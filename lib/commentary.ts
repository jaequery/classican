import { pieceId, site, type Track } from "./site";

// The radio host's words, written by a model on the Vercel AI Gateway from what
// lib/site.ts already says about each piece, so the host never has to guess.

const GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions";
/** The gateway's id for OpenAI GPT-6 Luna. Set COMMENTARY_MODEL to use another. */
export const DEFAULT_MODEL = "openai/gpt-6-luna";

export type Kind = "intro" | "outro";
export type Commentary = { ok: true; text: string } | { ok: false; status: number; error: string };

const byId = new Map(site.tracks.map((t) => [pieceId(t), t]));
export const trackFor = (id: string | null) => (id ? byId.get(id) : undefined);

const HOST = `You are the host of a classical music radio station: warm, unhurried, knowledgeable, never gushing.
You speak between recordings, so write words meant to be read aloud: plain sentences, no lists, no markdown, no stage directions, no emoji.
Use only the facts you are given about each piece; do not invent dates, anecdotes or numbers.
Never greet the listener by name, never mention being an AI, and never say "stay tuned".`;

function about(t: Track) {
  const c = site.composers[t.composer];
  return [
    `"${t.title}" by ${t.composer} (${c.origin}, ${c.born}–${c.died}), performed by ${t.performer.replace(/\s*\(.*\)$/, "")}.`,
    `Written ${t.details.year} in ${t.details.place}, for ${t.details.instruments.charAt(0).toLowerCase()}${t.details.instruments.slice(1)}.`,
    `Reception: ${t.details.reception}`,
    ...t.facts.map((f) => `- ${f.text}`),
  ].join("\n");
}

function prompt(kind: Kind, piece: Track, next?: Track) {
  if (kind === "intro") {
    return `The music has just begun. Introduce it the way a classical radio presenter does as a piece starts: name it and its composer, then add one detail worth listening for. Two or three sentences, at most 45 words.\n\nThe piece:\n${about(piece)}`;
  }
  return `This piece is about to end. In one spoken segment, back-announce it in a few words (name it, with one short remark), then introduce the next piece, naming it and its composer with one detail. At most 35 words in all.\n\nEnding now:\n${about(piece)}\n\nPlaying next:\n${about(next!)}`;
}

/** Ask the gateway for the host's words. Never falls back to another model: an unavailable model is reported by name. */
export async function writeCommentary(kind: Kind, piece: Track, next?: Track): Promise<Commentary> {
  const model = process.env.COMMENTARY_MODEL || DEFAULT_MODEL;
  // On Vercel the deployment's OIDC token also authenticates the gateway.
  const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!key) return { ok: false, status: 503, error: "AI_GATEWAY_API_KEY is not set, so the host has no words." };

  let res: Response;
  try {
    res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        max_tokens: 160,
        temperature: 0.8,
        // Reasoning would spend max_tokens before any words are written; the host needs none.
        reasoning: { enabled: false },
        messages: [
          { role: "system", content: HOST },
          { role: "user", content: prompt(kind, piece, next) },
        ],
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 504, error: "The AI Gateway did not answer in time." };
  }

  const body = (await res.json().catch(() => null)) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string; type?: string; code?: string };
  } | null;
  if (!res.ok) {
    const detail = `${body?.error?.type ?? ""} ${body?.error?.code ?? ""} ${body?.error?.message ?? ""}`;
    if (res.status === 404 || (/model/i.test(detail) && /not.?found|not.?available|unknown|invalid|unsupported/i.test(detail))) {
      return { ok: false, status: 502, error: `The model "${model}" is not available on the AI Gateway.` };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: 502, error: "The AI Gateway refused the API key." };
    }
    return { ok: false, status: 502, error: `The AI Gateway returned an error (${res.status}).` };
  }
  const text = body?.choices?.[0]?.message?.content?.replace(/\s+/g, " ").trim();
  return text ? { ok: true, text } : { ok: false, status: 502, error: "The AI Gateway returned no words." };
}
