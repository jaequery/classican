"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

// The radio host's voice, through the browser's speech synthesis. An Apple voice
// is used when the system has one; otherwise, or if it fails, the system's own
// default voice reads the words instead.

// macOS ships joke voices alongside the real ones; a presenter is never one of them.
const NOVELTY =
  /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Eddy|Flo|Fred|Good News|Grandma|Grandpa|Jester|Junior|Kathy|Organ|Ralph|Reed|Rocko|Sandy|Shelley|Superstar|Trinoids|Whisper|Wobble|Zarvox)\b/;
// Chrome on Apple devices lists Apple's voices by name only, without Safari's com.apple voiceURI.
const APPLE_NAMES =
  /^(Daniel|Serena|Kate|Oliver|Arthur|Martha|Jamie|Stephanie|Samantha|Ava|Allison|Susan|Tom|Evan|Nathan|Zoe|Joelle|Noelle|Alex|Karen|Lee|Moira|Tessa|Fiona|Rishi|Veena)\b/;
// Speech engines refuse or drop the voice; anything else (cancel, interrupt) is not a failure.
const VOICE_FAILURES = new Set(["synthesis-failed", "synthesis-unavailable", "voice-unavailable", "language-unavailable"]);
const RATE = 0.95;

function isApple(v: SpeechSynthesisVoice) {
  if (NOVELTY.test(v.name)) return false;
  if (v.voiceURI.startsWith("com.apple.")) return true;
  return v.localService && APPLE_NAMES.test(v.name) && /Mac|iPhone|iPad/.test(navigator.userAgent);
}

/** The best English Apple voice: premium, then enhanced, then British (a classical-radio accent), then any. */
function appleVoice(voices: SpeechSynthesisVoice[]) {
  const score = (v: SpeechSynthesisVoice) =>
    (/premium/i.test(v.voiceURI + v.name) ? 4 : /enhanced/i.test(v.voiceURI + v.name) ? 2 : 0) + (v.lang === "en-GB" ? 1 : 0);
  return voices
    .filter((v) => isApple(v) && v.lang.startsWith("en"))
    .sort((a, b) => score(b) - score(a))[0];
}

/** Roughly how long the host takes to say `text`, in seconds. */
export function speakingTime(text: string) {
  const words = text.split(/\s+/).filter(Boolean).length;
  const sentences = text.split(/[.!?]+\s/).length;
  return words / (2.6 * RATE) + sentences * 0.4;
}

export function useHost() {
  const apple = useRef<SpeechSynthesisVoice | undefined>(undefined);
  const appleFailed = useRef(false);
  const generation = useRef(0); // bumped by stop(), so callbacks from cancelled speech do nothing

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    // Voices often arrive after the page loads.
    const pick = () => (apple.current = appleVoice(synth.getVoices()));
    pick();
    synth.addEventListener("voiceschanged", pick);
    return () => {
      synth.removeEventListener("voiceschanged", pick);
      synth.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    generation.current++;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  /** Speech on iOS must first be started by a tap or key; call this from one. */
  const unlock = useCallback(() => {
    if (!("speechSynthesis" in window) || window.speechSynthesis.speaking) return;
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  }, []);

  /** Say `text` at `volume` (0–1). Resolves when it is finished, or stopped. */
  const speak = useCallback(
    (text: string, volume: number) =>
      new Promise<void>((resolve) => {
        if (!("speechSynthesis" in window)) return resolve();
        const synth = window.speechSynthesis;
        synth.cancel();
        const run = ++generation.current;
        // One utterance per sentence: Chrome cuts off long utterances part-way.
        const sentences = text.match(/[^.!?]+[.!?]+["'”’]?\s*|[^.!?]+$/g)?.map((s) => s.trim()).filter(Boolean) ?? [];
        const say = (i: number) => {
          if (run !== generation.current || i >= sentences.length) return resolve();
          const u = new SpeechSynthesisUtterance(sentences[i]);
          const voice = appleFailed.current ? undefined : apple.current;
          if (voice) {
            u.voice = voice;
            u.lang = voice.lang;
          }
          u.rate = RATE;
          u.volume = volume;
          let done = false;
          // Some engines never fire "end"; don't let the host hold the music down forever.
          const guard = window.setTimeout(() => finish(), (speakingTime(sentences[i]) + 6) * 1000);
          function finish(retry = false) {
            if (done) return;
            done = true;
            window.clearTimeout(guard);
            if (retry && run === generation.current) {
              // The Apple voice failed; read the rest in the system voice.
              appleFailed.current = true;
              say(i);
            } else say(i + 1);
          }
          u.onend = () => finish();
          u.onerror = (e) => finish(Boolean(voice) && VOICE_FAILURES.has(e.error));
          synth.speak(u);
        };
        say(0);
      }),
    [],
  );

  return useMemo(() => ({ speak, stop, unlock }), [speak, stop, unlock]);
}
