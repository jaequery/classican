// The radio host's voice: the host's words, spoken by a speech model on the Vercel
// AI Gateway, so the player can mix them with the music in one audio stream.

const SPEECH_URL = "https://ai-gateway.vercel.sh/v4/ai/speech-model";
/** The gateway's id for OpenAI TTS-1 HD. Set HOST_VOICE_MODEL to use another. */
export const DEFAULT_VOICE_MODEL = "openai/tts-1-hd";
/** A warm, unhurried British presenter. Set HOST_VOICE to use another of the model's voices. */
export const DEFAULT_VOICE = "fable";
/** A little slower than conversation, as a presenter between recordings speaks. */
const SPEED = 0.95;

export type Voice = { ok: true; audio: string } | { ok: false; status: number; error: string };

/** Speak `text`. The audio is MP3, base64-encoded. Never falls back to another model. */
export async function speak(text: string): Promise<Voice> {
  const model = process.env.HOST_VOICE_MODEL || DEFAULT_VOICE_MODEL;
  const voice = process.env.HOST_VOICE || DEFAULT_VOICE;
  // On Vercel the deployment's OIDC token also authenticates the gateway.
  const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!key) return { ok: false, status: 503, error: "AI_GATEWAY_API_KEY is not set, so the host has no voice." };

  let res: Response;
  try {
    res = await fetch(SPEECH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "ai-gateway-protocol-version": "0.0.1",
        "ai-speech-model-specification-version": "4",
        "ai-model-id": model,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice,
        outputFormat: "mp3",
        speed: SPEED,
        instructions: "A warm, unhurried classical radio presenter speaking between recordings.",
      }),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 504, error: "The AI Gateway did not speak in time." };
  }

  const body = (await res.json().catch(() => null)) as {
    audio?: string;
    error?: { message?: string; type?: string; code?: string };
  } | null;
  if (!res.ok) {
    const detail = `${body?.error?.type ?? ""} ${body?.error?.code ?? ""} ${body?.error?.message ?? ""}`;
    if (res.status === 404 || (/model/i.test(detail) && /not.?found|not.?available|unknown|invalid|unsupported/i.test(detail))) {
      return { ok: false, status: 502, error: `The voice model "${model}" is not available on the AI Gateway.` };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: 502, error: "The AI Gateway refused the API key." };
    }
    return { ok: false, status: 502, error: `The AI Gateway's voice returned an error (${res.status}).` };
  }
  return body?.audio ? { ok: true, audio: body.audio } : { ok: false, status: 502, error: "The AI Gateway returned no voice." };
}
