"use client";

import { useEffect, useRef, useState } from "react";
import { ART_H, ART_W, paintings, type Frame } from "@/lib/paintings";
import { Raster } from "@/lib/raster";

const FPS = 10;
const FADE = 2.5; // seconds for one painting to dissolve into the next

function toPixel(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  // ImageData is RGBA in memory; a little-endian Uint32 view reads it as ABGR.
  return (0xff << 24) | ((n & 0xff) << 16) | (n & 0xff00) | ((n >> 16) & 0xff);
}

/**
 * Full-screen pixel paintings that rotate on a timer. The picture drifts
 * slowly while music plays and settles when it pauses. Under reduced motion
 * nothing moves, and paintings change with an instant swap.
 */
export function Scene({ playing, paintingSeconds }: { playing: boolean; paintingSeconds: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playingRef = useRef(playing);
  const [label, setLabel] = useState("Rotating pixelated Cubist paintings.");

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    canvas.width = ART_W;
    canvas.height = ART_H;

    const image = ctx.createImageData(ART_W, ART_H);
    const out = new Uint32Array(image.data.buffer);
    const from = new Raster(ART_W, ART_H);
    const to = new Raster(ART_W, ART_H);
    const luts = paintings.map((p) => Uint32Array.from(p.colors, toPixel));

    // Dissolve order: random 2×2 blocks, so the change reads as pixels, not a blur.
    const noise = new Float32Array(ART_W * ART_H);
    for (let y = 0; y < ART_H; y += 2) {
      for (let x = 0; x < ART_W; x += 2) {
        const v = Math.random();
        for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) noise[(y + dy) * ART_W + x + dx] = v;
      }
    }

    const reduce = matchMedia("(prefers-reduced-motion: reduce)");
    let current = Math.floor(Math.random() * paintings.length);
    let sim = 30;
    let energy = playingRef.current ? 1 : 0.35;
    let shown = 0; // seconds the current painting has been on screen
    let fade = -1; // seconds into a dissolve, or -1
    let raf = 0;
    let timer = 0;
    let last = 0;

    const announce = () => setLabel(`Background painting: ${paintings[current].title}. ${paintings[current].alt}`);

    const draw = (still: boolean) => {
      const f: Frame = { t: sim, still };
      paintings[current].render(from, f);
      const lutA = luts[current];
      if (fade < 0) {
        for (let i = 0; i < out.length; i++) out[i] = lutA[from.buf[i]];
      } else {
        const next = (current + 1) % paintings.length;
        paintings[next].render(to, f);
        const lutB = luts[next];
        const p = fade / FADE;
        for (let i = 0; i < out.length; i++) out[i] = noise[i] < p ? lutB[to.buf[i]] : lutA[from.buf[i]];
      }
      ctx.putImageData(image, 0, 0);
    };

    const frame = (ms: number) => {
      raf = requestAnimationFrame(frame);
      if (ms - last < 1000 / FPS) return;
      const dt = last ? Math.min((ms - last) / 1000, 0.25) : 0;
      last = ms;
      energy += ((playingRef.current ? 1 : 0.35) - energy) * 0.03;
      sim += dt * energy;
      if (fade >= 0) {
        fade += dt;
        if (fade >= FADE) {
          fade = -1;
          current = (current + 1) % paintings.length;
          shown = 0;
          announce();
        }
      } else if ((shown += dt) >= paintingSeconds) {
        fade = 0;
      }
      draw(false);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      raf = 0;
      timer = 0;
    };

    const start = () => {
      stop();
      fade = -1;
      if (reduce.matches) {
        draw(true);
        timer = window.setInterval(() => {
          current = (current + 1) % paintings.length;
          announce();
          draw(true);
        }, paintingSeconds * 1000);
      } else if (!document.hidden) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };

    const onVisibility = () => (document.hidden ? stop() : start());

    announce();
    draw(reduce.matches);
    start();
    document.addEventListener("visibilitychange", onVisibility);
    reduce.addEventListener("change", start);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      reduce.removeEventListener("change", start);
    };
  }, [paintingSeconds]);

  return <canvas ref={canvasRef} className="scene" role="img" aria-label={label} />;
}
