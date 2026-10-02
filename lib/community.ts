import { randomUUID } from "node:crypto";
import { hashPassword, hashToken, newSessionToken, normalizeEmail, SESSION_DAYS, signUpProblem, verifyPassword } from "./auth";
import { iso, type Db, type Row } from "./db";
import { COMMENT_MAX, type Me, type PieceComment, type PieceSocial } from "./social";

// Accounts, likes and comments: every rule about who may do what lives here,
// so the API routes only translate HTTP to these calls and back.

export type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (status: number, error: string): Result<never> => ({ ok: false, status, error });

export type User = {
  id: string;
  /** Lower-cased, so one address can only sign up once. */
  email: string;
  /** Shown beside their comments; their email never is. */
  name: string;
  passwordHash: string;
};

const toUser = (row: Row): User => ({
  id: String(row.id),
  email: String(row.email),
  name: String(row.name),
  passwordHash: String(row.password_hash),
});

/** A password hash to check against when no account matches, so a wrong email takes as long as a wrong password. */
const decoy = hashPassword("not a real password");

export const toMe = (user: User): Me => ({ name: user.name, email: user.email });

async function startSession(db: Db, userId: string) {
  await db("DELETE FROM sessions WHERE expires_at <= now()");
  const { token, tokenHash } = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  await db("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)", [tokenHash, userId, expiresAt]);
  return token;
}

export type SignIn = { me: Me; token: string };

/** Make an account and sign it in. */
export async function signUp(db: Db, input: { email: string; name: string; password: string }): Promise<Result<SignIn>> {
  const problem = signUpProblem(input);
  if (problem) return fail(400, problem);
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  const [row] = await db(
    `INSERT INTO users (id, email, name, password_hash) VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING RETURNING *`,
    [randomUUID(), email, input.name.trim(), passwordHash],
  );
  if (!row) return fail(409, "That email already has an account. Sign in instead.");
  const user = toUser(row);
  return ok({ me: toMe(user), token: await startSession(db, user.id) });
}

export async function logIn(db: Db, input: { email: string; password: string }): Promise<Result<SignIn>> {
  const [row] = await db("SELECT * FROM users WHERE email = $1", [normalizeEmail(input.email)]);
  const user = row ? toUser(row) : null;
  const matches = await verifyPassword(input.password, user?.passwordHash ?? (await decoy));
  if (!user || !matches) return fail(401, "That email and password don't match an account.");
  return ok({ me: toMe(user), token: await startSession(db, user.id) });
}

export async function logOut(db: Db, token: string) {
  await db("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
}

/** The account a session token belongs to, or null if it is unknown or expired. */
export async function userForToken(db: Db, token: string | undefined): Promise<User | null> {
  if (!token) return null;
  const [row] = await db(
    `SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = $1 AND sessions.expires_at > now()`,
    [hashToken(token)],
  );
  return row ? toUser(row) : null;
}

/** A piece's likes and comments, as `userId` (or a signed-out visitor) sees them. */
export async function pieceSocial(db: Db, pieceId: string, userId?: string): Promise<PieceSocial> {
  const [[counts], rows] = await Promise.all([
    db(
      `SELECT count(*)::int AS likes, coalesce(bool_or(user_id = $2), false) AS liked
       FROM likes WHERE piece_id = $1`,
      [pieceId, userId ?? null],
    ),
    db(
      `SELECT comments.id, comments.user_id, comments.text, comments.created_at, users.name
       FROM comments LEFT JOIN users ON users.id = comments.user_id
       WHERE comments.piece_id = $1 ORDER BY comments.created_at DESC, comments.id`,
      [pieceId],
    ),
  ]);
  const comments: PieceComment[] = rows.map((c) => ({
    id: String(c.id),
    author: c.name ? String(c.name) : "A listener",
    text: String(c.text),
    createdAt: iso(c.created_at),
    mine: c.user_id === userId,
  }));
  return { likes: Number(counts.likes), liked: Boolean(counts.liked), comments };
}

/** Like or unlike. Liking twice is still one like, so a repeated request is harmless. */
export async function setLike(db: Db, pieceId: string, userId: string, on: boolean) {
  if (on) await db("INSERT INTO likes (piece_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [pieceId, userId]);
  else await db("DELETE FROM likes WHERE piece_id = $1 AND user_id = $2", [pieceId, userId]);
  return pieceSocial(db, pieceId, userId);
}

export async function addComment(db: Db, pieceId: string, userId: string, text: string): Promise<Result<PieceComment>> {
  const body = text.trim();
  if (!body) return fail(400, "Write something first.");
  if (body.length > COMMENT_MAX) return fail(400, `Keep comments to ${COMMENT_MAX} characters.`);
  const [row] = await db(
    `WITH added AS (
       INSERT INTO comments (id, piece_id, user_id, text) VALUES ($1, $2, $3, $4) RETURNING id, created_at, user_id
     )
     SELECT added.id, added.created_at, users.name FROM added LEFT JOIN users ON users.id = added.user_id`,
    [randomUUID(), pieceId, userId, body],
  );
  return ok({ id: String(row.id), author: row.name ? String(row.name) : "A listener", text: body, createdAt: iso(row.created_at), mine: true });
}

/** Only the person who wrote a comment can delete it. */
export async function deleteComment(db: Db, commentId: string, userId: string): Promise<Result<null>> {
  const [row] = await db("SELECT user_id FROM comments WHERE id::text = $1", [commentId]);
  if (!row) return fail(404, "That comment has already gone.");
  if (row.user_id !== userId) return fail(403, "You can only delete your own comments.");
  await db("DELETE FROM comments WHERE id::text = $1 AND user_id = $2", [commentId, userId]);
  return ok(null);
}
