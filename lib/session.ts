import { cookies } from "next/headers";
import { neon } from "@neondatabase/serverless";
import { SESSION_DAYS } from "./auth";
import { userForToken, type Result } from "./community";
import { pieceId, site } from "./site";
import { withSchema, type Db } from "./db";

// The glue between the API routes and lib/community.ts: where the data lives,
// the session cookie, and turning results into JSON responses.

let neonDb: Db | undefined;

/** The Neon database named by DATABASE_URL (set by Vercel's Neon integration), connected on first use. */
export const db: Db = (text, params) => {
  if (!neonDb) {
    const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
    if (!url) throw new Error("DATABASE_URL is not set, so accounts, likes and comments have nowhere to live.");
    const sql = neon(url);
    neonDb = withSchema((t, p) => sql.query(t, p ?? []));
  }
  return neonDb(text, params);
};

const COOKIE = "classican_session";

const pieces = new Set(site.tracks.map(pieceId));
export const isPiece = (id: string) => pieces.has(id);

export async function sessionToken() {
  return (await cookies()).get(COOKIE)?.value;
}

/** The signed-in account, or null. */
export async function currentUser() {
  return userForToken(db, await sessionToken());
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(COOKIE);
}

export const problem = (status: number, error: string) => Response.json({ error }, { status });

export const signInRequired = () => problem(401, "Sign in to do that.");

export function respond<T>(result: Result<T>, status = 200) {
  return result.ok ? Response.json(result.value, { status }) : problem(result.status, result.error);
}

/** The request's JSON body as string fields, or null if it isn't a JSON object. */
export async function fields(request: Request): Promise<Record<string, string> | null> {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object") return null;
    return Object.fromEntries(Object.entries(body).map(([k, v]) => [k, typeof v === "string" ? v : ""]));
  } catch {
    return null;
  }
}
