import { setLike } from "@/lib/community";
import { currentUser, isPiece, problem, signInRequired, store } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

async function like(id: string, on: boolean) {
  if (!isPiece(id)) return problem(404, "No such piece.");
  const user = await currentUser();
  if (!user) return signInRequired();
  const { likes, liked } = await setLike(store, id, user.id, on);
  return Response.json({ likes, liked });
}

/** Like the piece. */
export async function PUT(_request: Request, { params }: Params) {
  return like((await params).id, true);
}

/** Take the like back. */
export async function DELETE(_request: Request, { params }: Params) {
  return like((await params).id, false);
}
