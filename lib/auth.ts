import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

// Passwords and session tokens. Nothing here is ever stored or sent in the clear.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;
export const NAME_MAX = 40;
/** How long a sign-in lasts without signing in again. */
export const SESSION_DAYS = 30;

const KEY_LENGTH = 64;

function derive(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, KEY_LENGTH, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

/** A salted scrypt hash, stored as "scrypt$<salt>$<key>". */
export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const expected = Buffer.from(key, "base64");
  const actual = await derive(password, Buffer.from(salt, "base64"));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** A new session token for the cookie, and the hash the server keeps of it. */
export function newSessionToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("base64url");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/** Why these sign-up details can't be used, or null if they can. */
export function signUpProblem({ email, name, password }: { email: string; name: string; password: string }) {
  if (!name.trim()) return "Enter a name to show beside your comments.";
  if (name.trim().length > NAME_MAX) return `Keep your name to ${NAME_MAX} characters.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email)) || email.length > 254) return "Enter a valid email address.";
  if (password.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters for your password.`;
  if (password.length > PASSWORD_MAX) return `Keep your password to ${PASSWORD_MAX} characters.`;
  return null;
}
