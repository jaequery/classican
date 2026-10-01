// One original pixel painting per piece, each showing what the piece is about:
// the Greek dancers behind Satie's title, the moonlit park of Verlaine's poem,
// Bach's two-keyboard harpsichord, the columns of Knossos, Chopin's piano at night,
// Casals' cello, a sleeping child, the circle of keys, a desert sunrise, a Viennese
// salon, stained glass, Lake Lucerne by moonlight, a swan, a gondola, a Warsaw desk.
// Each one is composed from code in a loose Cubist manner, drawn at 160×100
// and scaled up by the page.

import { clipConvex, clipHalf, ellipse, place, rect, Raster, seeded, type Pt } from "./raster";

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

export type PaintingId =
  | "gymnopedie"
  | "clair-de-lune"
  | "goldberg"
  | "gnossienne"
  | "nocturne"
  | "cello-prelude"
  | "traumerei"
  | "well-tempered"
  | "morning-mood"
  | "mozart-salon"
  | "air"
  | "moonlight"
  | "swan"
  | "gondola"
  | "warsaw";

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
// 6. Cello Suite No. 1 Prelude: a cello and bow, and the old score Casals found
// ---------------------------------------------------------------------------

const cel = palette({
  b0: "#140d09",
  b1: "#2a1a10",
  b2: "#3d2614",
  amber: "#b8732f",
  amberL: "#d99a4e",
  dark: "#5a3216",
  ebony: "#120c08",
  string: "#e8d9a8",
  paper: "#d8c7a0",
  paperS: "#a8946c",
  ink: "#1a120c",
});
const celBack = fracture(71, [[cel.c.b0, cel.c.b1], [cel.c.b1, cel.c.b2], [cel.c.b1, cel.c.b0]], 4);
const lamplight = { [cel.c.b0]: cel.c.b1, [cel.c.b1]: cel.c.b2, [cel.c.b2]: cel.c.dark };

function renderCello(r: Raster, f: Frame) {
  const { c } = cel;
  paintPlanes(r, celBack, f);
  r.tint(ellipse(100, 56, 44, 40, 0, Math.PI * 2, 24), lamplight, 6);

  // The score, an old printed copy, lying at a slant.
  const sheet: Pt[] = [[12, 30], [52, 24], [58, 72], [18, 78]];
  r.fill(sheet.map((p) => drift(p, f, 0.4)), c.paper, c.paperS, 3);
  for (const top of [33, 47, 61]) {
    for (let k = 0; k < 5; k++) r.line(17, top + k * 2, 52, top - 5 + k * 2, c.paperS);
    for (let x = 20; x < 50; x += 5) r.dot(x, top + 4 - (x - 17) / 7 - (((x * 7) % 5) - 2), c.ink);
  }

  // The cello: a lower and an upper bout, split into a lit plane and a shadowed one.
  r.fill(rect(98, 4, 4, 34), c.ebony);
  r.fill(ellipse(100, 5, 3, 3, 0, Math.PI * 2, 10), c.dark);
  r.fill(ellipse(100, 70, 18, 17, 0, Math.PI * 2, 26), c.amber, c.amberL, 4);
  r.fill(ellipse(100, 44, 14, 12, 0, Math.PI * 2, 22), c.amber, c.amberL, 4);
  r.fill(rect(90, 50, 20, 10), c.amber, c.amberL, 4);
  r.fill(ellipse(100, 70, 18, 17, -Math.PI / 2, Math.PI / 2, 13), c.dark, c.amber, 5);
  r.fill(ellipse(100, 44, 14, 12, -Math.PI / 2, Math.PI / 2, 11), c.dark, c.amber, 5);
  r.fill(rect(100, 50, 10, 10), c.dark, c.amber, 5);
  r.fill([[97, 38], [103, 38], [104, 64], [96, 64]], c.ebony);
  r.stroke([[91, 62], [92, 66], [91, 72]], c.ebony, false);
  r.stroke([[109, 62], [108, 66], [109, 72]], c.ebony, false);
  r.fill([[95, 76], [105, 76], [103, 84], [97, 84]], c.ebony);
  r.line(94, 66, 106, 66, c.paper);
  for (let k = 0; k < 4; k++) r.line(98.5 + k, 8, 98 + k * 1.3, 78, c.string);
  r.line(100, 87, 100, 97, c.ebony);

  // The bow draws slowly back and forth across the strings.
  const b = wave(f, 0.35) * 12;
  thick(r, 68 + b, 63, 138 + b, 56, c.ebony);
  r.line(70 + b, 61, 136 + b, 54, c.string);
}

// ---------------------------------------------------------------------------
// 7. Träumerei: a child asleep, a rocking horse, stars at the nursery window
// ---------------------------------------------------------------------------

const tra = palette({
  n0: "#0d1020",
  n1: "#1a1f3a",
  n2: "#2a2f52",
  sky: "#16264a",
  skyL: "#24396b",
  star: "#f3e7b0",
  quilt: "#7a3d5a",
  quiltL: "#a35a76",
  pillow: "#e6dcc8",
  skin: "#d9b998",
  hair: "#3b2618",
  wood: "#6b4426",
  woodL: "#8f5f34",
  mane: "#e8d8b8",
});
const traBack = fracture(73, [[tra.c.n0, tra.c.n1], [tra.c.n1, tra.c.n2], [tra.c.n1, tra.c.n0]], 4);
const traSky = fracture(79, [[tra.c.sky, tra.c.skyL], [tra.c.skyL, tra.c.sky]], 3, [100, 10, 144, 52]);
const traStars: Pt[] = [[106, 18], [114, 30], [122, 15], [138, 24], [110, 44], [134, 42], [127, 34]];
const horse: Pt[][] = [
  [[-12, -10], [8, -10], [10, -4], [-10, -4]],
  [[6, -12], [10, -22], [16, -20], [14, -16], [10, -9]],
];

function renderTraumerei(r: Raster, f: Frame) {
  const { c } = tra;
  paintPlanes(r, traBack, f);

  // The window: a crescent moon and stars that come and go.
  r.fill(rect(97, 7, 50, 48), c.wood);
  paintPlanes(r, traSky, f);
  r.fill(ellipse(131, 17, 6, 6, 0, Math.PI * 2, 16), c.star);
  r.fill(ellipse(134, 15, 5, 5, 0, Math.PI * 2, 16), c.sky, c.skyL, 6);
  traStars.forEach(([x, y], i) => {
    if (f.still || wave(f, 0.6, i * 1.9) > -0.3) r.dot(x, y, c.star);
    if (!f.still && wave(f, 0.6, i * 1.9) > 0.8) {
      r.dot(x - 1, y, c.star);
      r.dot(x + 1, y, c.star);
    }
  });
  r.fill(rect(121, 10, 2, 42), c.wood);
  r.fill(rect(100, 30, 44, 2), c.wood);

  // The bed: the child asleep under a patched quilt, breathing slowly.
  const breath = wave(f, 0.4) * 0.8;
  r.fill(rect(8, 46, 6, 40), c.wood, c.woodL, 4);
  r.fill(ellipse(26, 62, 10, 5, 0, Math.PI * 2, 16), c.pillow);
  r.fill(ellipse(27, 57, 5, 5, 0, Math.PI * 2, 14), c.skin);
  r.fill(ellipse(27, 56, 6, 5, Math.PI, Math.PI * 2, 10), c.hair);
  r.line(28, 58, 30, 58, c.hair);
  r.fill([[18, 63 - breath], [50, 58 - breath], [82, 62], [86, 80], [16, 82]], c.quilt, c.quiltL, 6);
  r.line(40, 60 - breath, 46, 81, c.quiltL);
  r.line(62, 60, 64, 81, c.quiltL);
  r.fill(rect(8, 80, 82, 4), c.wood, c.woodL, 4);
  r.fill(rect(84, 66, 6, 20), c.wood, c.woodL, 4);
  for (const x of [10, 84]) r.fill(rect(x, 84, 4, 10), c.wood);

  // The rocking horse rocks gently on its runners.
  const tilt = wave(f, 0.5) * 0.12;
  const at = (pts: Pt[]) => place(pts, 128, 82, tilt);
  for (const p of horse) r.fill(at(p), c.woodL, c.wood, 4);
  r.fill(at([[11, -21], [6, -12], [4, -13], [8, -22]]), c.mane);
  r.stroke(at([[-8, -4], [-10, 6]]), c.wood, false);
  r.stroke(at([[6, -4], [8, 6]]), c.wood, false);
  r.stroke(at(ellipse(-1, -14, 22, 20, Math.PI * 0.32, Math.PI * 0.68, 8)), c.woodL, false);
  r.dot(at([[13, -19]])[0][0], at([[13, -19]])[0][1], c.hair);
}

// ---------------------------------------------------------------------------
// 8. Prelude in C, Well-Tempered Clavier: a broken-chord wave over a keyboard,
//    and the circle of all twenty-four keys
// ---------------------------------------------------------------------------

const wtc = palette({
  k0: "#0f1418",
  k1: "#1c2630",
  k2: "#2a3846",
  wood: "#7a5230",
  woodL: "#9a6a3e",
  ivory: "#ece6d6",
  ebony: "#121212",
  gold: "#e0b252",
  goldD: "#8a6a2c",
  blue: "#6a9cc8",
  blueD: "#3a5a7a",
});
const wtcBack = fracture(83, [[wtc.c.k0, wtc.c.k1], [wtc.c.k1, wtc.c.k2], [wtc.c.k1, wtc.c.k0]], 4);
// The prelude's figure: each bar's chord climbs, then its top three notes repeat.
const FIGURE = [0, 2, 4, 6, 8, 4, 6, 8];

function renderWellTempered(r: Raster, f: Frame) {
  const { c } = wtc;
  paintPlanes(r, wtcBack, f);

  // The circle of keys: twelve major keys outside, twelve minor within, turning slowly.
  const turn = f.still ? 0 : f.t * 0.02;
  r.stroke(ellipse(126, 38, 22, 22, 0, Math.PI * 2, 36), c.goldD);
  r.stroke(ellipse(126, 38, 15, 15, 0, Math.PI * 2, 30), c.blueD);
  for (let i = 0; i < 12; i++) {
    const a = turn + (i / 12) * Math.PI * 2 - Math.PI / 2;
    r.fill(ellipse(126 + Math.cos(a) * 22, 38 + Math.sin(a) * 22, 2, 2, 0, Math.PI * 2, 8), c.gold);
    r.fill(ellipse(126 + Math.cos(a) * 15, 38 + Math.sin(a) * 15, 1.5, 1.5, 0, Math.PI * 2, 8), c.blue);
  }
  r.line(126, 38, 126 + Math.cos(turn - Math.PI / 2) * 19, 38 + Math.sin(turn - Math.PI / 2) * 19, c.ivory);

  // Two bars of the figure, one note lit at a time.
  const lit = f.still ? -1 : Math.floor(f.t * 2.5) % 16;
  for (let i = 0; i < 16; i++) {
    const x = 12 + i * 5.6;
    const y = 52 - FIGURE[i % 8] * 3 - (i >= 8 ? 3 : 0);
    if (i > 0) {
      const px = 12 + (i - 1) * 5.6;
      const py = 52 - FIGURE[(i - 1) % 8] * 3 - (i - 1 >= 8 ? 3 : 0);
      r.line(px, py, x, y, c.k2);
    }
    r.fill(ellipse(x, y, 2, 1.6, 0, Math.PI * 2, 8), i === lit ? c.gold : c.ivory);
  }

  // The keyboard.
  r.fill(rect(6, 64, 96, 18), c.wood, c.woodL, 4);
  r.fill(rect(9, 67, 90, 11), c.ivory);
  for (let x = 9; x <= 99; x += 4) r.line(x, 67, x, 77, c.k2);
  for (let k = 0; k < 22; k++) {
    if ([2, 6].includes(k % 7)) continue;
    r.fill(rect(11.5 + k * 4, 67, 2, 6), c.ebony);
  }
  if (lit >= 0) r.fill(rect(9 + (FIGURE[lit % 8] + (lit >= 8 ? 1 : 0)) * 4 + 16, 74, 4, 4), c.gold);
  for (const x of [10, 96]) r.fill(rect(x, 82, 3, 14), c.wood);
}

// ---------------------------------------------------------------------------
// 9. Morning Mood: sunrise over the desert (where Ibsen sets it), a flute
// ---------------------------------------------------------------------------

const mor = palette({
  s0: "#3a2a4a",
  s1: "#7a4a5c",
  s2: "#d9825a",
  s3: "#f2b66a",
  sun: "#ffe3a0",
  dune: "#c98a4a",
  duneL: "#e0a964",
  duneD: "#8a5530",
  palm: "#2a2220",
  palmL: "#4a3a2a",
  flute: "#d8d0c0",
  key: "#7a7060",
});
const morSky = [mor.c.s0, mor.c.s1, mor.c.s2, mor.c.s3];
const morPlanes = fracture(89, [[mor.c.dune, mor.c.duneL], [mor.c.duneL, mor.c.dune], [mor.c.dune, mor.c.duneD]], 3, [0, 62, 160, 108]);

function renderMorning(r: Raster, f: Frame) {
  const { c } = mor;
  // The sky warms in bands from violet to gold, each dithered into the next.
  for (let i = 0; i < 4; i++) r.fill(rect(0, i * 16, ART_W, 17), morSky[i], morSky[Math.min(3, i + 1)], 5);

  // The sun rising, slowly, over the dunes, its light thrown in long planes.
  const rise = f.still ? 0 : wave(f, 0.03) * 3;
  r.fill([[100, 58 + rise], [40, 0], [70, 0]], c.s3, c.sun, 4);
  r.fill([[100, 58 + rise], [130, 0], [160, 0], [160, 12]], c.s3, c.sun, 3);
  r.fill(ellipse(100, 58 + rise, 14, 14, 0, Math.PI * 2, 28), c.sun);

  paintPlanes(r, morPlanes, f);
  r.fill(([[0, 70], [40, 60], [80, 66], [120, 60], [160, 66], [160, 76], [0, 80]] as Pt[]).map((p) => drift(p, f, 0.6)), c.duneD, c.dune, 6);
  r.fill(([[0, 86], [60, 76], [110, 84], [160, 78], [160, 100], [0, 100]] as Pt[]).map((p) => drift(p, f, 0.6)), c.duneL, c.dune, 4);

  // A palm, its fronds stirring.
  r.fill([[20, 76], [24, 76], [28, 34], [25, 34]], c.palm, c.palmL, 3);
  const s = wave(f, 0.4) * 2;
  for (const [dx, dy] of [[-18, 4], [-14, -6], [16, -6], [20, 5], [2, -12]] as Pt[]) {
    r.fill([[26, 33], [26 + dx * 0.5, 30 + dy * 0.5 - 2], [26 + dx + s, 34 + dy]], c.palm);
  }

  // The flute, which opens the piece, laid across the foreground.
  r.fill([[96, 92], [152, 82], [153, 85], [97, 95]], c.flute);
  for (let k = 0; k < 6; k++) r.dot(112 + k * 6, 89 - k * 1.1, c.key);
  r.fill(rect(98, 92, 4, 2), c.key);
}

// ---------------------------------------------------------------------------
// 10. Sonata K. 545: a Viennese salon, a fortepiano by candlelight, Mozart's silhouette
// ---------------------------------------------------------------------------

const moz = palette({
  w0: "#1e1a24",
  w1: "#2e2838",
  panel: "#4e5a7a",
  panelL: "#6c79a0",
  gilt: "#d1a94e",
  giltD: "#8c6a2a",
  cream: "#f0e6d0",
  wood: "#6b3f22",
  woodL: "#8f5a32",
  black: "#121014",
  flame: "#ffd56a",
  sheet: "#e8dcc0",
});
const mozBack = fracture(97, [[moz.c.w0, moz.c.w1], [moz.c.w1, moz.c.panel], [moz.c.w1, moz.c.w0]], 4);
const mozPanels = fracture(101, [[moz.c.panel, moz.c.panelL], [moz.c.panelL, moz.c.panel]], 3, [104, 10, 144, 58]);

function renderMozart(r: Raster, f: Frame) {
  const { c } = moz;
  paintPlanes(r, mozBack, f);

  // A gilt oval on the wall with Mozart in profile: wig, ribbon and queue.
  r.fill(ellipse(124, 34, 17, 22, 0, Math.PI * 2, 30), c.gilt, c.giltD, 4);
  r.fill(ellipse(124, 34, 14, 19, 0, Math.PI * 2, 30), c.cream);
  paintPlanes(r, mozPanels.map((p) => ({ ...p, pts: clipConvex(p.pts, ellipse(124, 34, 14, 19, 0, Math.PI * 2, 20)) })), f);
  r.fill(ellipse(124, 31, 6, 7, 0, Math.PI * 2, 16), c.black);
  r.fill([[128, 25], [130, 30], [133, 34], [130, 35], [131, 38], [127, 41], [124, 37]], c.black);
  r.fill(ellipse(119, 33, 2.5, 2, 0, Math.PI * 2, 8), c.black);
  r.fill(ellipse(119, 37, 2.5, 2, 0, Math.PI * 2, 8), c.black);
  r.fill([[119, 36], [121, 36], [116, 47], [114, 46]], c.black);
  r.fill([[116, 38], [120, 40], [116, 42]], c.cream);
  r.fill([[119, 41], [129, 40], [136, 53], [112, 53]], c.black);
  r.fill([[127, 41], [131, 41], [130, 46]], c.cream);

  // The fortepiano on slender legs, the sonata open on its desk.
  r.fill([[8, 58], [92, 58], [96, 62], [96, 72], [8, 72]], c.wood, c.woodL, 4);
  r.fill(rect(12, 62, 54, 5), c.cream);
  for (let x = 12; x < 66; x += 3) r.line(x, 62, x, 66, c.wood);
  for (const x of [12, 52, 90]) r.fill([[x, 72], [x + 3, 72], [x + 2, 92], [x + 1, 92]], c.wood);
  r.fill([[30, 44], [52, 44], [54, 58], [28, 58]], c.sheet);
  for (let k = 0; k < 4; k++) r.line(31, 47 + k * 3, 51, 47 + k * 3, c.giltD);

  // A two-branch candelabrum, its flames flickering.
  r.fill(rect(78, 46, 2, 12), c.gilt);
  r.line(72, 46, 86, 46, c.gilt);
  for (const x of [72, 86]) {
    r.fill(rect(x - 1, 40, 2, 6), c.cream);
    const h = f.still ? 0 : wave(f, 3.1, x) * 0.8;
    r.fill([[x - 1.5, 40], [x + 1.5, 40], [x + h, 35 - Math.abs(h)]], c.flame);
  }
}

// ---------------------------------------------------------------------------
// 11. Air on the G String: a violin in a church's stained-glass light
// ---------------------------------------------------------------------------

const air = palette({
  c0: "#120f14",
  c1: "#221c26",
  c2: "#33293a",
  stone: "#8a8070",
  blue: "#3a5a8a",
  blueL: "#6a8cbc",
  red: "#a8423a",
  gold: "#d8b04a",
  violin: "#a4501f",
  violinL: "#cf7a3a",
  violinD: "#5a2a10",
  ivory: "#ece0c0",
  black: "#0c0a0a",
});
const airBack = fracture(103, [[air.c.c0, air.c.c1], [air.c.c1, air.c.c2], [air.c.c1, air.c.c0]], 4);
const arch: Pt[] = [[18, 40], [22, 22], [30, 12], [40, 7], [50, 12], [58, 22], [62, 40], [62, 92], [18, 92]];
const glass = fracture(107, [[air.c.blue, air.c.blueL], [air.c.red, air.c.blue], [air.c.gold, air.c.red], [air.c.blueL, air.c.blue]], 5, [18, 7, 62, 92]).map(
  (p) => ({ ...p, pts: clipConvex(p.pts, arch) }),
);
const shaft = { [air.c.c0]: air.c.c1, [air.c.c1]: air.c.c2, [air.c.c2]: air.c.blue };
const violinBody: Pt[][] = [
  ellipse(0, 10, 11, 9, 0, Math.PI * 2, 22),
  ellipse(0, -8, 9, 8, 0, Math.PI * 2, 20),
  rect(-7, -2, 14, 6),
];

function renderAir(r: Raster, f: Frame) {
  const { c } = air;
  paintPlanes(r, airBack, f);
  r.tint([[40, 60], [62, 40], [150, 96], [100, 100]], shaft, 4);

  // The window: leaded glass in a pointed arch, its lights shifting.
  r.fill(arch, c.stone);
  paintPlanes(r, glass, f, c.black);
  r.stroke(arch, c.stone);
  r.fill(rect(39, 10, 2, 82), c.stone);
  r.fill(rect(18, 50, 44, 2), c.stone);

  // The violin, tilted as if resting on a shoulder; its lowest string, G, glows.
  const at = (pts: Pt[]) => place(pts, 116, 52, -0.55);
  for (const p of violinBody) r.fill(at(p), c.violin, c.violinL, 5);
  r.fill(at(ellipse(0, 10, 11, 9, -Math.PI / 2, Math.PI / 2, 11)), c.violinD, c.violin, 5);
  r.fill(at([[-1.5, -12], [1.5, -12], [1.5, -34], [-1.5, -34]]), c.black);
  r.fill(at(ellipse(0, -37, 2.5, 3, 0, Math.PI * 2, 10)), c.violinD);
  r.fill(at([[-2, 2], [2, 2], [3, 20], [-3, 20]]), c.black);
  r.stroke(at([[-5, 0], [-6, 4], [-5, 8]]), c.black, false);
  r.stroke(at([[5, 0], [6, 4], [5, 8]]), c.black, false);
  const glow = f.still || wave(f, 0.8) > -0.4 ? c.gold : c.ivory;
  ([[-1.5, glow], [-0.5, c.ivory], [0.5, c.ivory], [1.5, c.ivory]] as [number, number][]).forEach(([x, col]) => {
    const [[x0, y0], [x1, y1]] = at([[x, -34], [x * 1.4, 20]]);
    r.line(x0, y0, x1, y1, col);
  });
}

// ---------------------------------------------------------------------------
// 12. Moonlight Sonata: moonlight on Lake Lucerne, which gave the sonata its name
// ---------------------------------------------------------------------------

const mln = palette({
  m0: "#070b16",
  m1: "#10182c",
  m2: "#1c2844",
  moon: "#f2ecd0",
  moonS: "#c8c2a4",
  water: "#14223c",
  waterL: "#2a4068",
  mount: "#0e1424",
  mountL: "#222c46",
  snow: "#8a96b8",
  path: "#d8dcec",
  boat: "#05070c",
});
const mlnSky = fracture(109, [[mln.c.m0, mln.c.m1], [mln.c.m1, mln.c.m2], [mln.c.m1, mln.c.m0]], 4, [-8, -8, 168, 64]);
const mlnLake = fracture(113, [[mln.c.water, mln.c.waterL], [mln.c.waterL, mln.c.water], [mln.c.water, mln.c.m1]], 3, [-8, 62, 168, 108]);

function renderMoonlight(r: Raster, f: Frame) {
  const { c } = mln;
  paintPlanes(r, mlnSky, f);
  r.fill(ellipse(118, 22, 9, 9, 0, Math.PI * 2, 24), c.moon);
  r.fill(ellipse(118, 22, 9, 9, -Math.PI / 2, Math.PI / 2, 12), c.moonS, c.moon, 5);

  // The mountains round the lake, snow catching the light.
  r.fill([[-4, 64], [20, 36], [36, 48], [58, 28], [84, 52], [104, 40], [130, 54], [164, 38], [164, 64]], c.mount, c.mountL, 4);
  r.fill([[52, 34], [58, 28], [64, 34], [60, 33]], c.snow);
  r.fill([[16, 40], [20, 36], [25, 41]], c.snow);
  r.fill([[158, 41], [164, 38], [164, 44]], c.snow);

  paintPlanes(r, mlnLake, f);

  // The moon's path on the water: broken dashes that shimmer.
  for (let k = 0; k < 12; k++) {
    const y = 66 + k * 3;
    const w = 3 + k * 0.9;
    const s = f.still ? 0 : wave(f, 0.7, k * 1.3) * 2;
    r.fill(rect(118 - w / 2 + s, y, w, 1), c.path);
  }

  // A small boat drifting slowly.
  const x = 50 + wave(f, 0.04) * 6;
  r.fill([[x - 8, 72], [x + 8, 72], [x + 5, 75], [x - 5, 75]], c.boat);
  r.line(x, 72, x - 1, 63, c.boat);
  r.line(x - 1, 74, x - 10, 78, c.boat);
}

// ---------------------------------------------------------------------------
// 13. The Swan: a swan gliding at dusk among the reeds
// ---------------------------------------------------------------------------

const swn = palette({
  p0: "#1a1830",
  p1: "#2c2848",
  p2: "#4a3a5e",
  water: "#1e3a46",
  waterL: "#2e5a66",
  swan: "#f2efe6",
  swanS: "#b8b8b4",
  beak: "#e07a2a",
  black: "#0a0c0c",
  reed: "#1e3222",
  reedL: "#3a5a34",
});
const swnSky = fracture(127, [[swn.c.p0, swn.c.p1], [swn.c.p1, swn.c.p2], [swn.c.p1, swn.c.p0]], 4, [-8, -8, 168, 58]);
const swnLake = fracture(131, [[swn.c.water, swn.c.waterL], [swn.c.waterL, swn.c.water]], 4, [-8, 56, 168, 108]);
const reflect = { [swn.c.water]: swn.c.swanS, [swn.c.waterL]: swn.c.swan };

function renderSwan(r: Raster, f: Frame) {
  const { c } = swn;
  paintPlanes(r, swnSky, f);
  paintPlanes(r, swnLake, f);

  // The swan glides slowly across and back; the water ripples behind it.
  const x = 74 + wave(f, 0.035) * 10;
  const y = 64 + wave(f, 0.5) * 0.6;
  r.tint(ellipse(x, y + 10, 18, 5, 0, Math.PI * 2, 18), reflect, 3);
  for (let k = 1; k <= 3; k++) r.stroke(ellipse(x + 6, y + 6, 16 + k * 6, 2 + k, Math.PI * 0.1, Math.PI * 0.9, 12), c.waterL, false);
  r.fill([[x - 16, y], [x - 6, y - 8], [x + 10, y - 6], [x + 14, y + 4], [x - 12, y + 4]], c.swan, c.swanS, 4);
  r.fill([[x - 16, y], [x - 4, y - 12], [x + 2, y - 7]], c.swan);
  r.fill([[x + 8, y - 4], [x + 11, y - 4], [x + 9, y - 18], [x + 6, y - 18]], c.swan);
  r.fill([[x + 6, y - 18], [x + 9, y - 22], [x + 4, y - 26], [x + 1, y - 24], [x + 4, y - 20]], c.swan);
  r.fill(ellipse(x + 1, y - 25, 3, 2.5, 0, Math.PI * 2, 10), c.swan);
  r.fill([[x - 1, y - 26], [x - 6, y - 23], [x - 1, y - 24]], c.beak);
  r.dot(x + 1, y - 26, c.black);

  // Reeds at both edges, swaying.
  const s = wave(f, 0.3) * 1.5;
  for (const [bx, h] of [[6, 40], [11, 32], [16, 44], [140, 38], [146, 46], [152, 34], [157, 42]] as Pt[]) {
    r.fill([[bx, 88], [bx + 2, 88], [bx + 1 + s, 88 - h]], c.reed, c.reedL, 5);
  }
}

// ---------------------------------------------------------------------------
// 14. Venetian Gondola Song: a gondola on a canal at dusk, between palazzi
// ---------------------------------------------------------------------------

const gon = palette({
  v0: "#1a1426",
  v1: "#2e2240",
  v2: "#4a3456",
  wall: "#b0704a",
  wallL: "#d08e5e",
  wallD: "#7a4a32",
  win: "#241a24",
  canal: "#1e3a4a",
  canalL: "#2e5a6a",
  black: "#0a0a0e",
  gold: "#d8b04a",
  cream: "#eee0c0",
  stripe: "#9a2e2e",
});
const gonSky = fracture(137, [[gon.c.v0, gon.c.v1], [gon.c.v1, gon.c.v2], [gon.c.v1, gon.c.v0]], 3, [-8, -8, 168, 70]);
const gonLeft = fracture(139, [[gon.c.wall, gon.c.wallL], [gon.c.wallL, gon.c.wall], [gon.c.wall, gon.c.wallD]], 3, [-8, 4, 46, 72]);
const gonRight = fracture(149, [[gon.c.wall, gon.c.wallD], [gon.c.wallL, gon.c.wall], [gon.c.wallD, gon.c.wall]], 3, [118, 12, 168, 72]);
const gonCanal = fracture(151, [[gon.c.canal, gon.c.canalL], [gon.c.canalL, gon.c.canal]], 3, [-8, 70, 168, 108]);

function archWindow(r: Raster, x: number, y: number, col: number) {
  r.fill([...ellipse(x + 3, y + 3, 3, 3, Math.PI, Math.PI * 2, 8), [x + 6, y + 12], [x, y + 12]], col);
}

function renderGondola(r: Raster, f: Frame) {
  const { c } = gon;
  paintPlanes(r, gonSky, f);
  paintPlanes(r, gonLeft, f);
  paintPlanes(r, gonRight, f);
  for (const y of [14, 36, 56]) for (const x of [4, 16, 28]) archWindow(r, x, y, c.win);
  for (const y of [22, 44]) for (const x of [124, 136, 148]) archWindow(r, x, y, c.win);
  r.fill(rect(-1, 68, 47, 3), c.cream);
  r.fill(rect(118, 68, 43, 3), c.cream);
  paintPlanes(r, gonCanal, f);

  // The gondola rocks and glides; the gondolier leans on his oar.
  const x = 80 + wave(f, 0.03) * 4;
  const bob = wave(f, 0.55) * 0.8;
  const row = wave(f, 0.55);
  r.fill([[x - 34, 74 + bob], [x - 26, 80 + bob], [x + 22, 80 + bob], [x + 34, 70 + bob], [x + 30, 73 + bob], [x - 30, 73 + bob]], c.black);
  r.fill([[x + 30, 70 + bob], [x + 35, 62 + bob], [x + 36, 71 + bob]], c.black);
  for (let k = 0; k < 3; k++) r.line(x + 31, 64 + k * 2 + bob, x + 34, 64 + k * 2 + bob, c.gold);
  r.fill([[x - 4, 70 + bob], [x + 8, 70 + bob], [x + 8, 73 + bob], [x - 4, 73 + bob]], c.stripe);
  // The gondolier: striped shirt, boater, oar.
  const gx = x - 22;
  r.fill(rect(gx - 2, 46 + bob, 5, 12), c.cream);
  for (let k = 0; k < 3; k++) r.line(gx - 2, 48 + k * 3 + bob, gx + 2, 48 + k * 3 + bob, c.stripe);
  r.fill(rect(gx - 2, 58 + bob, 5, 15), c.black);
  r.fill(ellipse(gx, 43 + bob, 2.5, 2.5, 0, Math.PI * 2, 10), c.wallL);
  r.fill(rect(gx - 4, 40 + bob, 9, 1), c.gold);
  r.fill(rect(gx - 2, 38 + bob, 5, 2), c.gold);
  thick(r, gx + 2, 50 + bob, gx + 16 + row * 4, 86, c.wallD);
}

// ---------------------------------------------------------------------------
// 15. Nocturne in E minor: a young composer's desk in Warsaw, by candle, in winter
// ---------------------------------------------------------------------------

const war = palette({
  d0: "#0e0c10",
  d1: "#1c1820",
  d2: "#2a2430",
  glow: "#4a3424",
  desk: "#4a2e1c",
  deskL: "#6a4428",
  paper: "#e6dac0",
  paperS: "#b8a888",
  ink: "#141012",
  flame: "#ffd06a",
  wax: "#e8dcc0",
  pane: "#1e2a44",
  paneL: "#2e3c5c",
  snow: "#dce4ee",
  quill: "#f0ece0",
});
const warBack = fracture(157, [[war.c.d0, war.c.d1], [war.c.d1, war.c.d2], [war.c.d1, war.c.d0]], 4);
const warPane = fracture(163, [[war.c.pane, war.c.paneL], [war.c.paneL, war.c.pane]], 3, [110, 8, 148, 52]);
const candle = { [war.c.d0]: war.c.d1, [war.c.d1]: war.c.d2, [war.c.d2]: war.c.glow, [war.c.desk]: war.c.deskL };

function renderWarsaw(r: Raster, f: Frame) {
  const { c } = war;
  paintPlanes(r, warBack, f);

  // The window: snow falling over the city.
  r.fill(rect(107, 5, 44, 50), c.desk);
  paintPlanes(r, warPane, f);
  for (let k = 0; k < 14; k++) {
    const sx = 112 + ((k * 23) % 34);
    const sy = f.still ? 10 + ((k * 13) % 40) : 8 + ((f.t * (2 + (k % 3)) + k * 9) % 44);
    r.dot(sx + wave(f, 0.5, k) * 1.5, sy, c.snow);
  }
  r.fill(rect(110, 46, 38, 6), c.snow, c.paneL, 6);
  r.fill(rect(128, 8, 2, 44), c.desk);
  r.fill(rect(110, 28, 38, 2), c.desk);

  // The desk.
  r.fill([[0, 70], [160, 64], [160, 100], [0, 100]], c.desk, c.deskL, 3);

  // The candle; its light swells and shrinks with the flame.
  const h = f.still ? 0 : wave(f, 2.7) * 0.9;
  const glowR = 30 + (f.still ? 0 : wave(f, 1.3) * 3);
  r.tint(ellipse(100, 56, glowR, glowR * 0.8, 0, Math.PI * 2, 24), candle, 6);
  r.fill(rect(97, 52, 6, 16), c.wax);
  r.fill(rect(93, 67, 14, 3), c.deskL);
  r.fill([[98, 52], [102, 52], [100 + h, 44 - Math.abs(h)]], c.flame);

  // The manuscript: staves, notes, and a quill in its inkwell.
  r.fill([[24, 66], [80, 62], [84, 84], [26, 88]], c.paper, c.paperS, 2);
  for (const top of [68, 77]) {
    for (let k = 0; k < 5; k++) r.line(28, top + k * 1.5, 80, top - 3.5 + k * 1.5, c.paperS);
    for (let x = 32; x < 78; x += 6) r.dot(x, top + 3 - (x - 28) / 15 - ((x * 3) % 4), c.ink);
  }
  r.fill(ellipse(70, 92, 5, 3, 0, Math.PI * 2, 12), c.ink);
  r.fill([[69, 90], [71, 90], [86, 60], [84, 60]], c.quill);
  r.fill([[84, 60], [92, 54], [88, 64]], c.quill);
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
  {
    id: "cello-prelude",
    alt: "A cello and its bow lit by lamplight, beside an old printed score lying at a slant.",
    colors: cel.colors,
    motifs: { cello: [100, 56, 26], score: [35, 51, 22] },
    render: renderCello,
  },
  {
    id: "traumerei",
    alt: "A child asleep under a patched quilt, a rocking horse, and stars and a crescent moon at the nursery window.",
    colors: tra.colors,
    motifs: { dreamer: [40, 66, 22], window: [122, 30, 22], horse: [128, 74, 16] },
    render: renderTraumerei,
  },
  {
    id: "well-tempered",
    alt: "A keyboard beneath a rising and falling wave of notes, and a circle of twenty-four dots for every major and minor key.",
    colors: wtc.colors,
    motifs: { keyboard: [52, 73, 24], figure: [55, 42, 22], circle: [126, 38, 25] },
    render: renderWellTempered,
  },
  {
    id: "morning-mood",
    alt: "The sun rising over desert dunes in violet and gold bands, a palm tree, and a flute in the foreground.",
    colors: mor.colors,
    motifs: { sun: [100, 56, 17], desert: [50, 82, 22], flute: [124, 88, 15] },
    render: renderMorning,
  },
  {
    id: "mozart-salon",
    alt: "A Viennese salon: a fortepiano with music on its desk, a candelabrum, and Mozart's silhouette in a gilt oval.",
    colors: moz.colors,
    motifs: { fortepiano: [50, 64, 24], portrait: [124, 34, 20], candles: [79, 42, 10] },
    render: renderMozart,
  },
  {
    id: "air",
    alt: "A violin in a shaft of light from a pointed stained-glass church window, its lowest string glowing gold.",
    colors: air.colors,
    motifs: { window: [40, 50, 26], violin: [116, 50, 24] },
    render: renderAir,
  },
  {
    id: "moonlight",
    alt: "A full moon over a mountain lake at night, its light broken into a path on the water, and a small boat.",
    colors: mln.colors,
    motifs: { moon: [118, 22, 13], lake: [118, 82, 18], boat: [50, 70, 12] },
    render: renderMoonlight,
  },
  {
    id: "swan",
    alt: "A white swan gliding on a lake at dusk, ripples spreading behind it, reeds at either side.",
    colors: swn.colors,
    motifs: { swan: [76, 54, 24], reeds: [148, 66, 14] },
    render: renderSwan,
  },
  {
    id: "gondola",
    alt: "A black gondola and its gondolier on a Venetian canal at dusk, between palazzi with arched windows.",
    colors: gon.colors,
    motifs: { gondola: [82, 72, 22], gondolier: [58, 54, 14], palazzi: [20, 38, 20] },
    render: renderGondola,
  },
  {
    id: "warsaw",
    alt: "A manuscript of music, a quill and a candle on a desk at night, with snow falling past the window.",
    colors: war.colors,
    motifs: { manuscript: [54, 76, 20], candle: [100, 56, 13], window: [129, 29, 22] },
    render: renderWarsaw,
  },
];
