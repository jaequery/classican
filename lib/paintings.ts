// One original pixel painting per piece, each showing what the piece is about:
// the Greek dancers behind Satie's title, the moonlit park of Verlaine's poem,
// Bach's two-keyboard harpsichord, the columns of Knossos, Chopin's piano at night.
// Each one is composed from code in a loose Cubist manner, drawn at 160×100
// and scaled up by the page.

import { clipHalf, ellipse, rect, Raster, seeded, type Pt } from "./raster";

export const ART_W = 160;
export const ART_H = 100;

export type Frame = {
  /** Scene time in seconds; it runs slower while the music is paused. */
  t: number;
  /** Reduced motion: hold everything still. */
  still: boolean;
};

/** A circle in art pixels, [x, y, radius]: where a fact's light falls. */
export type Spot = [number, number, number];

export type PaintingId = "gymnopedie" | "clair-de-lune" | "goldberg" | "gnossienne" | "nocturne";

export type Painting = {
  id: PaintingId;
  /** Read out as the background's accessible name. */
  alt: string;
  colors: string[];
  /** Things in the picture a fact can point at, by name. */
  motifs: Record<string, Spot>;
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

/** Split a box (the whole canvas by default) into angular planes by repeated straight cuts. */
function fracture(seed: number, pairs: [number, number][], depth: number, box = [-8, -8, ART_W + 8, ART_H + 8]): Plane[] {
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
    split(clipHalf(poly, o, n), d - 1);
    split(clipHalf(poly, o, [-n[0], -n[1]]), d - 1);
  };
  split(rect(box[0], box[1], box[2] - box[0], box[3] - box[1]), depth);
  return planes;
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

/** Clip a convex polygon to an axis-aligned box. */
function clipBox(poly: Pt[], x0: number, y0: number, x1: number, y1: number) {
  poly = clipHalf(poly, [x0, 0], [1, 0]);
  poly = clipHalf(poly, [x1, 0], [-1, 0]);
  poly = clipHalf(poly, [0, y0], [0, 1]);
  return clipHalf(poly, [0, y1], [0, -1]);
}

/** A two-pixel-wide line. */
function thick(r: Raster, x0: number, y0: number, x1: number, y1: number, c: number) {
  r.line(x0, y0, x1, y1, c);
  r.line(x0 + 1, y0, x1 + 1, y1, c);
}

// ---------------------------------------------------------------------------
// 1. Gymnopédie No. 1: black-figure dancers round a vase frieze, Satie beside it
// ---------------------------------------------------------------------------

const gym = palette({
  d0: "#1a120e",
  d1: "#33211a",
  terra: "#c66a3b",
  terraL: "#dc8a56",
  ochre: "#a4532c",
  blk: "#17110e",
  cream: "#e8d4ad",
  skin: "#d6ae88",
  shade: "#97684a",
});
const gymBack = fracture(11, [[gym.c.d0, gym.c.d1], [gym.c.d1, gym.c.d0], [gym.c.d1, gym.c.ochre]], 4);
const gymBand = fracture(7, [[gym.c.terra, gym.c.terraL], [gym.c.terraL, gym.c.terra], [gym.c.terra, gym.c.ochre]], 4, [0, 30, 117, 72]);
const gymSide = fracture(23, [[gym.c.d0, gym.c.d1], [gym.c.d1, gym.c.d0]], 3, [118, -8, 168, 108]);

function dancer(r: Raster, f: Frame, x: number, y: number, phase: number) {
  const { c } = gym;
  const sw = wave(f, 0.5, phase) * 1.5;
  r.fill(ellipse(x, y + 4, 3, 3.3, 0, Math.PI * 2, 14), c.blk);
  r.fill([[x + 2, y + 3], [x + 5, y + 5], [x + 2, y + 6]], c.blk);
  r.dot(x + 1, y + 3, c.cream);
  r.fill([[x - 3, y + 8], [x + 3, y + 8], [x + 2, y + 17], [x - 2, y + 17]], c.blk);
  r.fill([[x - 2, y + 15], [x + 3, y + 15], [x + 7, y + 23], [x - 5, y + 23]], c.blk);
  thick(r, x + 1, y + 9, x + 8, y + 3 + sw, c.blk);
  thick(r, x - 2, y + 9, x - 8, y + 13 - sw, c.blk);
  thick(r, x - 2, y + 22, x - 6 - sw, y + 32, c.blk);
  thick(r, x + 1, y + 22, x + 6 + sw, y + 32, c.blk);
}

function renderGymnopedie(r: Raster, f: Frame) {
  const { c } = gym;
  paintPlanes(r, gymBack, f);
  paintPlanes(r, gymBand, f);

  // Greek-key border above, a dotted rule below.
  r.fill(rect(0, 17, 118, 11), c.cream);
  for (let x = 1; x < 116; x += 10) {
    r.stroke([[x, 26], [x, 19], [x + 7, 19], [x + 7, 24], [x + 3, 24], [x + 3, 22]], c.blk, false);
  }
  r.fill(rect(0, 28, 118, 2), c.blk);
  r.fill(rect(0, 72, 118, 3), c.blk);
  for (let x = 2; x < 116; x += 5) r.dot(x, 76, c.cream);

  // The dancers process slowly round the vase.
  const shift = f.still ? 0 : (f.t * 0.6) % 36;
  for (let i = -1; i < 4; i++) {
    const x = 8 + i * 36 + shift;
    if (x > -8 && x < 112) dancer(r, f, x, 36, i * 1.7);
  }

  // Side panel: Satie in his bowler hat and pince-nez.
  paintPlanes(r, gymSide, f);
  r.fill(rect(117, 0, 1, ART_H), c.blk);
  r.fill([[124, 82], [128, 64], [152, 64], [158, 82]], c.blk);
  r.fill([[136, 64], [144, 64], [140, 72]], c.cream);
  r.fill(ellipse(140, 53, 9, 11, 0, Math.PI * 2, 22), c.skin);
  r.fill(ellipse(140, 53, 9, 11, -Math.PI / 2, Math.PI / 2, 11), c.shade, c.skin, 4);
  r.fill([[133, 59], [147, 59], [143, 67], [137, 67]], c.blk);
  r.fill(ellipse(140, 43, 8, 7, Math.PI, Math.PI * 2, 12), c.blk);
  r.fill(rect(129, 42, 22, 2), c.blk);
  r.stroke(ellipse(136, 51, 2, 2, 0, Math.PI * 2, 8), c.blk);
  r.stroke(ellipse(144, 51, 2, 2, 0, Math.PI * 2, 8), c.blk);
  r.dot(140, 51, c.blk);
}

// ---------------------------------------------------------------------------
// 2. Clair de lune: a moonlit park, a fountain and masked figures (Verlaine's poem)
// ---------------------------------------------------------------------------

const lune = palette({
  n0: "#0c1430",
  n1: "#19244f",
  n2: "#2b3c72",
  moon: "#efe6b8",
  moonShade: "#c4bb8a",
  tree: "#10221b",
  tree2: "#1d3829",
  stone: "#8f95aa",
  stoneDark: "#545b78",
  water: "#a3c6e2",
  mask: "#f4f1ea",
  robe: "#7a3352",
  robe2: "#3d6283",
  skin: "#d6c4ae",
  ink: "#0a0d18",
});
const luneSky = fracture(31, [[lune.c.n0, lune.c.n1], [lune.c.n1, lune.c.n2], [lune.c.n1, lune.c.n0]], 4);
const moonbeam = {
  [lune.c.n0]: lune.c.n1,
  [lune.c.n1]: lune.c.n2,
  [lune.c.tree]: lune.c.tree2,
  [lune.c.tree2]: lune.c.stoneDark,
};

function masker(r: Raster, x: number, robe: number, alt: number, dir: 1 | -1) {
  const { c } = lune;
  r.fill([[x - 2, 51], [x + 2, 51], [x + 7, 78], [x - 7, 78]], robe, alt, 8);
  r.fill(ellipse(x, 47, 3, 3.5, 0, Math.PI * 2, 12), c.skin);
  r.fill([[x - 3, 43], [x + 3, 43], [x + dir, 35]], c.mask);
  r.fill(rect(x - 3, 46, 7, 2), c.mask);
  r.dot(x - 1, 46, c.ink);
  r.dot(x + 2, 46, c.ink);
  r.line(x + dir * 2, 54, x + dir * 8, 60, robe);
}

function renderClairDeLune(r: Raster, f: Frame) {
  const { c } = lune;
  paintPlanes(r, luneSky, f);
  r.tint([[116, 30], [132, 30], [112, 100], [30, 100]], moonbeam, 4);

  // Lawn and trees.
  r.fill(
    ([[0, 68], [60, 64], [160, 70], [160, 100], [0, 100]] as Pt[]).map((p) => drift(p, f, 0.5)),
    c.tree2,
    c.tree,
    6,
  );
  r.fill([[0, 8], [22, 30], [15, 40], [28, 64], [0, 70]], c.tree, c.tree2, 3);
  r.fill([[6, 30], [32, 68], [0, 68]], c.tree2, c.tree, 6);
  r.fill([[160, 28], [141, 44], [150, 52], [136, 70], [160, 72]], c.tree, c.tree2, 3);

  r.fill(ellipse(124, 21, 10, 10, 0, Math.PI * 2, 26), c.moon);
  r.fill(ellipse(124, 21, 10, 10, -Math.PI / 2, Math.PI / 2, 13), c.moonShade, c.moon, 5);

  // The fountain, its jets arcing over and falling.
  r.fill([[54, 71], [80, 71], [76, 77], [58, 77]], c.stone, c.stoneDark, 6);
  r.fill(rect(55, 70, 24, 1), c.water);
  r.fill([[64, 54], [68, 54], [69, 71], [63, 71]], c.stone);
  r.fill([[56, 50], [76, 50], [72, 54], [60, 54]], c.stone, c.stoneDark, 3);
  r.line(66, 40, 66, 50, c.water);
  for (let k = 0; k < 6; k++) {
    const p = f.still ? k / 6 : (f.t * 0.45 + k / 6) % 1;
    const y = 41 - 4 * p + 13 * p * p;
    r.dot(66 - p * 10, y, c.water);
    r.dot(66 + p * 10, y, c.water);
  }

  masker(r, 43, c.robe, c.robe2, 1);
  masker(r, 90, c.robe2, c.robe, -1);
}

// ---------------------------------------------------------------------------
// 3. Goldberg Variations: a two-keyboard harpsichord by candlelight
// ---------------------------------------------------------------------------

const gold = palette({
  k0: "#0d0907",
  k1: "#1e150f",
  k2: "#33241a",
  glow: "#5a3a22",
  wood: "#7a4a24",
  woodLight: "#a8703a",
  lid: "#55311a",
  ivory: "#ece2c6",
  ebony: "#140f0d",
  flame: "#ffd56a",
  flameOuter: "#ef8a2c",
  wax: "#e6d9bb",
  brass: "#c49a45",
});
const goldBack = fracture(41, [[gold.c.k0, gold.c.k1], [gold.c.k1, gold.c.k2], [gold.c.k1, gold.c.k0]], 4);
const candlelight = {
  [gold.c.k0]: gold.c.k1,
  [gold.c.k1]: gold.c.k2,
  [gold.c.k2]: gold.c.glow,
  [gold.c.lid]: gold.c.wood,
  [gold.c.wood]: gold.c.woodLight,
};

/** One keyboard: ivory naturals with the black keys grouped in twos and threes. */
function manual(r: Raster, x: number, y: number, w: number) {
  const { c } = gold;
  r.fill(rect(x, y, w, 3), c.ivory);
  for (let i = 0; i < w; i += 2) if ([1, 1, 0, 1, 1, 1, 0][(i >> 1) % 7]) r.dot(x + i + 1, y, c.ebony);
  r.fill(rect(x, y + 3, w, 1), c.ebony);
}

function renderGoldberg(r: Raster, f: Frame) {
  const { c } = gold;
  paintPlanes(r, goldBack, f);
  const flicker = wave(f, 2.3) * 0.6 + wave(f, 3.7, 1) * 0.4;

  // Case and raised lid.
  r.fill(
    ([[18, 44], [96, 40], [130, 30], [134, 34], [104, 50], [18, 50]] as Pt[]).map((p) => drift(p, f, 0.4)),
    c.lid,
    c.wood,
    4,
  );
  r.fill([[22, 44], [96, 40], [124, 8]], c.woodLight, c.wood, 6);
  r.stroke([[22, 44], [96, 40], [124, 8]], c.lid);
  r.fill(rect(18, 50, 86, 13), c.wood, c.lid, 3);
  manual(r, 26, 52, 70);
  manual(r, 24, 57, 74);
  r.fill(rect(18, 63, 86, 2), c.lid);
  for (const x of [24, 60, 98]) r.line(x, 65, x - 2, 84, c.lid);
  r.line(126, 34, 128, 70, c.lid);

  // The candle on its stand, and its light.
  r.fill(rect(134, 60, 14, 2), c.brass);
  r.line(141, 62, 141, 84, c.brass);
  r.fill(rect(139, 46, 5, 14), c.wax);
  r.tint(ellipse(141, 42, 34 + flicker, 30 + flicker, 0, Math.PI * 2, 10), candlelight, 3);
  r.tint(ellipse(141, 42, 18, 16, 0, Math.PI * 2, 9), candlelight, 6);
  r.fill([[141 + flicker * 0.6, 35], [143, 42], [141, 45], [139, 42]], c.flameOuter);
  r.fill([[141 + flicker * 0.4, 38], [142, 42], [141, 44], [140, 42]], c.flame);
}

// ---------------------------------------------------------------------------
// 4. Gnossienne No. 1: the red columns of Knossos and a stave with no bar lines
// ---------------------------------------------------------------------------

const gno = palette({
  wall: "#c79a54",
  wallDark: "#a5793b",
  stone: "#7d6a50",
  cream: "#efe2c4",
  red: "#b9322a",
  redDark: "#84211b",
  ink: "#161110",
  sky: "#3c5b75",
  skyLight: "#5f8098",
});
const gnoBack = fracture(
  53,
  [
    [gno.c.wall, gno.c.wallDark],
    [gno.c.wallDark, gno.c.stone],
    [gno.c.wall, gno.c.cream],
    [gno.c.sky, gno.c.skyLight],
  ],
  4,
);
const NOTE_PITCH = [3, 1, 2, 4, 2, 0, 3, 5, 1, 2, 4, 3];

/** A Minoan column: wider at the top than the bottom, under a black cushion capital. */
function column(r: Raster, x: number) {
  const { c } = gno;
  r.fill([[x - 6, 26], [x + 6, 26], [x + 3, 80], [x - 3, 80]], c.red);
  r.fill([[x, 26], [x + 6, 26], [x + 3, 80], [x, 80]], c.redDark, c.red, 6);
  r.fill(ellipse(x, 23, 8, 4, 0, Math.PI * 2, 16), c.ink);
  r.fill(rect(x - 8, 16, 17, 4), c.ink);
  r.fill(rect(x - 5, 80, 11, 3), c.stone);
}

function renderGnossienne(r: Raster, f: Frame) {
  const { c } = gno;
  paintPlanes(r, gnoBack, f, c.wallDark);
  r.fill(rect(0, 8, 98, 8), c.red);
  r.fill(rect(0, 10, 98, 3), c.ink, c.cream, 4);
  for (const x of [20, 48, 76]) column(r, x);
  r.fill(rect(0, 83, 98, 3), c.stone);

  // A scrap of score: five lines, a clef, notes drifting by with no bar lines.
  const sheet = ([[102, 40], [156, 37], [156, 63], [102, 66]] as Pt[]).map((p) => drift(p, f, 0.5));
  r.fill(sheet, c.cream);
  r.stroke(sheet, c.stone);
  for (let i = 0; i < 5; i++) r.line(105, 44 + i * 3, 153, 44 + i * 3, c.ink);
  r.line(107, 41, 107, 58, c.ink);
  r.line(108, 40, 109, 57, c.ink);
  const offset = f.still ? 0 : (f.t * 0.5) % 42;
  for (let n = 0; n < NOTE_PITCH.length; n++) {
    const x = Math.round(112 + ((n * 7 + 42 - offset) % 42));
    const y = 55 - NOTE_PITCH[n] * 1.5;
    r.fill(rect(x, Math.round(y), 2, 2), c.ink);
    r.line(x + 2, y, x + 2, y - 5, c.ink);
  }
}

// ---------------------------------------------------------------------------
// 5. Nocturne Op. 9 No. 2: a piano by a tall window, the moon over Paris rooftops
// ---------------------------------------------------------------------------

const noct = palette({
  d0: "#0b0a12",
  d1: "#17142a",
  d2: "#251f40",
  pane: "#24396b",
  paneLight: "#3a5590",
  moon: "#f2e9c4",
  roof: "#3c4660",
  roofDark: "#1e2338",
  piano: "#07060b",
  pianoLight: "#3a3556",
  ivory: "#e8e0cc",
  frame: "#3a3350",
  lamp: "#e9b25a",
});
const noctBack = fracture(61, [[noct.c.d0, noct.c.d1], [noct.c.d1, noct.c.d2], [noct.c.d1, noct.c.d0]], 4);
const noctSky = fracture(67, [[noct.c.pane, noct.c.paneLight], [noct.c.paneLight, noct.c.pane]], 3, [98, 6, 138, 78]);
const moonlit = { [noct.c.d0]: noct.c.d1, [noct.c.d1]: noct.c.d2, [noct.c.d2]: noct.c.frame };
const roofs: Pt[][] = [
  [[98, 60], [104, 52], [116, 52], [120, 58], [120, 80], [98, 80]],
  [[118, 64], [124, 57], [134, 57], [139, 64], [139, 80], [118, 80]],
];
const lamps: Pt[] = [[104, 64], [112, 70], [126, 68], [132, 72]];

function renderNocturne(r: Raster, f: Frame) {
  const { c } = noct;
  paintPlanes(r, noctBack, f);
  r.tint([[98, 78], [138, 78], [120, 100], [50, 100]], moonlit, 5);

  // The window: night sky, moon, rooftops with lit windows coming and going.
  r.fill(rect(95, 3, 46, 78), c.frame);
  paintPlanes(r, noctSky, f);
  r.fill(ellipse(127, 17, 5, 5, 0, Math.PI * 2, 14), c.moon);
  for (const p of roofs) r.fill(clipBox(p, 98, 6, 138, 78), c.roof, c.roofDark, 6);
  r.fill(rect(108, 47, 3, 6), c.roofDark);
  r.fill(rect(128, 52, 3, 6), c.roofDark);
  lamps.forEach(([x, y], i) => {
    if (f.still || wave(f, 0.07, i * 2) > -0.6) r.fill(rect(x, y, 2, 2), c.lamp);
  });
  r.fill(rect(117, 6, 2, 72), c.frame);
  r.fill(rect(98, 40, 40, 2), c.frame);

  // The grand piano, lid raised.
  r.fill(([[16, 50], [78, 50], [30, 26]] as Pt[]).map((p) => drift(p, f, 0.4)), c.pianoLight, c.piano, 8);
  r.line(30, 26, 78, 50, c.frame);
  r.fill([[10, 50], [72, 50], [86, 56], [86, 66], [10, 66]], c.piano, c.pianoLight, 2);
  r.line(10, 50, 72, 50, c.frame);
  r.fill(rect(6, 53, 10, 2), c.ivory);
  for (const x of [14, 50, 80]) r.fill(rect(x, 66, 2, 18), c.piano);
  r.line(44, 66, 44, 78, c.piano);
  r.fill(rect(40, 78, 9, 1), c.pianoLight);
}

// ---------------------------------------------------------------------------

export const paintings: Painting[] = [
  {
    id: "gymnopedie",
    alt: "Black-figure dancers in profile moving round a terracotta vase frieze, with a portrait of Satie in a bowler hat beside it.",
    colors: gym.colors,
    motifs: { dancers: [60, 54, 20], frieze: [30, 24, 13], composer: [140, 52, 17] },
    render: renderGymnopedie,
  },
  {
    id: "clair-de-lune",
    alt: "Moonlight over a park at night: a full moon, a fountain and two masked figures beside it.",
    colors: lune.colors,
    motifs: { moon: [124, 21, 13], fountain: [66, 58, 27] },
    render: renderClairDeLune,
  },
  {
    id: "goldberg",
    alt: "A two-keyboard harpsichord with its lid raised, lit by a single candle at night.",
    colors: gold.colors,
    motifs: { harpsichord: [72, 38, 27], keyboards: [60, 56, 13], candle: [141, 44, 13] },
    render: renderGoldberg,
  },
  {
    id: "gnossienne",
    alt: "Red, top-heavy columns with black capitals from the palace of Knossos, beside a stave of music with no bar lines.",
    colors: gno.colors,
    motifs: { columns: [48, 46, 27], stave: [128, 51, 17] },
    render: renderGnossienne,
  },
  {
    id: "nocturne",
    alt: "A grand piano in a dark room by a tall window, with the moon and Paris rooftops outside.",
    colors: noct.colors,
    motifs: { piano: [44, 54, 22], window: [118, 26, 17], rooftops: [118, 64, 14] },
    render: renderNocturne,
  },
];
