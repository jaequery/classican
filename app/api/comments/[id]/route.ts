import { deleteComment } from "@/lib/community";
import { currentUser, respond, signInRequired, db } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return signInRequired();
  const result = await deleteComment(db, (await params).id, user.id);
  return result.ok ? new Response(null, { status: 204 }) : respond(result);
}
