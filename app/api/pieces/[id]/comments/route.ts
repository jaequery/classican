import { addComment } from "@/lib/community";
import { currentUser, fields, isPiece, problem, respond, signInRequired, db } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  if (!isPiece(id)) return problem(404, "No such piece.");
  const user = await currentUser();
  if (!user) return signInRequired();
  const body = await fields(request);
  return respond(await addComment(db, id, user.id, body?.text ?? ""), 201);
}
