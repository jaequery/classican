import { signUp } from "@/lib/community";
import { fields, problem, setSessionCookie, store } from "@/lib/session";

export async function POST(request: Request) {
  const body = await fields(request);
  if (!body) return problem(400, "Send an email, name and password.");
  const result = await signUp(store, { email: body.email ?? "", name: body.name ?? "", password: body.password ?? "" });
  if (!result.ok) return problem(result.status, result.error);
  await setSessionCookie(result.value.token);
  return Response.json(result.value.me, { status: 201 });
}
