import { pieceSocial } from "@/lib/community";
import { currentUser, isPiece, problem, store } from "@/lib/session";

type Params = { params: Promise<{ id: string }> };

/** A piece's likes and comments. Anyone can read them. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!isPiece(id)) return problem(404, "No such piece.");
  const user = await currentUser();
  return Response.json(await pieceSocial(store, id, user?.id));
}
