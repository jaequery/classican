import { randomUUID } from "node:crypto";
import { hashPassword, hashToken, newSessionToken, normalizeEmail, SESSION_DAYS, signUpProblem, verifyPassword } from "./auth";
import { COMMENT_MAX, type Me, type PieceComment, type PieceSocial } from "./social";
import type { Data, Store, User } from "./store";

// Accounts, likes and comments: every rule about who may do what lives here,
// so the API routes only translate HTTP to these calls and back.

export type Result<T> = { ok: true; value: T } | { ok: false; status: number; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (status: number, error: string): Result<never> => ({ ok: false, status, error });

/** A password hash to check against when no account matches, so a wrong email takes as long as a wrong password. */
const decoy = hashPassword("not a real password");

export const toMe = (user: User): Me => ({ name: user.name, email: user.email });

function startSession(data: Data, userId: string) {
  const now = Date.now();
  data.sessions = data.sessions.filter((s) => Date.parse(s.expiresAt) > now);
  const { token, tokenHash } = newSessionToken();
  data.sessions.push({ tokenHash, userId, expiresAt: new Date(now + SESSION_DAYS * 86400_000).toISOString() });
  return token;
}

export type SignIn = { me: Me; token: string };

/** Make an account and sign it in. */
export async function signUp(store: Store, input: { email: string; name: string; password: string }): Promise<Result<SignIn>> {
  const problem = signUpProblem(input);
  if (problem) return fail(400, problem);
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  return store.write((data) => {
    if (data.users.some((u) => u.email === email)) return fail(409, "That email already has an account. Sign in instead.");
    const user: User = { id: randomUUID(), email, name: input.name.trim(), passwordHash, createdAt: new Date().toISOString() };
    data.users.push(user);
    return ok({ me: toMe(user), token: startSession(data, user.id) });
  });
}

export async function logIn(store: Store, input: { email: string; password: string }): Promise<Result<SignIn>> {
  const email = normalizeEmail(input.email);
  const user = await store.read((data) => data.users.find((u) => u.email === email));
  const matches = await verifyPassword(input.password, user?.passwordHash ?? (await decoy));
  if (!user || !matches) return fail(401, "That email and password don't match an account.");
  const token = await store.write((data) => startSession(data, user.id));
  return ok({ me: toMe(user), token });
}

export function logOut(store: Store, token: string) {
  const tokenHash = hashToken(token);
  return store.write((data) => {
    data.sessions = data.sessions.filter((s) => s.tokenHash !== tokenHash);
  });
}

/** The account a session token belongs to, or null if it is unknown or expired. */
export function userForToken(store: Store, token: string | undefined) {
  if (!token) return Promise.resolve(null);
  const tokenHash = hashToken(token);
  return store.read((data) => {
    const session = data.sessions.find((s) => s.tokenHash === tokenHash && Date.parse(s.expiresAt) > Date.now());
    return data.users.find((u) => u.id === session?.userId) ?? null;
  });
}

function social(data: Data, pieceId: string, userId: string | undefined): PieceSocial {
  const likes = data.likes.filter((l) => l.pieceId === pieceId);
  const names = new Map(data.users.map((u) => [u.id, u.name]));
  const comments: PieceComment[] = data.comments
    .filter((c) => c.pieceId === pieceId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((c) => ({ id: c.id, author: names.get(c.userId) ?? "A listener", text: c.text, createdAt: c.createdAt, mine: c.userId === userId }));
  return { likes: likes.length, liked: likes.some((l) => l.userId === userId), comments };
}

/** A piece's likes and comments, as `userId` (or a signed-out visitor) sees them. */
export function pieceSocial(store: Store, pieceId: string, userId?: string) {
  return store.read((data) => social(data, pieceId, userId));
}

/** Like or unlike. Liking twice is still one like, so a repeated request is harmless. */
export function setLike(store: Store, pieceId: string, userId: string, on: boolean) {
  return store.write((data) => {
    const has = data.likes.some((l) => l.pieceId === pieceId && l.userId === userId);
    if (on && !has) data.likes.push({ pieceId, userId, createdAt: new Date().toISOString() });
    if (!on && has) data.likes = data.likes.filter((l) => !(l.pieceId === pieceId && l.userId === userId));
    return social(data, pieceId, userId);
  });
}

export async function addComment(store: Store, pieceId: string, userId: string, text: string): Promise<Result<PieceComment>> {
  const body = text.trim();
  if (!body) return fail(400, "Write something first.");
  if (body.length > COMMENT_MAX) return fail(400, `Keep comments to ${COMMENT_MAX} characters.`);
  return store.write((data) => {
    const comment = { id: randomUUID(), pieceId, userId, text: body, createdAt: new Date().toISOString() };
    data.comments.push(comment);
    const author = data.users.find((u) => u.id === userId)?.name ?? "A listener";
    return ok({ id: comment.id, author, text: body, createdAt: comment.createdAt, mine: true });
  });
}

/** Only the person who wrote a comment can delete it. */
export function deleteComment(store: Store, commentId: string, userId: string): Promise<Result<null>> {
  return store.write((data) => {
    const comment = data.comments.find((c) => c.id === commentId);
    if (!comment) return fail(404, "That comment has already gone.");
    if (comment.userId !== userId) return fail(403, "You can only delete your own comments.");
    data.comments = data.comments.filter((c) => c.id !== commentId);
    return ok(null);
  });
}
