"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { ART_H, ART_W, paintings, type Frame, type PaintingId, type Spot } from "@/lib/paintings";
import { BAYER, Raster } from "@/lib/raster";
import type { Beat, Fact } from "@/lib/site";

const FPS = 10;
const FADE = 2.5; // seconds for one painting to dissolve into the next
const LEAD = 8; // seconds of music before a piece's first fact
const DIM_IN = 1.4; // seconds for the light to gather on a motif, and to return
const TEXT_FROM = 1.4; // seconds into a fact's turn when its words appear…
const TEXT_TO = 13.4; // …and when they leave
const STORY_TO = 16; // story words stay a little longer
const AFTER_STORY = 6; // seconds after a story beat's words leave before facts resume
const DIM_MAX = 12; // of 16 pixels outside the pool take the darker twin: about 70% brightness
const SHADE = 0.6; // brightness of the darker twin
const FEATHER = 7; // art pixels over which the pool's edge softens

function toPixel(hex: string, k = 1) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round((n >> 16) * k);
  const g = Math.round(((n >> 8) & 0xff) * k);
  const b = Math.round((n & 0xff) * k);
  // ImageData is RGBA in memory; a little-endian Uint32 view reads it as ABGR.
  return (0xff << 24) | (b << 16) | (g << 8) | r;
}

type Props = {
  playing: boolean;
  painting: PaintingId;
  facts: Fact[];
  story?: Beat[];
  /** Seconds played into the piece, kept by the player. */
  clock: RefObject<number>;
  factSeconds: number;
};

/**
 * The current piece's painting, full screen. While music plays, a fact about
 * the piece comes every `factSeconds`: the painting dims gently around the
 * thing the fact is about, the words sit beside that pool of light, then the
 * light returns. When the piece changes, its painting dissolves in. A piece
 * with a story follows it as the music plays: at each beat the painting
 * dissolves to that scene and the beat's words show, and facts wait their
 * turn around them. Under reduced motion nothing drifts, fades or pans.
 */
export function Scene({ playing, painting, facts, story, clock, factSeconds }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const factRef = useRef<HTMLParagraphElement>(null);
  const props = useRef({ playing, painting, facts, story, factSeconds });
  const [label, setLabel] = useState("");

  useEffect(() => {
    props.current = { playing, painting, facts, story, factSeconds };
  }, [playing, painting, facts, story, factSeconds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const factEl = factRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !factEl || !ctx) return;
    canvas.width = ART_W;
    canvas.height = ART_H;

    const image = ctx.createImageData(ART_W, ART_H);
    const out = new Uint32Array(image.data.buffer);
    const from = new Raster(ART_W, ART_H);
    const to = new Raster(ART_W, ART_H);
    const luts = paintings.map((p) => ({
      lit: Uint32Array.from(p.colors, (h) => toPixel(h)),
      dim: Uint32Array.from(p.colors, (h) => toPixel(h, SHADE)),
    }));

    // Dissolve order: random 2×2 blocks, so the change reads as pixels, not a blur.
    const noise = new Float32Array(ART_W * ART_H);
    for (let y = 0; y < ART_H; y += 2) {
      for (let x = 0; x < ART_W; x += 2) {
        const v = Math.random();
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) noise[(y + dy) * ART_W + x + dx] = v;
      }
    }

    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    const find = (id: PaintingId) => Math.max(0, paintings.findIndex((p) => p.id === id));
    let piece = props.current.painting; // the loaded piece's own painting
    let current = find(piece);
    let next = current;
    let arriving = false; // the dissolve under way brings in a new piece, not a scene of the same one
    let fade = -1; // seconds into a dissolve, or -1
    let sim = 30;
    let energy = props.current.playing ? 1 : 0.35;
    let fact = 0; // which of the piece's facts is next or showing
    let turn = -LEAD; // seconds into the current fact's turn; negative while waiting for the first
    let dim = 0; // 0 = full light, 1 = pool on the motif
    let beat = -1; // the story beat the music has reached, or -1
    let told = Infinity; // seconds into telling the current beat; Infinity once told
    let pool: Spot | null = null; // where the current words' light falls, if they name a motif
    let focus: Spot | null = null; // the pool while it is lit: the view pans to keep it on screen
    let words = false;
    const view = { s: 1, x: 0, y: 0, tx: 0, ty: 0 };
    let raf = 0;
    let last = 0;
    let since = 1; // seconds since the canvas was last redrawn

    const announce = () => setLabel(`Background painting: ${paintings[current].alt}`);

    const playerTop = () => document.querySelector(".player")?.getBoundingClientRect().top ?? innerHeight;

    /** Pan so the lit motif sits above the player when the screen crops the painting; otherwise centre it. */
    const aim = () => {
      const s = view.s;
      let fx = ART_W / 2;
      let fy = ART_H / 2;
      let cy = innerHeight / 2;
      if (focus) {
        [fx, fy] = focus;
        cy = Math.max(playerTop() / 2, 80);
      }
      view.tx = Math.min(0, Math.max(innerWidth - ART_W * s, innerWidth / 2 - fx * s));
      view.ty = Math.min(0, Math.max(innerHeight - ART_H * s, cy - fy * s));
    };

    const layout = () => {
      view.s = Math.max(innerWidth / ART_W, innerHeight / ART_H);
      canvas.style.width = `${ART_W * view.s}px`;
      canvas.style.height = `${ART_H * view.s}px`;
      aim();
      view.x = view.tx;
      view.y = view.ty;
      canvas.style.transform = `translate(${view.x}px, ${view.y}px)`;
    };

    const show = (text: string, motif: string | undefined, eyebrow: string) => {
      pool = motif ? (paintings[current].motifs[motif] ?? null) : null;
      const words: Node[] = [document.createTextNode(text)];
      if (eyebrow) {
        const span = document.createElement("span");
        span.className = "fact-eyebrow";
        span.textContent = eyebrow;
        words.unshift(span);
      }
      factEl.replaceChildren(...words);
      factEl.classList.toggle("story", Boolean(eyebrow));
    };

    const telling = () => told <= STORY_TO + 0.5;

    /** Put up the words that are due: the story beat being told, else the next fact. */
    const showFact = () => {
      const { facts: list, story: beats } = props.current;
      const b = beats?.[beat];
      if (b && telling()) return show(b.text, b.motif, "The story");
      const f = list[fact % list.length];
      show(f?.text ?? "", f?.motif, "");
    };

    const setWords = (on: boolean) => {
      if (on === words) return;
      words = on;
      factEl.classList.toggle("on", on);
      factEl.setAttribute("aria-hidden", String(!on));
    };

    /** Beside the pool: right of it, else left, else above or below; always inside the gutters, below the update bar, above the player and clear of the wall label. */
    const placeFact = () => {
      const gutter = innerWidth < 600 ? 16 : 24;
      const top = (document.querySelector(".update")?.getBoundingClientRect().bottom ?? 0) + gutter;
      const w = factEl.offsetWidth;
      const h = factEl.offsetHeight;
      let x = gutter;
      let y = top;
      if (pool) {
        const cx = view.x + pool[0] * view.s;
        const cy = view.y + pool[1] * view.s;
        const r = (pool[2] + FEATHER / 2) * view.s;
        const gap = 12;
        y = cy - h / 2;
        if (cx + r + gap + w <= innerWidth - gutter) x = cx + r + gap;
        else if (cx - r - gap - w >= gutter) x = cx - r - gap - w;
        else {
          x = cx - w / 2;
          y = cy - r - gap - h < top ? cy + r + gap : cy - r - gap - h;
        }
      }
      x = Math.max(gutter, Math.min(innerWidth - gutter - w, x));
      y = Math.max(top, Math.min(playerTop() - 12 - h, y));
      // Keep clear of the wall label: step below it, or beside it if there is no room below.
      const label = document.querySelector(".wall")?.getBoundingClientRect();
      if (label && x < label.right + 12 && x + w > label.left - 12 && y < label.bottom + 12 && y + h > label.top - 12) {
        if (label.bottom + 12 + h <= playerTop() - 12) y = label.bottom + 12;
        else x = Math.max(gutter, label.left - 12 - w);
      }
      factEl.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    };

    const draw = () => {
      const still = reduce.matches;
      const f: Frame = { t: sim, still };
      paintings[current].render(from, f);
      const a = luts[current];
      const b = luts[next];
      const p = fade < 0 ? 0 : fade / FADE;
      if (fade >= 0) paintings[next].render(to, f);
      const [px, py, pr] = pool ?? [0, 0, 0];
      for (let y = 0, i = 0; y < ART_H; y++) {
        for (let x = 0; x < ART_W; x++, i++) {
          const fromNext = fade >= 0 && noise[i] < p;
          const lut = fromNext ? b : a;
          const c = fromNext ? to.buf[i] : from.buf[i];
          let dark = false;
          if (dim > 0) {
            let level = DIM_MAX * dim;
            if (pool) level *= Math.max(0, Math.min(1, (Math.hypot(x + 0.5 - px, y + 0.5 - py) - pr) / FEATHER));
            dark = BAYER[(y & 3) * 4 + (x & 3)] < Math.round(level);
          }
          out[i] = dark ? lut.dim[c] : lut.lit[c];
        }
      }
      ctx.putImageData(image, 0, 0);
    };

    const step = (dt: number) => {
      const { playing, painting, story: beats, factSeconds } = props.current;
      const still = reduce.matches;

      // Follow the piece the player has loaded, and the beat of its story the music has reached.
      if (painting !== piece) {
        piece = painting;
        arriving = true;
        beat = -1;
        told = Infinity;
      }
      // Beats only move forward: the clock drops to 0 a frame before the next piece's painting arrives.
      let reached = -1;
      if (beats) for (let i = 0; i < beats.length && beats[i].at <= (clock.current ?? 0); i++) reached = i;
      if (reached > beat) {
        beat = reached;
        // A fact already on screen has been read; the next one comes after the story.
        if (turn >= TEXT_FROM) fact++;
        turn = -Infinity;
        told = 0;
        if (fade < 0) {
          dim = 0;
          setWords(false);
          showFact();
        }
      }
      const want = find(beats?.[beat]?.scene ?? piece);
      if (fade < 0 && want !== current) {
        pool = null;
        dim = 0;
        setWords(false);
        if (still) {
          current = next = want;
          if (arriving) {
            fact = 0;
            turn = -LEAD;
          }
          arriving = false;
          announce();
          showFact();
          since = 1; // redraw now
        } else {
          next = want;
          fade = 0;
        }
      }
      if (fade >= 0) {
        fade += dt;
        if (fade >= FADE) {
          fade = -1;
          current = next;
          if (arriving) {
            fact = 0;
            turn = -LEAD;
          }
          arriving = false;
          announce();
          showFact();
        }
      }

      // The story's words first, then one fact per turn; both only while music plays.
      const cycling = playing && fade < 0;
      const story = cycling && telling();
      if (cycling && telling()) {
        told += dt;
        if (!telling()) {
          turn = -AFTER_STORY;
          showFact();
        }
      } else if (cycling) {
        turn += dt;
        if (turn >= factSeconds) {
          turn = 0;
          fact++;
          showFact();
        }
      }
      const showing = cycling && turn >= 0;
      const lit = pool !== null && (story ? told < STORY_TO + 0.5 : showing && turn < TEXT_TO + 0.5);
      const target = lit ? 1 : 0;
      const before = dim;
      dim = still ? target : dim + Math.sign(target - dim) * Math.min(Math.abs(target - dim), dt / DIM_IN);
      if ((lit ? pool : null) !== focus) {
        focus = lit ? pool : null;
        aim();
      }

      const ease = still ? 1 : 1 - Math.exp(-dt / DIM_IN);
      view.x += (view.tx - view.x) * ease;
      view.y += (view.ty - view.y) * ease;
      canvas.style.transform = `translate(${view.x.toFixed(1)}px, ${view.y.toFixed(1)}px)`;

      setWords(story ? told >= TEXT_FROM && told < STORY_TO : showing && turn >= TEXT_FROM && turn < TEXT_TO);
      if (words) placeFact();

      energy += ((playing ? 1 : 0.35) - energy) * 0.03;
      sim += dt * energy;
      since += dt;
      // A still painting only needs redrawing when the light or the picture changes.
      if (since >= 1 / FPS && (!still || dim !== before || since >= 1)) {
        draw();
        since = 0;
      }
    };

    const frame = (ms: number) => {
      raf = requestAnimationFrame(frame);
      const dt = last ? Math.min((ms - last) / 1000, 0.25) : 0;
      last = ms;
      step(dt);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const start = () => {
      stop();
      if (document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    const onResize = () => {
      layout();
      draw();
    };

    announce();
    showFact();
    layout();
    draw();
    start();
    document.addEventListener("visibilitychange", onVisibility);
    addEventListener("resize", onResize);
    reduce.addEventListener("change", onResize);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      removeEventListener("resize", onResize);
      reduce.removeEventListener("change", onResize);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="scene" role="img" aria-label={label} />
      <p ref={factRef} className="fact" aria-hidden="true" />
    </>
  );
}
