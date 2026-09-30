// A tiny indexed-colour rasterizer. Paintings are drawn into a low-resolution
// buffer of palette indices, so every edge lands on a whole pixel and the page
// scales the result up with `image-rendering: pixelated`.

export type Pt = [number, number];

// 4×4 ordered dither: a plane with `level` n shows its second colour on n of 16 pixels.
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export class Raster {
  readonly w: number;
  readonly h: number;
  readonly buf: Uint8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h);
  }

  clear(c: number) {
    this.buf.fill(c);
  }

  dot(x: number, y: number, c: number) {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.buf[y * this.w + x] = c;
  }

  /** Even-odd scanline fill, sampling pixel centres. */
  fill(pts: Pt[], a: number, b = a, level = 0) {
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of pts) {
      if (p[1] < minY) minY = p[1];
      if (p[1] > maxY) maxY = p[1];
    }
    const y0 = Math.max(0, Math.floor(minY));
    const y1 = Math.min(this.h - 1, Math.ceil(maxY));
    const xs: number[] = [];
    for (let y = y0; y <= y1; y++) {
      const sy = y + 0.5;
      xs.length = 0;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i];
        const [xj, yj] = pts[j];
        if (yi > sy !== yj > sy) xs.push(xi + ((sy - yi) / (yj - yi)) * (xj - xi));
      }
      xs.sort((m, n) => m - n);
      const row = y * this.w;
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const xa = Math.max(0, Math.ceil(xs[k] - 0.5));
        const xb = Math.min(this.w - 1, Math.ceil(xs[k + 1] - 0.5) - 1);
        for (let x = xa; x <= xb; x++) {
          this.buf[row + x] = level > 0 && BAYER[(y & 3) * 4 + (x & 3)] < level ? b : a;
        }
      }
    }
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number) {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.dot(x0, y0, c);
      if (x0 === x1 && y0 === y1) return;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  stroke(pts: Pt[], c: number, closed = true) {
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const q = pts[(i + 1) % pts.length];
      this.line(p[0], p[1], q[0], q[1], c);
    }
  }
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, from = 0, to = Math.PI * 2, n = 28): Pt[] {
  const pts: Pt[] = [];
  const full = Math.abs(to - from - Math.PI * 2) < 1e-6;
  const steps = full ? n : n + 1;
  for (let i = 0; i < steps; i++) {
    const a = from + ((to - from) * i) / n;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
}

export function rect(x: number, y: number, w: number, h: number): Pt[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

/** Rotate by `angle` about the origin, then move to (x, y). */
export function place(pts: Pt[], x: number, y: number, angle = 0, scale = 1): Pt[] {
  const c = Math.cos(angle) * scale;
  const s = Math.sin(angle) * scale;
  return pts.map(([px, py]) => [x + px * c - py * s, y + px * s + py * c]);
}

/** Seeded PRNG (mulberry32), so each painting composes the same way every visit. */
export function seeded(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Keep the side of a convex polygon where (p - o)·n >= 0 (Sutherland–Hodgman, one edge). */
export function clipHalf(poly: Pt[], o: Pt, n: Pt): Pt[] {
  const side = (p: Pt) => (p[0] - o[0]) * n[0] + (p[1] - o[1]) * n[1];
  const out: Pt[] = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(p);
    const sq = side(q);
    if (sp >= 0) out.push(p);
    if (sp >= 0 !== sq >= 0) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/** Clip any convex polygon to the inside of a convex `clipper`. */
export function clipConvex(poly: Pt[], clipper: Pt[]): Pt[] {
  let area = 0;
  for (let i = 0, j = clipper.length - 1; i < clipper.length; j = i++) {
    area += (clipper[j][0] - clipper[i][0]) * (clipper[j][1] + clipper[i][1]);
  }
  const sign = area > 0 ? 1 : -1;
  let out = poly;
  for (let i = 0; i < clipper.length && out.length; i++) {
    const a = clipper[i];
    const b = clipper[(i + 1) % clipper.length];
    out = clipHalf(out, a, [-(b[1] - a[1]) * sign, (b[0] - a[0]) * sign]);
  }
  return out;
}
