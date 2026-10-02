import { toMe } from "@/lib/community";
import { currentUser } from "@/lib/session";

/** The signed-in visitor, or null. */
export async function GET() {
  const user = await currentUser();
  return Response.json(user ? toMe(user) : null);
}
