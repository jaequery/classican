import { logOut } from "@/lib/community";
import { clearSessionCookie, sessionToken, db } from "@/lib/session";

export async function POST() {
  const token = await sessionToken();
  if (token) await logOut(db, token);
  await clearSessionCookie();
  return new Response(null, { status: 204 });
}
