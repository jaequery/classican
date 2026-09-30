// Five original pixel paintings in the manner of early-twentieth-century
// Cubism: split faces, profile noses, tilted tables and fractured planes.
// Each one is composed from code, drawn at 160×100 and scaled up by the page.

import { clipConvex, ellipse, place, rect, Raster, seeded, type Pt } from "./raster";

export const ART_W = 160;
export const ART_H = 100;

export type Frame = {
  /** Scene time in seconds; it runs slower while the music is paused. */
  t: number;
  /** Reduced motion: hold everything still. */
  still: boolean;
};

export type Painting = {
  id: string;
  title: string;
  /** Read out as the background's accessible name. */
  alt: string;
  colors: string[];
  render: (r: Raster, f: Frame) => void;
};

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

function palette<K extends string>(named: Record<K, string>) {
  const keys = Object.keys(named) as K[];
  const c = {} as Record<K, number>;
  keys.forEach((k, i) => (c[k] = i));
  return { colors: keys.map((k) => named[k]), c };
}

function hash(x: number, y: number) {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Nudge a vertex slowly around its rest position. Shared vertices move together. */
function drift(p: Pt, f: Frame, amp = 0.9): Pt {
  if (f.still) return p;
  const kx = Math.round(p[0] * 4);
  const ky = Math.round(p[1] * 4);
  const a = hash(kx, ky) * 6.283;
  const b = hash(ky, kx) * 6.283;
  return [p[0] + Math.sin(f.t * 0.31 + a) * amp, p[1] + Math.cos(f.t * 0.23 + b) * amp];
}

function wave(f: Frame, speed: number, phase = 0) {
  return f.still ? 0 : Math.sin(f.t * speed + phase);
}

type Plane = { pts: Pt[]; a: number; b: number; level: number; phase: number };

/** Split the canvas into angular planes by repeated straight cuts. */
function fracture(seed: number, pairs: [number, number][], depth: number): Plane[] {
  const rnd = seeded(seed);
  const planes: Plane[] = [];
  const split = (poly: Pt[], d: number) => {
    if (d === 0 || poly.length < 3) {
      const [a, b] = pairs[Math.floor(rnd() * pairs.length)];
      planes.push({ pts: poly, a, b, level: [0, 3, 6, 8][Math.floor(rnd() * 4)], phase: rnd() * 6.283 });
      return;
    }
    let cx = 0;
    let cy = 0;
    for (const p of poly) {
      cx += p[0];
      cy += p[1];
    }
    const o: Pt = [cx / poly.length + (rnd() - 0.5) * 16, cy / poly.length + (rnd() - 0.5) * 12];
    // Favour steep diagonals: Cubist planes rarely lie flat.
    const ang = (rnd() < 0.5 ? 0.35 : 1.2) + rnd() * 1.1 + (rnd() < 0.5 ? Math.PI / 2 : 0);
    const n: Pt = [Math.cos(ang), Math.sin(ang)];
    const a = clipConvex(poly, halfPlane(o, n));
    const b = clipConvex(poly, halfPlane(o, [-n[0], -n[1]]));
    split(a, d - 1);
    split(b, d - 1);
  };
  split(
    [
      [-8, -8],
      [ART_W + 8, -8],
      [ART_W + 8, ART_H + 8],
      [-8, ART_H + 8],
    ],
    depth,
  );
  return planes;
}

/** A huge convex square covering the side of the line through `o` that `n` points to. */
function halfPlane(o: Pt, n: Pt): Pt[] {
  const t: Pt = [-n[1], n[0]];
  const far = 1000;
  return [
    [o[0] + t[0] * far, o[1] + t[1] * far],
    [o[0] + t[0] * far + n[0] * far, o[1] + t[1] * far + n[1] * far],
    [o[0] - t[0] * far + n[0] * far, o[1] - t[1] * far + n[1] * far],
    [o[0] - t[0] * far, o[1] - t[1] * far],
  ];
}

function paintPlanes(r: Raster, planes: Plane[], f: Frame, line?: number) {
  for (const p of planes) {
    const pts = p.pts.map((q) => drift(q, f));
    // Light moves across the canvas: the dither in each plane thickens and thins.
    const level = Math.max(0, Math.min(10, p.level + Math.round(wave(f, 0.09, p.phase) * 2)));
    r.fill(pts, p.a, p.b, level);
    if (line !== undefined) r.stroke(pts, line);
  }
}

type FaceStyle = {
  skin: number;
  shade: number;
  ink: number;
  white: number;
  lips: number;
  lipsDark: number;
};

/**
 * A Cubist face: one half lit, one half in another colour, a frontal eye and a
 * profile eye at different heights, and the nose seen side-on.
 * `side` is the direction the profile faces.
 */
function face(r: Raster, f: Frame, x: number, y: number, w: number, h: number, tilt: number, side: 1 | -1, s: FaceStyle) {
  const at = (pts: Pt[]) => place(pts, x, y, tilt);
  const head = ellipse(0, 0, w / 2, h / 2, 0, Math.PI * 2, 26);
  r.fill(at(head), s.skin);
  const half = side === 1 ? ellipse(0, 0, w / 2, h / 2, -Math.PI / 2, Math.PI / 2, 13) : ellipse(0, 0, w / 2, h / 2, Math.PI / 2, Math.PI * 1.5, 13);
  r.fill(at(half), s.shade, s.skin, 4);

  // Nose in profile, jutting past the outline.
  const nose: Pt[] = [
    [side * w * 0.06, -h * 0.12],
    [side * (w * 0.5 + w * 0.14), h * 0.1],
    [side * w * 0.1, h * 0.14],
  ];
  r.fill(at(nose), s.skin);
  r.stroke(at(nose), s.ink);

  const blink = !f.still && f.t % 7.3 < 0.2;
  // Frontal eye: a full almond.
  const ex = -side * w * 0.2;
  const ey = -h * 0.06;
  if (blink) {
    const l = at([
      [ex - w * 0.13, ey],
      [ex + w * 0.13, ey],
    ]);
    r.line(l[0][0], l[0][1], l[1][0], l[1][1], s.ink);
  } else {
    const eye = ellipse(ex, ey, w * 0.14, h * 0.065, 0, Math.PI * 2, 12);
    r.fill(at(eye), s.white);
    r.stroke(at(eye), s.ink);
    const [pupil] = at([[ex + side * w * 0.02, ey]]);
    r.dot(pupil[0], pupil[1], s.ink);
    r.dot(pupil[0] + 1, pupil[1], s.ink);
  }
  // Profile eye: higher, narrower, turned.
  const px = side * w * 0.2;
  const py = -h * 0.16;
  if (blink) {
    const l = at([
      [px - w * 0.08, py],
      [px + w * 0.08, py],
    ]);
    r.line(l[0][0], l[0][1], l[1][0], l[1][1], s.ink);
  } else {
    const eye2 = place(ellipse(0, 0, w * 0.1, h * 0.05, 0, Math.PI * 2, 10), px, py, side * 0.35);
    r.fill(at(eye2), s.white);
    r.stroke(at(eye2), s.ink);
    const [pupil] = at([[px + side * w * 0.03, py]]);
    r.dot(pupil[0], pupil[1], s.ink);
  }
  // Brows.
  const brows = at([
    [ex - w * 0.16, ey - h * 0.12],
    [ex + w * 0.12, ey - h * 0.14],
    [px - w * 0.1, py - h * 0.1],
    [px + w * 0.12, py - h * 0.06],
  ]);
  r.line(brows[0][0], brows[0][1], brows[1][0], brows[1][1], s.ink);
  r.line(brows[2][0], brows[2][1], brows[3][0], brows[3][1], s.ink);

  // Lips as two small wedges.
  const mx = side * w * 0.06;
  const my = h * 0.3;
  r.fill(at([[mx - w * 0.14, my], [mx, my - h * 0.05], [mx + w * 0.14, my]]), s.lips);
  r.fill(at([[mx - w * 0.14, my], [mx + w * 0.14, my], [mx, my + h * 0.05]]), s.lipsDark);

  r.stroke(at(head), s.ink);
}

/** Two bouts, a sound hole, a neck and strings. Neck points along local −y. */
function guitar(r: Raster, x: number, y: number, angle: number, scale: number, c: { body: number; shade: number; ink: number; neck: number; string: number }) {
  const at = (pts: Pt[]) => place(pts, x, y, angle, scale);
  const lower = ellipse(0, 7, 10, 10, 0, Math.PI * 2, 22);
  const upper = ellipse(0, -8, 7.5, 7.5, 0, Math.PI * 2, 18);
  r.fill(at([[-1.8, -12], [1.8, -12], [2.2, -38], [-2.2, -38]]), c.neck);
  r.fill(at([[-3, -38], [3, -38], [2.4, -44], [-2.4, -44]]), c.ink);
  r.fill(at(lower), c.body);
  r.fill(at(upper), c.body);
  r.fill(at(ellipse(0, 7, 10, 10, -Math.PI / 2, Math.PI / 2, 11)), c.shade, c.body, 6);
  r.stroke(at(lower), c.ink);
  r.stroke(at(upper), c.ink);
  r.fill(at(ellipse(0, 0, 3.4, 3.4, 0, Math.PI * 2, 12)), c.ink);
  for (const sx of [-1, 0, 1]) {
    const s = at([
      [sx, 13],
      [sx * 0.8, -38],
    ]);
    r.line(s[0][0], s[0][1], s[1][0], s[1][1], c.string);
  }
  const bridge = at(rect(-3.5, 12, 7, 1.6));
  r.fill(bridge, c.ink);
}

// ---------------------------------------------------------------------------
// 1. The Blue Guitarist
// ---------------------------------------------------------------------------

const blue = palette({
  ink: "#0b1026",
  navy: "#16244d",
  blue: "#23407a",
  cerulean: "#3a6aa8",
  pale: "#8fb3d9",
  mist: "#c9dbea",
  skin: "#a9bfd6",
  shade: "#5f7fa8",
  ochre: "#c79a4a",
  ochreDark: "#8a6428",
});

const bluePlanes = fracture(
  11,
  [
    [blue.c.navy, blue.c.blue],
    [blue.c.blue, blue.c.cerulean],
    [blue.c.navy, blue.c.ink],
    [blue.c.cerulean, blue.c.pale],
    [blue.c.blue, blue.c.navy],
  ],
  5,
);

function renderBlue(r: Raster, f: Frame) {
  const { c } = blue;
  r.clear(c.navy);
  paintPlanes(r, bluePlanes, f);

  const sway = wave(f, 0.18) * 0.8;
  const X = 80 + sway;
  // Cloak and shoulders.
  const cloak: Pt[] = [
    [X - 18, 40],
    [X + 16, 38],
    [X + 34, 104],
    [X - 36, 104],
  ];
  r.fill(cloak, c.blue, c.navy, 6);
  r.fill(
    [
      [X, 39],
      [X + 16, 38],
      [X + 34, 104],
      [X + 4, 104],
    ],
    c.navy,
    c.ink,
    3,
  );
  r.stroke(cloak, c.ink);
  // Neck.
  r.fill(
    [
      [X - 4, 31],
      [X + 4, 31],
      [X + 5, 40],
      [X - 5, 40],
    ],
    c.shade,
  );
  // Bowed head with a dark cap of hair.
  face(r, f, X, 22 + wave(f, 0.15, 1) * 0.5, 20, 26, -0.28, 1, {
    skin: c.skin,
    shade: c.shade,
    ink: c.ink,
    white: c.mist,
    lips: c.shade,
    lipsDark: c.navy,
  });
  const hair = place(ellipse(0, -4, 11, 10, Math.PI, Math.PI * 2, 12), X, 22, -0.28);
  r.fill(hair, c.ink, c.navy, 4);

  // Guitar across the body, held low.
  guitar(r, X + 8, 70, 0.95, 1.15, { body: c.ochre, shade: c.ochreDark, ink: c.ink, neck: c.ochreDark, string: c.mist });

  // Arms: one strumming, one reaching up the neck.
  const strum: Pt[] = [
    [X - 16, 44],
    [X - 8, 42],
    [X + 6, 74],
    [X - 1, 78],
  ];
  r.fill(strum, c.cerulean, c.blue, 5);
  r.stroke(strum, c.ink);
  r.fill(place(ellipse(0, 0, 4, 3, 0, Math.PI * 2, 10), X + 3, 76, 0.4), c.skin);
  const reach: Pt[] = [
    [X + 12, 42],
    [X + 18, 44],
    [X + 36, 50],
    [X + 34, 55],
  ];
  r.fill(reach, c.cerulean, c.blue, 5);
  r.stroke(reach, c.ink);
  r.fill(place(ellipse(0, 0, 3.5, 3, 0, Math.PI * 2, 10), X + 37, 51, 0.9), c.skin);
}

// ---------------------------------------------------------------------------
// 2. Harlequin in Rose
// ---------------------------------------------------------------------------

const rose = palette({
  ink: "#2a1a1f",
  rose: "#d98b8b",
  blush: "#eab8a8",
  terracotta: "#b5563f",
  ochre: "#d9a45b",
  cream: "#f2e2c9",
  grey: "#8c7f86",
  red: "#c24d4d",
  teal: "#3f6d6a",
  skin: "#efc9ae",
  shade: "#c98f77",
});

const rosePlanes = fracture(
  23,
  [
    [rose.c.rose, rose.c.blush],
    [rose.c.blush, rose.c.cream],
    [rose.c.terracotta, rose.c.rose],
    [rose.c.ochre, rose.c.blush],
    [rose.c.grey, rose.c.rose],
  ],
  5,
);

function renderRose(r: Raster, f: Frame) {
  const { c } = rose;
  r.clear(c.rose);
  paintPlanes(r, rosePlanes, f);

  const X = 80 + wave(f, 0.16) * 0.8;
  const torso: Pt[] = [
    [X - 20, 44],
    [X + 20, 44],
    [X + 28, 104],
    [X - 28, 104],
  ];
  r.fill(torso, c.red);
  // The harlequin's diamonds, clipped to the costume.
  for (let gy = 0; gy < 6; gy++) {
    for (let gx = -4; gx <= 4; gx++) {
      const cx = X + gx * 10 + (gy % 2) * 5;
      const cy = 46 + gy * 11;
      const d = clipConvex(
        [
          [cx, cy - 6],
          [cx + 5, cy],
          [cx, cy + 6],
          [cx - 5, cy],
        ],
        torso,
      );
      if (d.length > 2) r.fill(d, (gx + gy) % 2 ? c.teal : c.cream, c.ochre, (gx + gy) % 3 === 0 ? 3 : 0);
    }
  }
  r.stroke(torso, c.ink);

  r.fill(
    [
      [X - 3, 36],
      [X + 4, 36],
      [X + 4, 45],
      [X - 3, 45],
    ],
    c.shade,
  );
  // Ruff collar: a zigzag of points.
  const ruff: Pt[] = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI * (i / 12);
    const rr = i % 2 ? 15 : 20;
    ruff.push([X - Math.cos(a) * rr, 43 + Math.sin(a) * rr * 0.4]);
  }
  r.fill(ruff, c.cream);
  r.stroke(ruff, c.ink);

  face(r, f, X, 27, 18, 24, 0.12, -1, {
    skin: c.skin,
    shade: c.shade,
    ink: c.ink,
    white: c.cream,
    lips: c.terracotta,
    lipsDark: c.red,
  });

  // Bicorne hat with a pompom.
  const hat: Pt[] = place(
    [
      [-19, 0],
      [0, -11],
      [19, 0],
      [0, -3],
    ],
    X,
    17,
    0.12,
  );
  r.fill(hat, c.ink, c.grey, 2);
  r.stroke(hat, c.ink);
  r.fill(ellipse(X + 1, 5, 2.5, 2.5, 0, Math.PI * 2, 10), c.cream);

  // A small drum held at the hip.
  const drum = ellipse(X + 30, 76, 9, 9, 0, Math.PI * 2, 20);
  r.fill(drum, c.ochre, c.cream, 4);
  r.stroke(drum, c.ink);
  r.stroke(ellipse(X + 30, 76, 6, 6, 0, Math.PI * 2, 16), c.terracotta);
}

// ---------------------------------------------------------------------------
// 3. Still Life with Mandolin
// ---------------------------------------------------------------------------

const still = palette({
  ink: "#231c14",
  umber: "#4a3a28",
  brown: "#6e5438",
  ochre: "#a8834f",
  sand: "#cdb58a",
  grey: "#7d7a70",
  greyLight: "#aaa596",
  paper: "#e6dcc2",
  green: "#5b6b4a",
  fruit: "#b0643a",
});

const stillPlanes = fracture(
  37,
  [
    [still.c.umber, still.c.brown],
    [still.c.brown, still.c.ochre],
    [still.c.grey, still.c.greyLight],
    [still.c.ochre, still.c.sand],
    [still.c.umber, still.c.grey],
  ],
  6,
);

function renderStill(r: Raster, f: Frame) {
  const { c } = still;
  r.clear(c.brown);
  paintPlanes(r, stillPlanes, f, c.umber);

  // A table seen from above and from the side at once.
  const table: Pt[] = [
    [14, 60],
    [146, 54],
    [156, 104],
    [4, 104],
  ];
  r.fill(table, c.brown, c.ochre, 4);
  r.stroke(table, c.ink);
  r.fill(
    [
      [14, 60],
      [146, 54],
      [147, 58],
      [15, 64],
    ],
    c.sand,
  );

  // Sheet music: one stave and a short phrase.
  const lift = wave(f, 0.4) * 0.6;
  const sheet = place(rect(-18, -12, 36, 24), 50, 60 + lift, -0.14);
  r.fill(sheet, c.paper);
  r.stroke(sheet, c.ink);
  for (let i = 0; i < 5; i++) {
    const l = place(
      [
        [-15, -6 + i * 2.6],
        [15, -6 + i * 2.6],
      ],
      50,
      60 + lift,
      -0.14,
    );
    r.line(l[0][0], l[0][1], l[1][0], l[1][1], c.grey);
  }
  const notes = [-10, -4, 2, 8, 13];
  const pitch = [2, 0, 3, 1, 4];
  notes.forEach((nx, i) => {
    const [head, stem] = place(
      [
        [nx, -6 + pitch[i] * 2.6],
        [nx + 1, -6 + pitch[i] * 2.6 - 6],
      ],
      50,
      60 + lift,
      -0.14,
    );
    r.fill(ellipse(head[0], head[1], 1.4, 1, 0, Math.PI * 2, 8), c.ink);
    r.line(head[0] + 1, head[1], stem[0], stem[1], c.ink);
  });

  // Mandolin: a teardrop body split into lit and shadowed halves.
  const M: Pt = [96, 64];
  const ang = -0.55;
  const at = (pts: Pt[]) => place(pts, M[0], M[1], ang);
  r.fill(at([[-1.6, -8], [1.6, -8], [1.8, -34], [-1.8, -34]]), c.umber);
  r.fill(at([[-2.8, -34], [2.8, -34], [2, -40], [-2, -40]]), c.ink);
  const body = ellipse(0, 2, 11, 14, 0, Math.PI * 2, 24);
  r.fill(at(body), c.ochre, c.sand, 5);
  r.fill(at(ellipse(0, 2, 11, 14, Math.PI / 2, Math.PI * 1.5, 12)), c.umber, c.brown, 6);
  r.stroke(at(body), c.ink);
  r.fill(at(ellipse(0, -2, 3.2, 3.2, 0, Math.PI * 2, 12)), c.ink);
  for (const sx of [-0.8, 0.8]) {
    const s = at([
      [sx, 12],
      [sx, -38],
    ]);
    r.line(s[0][0], s[0][1], s[1][0], s[1][1], c.paper);
  }

  // Bottle, seen as two overlapping flat shapes.
  const bottle: Pt[] = [
    [120, 26],
    [132, 26],
    [132, 56],
    [120, 56],
  ];
  r.fill(bottle, c.green, c.umber, 4);
  r.fill(rect(124, 14, 4, 12), c.green);
  r.fill(rect(126, 26, 6, 30), c.umber, c.green, 8);
  r.stroke(bottle, c.ink);
  r.line(122, 30, 122, 50, c.greyLight);

  // Fruit bowl.
  for (const [fx, fy, rr] of [
    [132, 66, 4.5],
    [140, 67, 4],
    [136, 62, 3.5],
  ] as const) {
    r.fill(ellipse(fx, fy, rr, rr, 0, Math.PI * 2, 12), c.fruit, c.ochre, 3);
    r.stroke(ellipse(fx, fy, rr, rr, 0, Math.PI * 2, 12), c.ink);
  }
  const bowl = ellipse(136, 68, 12, 7, 0, Math.PI, 14);
  r.fill(bowl, c.greyLight, c.grey, 6);
  r.stroke(bowl, c.ink);
}

// ---------------------------------------------------------------------------
// 4. Woman in a Red Hat
// ---------------------------------------------------------------------------

const hat = palette({
  ink: "#141414",
  yellow: "#f2c53d",
  violet: "#6b4ba1",
  green: "#3f9a5a",
  red: "#d8453b",
  blue: "#3a6fc4",
  pink: "#f0a6b4",
  skin: "#f3d7b6",
  mint: "#9fc7a8",
  white: "#f5f1e6",
  orange: "#e98a3a",
});

const hatPlanes = fracture(
  51,
  [
    [hat.c.violet, hat.c.blue],
    [hat.c.green, hat.c.yellow],
    [hat.c.yellow, hat.c.orange],
    [hat.c.blue, hat.c.violet],
    [hat.c.pink, hat.c.white],
  ],
  4,
);

function renderHat(r: Raster, f: Frame) {
  const { c } = hat;
  r.clear(c.violet);
  paintPlanes(r, hatPlanes, f);

  const X = 80 + wave(f, 0.14) * 0.7;
  // Armchair back: bold stripes behind the sitter.
  const chair: Pt[] = [
    [X - 34, 30],
    [X + 34, 30],
    [X + 40, 104],
    [X - 40, 104],
  ];
  r.fill(chair, c.green);
  for (let i = -3; i <= 3; i++) {
    const s = clipConvex(
      [
        [X + i * 10 - 2, 20],
        [X + i * 10 + 2, 20],
        [X + i * 12 + 3, 110],
        [X + i * 12 - 3, 110],
      ],
      chair,
    );
    if (s.length > 2) r.fill(s, c.yellow);
  }
  r.stroke(chair, c.ink);

  // Dress in stripes.
  const dress: Pt[] = [
    [X - 18, 58],
    [X + 18, 58],
    [X + 28, 104],
    [X - 28, 104],
  ];
  r.fill(dress, c.blue);
  for (let i = 0; i < 6; i++) {
    const s = clipConvex(rect(X - 40, 60 + i * 8, 80, 3), dress);
    if (s.length > 2) r.fill(s, c.white);
  }
  r.stroke(dress, c.ink);
  r.fill(
    [
      [X - 5, 52],
      [X + 5, 52],
      [X + 6, 60],
      [X - 6, 60],
    ],
    c.mint,
  );
  // Necklace.
  for (let i = -4; i <= 4; i++) r.dot(X + i * 2, 60 + Math.abs(i) * 0.4, i % 2 ? c.red : c.white);

  face(r, f, X, 36, 28, 34, 0.08, 1, {
    skin: c.skin,
    shade: c.mint,
    ink: c.ink,
    white: c.white,
    lips: c.red,
    lipsDark: c.ink,
  });
  // Hair falling to one side.
  const hair: Pt[] = place(
    [
      [-15, -10],
      [-8, -16],
      [-16, 12],
      [-20, 16],
    ],
    X,
    36,
    0.08,
  );
  r.fill(hair, c.orange, c.yellow, 4);
  r.stroke(hair, c.ink);

  // Red hat with a green feather that nods gently.
  const brim = place(ellipse(0, 0, 21, 5, 0, Math.PI * 2, 20), X - 2, 20, 0.12);
  const crown = place(
    [
      [-12, 0],
      [-9, -12],
      [9, -12],
      [12, 0],
    ],
    X - 2,
    19,
    0.12,
  );
  r.fill(crown, c.red, c.orange, 2);
  r.stroke(crown, c.ink);
  r.fill(brim, c.red);
  r.stroke(brim, c.ink);
  const nod = wave(f, 0.5) * 0.08;
  const feather = place(
    [
      [0, 0],
      [8, -10],
      [20, -14],
      [12, -6],
    ],
    X + 6,
    10,
    nod,
  );
  r.fill(feather, c.green, c.mint, 4);
  r.stroke(feather, c.ink);
}

// ---------------------------------------------------------------------------
// 5. Nocturne with Violin
// ---------------------------------------------------------------------------

const noct = palette({
  ink: "#0f1418",
  teal: "#1f4a4f",
  pine: "#2d6a5e",
  indigo: "#27305c",
  night: "#171d3a",
  moon: "#efe6c4",
  amber: "#d9953b",
  wood: "#a2562b",
  woodLight: "#c87b3f",
  paper: "#ddd6bd",
  grey: "#5a6470",
});

const noctPlanes = fracture(
  67,
  [
    [noct.c.night, noct.c.indigo],
    [noct.c.indigo, noct.c.teal],
    [noct.c.teal, noct.c.pine],
    [noct.c.night, noct.c.ink],
    [noct.c.pine, noct.c.grey],
  ],
  5,
);

const stars = (() => {
  const rnd = seeded(5);
  return Array.from({ length: 14 }, () => ({ x: 22 + rnd() * 36, y: 14 + rnd() * 30, p: rnd() * 6.283 }));
})();

function renderNocturne(r: Raster, f: Frame) {
  const { c } = noct;
  r.clear(c.night);
  paintPlanes(r, noctPlanes, f);

  // Window onto the night, with the moon and a few stars.
  const win = rect(18, 10, 44, 38);
  r.fill(win, c.night, c.indigo, 3);
  for (const s of stars) {
    if (f.still || Math.sin(f.t * 0.6 + s.p) > -0.3) r.dot(s.x, s.y, c.paper);
  }
  r.fill(ellipse(48, 22, 6, 6, 0, Math.PI * 2, 18), c.moon);
  r.fill(ellipse(51, 20, 5, 5, 0, Math.PI * 2, 16), c.night, c.indigo, 3);
  r.stroke(win, c.ink);
  r.line(40, 10, 40, 48, c.ink);
  r.line(18, 29, 62, 29, c.ink);
  r.fill(rect(14, 48, 52, 3), c.grey);

  // Music stand with an open score.
  const stand = place(rect(-15, -10, 30, 20), 128, 44, 0.1);
  r.fill(stand, c.paper, c.moon, 4);
  r.stroke(stand, c.ink);
  for (let i = 0; i < 3; i++) {
    const l = place(
      [
        [-12, -6 + i * 6],
        [12, -6 + i * 6],
      ],
      128,
      44,
      0.1,
    );
    r.line(l[0][0], l[0][1], l[1][0], l[1][1], c.grey);
  }
  r.line(129, 54, 131, 100, c.ink);
  r.line(131, 100, 122, 104, c.ink);
  r.line(131, 100, 140, 104, c.ink);

  // Violin standing on end, turned slightly.
  const V: Pt = [90, 64];
  const ang = 0.2 + wave(f, 0.2) * 0.02;
  const at = (pts: Pt[]) => place(pts, V[0], V[1], ang);
  const lower = ellipse(0, 10, 10, 11, 0, Math.PI * 2, 22);
  const upper = ellipse(0, -10, 8, 8.5, 0, Math.PI * 2, 20);
  const waist = rect(-6, -6, 12, 12);
  r.fill(at(lower), c.wood);
  r.fill(at(upper), c.wood);
  r.fill(at(waist), c.wood);
  r.fill(at(ellipse(0, 10, 10, 11, -Math.PI / 2, Math.PI / 2, 11)), c.woodLight, c.amber, 4);
  r.stroke(at(lower), c.ink);
  r.stroke(at(upper), c.ink);
  r.fill(at(rect(-1.6, -38, 3.2, 38)), c.ink);
  r.fill(at(ellipse(0, -40, 2.6, 2.6, 0, Math.PI * 2, 10)), c.wood);
  r.stroke(at(ellipse(0, -40, 2.6, 2.6, 0, Math.PI * 2, 10)), c.ink);
  for (const sx of [-4, 4]) {
    const fh = at([
      [sx, -2],
      [sx - 1, 2],
      [sx + 1, 6],
      [sx, 10],
    ]);
    r.stroke(fh, c.ink, false);
  }
  for (const sx of [-0.9, 0.9]) {
    const s = at([
      [sx, 18],
      [sx * 0.7, -38],
    ]);
    r.line(s[0][0], s[0][1], s[1][0], s[1][1], c.paper);
  }
  r.fill(at(rect(-4, 6, 8, 1.4)), c.amber);

  // The bow resting across it.
  const bow = place(
    [
      [-36, 0],
      [36, 0],
    ],
    96,
    74,
    -0.5,
  );
  r.line(bow[0][0], bow[0][1], bow[1][0], bow[1][1], c.wood);
  const hair = place(
    [
      [-34, 2],
      [34, 2],
    ],
    96,
    74,
    -0.5,
  );
  r.line(hair[0][0], hair[0][1], hair[1][0], hair[1][1], c.paper);
}

export const paintings: Painting[] = [
  {
    id: "blue-guitarist",
    title: "The Blue Guitarist",
    alt: "A pixelated Cubist painting in blues: a bowed musician in a cloak plays an ochre guitar.",
    colors: blue.colors,
    render: renderBlue,
  },
  {
    id: "harlequin",
    title: "Harlequin in Rose",
    alt: "A pixelated Cubist painting in pinks and terracotta: a harlequin in a diamond costume and bicorne hat holds a small drum.",
    colors: rose.colors,
    render: renderRose,
  },
  {
    id: "still-life",
    title: "Still Life with Mandolin",
    alt: "A pixelated Cubist still life in browns and ochres: a mandolin, sheet music, a green bottle and a bowl of fruit on a tilted table.",
    colors: still.colors,
    render: renderStill,
  },
  {
    id: "red-hat",
    title: "Woman in a Red Hat",
    alt: "A pixelated Cubist portrait in vivid colours: a woman shown in front view and profile at once, wearing a red hat with a green feather.",
    colors: hat.colors,
    render: renderHat,
  },
  {
    id: "nocturne",
    title: "Nocturne with Violin",
    alt: "A pixelated Cubist night scene in deep greens and blues: a violin and bow before a moonlit window and a music stand.",
    colors: noct.colors,
    render: renderNocturne,
  },
];
