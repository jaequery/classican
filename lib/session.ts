import { cookies } from "next/headers";
import { join } from "node:path";
import { SESSION_DAYS } from "./auth";
import { userForToken, type Result } from "./community";
import { pieceId, site } from "./site";
import { fileStore } from "./store";

// The glue between the API routes and lib/community.ts: where the data lives,
// the session cookie, and turning results into JSON responses.

export const store = fileStore(process.env.CLASSICAN_DATA ?? join(process.cwd(), ".data", "classican.json"));

const COOKIE = "classican_session";

const pieces = new Set(site.tracks.map(pieceId));
export const isPiece = (id: string) => pieces.has(id);

export async function sessionToken() {
  return (await cookies()).get(COOKIE)?.value;
}

/** The signed-in account, or null. */
export async function currentUser() {
  return userForToken(store, await sessionToken());
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
