import { trackFor, writeCommentary } from "@/lib/commentary";
import { problem } from "@/lib/session";

/**
 * What the radio host says: `?kind=intro&piece=<id>` as a piece begins, or
 * `?kind=outro&piece=<id>&next=<id>` as it ends and the next one is coming.
 * Only playlist ids are accepted, and good answers are cached at the CDN for a
 * day, so each piece and pairing costs the gateway once.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const piece = trackFor(params.get("piece"));
  const next = trackFor(params.get("next"));
  if (kind !== "intro" && kind !== "outro") return problem(400, "kind must be intro or outro.");
  if (!piece || (kind === "outro" && !next)) return problem(404, "No such piece.");

  const result = await writeCommentary(kind, piece, next);
  if (!result.ok) return problem(result.status, result.error);
  return Response.json(
    { text: result.text },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
