// Drives the player in headless Chromium emulating an iPhone 13 with the radio host on,
// to check that the host never silences the music (CLAS-QDZQ7M).
//
//   npx next dev -p 3123 &
//   PLAYWRIGHT_DIR=/path/with/node_modules/playwright BASE=http://localhost:3123 \
//     node scripts/host-repro/repro.mjs wait|tap|outro|nokey [out-dir]
//
// - Autoplay is refused until the first tap, as on iOS.
// - speechSynthesis is swapped for a stand-in that does what iOS Safari does: when an
//   utterance with words starts, the system pauses every <audio> element.
// - The music is a silent WAV. The host's words (and voice, from /api/host-voice) are
//   stubbed, except in `nokey`, where the real route answers without an API key.
//
// Exits 0 when every expectation for the scenario holds, 1 otherwise.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(path.join(process.env.PLAYWRIGHT_DIR ?? process.cwd(), "noop.js"));
const { chromium, devices } = require("playwright");

const mode = process.argv[2] ?? "wait";
const out = process.argv[3] ?? "scripts/host-repro/out";
const BASE = process.env.BASE ?? "http://localhost:3123";
const INTRO = "This is the piece now beginning, by its composer. It was written in a single week. The composer later called it his favourite.";

function wav(seconds, rate, sample) {
  const n = Math.floor(seconds * rate);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(sample(i / rate), 44 + i * 2);
  return buf;
}
// A short piece for the outro run, so its end comes round without seeking.
const music = wav(mode === "outro" ? 30 : 240, 8000, () => 0);
// The host's "voice": 4.5 s of a quiet tone, standing in for the spoken clip.
const voice = wav(4.5, 22050, (t) => Math.round(Math.sin(2 * Math.PI * 220 * t) * 3000));

// Runs in the page before the app: blocks autoplay, mimics iOS speech, records everything.
function instrument() {
  const t0 = performance.now();
  const events = [];
  const log = (msg) => events.push(`+${String(Math.round(performance.now() - t0)).padStart(6)}ms  ${msg}`);
  window.__events = events;
  window.__speakWithText = 0;
  let gesture = false;
  addEventListener("pointerdown", () => (gesture = true), true);
  addEventListener("click", () => (gesture = true), true);
  const play = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!gesture) return Promise.reject(new DOMException("autoplay refused", "NotAllowedError"));
    log("<audio> play()");
    return play.call(this);
  };
  for (const type of ["pause", "playing"]) {
    document.addEventListener(type, (e) => e.target instanceof HTMLAudioElement && log(`<audio> ${type} event`), true);
  }
  // Every GainNode the page makes, so the music's level can be read.
  window.__gains = [];
  const createGain = AudioContext.prototype.createGain;
  AudioContext.prototype.createGain = function () {
    const g = createGain.call(this);
    window.__gains.push(g);
    return g;
  };
  // iOS-like speech: words take the audio session and pause the music; speech continues.
  let speaking = null;
  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: () => [],
    addEventListener() {},
    removeEventListener() {},
    cancel() {
      log(`speechSynthesis.cancel ${speaking ? `while speaking "${speaking.u.text}"` : "idle"}`);
      if (speaking) clearTimeout(speaking.timer);
      speaking = null;
      synth.speaking = false;
    },
    speak(u) {
      log(`speechSynthesis.speak "${u.text}"`);
      if (!u.text) return;
      window.__speakWithText++;
      synth.speaking = true;
      for (const a of document.querySelectorAll("audio")) if (!a.paused) {
        log("system pauses <audio> for speech");
        a.pause();
      }
      const timer = setTimeout(() => {
        speaking = null;
        synth.speaking = false;
        log(`host voice ends "${u.text}"`);
        u.onend?.(new Event("end"));
      }, 1500);
      speaking = { u, timer };
    },
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
}

function snapshot() {
  const a = document.querySelector("audio");
  const button = document.querySelector(".control.play");
  return {
    audioPaused: a?.paused,
    currentTime: a ? Math.round(a.currentTime * 10) / 10 : null,
    button: button?.getAttribute("aria-label"),
    status: document.querySelector(".player-status")?.textContent ?? "",
    onAir: document.querySelector(".on-air")?.textContent ?? null,
    musicGain: window.__gains[0] ? Math.round(window.__gains[0].gain.value * 100) / 100 : null,
  };
}

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const context = await browser.newContext({ ...devices["iPhone 13"] });
await context.addInitScript(() => localStorage.setItem("classican:host:v1", "true"));
await context.addInitScript(instrument);
await context.route(/upload\.wikimedia\.org/, (r) =>
  r.fulfill({ status: 200, contentType: "audio/wav", body: music, headers: { "Access-Control-Allow-Origin": "*" } }),
);
if (mode !== "nokey") await context.route(/\/api\/commentary\?/, (r) => r.fulfill({ json: { text: INTRO } }));
if (mode !== "nokey") {
  await context.route(/\/api\/host-voice\?/, (r) =>
    r.fulfill({ json: { text: INTRO, audio: voice.toString("base64") } }),
  );
}

const page = await context.newPage();
const rows = [];
const failures = [];
const record = async (label) => {
  const s = await page.evaluate(snapshot);
  rows.push(`${label.padEnd(44)} ${JSON.stringify(s)}`);
  return s;
};
const expect = (ok, what) => {
  if (!ok) failures.push(what);
};
let pausesOnAir = 0;
const onAir = () => page.waitForSelector(".on-air:not(.off)", { timeout: 15_000 }).then(() => true, () => false);

mkdirSync(out, { recursive: true });
await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(500);
await record("page loaded (autoplay refused)");
await page.click(".control.play");
await record("tapped Play");

if (mode === "wait") {
  expect(await onAir(), "the host goes on air");
  const first = await record("host starts talking");
  await page.screenshot({ path: path.join(out, "wait-on-air.png") });
  const samples = [first];
  for (let s = 1; s <= 7; s++) {
    await page.waitForTimeout(1000);
    samples.push(await record(`${s} s into the host segment (no taps)`));
  }
  const airing = samples.filter((s) => s.onAir && !s.onAir.startsWith("Host off air"));
  expect(airing.length > 0 && airing.every((s) => s.audioPaused === false), "audio.paused stays false while on air");
  expect(airing.every((s) => s.button !== "Pause" || s.audioPaused === false), "never 'Pause' over paused music");
  expect(airing.some((s) => s.musicGain !== null && s.musicGain < 0.5), "the music is ducked under the host");
  const last = samples.at(-1);
  expect(last.onAir === null && last.audioPaused === false, "after the host, the music plays on");
  expect(last.musicGain !== null && last.musicGain > 0.75, "the music comes back up to full volume");
} else if (mode === "tap") {
  expect(await onAir(), "the host goes on air");
  await record("host starts talking");
  await page.waitForTimeout(800);
  await page.click(".control.play");
  await page.waitForTimeout(300);
  const paused = await record("listener taps pause during the host");
  expect(paused.audioPaused === true && paused.button === "Play" && paused.onAir === null, "pause stops the music and the host together");
  await page.click(".control.play");
  await page.waitForTimeout(300);
  const resumed = await record("listener taps play once");
  expect(resumed.audioPaused === false && resumed.button === "Pause", "one tap resumes the music");
  expect(await onAir(), "the cut-off intro is said again");
  const again = await record("host back on air");
  expect(again.audioPaused === false, "the music keeps playing under the repeated intro");
  await page.waitForTimeout(6000);
  const after = await record("6 s later");
  expect(after.audioPaused === false && after.onAir === null, "the music plays on after the host");
} else if (mode === "outro") {
  // The 30 s piece: the intro plays first, then near the end the host back-announces it and introduces the next.
  await page.waitForTimeout(8000);
  const title = await page.textContent(".now .title");
  expect(await page.waitForSelector(".on-air:not(.off)", { timeout: 25_000 }).then(() => true, () => false), "the host goes on air for the outro");
  const samples = [await record("outro starts")];
  for (let s = 1; s <= 4; s++) {
    await page.waitForTimeout(1000);
    samples.push(await record(`${s} s into the outro`));
  }
  // The piece's own end pauses the element as the next one loads; only pauses while on air count.
  pausesOnAir = (await page.evaluate(() => window.__events)).filter((e) => e.includes("pause event")).length;
  const airing = samples.filter((s) => s.onAir && !s.onAir.startsWith("Host off air"));
  expect(airing.length > 0 && airing.every((s) => s.audioPaused === false), "audio.paused stays false during the outro");
  expect(airing.some((s) => s.musicGain !== null && s.musicGain < 0.5), "the music is ducked under the outro");
  const moved = await page.waitForFunction((t) => document.querySelector(".now .title")?.textContent !== t, title, { timeout: 20_000 }).then(() => true, () => false);
  expect(moved, "the next piece follows the outro");
  await page.waitForTimeout(3000);
  const next = await record("3 s into the next piece");
  expect(next.audioPaused === false && next.currentTime > 1, "the next piece plays");
  expect(next.musicGain !== null && next.musicGain > 0.75, "the music is back to full volume");
  expect(next.onAir === null, "the piece the outro introduced gets no second intro");
} else if (mode === "nokey") {
  await page.waitForTimeout(6000);
  const s = await record("6 s after tapping Play (no TTS key)");
  await page.screenshot({ path: path.join(out, "nokey.png") });
  expect(s.audioPaused === false && s.currentTime > 2, "the music plays without a voice");
  expect(s.button !== "Pause" || s.audioPaused === false, "never 'Pause' over silence");
  expect(Boolean(s.onAir?.startsWith("Host off air")), "the caption says the host is off air");
}

const speakWithText = await page.evaluate(() => window.__speakWithText);
if (mode !== "nokey") expect(speakWithText === 0, "speechSynthesis.speak is never called with words");
if (mode === "wait") pausesOnAir = (await page.evaluate(() => window.__events)).filter((e) => e.includes("pause event")).length;
expect(pausesOnAir === 0, "no <audio> pause event fires while the host speaks");

const report = [
  `mode: ${mode}`,
  ...rows,
  "",
  "--- event log ---",
  ...(await page.evaluate(() => window.__events)),
  "",
  failures.length ? `FAIL:\n${failures.map((f) => `  - ${f}`).join("\n")}` : "PASS",
].join("\n");
writeFileSync(path.join(out, `${mode}.log`), report + "\n");
console.log(report);
await browser.close();
process.exit(failures.length ? 1 : 0);
