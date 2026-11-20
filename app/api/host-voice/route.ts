import { trackFor, writeCommentary } from "@/lib/commentary";
import { speak } from "@/lib/hostVoice";
import { problem } from "@/lib/session";

/**
 * The radio host's words and voice together: `?kind=intro&piece=<id>` as a piece
 * begins, or `?kind=outro&piece=<id>&next=<id>` as it ends. The answer is
 * `{ text, audio }`, where `audio` is base64 MP3 saying exactly `text`, so the
 * caption always matches the voice. Only playlist ids are accepted, and good
 * answers are cached at the CDN for a day, so each piece and pairing is paid
 * for once. Errors are never cached.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const piece = trackFor(params.get("piece"));
  const next = trackFor(params.get("next"));
  if (kind !== "intro" && kind !== "outro") return problem(400, "kind must be intro or outro.");
  if (!piece || (kind === "outro" && !next)) return problem(404, "No such piece.");

  const words = await writeCommentary(kind, piece, next);
  if (!words.ok) return problem(words.status, words.error);
  const voice = await speak(words.text);
  if (!voice.ok) return problem(voice.status, voice.error);
  return Response.json(
    { text: words.text, audio: voice.audio },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
