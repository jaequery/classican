// One original pixel painting per piece, each showing what the piece is about:
// the Greek dancers behind Satie's title, the moonlit park of Verlaine's poem,
// Bach's two-keyboard harpsichord, the columns of Knossos, Chopin's piano at night,
// Casals' cello, a sleeping child, the circle of keys, a desert sunrise, a Viennese
// salon, stained glass, Lake Lucerne by moonlight, a swan, a gondola, a Warsaw desk.
// Then thirty more, from Dvořák's prairie moon and Smetana's river to the Mountain
// King's hall, the Great Gate of Kiev, Saint-Saëns' graveyard dance, Handel's forge,
// Vivaldi's spring, the Magic Flute's temples and Carmen's bullring.
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
  | "warsaw"
  | "new-world"
  | "moldau"
  | "moldau-hunt"
  | "moldau-wedding"
  | "moldau-nymphs"
  | "moldau-rapids"
  | "moldau-vysehrad"
  | "mountain-king"
  | "anitra"
  | "vienna-woods"
  | "tchaikovsky-concerto"
  | "rachmaninoff-adagio"
  | "great-gate"
  | "steppes"
  | "danse-macabre"
  | "jesu-joy"
  | "badinerie"
  | "blacksmith"
  | "mandolin"
  | "spring"
  | "albinoni"
  | "nachtmusik"
  | "magic-flute"
  | "pathetique"
  | "fifth"
  | "pastoral"
  | "waltz"
  | "ballade"
  | "wedding-march"
  | "italian"
  | "schubert-sonata"
  | "intermezzo"
  | "foreign-lands"
  | "roman-carnival"
  | "carmen";

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
// 16. New World Symphony, Largo: a steamship nearing the New World at dusk,
//     the moon rising, and the cor anglais that sings the famous tune
// ---------------------------------------------------------------------------

const nwA = palette({
  s0: "#1c1a36",
  s1: "#3a2c52",
  s2: "#7a4a5e",
  glow: "#d98a5a",
  moon: "#f0e6c2",
  sea: "#16283e",
  seaL: "#2a4462",
  city: "#0e1222",
  lamp: "#f0c46a",
  hull: "#0a0c14",
  smoke: "#5a5468",
  wood: "#5a3018",
  woodL: "#8a5028",
  key: "#d8c8a0",
});
const nwSkyA = fracture(201, [[nwA.c.s0, nwA.c.s1], [nwA.c.s1, nwA.c.s2], [nwA.c.s2, nwA.c.glow]], 4, [-8, -8, 168, 60]);
const nwSeaA = fracture(203, [[nwA.c.sea, nwA.c.seaL], [nwA.c.seaL, nwA.c.sea]], 3, [-8, 58, 168, 108]);
const nwTowersA: [number, number][] = [[96, 8], [101, 13], [106, 6], [110, 10], [115, 15], [120, 7], [126, 11], [131, 5], [137, 9]];

function renderNewWorldA(r: Raster, f: Frame) {
  const { c } = nwA;
  paintPlanes(r, nwSkyA, f);
  r.fill(rect(0, 50, ART_W, 9), c.s2, c.glow, 6);
  r.fill(ellipse(38, 20, 7, 7, 0, Math.PI * 2, 20), c.moon);
  r.fill(ellipse(38, 20, 7, 7, -Math.PI / 2, Math.PI / 2, 10), c.glow, c.moon, 3);

  // The far shore: a low city on the horizon, windows lighting one by one.
  nwTowersA.forEach(([dx, h], i) => {
    r.fill(rect(dx, 58 - h, 5, h + 1), c.city);
    if (f.still || wave(f, 0.08, i * 1.7) > -0.4) r.dot(dx + 2, 58 - h + 2, c.lamp);
  });
  paintPlanes(r, nwSeaA, f);
  for (let k = 0; k < 8; k++) r.fill(rect(36 - k * 0.6 + wave(f, 0.6, k) * 1.5, 61 + k * 4, 4 + k, 1), c.moon);

  // The steamship, rolling gently, smoke trailing behind.
  const bob = wave(f, 0.4) * 0.8;
  r.fill([[60, 66 + bob], [96, 66 + bob], [92, 72 + bob], [64, 72 + bob]], c.hull);
  r.fill(rect(68, 61 + bob, 20, 5), c.hull);
  r.fill(rect(76, 52 + bob, 4, 9), c.hull);
  for (let k = 0; k < 4; k++) r.dot(70 + k * 5, 63 + bob, c.lamp);
  for (let k = 0; k < 5; k++) {
    const p = f.still ? k / 5 : (f.t * 0.05 + k / 5) % 1;
    r.fill(ellipse(76 - p * 26, 49 - p * 8, 2 + p * 3, 1.5 + p * 2, 0, Math.PI * 2, 10), c.smoke);
  }

  // The cor anglais, laid diagonally across the foreground.
  thick(r, 104, 96, 150, 66, c.wood);
  r.fill(ellipse(104, 96, 4, 3, 0, Math.PI * 2, 12), c.woodL);
  r.line(150, 66, 156, 60, c.key);
  for (let k = 0; k < 5; k++) r.dot(114 + k * 7, 89 - k * 4.6, c.key);
}

// ---------------------------------------------------------------------------
// 17. Vltava: the river winding from two springs past hills and a castle rock
// ---------------------------------------------------------------------------

const vltA = palette({
  sky: "#9ab8c8",
  skyL: "#c4d6d8",
  hill: "#3e6a3a",
  hillL: "#5e8a48",
  hillD: "#24442a",
  field: "#a8a050",
  river: "#2e6a9a",
  riverL: "#6aa2c8",
  foam: "#e8f0f0",
  rock: "#6a5a4a",
  rockD: "#3a3028",
  wall: "#d8c8a8",
  roof: "#8a3a2a",
});
const vltSkyA = fracture(211, [[vltA.c.sky, vltA.c.skyL], [vltA.c.skyL, vltA.c.sky]], 3, [-8, -8, 168, 40]);
const vltLandA = fracture(213, [[vltA.c.hill, vltA.c.hillL], [vltA.c.hillL, vltA.c.field], [vltA.c.hillD, vltA.c.hill]], 4, [-8, 30, 168, 108]);
// The river's course: two springs meet, then it widens as it flows down toward us.
const vltCourseA: [number, number, number][] = [
  [52, 36, 1], [46, 42, 1.5], [54, 48, 2], [70, 54, 3], [82, 60, 4], [74, 68, 6], [58, 76, 8], [64, 86, 11], [86, 98, 15], [96, 106, 17],
];

function renderMoldauA(r: Raster, f: Frame) {
  const { c } = vltA;
  paintPlanes(r, vltSkyA, f);
  r.fill([[-4, 40], [20, 26], [40, 34], [62, 22], [90, 34], [120, 24], [164, 36], [164, 44], [-4, 44]], c.hillD, c.hill, 4);
  paintPlanes(r, vltLandA, f);

  // The two springs, high in the hills.
  r.line(36, 30, 52, 36, c.riverL);
  r.line(64, 28, 52, 36, c.riverL);
  r.dot(36, 30, c.foam);
  r.dot(64, 28, c.foam);
  // The river, drawn as a chain of widening bends; light moves down it.
  for (let i = 0; i + 1 < vltCourseA.length; i++) {
    const [x0, y0, w0] = vltCourseA[i];
    const [x1, y1, w1] = vltCourseA[i + 1];
    r.fill([[x0 - w0, y0], [x0 + w0, y0], [x1 + w1, y1], [x1 - w1, y1]], c.river, c.riverL, 4);
  }
  for (let k = 0; k < 7; k++) {
    const p = f.still ? k / 7 : (f.t * 0.04 + k / 7) % 1;
    const i = Math.min(vltCourseA.length - 2, Math.floor(p * (vltCourseA.length - 1)));
    const u = p * (vltCourseA.length - 1) - i;
    const [x0, y0, w0] = vltCourseA[i];
    const [x1, y1] = vltCourseA[i + 1];
    r.fill(rect(x0 + (x1 - x0) * u - w0 * 0.4, y0 + (y1 - y0) * u, Math.max(1, w0 * 0.8), 1), c.foam);
  }

  // The castle on its rock above the river.
  r.fill([[110, 70], [118, 46], [140, 42], [152, 60], [150, 74]], c.rock, c.rockD, 5);
  r.fill(rect(120, 32, 22, 12), c.wall);
  r.fill(rect(124, 22, 6, 10), c.wall);
  r.fill([[123, 22], [131, 22], [127, 15]], c.roof);
  r.fill([[119, 32], [143, 32], [139, 27], [123, 27]], c.roof);
  for (const x of [123, 129, 135]) r.fill(rect(x, 36, 2, 3), c.rockD);
}

// The Moldau's story scenes, which the painting turns to as the river reaches them.

// Forest hunt: hunting horns ring through a pine wood on the riverbank; a stag leaps away.
const vltHunt = palette({
  sky: "#2a3a30",
  skyL: "#3e5240",
  pine: "#16261c",
  pineL: "#24402a",
  floor: "#3a3420",
  floorL: "#54482a",
  river: "#3a6070",
  riverL: "#6a98a6",
  coat: "#7a2a1a",
  horse: "#3a2418",
  brass: "#e0b03a",
  stag: "#8a5a32",
  pale: "#e6dcc0",
});
const vltHuntBack = fracture(311, [[vltHunt.c.sky, vltHunt.c.skyL], [vltHunt.c.skyL, vltHunt.c.sky]], 3, [-8, -8, 168, 60]);
const vltHuntFloor = fracture(313, [[vltHunt.c.floor, vltHunt.c.floorL], [vltHunt.c.floorL, vltHunt.c.floor]], 3, [-8, 64, 168, 108]);

function pine(r: Raster, x: number, base: number, h: number, a: number, b: number) {
  r.fill(rect(x - 1, base - h * 0.3, 2, h * 0.3), a);
  for (let k = 0; k < 4; k++) {
    const y = base - h * 0.25 - k * h * 0.2;
    const w = h * 0.24 * (1 - k * 0.2);
    r.fill([[x - w, y], [x + w, y], [x, y - h * 0.32]], a, b, 3);
  }
}

function renderMoldauHunt(r: Raster, f: Frame) {
  const { c } = vltHunt;
  paintPlanes(r, vltHuntBack, f);
  for (let i = 0; i < 9; i++) pine(r, 4 + i * 19, 66, 44 + (i % 3) * 10, c.pine, c.pineL);
  paintPlanes(r, vltHuntFloor, f);
  // The river slips past behind the trees.
  r.fill([[-4, 62], [164, 58], [164, 66], [-4, 70]], c.river, c.riverL, 5);
  for (let k = 0; k < 5; k++) {
    const x = f.still ? k * 34 : (f.t * 6 + k * 34) % 172 - 6;
    r.fill(rect(x, 63 - x * 0.025, 5, 1), c.riverL);
  }
  // The hunter on horseback, horn raised.
  const bob = wave(f, 1.6) * 0.8;
  r.fill(ellipse(54, 80 + bob, 13, 6, 0, Math.PI * 2, 18), c.horse);
  r.fill([[64, 76 + bob], [72, 66 + bob], [76, 68 + bob], [70, 80 + bob]], c.horse);
  for (const [x, d] of [[44, 1], [48, -1], [60, 1], [64, -1]] as const) thick(r, x, 84 + bob, x + d * 2, 94, c.horse);
  r.fill(rect(50, 64 + bob, 7, 12), c.coat);
  r.fill(ellipse(53.5, 61 + bob, 3, 3, 0, Math.PI * 2, 12), c.pale);
  r.fill([[56, 60 + bob], [64, 56 + bob], [66, 60 + bob], [58, 63 + bob]], c.brass);
  r.fill(ellipse(66, 58 + bob, 2.5, 3, 0, Math.PI * 2, 10), c.brass);
  // The stag bounds away across the clearing.
  const leap = f.still ? 0 : Math.abs(Math.sin(f.t * 1.4)) * 4;
  const sx = 122;
  const sy = 78 - leap;
  r.fill(ellipse(sx, sy, 10, 4.5, -0.15, Math.PI * 2, 16), c.stag);
  r.fill([[sx + 7, sy - 2], [sx + 12, sy - 10], [sx + 15, sy - 9], [sx + 11, sy]], c.stag);
  r.line(sx + 12, sy - 10, sx + 10, sy - 17, c.pale);
  r.line(sx + 11, sy - 14, sx + 7, sy - 16, c.pale);
  r.line(sx + 14, sy - 10, sx + 17, sy - 17, c.pale);
  r.line(sx + 15, sy - 14, sx + 19, sy - 15, c.pale);
  thick(r, sx - 7, sy + 2, sx - 14, sy + 10, c.stag);
  thick(r, sx + 6, sy + 2, sx + 13, sy + 9, c.stag);
}

// Peasant wedding: couples dance a polka on the green by the river, a fiddler on a barrel.
const vltWed = palette({
  sky: "#e8b870",
  skyL: "#f2d496",
  grass: "#5a7a34",
  grassL: "#7a9a44",
  river: "#4a7a8a",
  riverL: "#8ab6c0",
  wall: "#e8dcc0",
  roof: "#8a3a2a",
  wood: "#5a3a22",
  red: "#c0302a",
  blue: "#2a4a8a",
  white: "#f6f0e2",
  skin: "#e0b08a",
  ink: "#2a1a12",
  flag: "#e0b03a",
});
const vltWedSky = fracture(321, [[vltWed.c.sky, vltWed.c.skyL], [vltWed.c.skyL, vltWed.c.sky]], 3, [-8, -8, 168, 50]);
const vltWedGreen = fracture(323, [[vltWed.c.grass, vltWed.c.grassL], [vltWed.c.grassL, vltWed.c.grass]], 3, [-8, 56, 168, 108]);

function polka(r: Raster, f: Frame, x: number, y: number, phase: number, skirt: number) {
  const { c } = vltWed;
  const spin = f.still ? 0 : Math.sin(f.t * 3.2 + phase);
  const hop = f.still ? 0 : Math.abs(Math.sin(f.t * 3.2 + phase)) * 1.5;
  y -= hop;
  // Her: a full skirt that swings as they turn.
  r.fill([[x - 3, y], [x, y], [x + 1 + spin * 2, y + 12], [x - 8 + spin * 2, y + 12]], skirt, c.white, 2);
  r.fill(rect(x - 3, y - 7, 4, 7), c.white);
  r.fill(ellipse(x - 1, y - 9, 2.2, 2.4, 0, Math.PI * 2, 10), c.skin);
  // Him: dark breeches and a waistcoat.
  r.fill(rect(x + 2, y - 7, 4, 8), c.blue);
  r.fill(ellipse(x + 4, y - 9.5, 2.2, 2.4, 0, Math.PI * 2, 10), c.skin);
  thick(r, x + 2, y + 1, x + 1 - spin, y + 12 + hop, c.ink);
  thick(r, x + 5, y + 1, x + 6 + spin, y + 12 + hop, c.ink);
  r.line(x, y - 5, x + 3, y - 5, c.skin);
}

function renderMoldauWedding(r: Raster, f: Frame) {
  const { c } = vltWed;
  paintPlanes(r, vltWedSky, f);
  r.fill([[-4, 50], [164, 46], [164, 58], [-4, 60]], c.river, c.riverL, 4);
  paintPlanes(r, vltWedGreen, f);
  // A whitewashed cottage with a red roof.
  r.fill(rect(112, 34, 34, 22), c.wall);
  r.fill([[108, 35], [150, 35], [129, 18]], c.roof);
  r.fill(rect(126, 44, 6, 12), c.wood);
  r.fill(rect(116, 40, 5, 5), c.blue);
  r.fill(rect(137, 40, 5, 5), c.blue);
  // Garland strung across the green.
  const sag = (i: number): Pt => [8 + i * 8, 30 + Math.sin((i / 12) * Math.PI) * 8];
  for (let i = 0; i < 12; i++) r.line(...sag(i), ...sag(i + 1), c.wood);
  for (let i = 0; i <= 12; i++) {
    const [x, y] = sag(i);
    r.fill([[x - 2, y], [x + 2, y], [x, y + 3]], i % 2 ? c.red : c.flag);
  }
  // The fiddler on his barrel.
  const bow = wave(f, 6) * 2;
  r.fill(ellipse(22, 82, 6, 8, 0, Math.PI * 2, 14), c.wood);
  r.fill(rect(19, 62, 6, 12), c.red);
  r.fill(ellipse(22, 59, 2.5, 2.7, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(28, 64, 3, 2, -0.5, Math.PI * 2, 10), c.wood);
  r.line(26 + bow, 60, 34 + bow, 68, c.ink);
  // Three couples whirling in a polka.
  polka(r, f, 50, 70, 0, c.red);
  polka(r, f, 74, 76, 1.6, c.blue);
  polka(r, f, 98, 70, 3.1, c.red);
}

// Moonlight, the nymphs' round dance: water nymphs glide in a ring on the silvered river,
// castle ruins on the rocks above.
const vltNym = palette({
  n0: "#0c1424",
  n1: "#16223a",
  n2: "#24345a",
  moon: "#f2ecd0",
  halo: "#8a96b8",
  water: "#1e3050",
  silver: "#b8c6dc",
  rock: "#141a28",
  rockL: "#26304a",
  nymph: "#e8eef6",
  veil: "#9ab0d6",
});
const vltNymSky = fracture(331, [[vltNym.c.n0, vltNym.c.n1], [vltNym.c.n1, vltNym.c.n2], [vltNym.c.n1, vltNym.c.n0]], 4, [-8, -8, 168, 64]);

function renderMoldauNymphs(r: Raster, f: Frame) {
  const { c } = vltNym;
  paintPlanes(r, vltNymSky, f);
  r.tint(ellipse(118, 20, 18, 18, 0, Math.PI * 2, 20), { [c.n0]: c.n1, [c.n1]: c.n2, [c.n2]: c.halo }, 6);
  r.fill(ellipse(118, 20, 8, 8, 0, Math.PI * 2, 20), c.moon);
  // Ruined castle walls on the dark rocks.
  r.fill([[-4, 58], [6, 34], [28, 30], [40, 50], [44, 62], [-4, 64]], c.rock, c.rockL, 3);
  r.fill(rect(10, 22, 7, 12), c.rockL);
  r.fill(rect(22, 26, 5, 6), c.rockL);
  for (const x of [10, 13, 16]) r.fill(rect(x, 20, 1, 2), c.rockL);
  r.fill([[150, 60], [156, 40], [164, 38], [164, 62]], c.rock, c.rockL, 3);
  // The river under the moon, a path of silver light.
  r.fill(rect(-4, 60, 168, 44), c.water);
  for (let y = 62; y < 100; y += 3) {
    const w = 4 + (y - 60) * 0.5;
    const sh = f.still ? 0 : Math.sin(f.t * 1.3 + y) * 3;
    r.fill(rect(118 - w / 2 + sh, y, w, 1), c.silver);
  }
  // Seven nymphs dancing in a slow ring on the water.
  const turn = f.still ? 0 : f.t * 0.35;
  for (let k = 0; k < 7; k++) {
    const a = turn + (k / 7) * Math.PI * 2;
    const x = 70 + Math.cos(a) * 30;
    const y = 76 + Math.sin(a) * 9;
    const s = 0.8 + (Math.sin(a) + 1) * 0.15;
    r.fill([[x - 4 * s, y + 6 * s], [x + 4 * s, y + 6 * s], [x + 1.5 * s, y - 4 * s], [x - 1.5 * s, y - 4 * s]], c.nymph, c.veil, 5);
    r.fill(ellipse(x, y - 6 * s, 1.8 * s, 2 * s, 0, Math.PI * 2, 10), c.nymph);
    r.line(x - 1, y - 3 * s, x - 6 * s, y - 8 * s, c.veil);
    r.line(x + 1, y - 3 * s, x + 6 * s, y - 8 * s, c.veil);
  }
}

// St John's Rapids: the river crashes white between rocks in a narrow gorge.
const vltRap = palette({
  sky: "#5a6670",
  skyL: "#7a8690",
  cliff: "#2a2a2a",
  cliffL: "#4a4642",
  water: "#2a4a5a",
  waterL: "#4a7a8a",
  foam: "#e8f0f2",
  spray: "#b0c4cc",
  rock: "#1a1816",
});
const vltRapSky = fracture(341, [[vltRap.c.sky, vltRap.c.skyL], [vltRap.c.skyL, vltRap.c.sky]], 3, [-8, -8, 168, 40]);
const vltRapLeft = fracture(343, [[vltRap.c.cliff, vltRap.c.cliffL], [vltRap.c.cliffL, vltRap.c.cliff]], 3, [-8, -8, 56, 108]);
const vltRapRight = fracture(345, [[vltRap.c.cliff, vltRap.c.cliffL], [vltRap.c.cliffL, vltRap.c.cliff]], 3, [104, -8, 168, 108]);
const vltRapRocks: [number, number, number][] = [[62, 62, 6], [92, 70, 7], [74, 84, 8], [104, 88, 6], [52, 92, 7]];

function renderMoldauRapids(r: Raster, f: Frame) {
  const { c } = vltRap;
  paintPlanes(r, vltRapSky, f);
  r.fill([[40, 20], [120, 20], [168, 108], [-8, 108]], c.water, c.waterL, 5);
  // Streaks of white water racing down toward us.
  for (let k = 0; k < 26; k++) {
    const lane = (k * 37) % 23;
    const p = f.still ? (k * 0.37) % 1 : (f.t * 0.5 + k * 0.37) % 1;
    const y = 22 + p * 84;
    const half = 40 + (y - 20) * 0.5;
    const x = 80 - half + (lane / 22) * half * 2;
    r.fill(rect(x, y, 2 + p * 6, 1 + p), k % 3 ? c.foam : c.spray);
  }
  // Rocks the river breaks over, each with a collar of foam.
  for (const [x, y, s] of vltRapRocks) {
    const sp = wave(f, 4, x) * 1.2;
    r.fill(ellipse(x, y - 2, s + 3 + sp, s * 0.7 + 2, Math.PI, Math.PI * 2, 14), c.foam, c.spray, 6);
    r.fill(ellipse(x, y, s, s * 0.6, 0, Math.PI * 2, 14), c.rock);
  }
  paintPlanes(r, vltRapLeft.map((p) => ({ ...p, pts: clipConvex(p.pts, [[-8, -8], [44, -8], [36, 30], [20, 108], [-8, 108]]) })), f);
  paintPlanes(r, vltRapRight.map((p) => ({ ...p, pts: clipConvex(p.pts, [[116, -8], [168, -8], [168, 108], [140, 108], [124, 30]]) })), f);
}

// The broad river and Vyšehrad: the Vltava flows wide and majestic past the old royal
// castle on its high rock, toward the spires of Prague.
const vltVys = palette({
  sky: "#e8a868",
  skyL: "#f4cc8a",
  skyH: "#c8784a",
  river: "#4a6a8a",
  riverL: "#9ab8d0",
  gold: "#f2d07a",
  rock: "#5a4434",
  rockL: "#7a5a40",
  wall: "#d8c09a",
  roof: "#3a5a4a",
  city: "#7a5a5a",
  cityD: "#5a4048",
  bank: "#3a4a2a",
});
const vltVysSky = fracture(351, [[vltVys.c.sky, vltVys.c.skyL], [vltVys.c.skyH, vltVys.c.sky], [vltVys.c.skyL, vltVys.c.sky]], 4, [-8, -8, 168, 56]);

function renderMoldauVysehrad(r: Raster, f: Frame) {
  const { c } = vltVys;
  paintPlanes(r, vltVysSky, f);
  r.fill(ellipse(40, 46, 9, 9, Math.PI, Math.PI * 2, 16), c.gold);
  // Prague's spires in the haze downstream.
  for (const [x, h] of [[18, 10], [26, 16], [34, 8], [46, 14], [58, 9], [66, 12]] as const) {
    r.fill(rect(x - 2, 54 - h, 4, h), c.city, c.cityD, 4);
    r.fill([[x - 2, 54 - h], [x + 2, 54 - h], [x, 48 - h]], c.cityD);
  }
  // The river, wide and calm, light gliding across it.
  r.fill([[-4, 54], [164, 52], [164, 104], [-4, 104]], c.river, c.riverL, 3);
  for (let k = 0; k < 10; k++) {
    const y = 58 + k * 4.4;
    const x = f.still ? (k * 47) % 160 : (f.t * (2 + k * 0.4) + k * 47) % 180 - 10;
    r.fill(rect(x, y, 6 + k, 1), k < 4 ? c.gold : c.riverL);
  }
  r.fill([[-4, 96], [60, 90], [80, 104], [-4, 104]], c.bank);
  // Vyšehrad on its rock: walls, towers, the church's twin spires.
  r.fill([[88, 104], [94, 60], [108, 40], [164, 34], [164, 104]], c.rock, c.rockL, 5);
  r.fill(rect(104, 28, 60, 14), c.wall);
  for (let x = 104; x < 164; x += 5) r.fill(rect(x, 26, 3, 2), c.wall);
  r.fill(rect(124, 6, 5, 22), c.wall);
  r.fill(rect(136, 6, 5, 22), c.wall);
  r.fill([[123, 6], [130, 6], [126.5, -4]], c.roof);
  r.fill([[135, 6], [142, 6], [138.5, -4]], c.roof);
  r.fill([[122, 20], [143, 20], [139, 14], [126, 14]], c.roof);
}

// ---------------------------------------------------------------------------
// 18. In the Hall of the Mountain King: the troll king on his throne in a
//     torchlit cave, trolls creeping in from the shadows
// ---------------------------------------------------------------------------

const mkA = palette({
  k0: "#0e0c0a",
  k1: "#201a14",
  k2: "#3a2c1e",
  glow: "#6a4422",
  stone: "#5a5248",
  troll: "#4a5a34",
  trollL: "#6a7a44",
  eye: "#f2e06a",
  gold: "#e0b03a",
  goldD: "#8a6420",
  flame: "#ffcf5a",
  flameO: "#e0682a",
  robe: "#6a2424",
});
const mkBackA = fracture(221, [[mkA.c.k0, mkA.c.k1], [mkA.c.k1, mkA.c.k2], [mkA.c.k1, mkA.c.k0]], 4);
const mkTorchlightA = { [mkA.c.k0]: mkA.c.k1, [mkA.c.k1]: mkA.c.k2, [mkA.c.k2]: mkA.c.glow };

function trollA(r: Raster, x: number, y: number, s: number, hop: number) {
  const { c } = mkA;
  y -= hop;
  r.fill(ellipse(x, y, 5 * s, 6 * s, 0, Math.PI * 2, 14), c.troll, c.trollL, 4);
  r.fill(ellipse(x, y - 7 * s, 3.5 * s, 3 * s, 0, Math.PI * 2, 12), c.troll);
  r.fill([[x + 2 * s, y - 7 * s], [x + 6 * s, y - 6 * s], [x + 2 * s, y - 5 * s]], c.trollL);
  r.fill([[x - 3 * s, y - 9 * s], [x - 5 * s, y - 13 * s], [x - 1 * s, y - 10 * s]], c.troll);
  r.dot(x + 1 * s, y - 8 * s, c.eye);
  thick(r, x - 3 * s, y + 5 * s, x - 4 * s, y + 10 * s + hop, c.troll);
  thick(r, x + 2 * s, y + 5 * s, x + 3 * s, y + 10 * s + hop, c.troll);
}

function renderMountainKingA(r: Raster, f: Frame) {
  const { c } = mkA;
  paintPlanes(r, mkBackA, f);
  // The cave mouth's ragged edges.
  r.fill([[-4, -4], [40, -4], [26, 10], [12, 30], [6, 60], [-4, 70]], c.stone, c.k2, 6);
  r.fill([[164, -4], [118, -4], [134, 12], [150, 34], [164, 50]], c.stone, c.k2, 6);
  r.fill([[-4, 84], [164, 80], [164, 104], [-4, 104]], c.k2, c.stone, 3);

  // Torches flicker and throw their light about.
  const fl = wave(f, 2.9) * 0.7;
  for (const x of [30, 132]) {
    r.tint(ellipse(x, 40, 28 + fl * 2, 24 + fl * 2, 0, Math.PI * 2, 16), mkTorchlightA, 5);
    r.fill(rect(x - 1, 40, 2, 12), c.k2);
    r.fill([[x - 2.5, 40], [x + 2.5, 40], [x + fl, 32]], c.flameO);
    r.fill([[x - 1.2, 40], [x + 1.2, 40], [x + fl * 0.6, 35]], c.flame);
  }

  // The Mountain King on his throne, crown and sceptre.
  r.fill(rect(64, 30, 32, 52), c.stone, c.k2, 4);
  r.fill([[64, 30], [80, 18], [96, 30]], c.stone);
  r.fill([[70, 50], [90, 50], [94, 82], [66, 82]], c.robe);
  r.fill(ellipse(80, 44, 9, 9, 0, Math.PI * 2, 18), c.troll, c.trollL, 4);
  r.fill([[83, 44], [91, 47], [83, 49]], c.trollL);
  r.fill([[72, 49], [80, 62], [88, 49]], c.trollL, c.troll, 6);
  r.dot(77, 42, c.eye);
  r.dot(84, 42, c.eye);
  r.fill([[72, 36], [72, 30], [75, 33], [78, 28], [80, 33], [83, 28], [85, 33], [88, 30], [88, 36]], c.gold, c.goldD, 3);
  r.line(96, 34, 98, 70, c.goldD);
  r.fill(ellipse(96, 33, 2, 2, 0, Math.PI * 2, 8), c.gold);

  // Trolls creep closer and hop, faster and faster as the music builds.
  const hop = (p: number) => (f.still ? 0 : Math.max(0, wave(f, 1.6, p)) * 2.5);
  trollA(r, 22, 76, 1, hop(0));
  trollA(r, 42, 80, 1.2, hop(1.2));
  trollA(r, 118, 80, 1.2, hop(2.4));
  trollA(r, 140, 76, 1, hop(3.6));
}

// ---------------------------------------------------------------------------
// 19. Anitra's Dance: a chieftain's daughter dancing in a desert tent by
//     lamplight, Peer's purse of gold on the cushions
// ---------------------------------------------------------------------------

const aniA = palette({
  t0: "#2a1420",
  t1: "#4a1e2a",
  t2: "#7a2e30",
  stripe: "#c88a3a",
  sand: "#d8a868",
  night: "#14183a",
  star: "#f2e6b0",
  veil: "#e8c0c8",
  veilD: "#b0607a",
  skin: "#b8784a",
  hair: "#1a0e0a",
  gold: "#f0c24a",
  goldD: "#9a6a1e",
  rug: "#6a2a5a",
});
const aniBackA = fracture(231, [[aniA.c.t0, aniA.c.t1], [aniA.c.t1, aniA.c.t2], [aniA.c.t2, aniA.c.t1]], 4);
const aniLampA = { [aniA.c.t0]: aniA.c.t1, [aniA.c.t1]: aniA.c.t2, [aniA.c.t2]: aniA.c.stripe, [aniA.c.rug]: aniA.c.veilD };

function renderAnitraA(r: Raster, f: Frame) {
  const { c } = aniA;
  paintPlanes(r, aniBackA, f);
  // The tent's opening: night sky and the desert beyond.
  r.fill([[112, 84], [124, 18], [136, 84]], c.night);
  r.fill([[114, 84], [124, 64], [134, 84]], c.sand);
  for (const [x, y] of [[124, 30], [121, 44], [127, 52]] as Pt[]) r.dot(x, y, c.star);
  // Tent stripes sloping to the pole.
  for (const x of [0, 30, 60, 150]) r.line(x, 100, 80, -4, c.stripe);

  // The hanging lamp swings a little, its light swelling.
  const sw = wave(f, 0.7) * 2;
  r.line(48, 0, 48 + sw, 14, c.goldD);
  r.tint(ellipse(48 + sw, 22, 30, 26, 0, Math.PI * 2, 18), aniLampA, 5);
  r.fill([[44 + sw, 14], [52 + sw, 14], [50 + sw, 22], [46 + sw, 22]], c.gold, c.goldD, 4);
  r.dot(48 + sw, 23, c.star);

  // The rug and cushions; Peer's purse spilling coins.
  r.fill([[0, 86], [160, 82], [160, 100], [0, 100]], c.rug, c.t1, 4);
  r.fill(ellipse(26, 84, 14, 5, 0, Math.PI * 2, 16), c.stripe, c.t2, 6);
  r.fill(ellipse(24, 78, 5, 4, 0, Math.PI * 2, 12), c.goldD);
  for (const [x, y] of [[30, 81], [33, 83], [36, 80], [18, 82]] as Pt[]) r.fill(rect(x, y, 2, 1), c.gold);

  // Anitra turns and sways: veil swirling, arms raised.
  const sway = wave(f, 1.1) * 3;
  const x = 82 + sway * 0.5;
  r.fill([[x - 3, 54], [x + 3, 54], [x + 12 + sway, 84], [x - 12 + sway, 84]], c.veil, c.veilD, 5);
  r.fill(rect(x - 3, 42, 6, 12), c.skin);
  r.fill(rect(x - 3, 47, 6, 3), c.veilD);
  r.fill(ellipse(x, 37, 3.5, 4, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(x, 35, 4, 3, Math.PI, Math.PI * 2, 10), c.hair);
  r.line(x + 3, 35, x + 6, 44, c.hair);
  thick(r, x - 3, 44, x - 10 - sway, 32, c.skin);
  thick(r, x + 2, 44, x + 9 - sway, 30, c.skin);
  r.stroke([[x - 10 - sway, 32], [x - 2, 22 + sway], [x + 9 - sway, 30]], c.veil, false);
  r.dot(x - 10 - sway, 34, c.gold);
  r.dot(x + 10 - sway, 32, c.gold);
}

// ---------------------------------------------------------------------------
// 20. Tales from the Vienna Woods: a zither on a garden table at the edge of
//     the woods, a bird singing in the branches
// ---------------------------------------------------------------------------

const vwA = palette({
  g0: "#1e3420",
  g1: "#2e4a2a",
  g2: "#4a6a36",
  leaf: "#7a9a48",
  sun: "#e8d890",
  sky: "#a8c4b0",
  trunk: "#3a2a1c",
  table: "#8a5a32",
  tableL: "#b07a44",
  zither: "#c08a4a",
  zitherD: "#6a4022",
  string: "#ece4c8",
  bird: "#5a4a3a",
  breast: "#d0703a",
  wine: "#c8c070",
  gold: "#e0c060",
});
const vwBackA = fracture(241, [[vwA.c.g0, vwA.c.g1], [vwA.c.g1, vwA.c.g2], [vwA.c.g2, vwA.c.leaf], [vwA.c.g1, vwA.c.sky]], 4);
const vwSunA = { [vwA.c.g0]: vwA.c.g1, [vwA.c.g1]: vwA.c.g2, [vwA.c.g2]: vwA.c.leaf, [vwA.c.leaf]: vwA.c.sun };

function renderViennaWoodsA(r: Raster, f: Frame) {
  const { c } = vwA;
  paintPlanes(r, vwBackA, f);
  r.tint([[60, -4], [100, -4], [130, 100], [40, 100]], vwSunA, 3);

  // Trunks of the beech wood.
  for (const [x, w] of [[14, 6], [44, 4], [118, 5], [146, 7]] as Pt[]) r.fill([[x, -4], [x + w, -4], [x + w + 1, 70], [x - 1, 70]], c.trunk, c.g0, 4);

  // A bird on a branch, its head bobbing as it sings (the flute's birdsong).
  r.line(124, 36, 92, 30, c.trunk);
  r.line(124, 37, 92, 31, c.trunk);
  const bob = f.still ? 0 : Math.max(0, wave(f, 2.2)) * 1.2;
  r.fill(ellipse(104, 25, 6, 4, 0, Math.PI * 2, 14), c.bird);
  r.fill(ellipse(102, 27, 3.5, 2.5, 0, Math.PI * 2, 10), c.breast);
  r.fill(ellipse(98, 21 - bob, 3, 3, 0, Math.PI * 2, 10), c.bird);
  r.dot(97, 20 - bob, c.sun);
  r.fill([[95, 21 - bob], [91, 20 - bob], [95, 22 - bob]], c.sun);
  r.fill([[109, 23], [116, 20], [114, 26]], c.bird);
  r.line(103, 29, 103, 31, c.trunk);
  if (!f.still && wave(f, 2.2) > 0.3) for (const [dx, dy] of [[-8, -5], [-11, -1], [-10, -9]] as Pt[]) r.dot(92 + dx, 21 + dy, c.sun);

  // The garden table, a glass of wine, and the zither lying ready.
  r.fill([[20, 70], [140, 66], [148, 76], [12, 80]], c.table, c.tableL, 4);
  for (const x of [20, 136]) r.fill(rect(x, 78, 4, 22), c.table);
  r.fill([[34, 71], [100, 67], [110, 79], [30, 85]], c.zither, c.zitherD, 3);
  r.stroke([[34, 71], [100, 67], [110, 79], [30, 85]], c.zitherD);
  r.fill(ellipse(72, 76, 5, 3, 0, Math.PI * 2, 12), c.zitherD);
  for (let k = 0; k < 9; k++) r.dot(37 + k * 0.4, 72 + k * 1.4, c.gold);
  // The strings tremble while it plays.
  for (let k = 0; k < 5; k++) {
    const v = f.still ? 0 : wave(f, 7, k) * 0.4;
    r.line(38, 73 + k * 2.4 + v, 102, 69 + k * 2.2 - v, c.string);
  }
  r.fill(rect(118, 58, 5, 9), c.wine, c.sun, 4);
  r.line(120, 67, 120, 70, c.string);
}

// ---------------------------------------------------------------------------
// 21. Piano Concerto No. 1: a concert grand on a gaslit stage, the horns'
//     bells raised behind it and great chords breaking over the keyboard
// ---------------------------------------------------------------------------

const tcA = palette({
  h0: "#1a0c10",
  h1: "#341420",
  h2: "#5a1e2a",
  curtain: "#8a1e26",
  curtainL: "#b2343a",
  gilt: "#d8a840",
  giltD: "#7a5a20",
  piano: "#08070a",
  pianoL: "#34303e",
  ivory: "#ece4cc",
  brass: "#e0b84a",
  brassD: "#9a7428",
  spark: "#fff0b0",
});
const tcBackA = fracture(251, [[tcA.c.h0, tcA.c.h1], [tcA.c.h1, tcA.c.h2], [tcA.c.h1, tcA.c.h0]], 4);
const tcStageA = { [tcA.c.h0]: tcA.c.h1, [tcA.c.h1]: tcA.c.h2, [tcA.c.h2]: tcA.c.curtain };

/** A french horn seen side-on: coiled tubing and a flared bell. */
function hornA(r: Raster, x: number, y: number) {
  const { c } = tcA;
  r.stroke(ellipse(x, y, 6, 6, 0, Math.PI * 2, 16), c.brass);
  r.stroke(ellipse(x, y, 4, 4, 0, Math.PI * 2, 12), c.brassD);
  r.fill([[x + 4, y - 2], [x + 12, y - 7], [x + 12, y + 3]], c.brass, c.brassD, 4);
}

function renderTchaikovskyA(r: Raster, f: Frame) {
  const { c } = tcA;
  paintPlanes(r, tcBackA, f);
  // Proscenium curtains, swagged with gilt tassels.
  r.fill([[-4, -4], [26, -4], [18, 40], [8, 92], [-4, 92]], c.curtain, c.curtainL, 4);
  r.fill([[164, -4], [134, -4], [142, 40], [152, 92], [164, 92]], c.curtain, c.curtainL, 4);
  r.fill(rect(-4, -4, 168, 8), c.curtainL, c.gilt, 3);
  r.dot(18, 40, c.gilt);
  r.dot(142, 40, c.gilt);
  r.tint(ellipse(80, 60, 52, 36, 0, Math.PI * 2, 22), tcStageA, 6);
  r.fill(rect(-4, 84, 168, 20), c.h2, c.giltD, 3);

  // Four horns at the back of the stage: they open the concerto.
  for (let k = 0; k < 4; k++) hornA(r, 34 + k * 14, 28 + (k % 2) * 3);

  // The concert grand, lid raised.
  r.fill(([[42, 58], [118, 58], [62, 26]] as Pt[]).map((p) => drift(p, f, 0.4)), c.pianoL, c.piano, 8);
  r.line(62, 26, 118, 58, c.pianoL);
  r.fill([[36, 58], [116, 58], [128, 64], [128, 74], [36, 74]], c.piano, c.pianoL, 2);
  r.fill(rect(30, 61, 14, 3), c.ivory);
  for (let x = 31; x < 44; x += 2) r.dot(x, 61, c.piano);
  for (const x of [40, 84, 122]) r.fill(rect(x, 74, 2, 12), c.piano);

  // The great opening chords: bursts of light rising from the keyboard in time.
  for (let k = 0; k < 4; k++) {
    const p = f.still ? 0.5 : (f.t * 0.25 + k / 4) % 1;
    const y = 58 - p * 34;
    const w = 3 + p * 10;
    if (p > 0.05) for (let i = 0; i < 3; i++) r.fill(rect(30 + i * 5 - w / 4, y - i * 2, 2, 2), p < 0.7 ? c.spark : c.gilt);
  }
}

// ---------------------------------------------------------------------------
// 22. Piano Concerto No. 2, Adagio: a piano by an open window at dawn, birches
//     and a still lake outside, a flute and clarinet resting on the lid
// ---------------------------------------------------------------------------

const rcA = palette({
  w0: "#2a2a3a",
  w1: "#3e3c52",
  w2: "#5a5470",
  sky: "#e8c8b0",
  skyL: "#f4e2c8",
  sun: "#fff2d0",
  lake: "#9ab0c4",
  lakeL: "#c8d4dc",
  far: "#6a7a8a",
  birch: "#f0ece4",
  bark: "#2a2622",
  leaf: "#b0b860",
  piano: "#14121a",
  pianoL: "#4a4658",
  silver: "#c8c8d0",
  reed: "#1e1a18",
});
const rcBackA = fracture(261, [[rcA.c.w0, rcA.c.w1], [rcA.c.w1, rcA.c.w2], [rcA.c.w1, rcA.c.w0]], 4);
const rcDawnA = fracture(263, [[rcA.c.sky, rcA.c.skyL], [rcA.c.skyL, rcA.c.sky]], 3, [86, 8, 146, 50]);
const rcLightA = { [rcA.c.w0]: rcA.c.w1, [rcA.c.w1]: rcA.c.w2, [rcA.c.w2]: rcA.c.far };

function renderRachmaninoffA(r: Raster, f: Frame) {
  const { c } = rcA;
  paintPlanes(r, rcBackA, f);
  r.tint([[86, 70], [146, 70], [120, 100], [30, 100]], rcLightA, 4);

  // The window: dawn over a lake, birches at the shore.
  r.fill(rect(82, 4, 68, 68), c.w2);
  paintPlanes(r, rcDawnA, f);
  const rise = f.still ? 0 : wave(f, 0.03) * 1.5;
  r.fill(ellipse(124, 48 + rise, 7, 7, Math.PI, Math.PI * 2, 16), c.sun);
  r.fill([[86, 50], [100, 44], [116, 48], [132, 42], [146, 47], [146, 52], [86, 52]], c.far);
  r.fill(rect(86, 52, 60, 16), c.lake, c.lakeL, 3);
  for (let k = 0; k < 4; k++) r.fill(rect(118 + wave(f, 0.5, k) * 2 - k, 54 + k * 3, 12 - k * 2, 1), c.sun);
  for (const [x, h] of [[92, 34], [98, 28], [138, 30]] as Pt[]) {
    r.fill(rect(x, 52 - h, 2, h), c.birch);
    for (let y = 54 - h; y < 52; y += 5) r.dot(x + ((y >> 2) & 1), y, c.bark);
    const s = wave(f, 0.4, x) * 1.2;
    r.fill(ellipse(x + 1 + s, 52 - h, 5, 4, 0, Math.PI * 2, 12), c.leaf, c.far, 4);
  }
  r.fill(rect(115, 8, 2, 60), c.w2);
  r.fill(rect(86, 36, 60, 2), c.w2);
  // The curtain stirs in the morning air.
  const blow = wave(f, 0.3) * 2;
  r.fill([[80, 2], [88, 2], [86 + blow, 40], [90 + blow, 74], [78, 74]], c.lakeL, c.w2, 6);

  // The piano, lid closed, the flute and clarinet laid across it.
  r.fill([[6, 62], [84, 60], [92, 66], [92, 76], [6, 78]], c.piano, c.pianoL, 2);
  r.fill(rect(6, 64, 14, 3), c.birch);
  for (let x = 7; x < 20; x += 2) r.dot(x, 64, c.piano);
  r.fill([[28, 58], [70, 55], [70, 56], [28, 59]], c.silver);
  for (let k = 0; k < 5; k++) r.dot(40 + k * 5, 57 - k * 0.3, c.pianoL);
  r.fill([[34, 61], [72, 58], [72, 60], [34, 63]], c.reed);
  r.fill([[72, 57], [76, 56], [76, 62], [72, 61]], c.reed);
  for (let k = 0; k < 4; k++) r.dot(44 + k * 6, 61 - k * 0.5, c.silver);
  for (const x of [12, 80]) r.fill(rect(x, 78, 3, 20), c.piano);
}

// ---------------------------------------------------------------------------
// 23. The Great Gate of Kiev: Hartmann's design, a great arched gate crowned
//     by a cupola shaped like a warrior's helmet, its bells ringing
// ---------------------------------------------------------------------------

const ggA = palette({
  s0: "#3a5a8a",
  s1: "#5a7aa8",
  s2: "#8aa4c8",
  cloud: "#e4e8ee",
  stone: "#e4d8c0",
  stoneD: "#b4a488",
  shade: "#7a6c58",
  brick: "#a84a32",
  gold: "#e8b840",
  goldD: "#9a7020",
  dome: "#3a6a4a",
  domeL: "#5a9a64",
  dark: "#1e1814",
  crowd: "#4a3a3a",
});
const ggSkyA = fracture(271, [[ggA.c.s0, ggA.c.s1], [ggA.c.s1, ggA.c.s2], [ggA.c.s2, ggA.c.cloud]], 4, [-8, -8, 168, 84]);

function bellA(r: Raster, x: number, y: number, a: number) {
  const { c } = ggA;
  r.fill(place([[-3, 0], [3, 0], [4, 5], [-4, 5]], x, y, a), c.gold, c.goldD, 4);
  const [[cx, cy]] = place([[0, 6]], x, y, a);
  r.dot(cx, cy, c.goldD);
}

function renderGreatGateA(r: Raster, f: Frame) {
  const { c } = ggA;
  paintPlanes(r, ggSkyA, f);

  // The bell tower beside the gate; its bells swing.
  r.fill(rect(118, 26, 22, 58), c.stone, c.stoneD, 4);
  r.fill([[116, 26], [142, 26], [129, 8]], c.brick);
  r.fill(rect(122, 34, 14, 14), c.dark);
  for (const [x, ph] of [[126, 0], [132, 1.3]] as Pt[]) bellA(r, x, 37, f.still ? 0 : wave(f, 1.4, ph) * 0.45);
  r.fill(rect(122, 56, 14, 3), c.brick);

  // The gate: a broad block of stone, a round arch, and the helmet-shaped cupola.
  r.fill(rect(28, 34, 76, 50), c.stone, c.stoneD, 3);
  r.fill(rect(28, 34, 76, 4), c.brick);
  r.fill(rect(28, 46, 76, 2), c.brick);
  r.fill([...ellipse(66, 62, 16, 16, Math.PI, Math.PI * 2, 16), [82, 84], [50, 84]], c.dark);
  r.fill([...ellipse(66, 62, 16, 16, Math.PI, Math.PI * 2, 16), [82, 84], [82, 62]], c.shade, c.dark, 8);
  for (const x of [36, 92]) r.fill(rect(x, 54, 5, 30), c.stoneD, c.shade, 4);
  // A drum and the helmet dome with its spike.
  r.fill(rect(52, 22, 28, 12), c.stone, c.stoneD, 5);
  for (let x = 55; x < 78; x += 6) r.fill(rect(x, 25, 2, 6), c.shade);
  r.fill([...ellipse(66, 22, 16, 14, Math.PI, Math.PI * 2, 18)], c.dome, c.domeL, 5);
  r.fill([[64, 9], [68, 9], [66, -2]], c.gold);
  r.fill(rect(50, 21, 32, 2), c.gold);

  // The crowd processing beneath the gate.
  r.fill(rect(-4, 84, 168, 20), c.stoneD, c.shade, 6);
  const step = f.still ? 0 : (f.t * 0.8) % 8;
  for (let x = -8; x < 168; x += 8) {
    const px = x + step;
    r.fill(rect(px, 82, 3, 7), c.crowd);
    r.dot(px + 1, 81, c.crowd);
  }
}

// ---------------------------------------------------------------------------
// 24. In the Steppes of Central Asia: a camel caravan crossing the endless
//     steppe under escort, horsemen riding alongside
// ---------------------------------------------------------------------------

const stpA = palette({
  sky: "#d8c49a",
  skyL: "#eadcb4",
  haze: "#b8a07a",
  sun: "#f6eccc",
  land: "#a8884e",
  landL: "#c4a466",
  landD: "#7a6034",
  camel: "#6a4a2a",
  camelL: "#8a6438",
  pack: "#8a2e2a",
  rider: "#2a2a34",
  white: "#e8e2d2",
  horse: "#3a2a20",
});
const stpSkyA = fracture(281, [[stpA.c.sky, stpA.c.skyL], [stpA.c.skyL, stpA.c.sky], [stpA.c.sky, stpA.c.haze]], 4, [-8, -8, 168, 56]);
const stpLandA = fracture(283, [[stpA.c.land, stpA.c.landL], [stpA.c.landL, stpA.c.land], [stpA.c.land, stpA.c.landD]], 4, [-8, 54, 168, 108]);

function camelA(r: Raster, x: number, y: number, step: number) {
  const { c } = stpA;
  r.fill([[x - 8, y], [x - 4, y - 7], [x - 1, y - 4], [x + 2, y - 8], [x + 6, y - 2], [x + 6, y + 2], [x - 8, y + 2]], c.camel, c.camelL, 4);
  r.fill([[x - 2, y - 7], [x + 2, y - 9], [x + 3, y - 5]], c.pack);
  thick(r, x + 5, y - 1, x + 9, y - 8, c.camel);
  r.fill([[x + 8, y - 10], [x + 13, y - 9], [x + 12, y - 7], [x + 9, y - 7]], c.camel);
  for (const [dx, ph] of [[-7, 0], [-4, 1], [3, 0], [5, 1]] as Pt[]) {
    const s = ph ? step : -step;
    r.line(x + dx, y + 2, x + dx + s, y + 9, c.camel);
  }
}

function riderA(r: Raster, x: number, y: number, step: number) {
  const { c } = stpA;
  r.fill([[x - 6, y], [x + 5, y], [x + 6, y + 4], [x - 6, y + 4]], c.horse);
  r.fill([[x + 4, y], [x + 8, y - 5], [x + 10, y - 4], [x + 7, y + 2]], c.horse);
  for (const [dx, s] of [[-5, step], [-3, -step], [3, step], [5, -step]] as Pt[]) r.line(x + dx, y + 4, x + dx + s, y + 9, c.horse);
  r.fill(rect(x - 2, y - 7, 4, 7), c.rider);
  r.fill(rect(x - 2, y - 10, 4, 3), c.white);
  r.line(x + 1, y - 9, x + 3, y - 17, c.rider);
}

function renderSteppesA(r: Raster, f: Frame) {
  const { c } = stpA;
  paintPlanes(r, stpSkyA, f);
  r.fill(ellipse(132, 26, 8, 8, 0, Math.PI * 2, 20), c.sun);
  paintPlanes(r, stpLandA, f);
  r.fill(rect(-4, 54, 168, 3), c.haze, c.landL, 6);

  // The caravan travels slowly across, from right to left, and away.
  const off = f.still ? 0 : (f.t * 1.2) % 200;
  const step = f.still ? 0 : wave(f, 2.4) * 1.5;
  for (let k = 0; k < 5; k++) {
    const x = ((150 - off + k * 22 + 400) % 200) - 20;
    camelA(r, x, 66 + k * 0.5, k % 2 ? step : -step);
  }
  // The escort rides alongside, in front.
  for (let k = 0; k < 2; k++) {
    const x = ((120 - off + k * 70 + 400) % 200) - 20;
    riderA(r, x, 80, k % 2 ? -step : step);
  }
}

// ---------------------------------------------------------------------------
// 25. Danse macabre: Death fiddling by a church clock at midnight while
//     skeletons dance among the graves
// ---------------------------------------------------------------------------

const dmA = palette({
  n0: "#0a0c16",
  n1: "#161a2c",
  n2: "#262c44",
  moon: "#e8e4cc",
  ground: "#1a2018",
  groundL: "#2a3424",
  stone: "#6a6a72",
  stoneD: "#3a3a44",
  bone: "#ece8dc",
  boneS: "#a8a49a",
  cloak: "#06060a",
  fiddle: "#8a3a1a",
  clock: "#d8c890",
  hand: "#1a1a22",
});
const dmSkyA = fracture(291, [[dmA.c.n0, dmA.c.n1], [dmA.c.n1, dmA.c.n2], [dmA.c.n1, dmA.c.n0]], 4, [-8, -8, 168, 74]);

function skeletonA(r: Raster, x: number, y: number, ph: number, f: Frame) {
  const { c } = dmA;
  const k = wave(f, 1.8, ph) * 3;
  const j = f.still ? 0 : Math.abs(wave(f, 1.8, ph)) * 2;
  y -= j;
  r.fill(ellipse(x, y, 2.5, 2.5, 0, Math.PI * 2, 10), c.bone);
  r.dot(x - 1, y, c.cloak);
  r.dot(x + 1, y, c.cloak);
  r.line(x, y + 3, x, y + 11, c.bone);
  for (let i = 0; i < 3; i++) r.line(x - 2, y + 5 + i * 2, x + 2, y + 5 + i * 2, c.boneS);
  r.line(x, y + 4, x - 5 - k, y + 1 - k, c.bone);
  r.line(x, y + 4, x + 5 - k, y + 1 + k, c.bone);
  r.line(x, y + 11, x - 3 + k, y + 18 + j, c.bone);
  r.line(x, y + 11, x + 3 + k, y + 18 + j, c.bone);
}

function renderDanseMacabreA(r: Raster, f: Frame) {
  const { c } = dmA;
  paintPlanes(r, dmSkyA, f);
  r.fill(ellipse(26, 18, 8, 8, 0, Math.PI * 2, 22), c.moon);
  r.fill(ellipse(29, 16, 7, 7, 0, Math.PI * 2, 18), c.n1, c.n2, 4);

  // The church tower and its clock at midnight.
  r.fill(rect(124, 4, 28, 72), c.stoneD, c.stone, 3);
  r.fill([[122, 4], [154, 4], [138, -8]], c.stoneD);
  r.fill(ellipse(138, 22, 9, 9, 0, Math.PI * 2, 20), c.clock);
  r.stroke(ellipse(138, 22, 9, 9, 0, Math.PI * 2, 20), c.hand);
  r.line(138, 22, 138, 15, c.hand);
  r.line(138, 22, 138, 16, c.hand);
  for (let i = 0; i < 12; i++) r.dot(138 + Math.cos((i / 12) * Math.PI * 2) * 7, 22 + Math.sin((i / 12) * Math.PI * 2) * 7, c.hand);
  r.fill([...ellipse(138, 50, 5, 5, Math.PI, Math.PI * 2, 8), [143, 62], [133, 62]], c.n0);

  // The graveyard.
  r.fill(([[-4, 72], [60, 68], [164, 74], [164, 104], [-4, 104]] as Pt[]).map((p) => drift(p, f, 0.5)), c.ground, c.groundL, 4);
  for (const [x, y, h] of [[10, 76, 10], [34, 80, 8], [108, 78, 9], [150, 84, 11]] as [number, number, number][]) {
    r.fill([...ellipse(x + 3, y, 3, 3, Math.PI, Math.PI * 2, 6), [x + 6, y + h], [x, y + h]], c.stone, c.stoneD, 5);
  }
  r.fill(rect(60, 70, 2, 12), c.stone);
  r.fill(rect(57, 73, 8, 2), c.stone);

  // Skeletons dance.
  skeletonA(r, 22, 64, 0, f);
  skeletonA(r, 46, 66, 1.4, f);
  skeletonA(r, 100, 66, 2.8, f);

  // Death, hooded, sawing at his fiddle.
  const bow = wave(f, 1.8) * 5;
  r.fill([[66, 40], [80, 40], [88, 84], [58, 84]], c.cloak);
  r.fill(ellipse(73, 36, 6, 7, 0, Math.PI * 2, 16), c.cloak);
  r.fill(ellipse(74, 37, 3, 3.5, 0, Math.PI * 2, 10), c.bone);
  r.dot(73, 36, c.cloak);
  r.dot(75, 36, c.cloak);
  r.fill(place([[-3, -4], [3, -4], [4, 4], [-4, 4]], 82, 46, 0.6), c.fiddle);
  r.line(80, 43, 74, 50, c.fiddle);
  r.line(70 + bow, 38, 94 + bow, 52, c.boneS);
  r.line(78, 46, 70 + bow * 0.6, 50, c.bone);
}

// ---------------------------------------------------------------------------
// 26. Jesu, Joy of Man's Desiring: a choir in a church gallery under organ pipes,
//     a ribbon of flowing triplets, and Bach's trumpet
// ---------------------------------------------------------------------------

const jjB = palette({
  c0: "#140f0c",
  c1: "#261b14",
  c2: "#3a2a1e",
  pipe: "#b7b2a4",
  pipeD: "#6e6a60",
  wood: "#6a4224",
  woodL: "#8c5c32",
  robe: "#2c3a5c",
  robeL: "#43567e",
  collar: "#ece4d0",
  skin: "#d8b896",
  note: "#f2e6c4",
  brass: "#d6a642",
  brassD: "#8e6a26",
});
const jjBack = fracture(301, [[jjB.c.c0, jjB.c.c1], [jjB.c.c1, jjB.c.c2], [jjB.c.c1, jjB.c.c0]], 4);
const jjPipes = [9, 6, 4, 3, 5, 8, 11, 13, 10, 7, 5, 4, 6, 9, 12, 14, 11, 8, 6, 5, 7, 10];

function renderJesuJoyB(r: Raster, f: Frame) {
  const { c } = jjB;
  paintPlanes(r, jjBack, f);

  // Organ pipes along the top, the longest in the middle of each tower.
  r.fill(rect(6, 34, 148, 4), c.wood, c.woodL, 4);
  jjPipes.forEach((h, i) => {
    const x = 8 + i * 6.6;
    const top = 6 + h;
    r.fill(rect(x, top, 4, 34 - top), c.pipe, c.pipeD, 5);
    r.fill(rect(x + 2, top, 2, 34 - top), c.pipeD, c.pipe, 3);
    r.fill([[x, 30], [x + 4, 30], [x + 2, 27]], c.c0);
  });

  // The ribbon of triplets, flowing left to right in groups of three.
  const run = f.still ? 0 : (f.t * 4) % 24;
  for (let g = -1; g < 7; g++) {
    const gx = 6 + g * 24 + run;
    const ys = [0, 1, 2].map((k) => 46 + Math.sin((gx + k * 7) * 0.06) * 5 - k * 1.5);
    [0, 1, 2].forEach((k) => {
      const x = gx + k * 7;
      r.fill(ellipse(x, ys[k], 2, 1.5, 0, Math.PI * 2, 8), c.note);
      r.line(x + 2, ys[k], x + 2, ys[k] - 6, c.note);
    });
    r.line(gx + 2, ys[0] - 6, gx + 16, ys[2] - 6, c.note);
  }

  // The choir in its gallery, singing; heads lift a little on each breath.
  for (let i = 0; i < 7; i++) {
    const x = 14 + i * 13;
    const lift = wave(f, 0.5, i * 0.9) * 0.6;
    r.fill([[x - 5, 70], [x - 4, 62], [x + 4, 62], [x + 5, 70]], i % 2 ? c.robe : c.robeL, c.robe, 4);
    r.fill([[x - 3, 62], [x + 3, 62], [x, 65]], c.collar);
    r.fill(ellipse(x, 58 + lift, 3, 3.4, 0, Math.PI * 2, 12), c.skin);
    r.dot(x, 60 + lift, c.c1);
  }
  r.fill(rect(4, 70, 98, 6), c.wood, c.woodL, 3);
  for (let x = 8; x < 100; x += 8) r.fill(rect(x, 76, 2, 14), c.wood);
  r.fill(rect(4, 88, 98, 3), c.wood, c.woodL, 3);

  // A natural trumpet resting on the rail, its bell catching the light.
  const shine = f.still ? 0 : Math.round(wave(f, 0.6) * 2);
  r.fill(rect(108, 82, 34, 2), c.brass);
  r.fill(rect(112, 88, 30, 2), c.brassD);
  r.stroke(ellipse(142, 86, 3, 3, -Math.PI / 2, Math.PI / 2, 8), c.brass, false);
  r.stroke(ellipse(112, 85, 2, 3, Math.PI / 2, Math.PI * 1.5, 6), c.brassD, false);
  r.fill([[142 + 0, 77], [154, 72], [154, 92], [142, 87]], c.brass, c.brassD, 4 + shine);
  r.fill(rect(104, 81, 4, 4), c.brassD);
}

// ---------------------------------------------------------------------------
// 27. Badinerie: a baroque flute, notes skipping off it, and a jester's mask
// ---------------------------------------------------------------------------

const badB = palette({
  s0: "#2e4a6a",
  s1: "#3e6088",
  s2: "#5a7ea4",
  gold: "#e2b850",
  goldD: "#a07c2c",
  box: "#d6b47c",
  boxD: "#a07c4c",
  ring: "#2a1c12",
  cream: "#f4ecd6",
  mask: "#c23a3a",
  maskD: "#7e2222",
  ink: "#141824",
});
const badBack = fracture(311, [[badB.c.s0, badB.c.s1], [badB.c.s1, badB.c.s2], [badB.c.s0, badB.c.s1]], 4);
const badHop = [0, 3, 1, 4, 2, 5, 3, 6, 4, 2, 5, 1];

function renderBadinerieB(r: Raster, f: Frame) {
  const { c } = badB;
  paintPlanes(r, badBack, f, c.s0);

  // A jester's half-mask, tilting playfully.
  const tip = wave(f, 0.7) * 0.15;
  const m = (pts: Pt[]) => place(pts, 30, 28, tip);
  r.fill(m([[-14, -6], [0, -9], [14, -6], [12, 4], [4, 8], [0, 4], [-4, 8], [-12, 4]]), c.mask, c.maskD, 4);
  r.fill(m(ellipse(-6, -1, 3, 2, 0, Math.PI * 2, 10)), c.ink);
  r.fill(m(ellipse(6, -1, 3, 2, 0, Math.PI * 2, 10)), c.ink);
  r.fill(m([[-14, -6], [-22, -16], [-10, -8]]), c.gold);
  r.fill(m([[14, -6], [22, -16], [10, -8]]), c.gold);
  r.dot(...(m([[-22, -16]])[0] as [number, number]), c.cream);
  r.dot(...(m([[22, -16]])[0] as [number, number]), c.cream);

  // The flute: boxwood in sections joined by dark rings, laid on a diagonal.
  const fl = (pts: Pt[]) => place(pts, 84, 62, -0.32);
  r.fill(fl(rect(-56, -3, 112, 6)), c.box, c.boxD, 4);
  r.fill(fl(rect(-56, 0, 112, 3)), c.boxD, c.box, 6);
  for (const x of [-56, -36, -6, 24, 52]) r.fill(fl(rect(x, -4, 4, 8)), c.ring);
  r.fill(fl(ellipse(-44, -1, 1.6, 1.2, 0, Math.PI * 2, 8)), c.ink);
  for (const x of [-16, -10, -4, 6, 12, 18]) r.fill(fl(ellipse(x, -1, 1.2, 1.2, 0, Math.PI * 2, 6)), c.ink);
  r.fill(fl(rect(34, -1, 3, 2)), c.gold);

  // The tune, skipping away from the flute's mouth fast and light.
  const run = f.still ? 0 : (f.t * 9) % 12;
  for (let i = 0; i < 12; i++) {
    const k = (i + run) % 12;
    const x = 64 + k * 7.5;
    const y = 36 - badHop[i] * 2.5 - k * 1.2;
    r.fill(ellipse(x, y, 1.8, 1.3, 0, Math.PI * 2, 8), c.cream);
    r.line(x + 2, y, x + 2, y - 5, c.cream);
    if (i % 2 === 0) r.line(x + 2, y - 5, x + 4, y - 3, c.cream);
  }
}

// ---------------------------------------------------------------------------
// 28. The Harmonious Blacksmith: a forge, a hammer on the anvil, rain at the door
// ---------------------------------------------------------------------------

const bsB = palette({
  f0: "#120c0a",
  f1: "#24160f",
  f2: "#3a2316",
  glow: "#6a3418",
  fire: "#e86a24",
  fireL: "#ffb44a",
  spark: "#fff0a0",
  iron: "#4a4c54",
  ironL: "#7a7e88",
  wood: "#5a3a22",
  rain: "#7aa0c4",
  night: "#1a2638",
  nightL: "#2a3a54",
});
const bsBack = fracture(321, [[bsB.c.f0, bsB.c.f1], [bsB.c.f1, bsB.c.f2], [bsB.c.f1, bsB.c.f0]], 4);
const bsDoor = fracture(327, [[bsB.c.night, bsB.c.nightL], [bsB.c.nightL, bsB.c.night]], 3, [8, 18, 40, 92]);
const forgeLight = { [bsB.c.f0]: bsB.c.f1, [bsB.c.f1]: bsB.c.f2, [bsB.c.f2]: bsB.c.glow, [bsB.c.iron]: bsB.c.ironL };

function renderBlacksmithB(r: Raster, f: Frame) {
  const { c } = bsB;
  paintPlanes(r, bsBack, f);

  // The open doorway, rain slanting past it.
  r.fill(rect(5, 15, 38, 80), c.wood);
  paintPlanes(r, bsDoor, f);
  for (let k = 0; k < 16; k++) {
    const x = 10 + ((k * 7) % 28);
    const y = f.still ? 20 + ((k * 11) % 66) : 18 + ((f.t * 40 + k * 17) % 72);
    r.line(x, y, x - 1, y + 3, c.rain);
  }

  // The hearth, its fire breathing.
  const glowR = 26 + (f.still ? 0 : wave(f, 1.1) * 2);
  r.tint(ellipse(136, 46, glowR, glowR * 0.9, 0, Math.PI * 2, 20), forgeLight, 6);
  r.fill([[116, 30], [156, 30], [152, 60], [120, 60]], c.iron, c.f1, 6);
  r.fill(ellipse(136, 52, 12, 6, Math.PI, Math.PI * 2, 12), c.fire);
  const lick = f.still ? 0 : wave(f, 2.6) * 2;
  r.fill([[128, 52], [133, 40 + lick], [137, 46], [141, 38 - lick], [145, 52]], c.fire, c.fireL, 6);
  r.fill(rect(130, 6, 12, 24), c.f2, c.iron, 3);

  // The anvil, and the hammer rising and falling on it.
  r.fill([[70, 66], [114, 66], [108, 72], [76, 72]], c.iron, c.ironL, 3);
  r.fill([[62, 64], [70, 64], [70, 68]], c.iron);
  r.fill([[80, 72], [104, 72], [100, 80], [84, 80]], c.iron);
  r.fill([[78, 80], [106, 80], [110, 90], [74, 90]], c.wood);
  r.fill(rect(84, 63, 18, 3), c.fire, c.fireL, 6);
  const beat = f.still ? 1 : (f.t * 0.9) % 1;
  const lift = beat < 0.2 ? beat / 0.2 : 1 - (beat - 0.2) / 0.8;
  const a = -0.2 - (1 - lift) * 0.9;
  const hd = place([[0, 0]], 120, 58, a)[0];
  const [hx, hy] = place([[-26, 0]], 120, 58, a)[0];
  thick(r, hd[0], hd[1], hx, hy, c.wood);
  r.fill(place(rect(-32, -3, 8, 6), 120, 58, a), c.ironL, c.iron, 4);
  if (beat < 0.12 && !f.still) {
    for (let k = 0; k < 7; k++) r.dot(92 + Math.cos(k) * (4 + k * 2), 60 - Math.abs(Math.sin(k * 1.7)) * (3 + k), c.spark);
  }
}

// ---------------------------------------------------------------------------
// 29. Mandolin Concerto: a bowl-backed mandolin before the Venice lagoon at sunset
// ---------------------------------------------------------------------------

const manB = palette({
  s0: "#4a2a48",
  s1: "#a04a4a",
  s2: "#e08a52",
  s3: "#f4c47a",
  sea: "#3a4a6a",
  seaL: "#5a6a8a",
  tower: "#2a1a24",
  towerL: "#4a2e3a",
  body: "#8a4a1e",
  bodyL: "#b46a2c",
  bodyD: "#552a10",
  top: "#e8cc94",
  ebony: "#1a100a",
  string: "#f2ecd8",
  pearl: "#e4e0d4",
});
const manSea = fracture(331, [[manB.c.sea, manB.c.seaL], [manB.c.seaL, manB.c.sea], [manB.c.sea, manB.c.s1]], 3, [-8, 60, 168, 108]);
const manSky = [manB.c.s0, manB.c.s1, manB.c.s2, manB.c.s3];

function renderMandolinB(r: Raster, f: Frame) {
  const { c } = manB;
  for (let i = 0; i < 4; i++) r.fill(rect(0, i * 15, ART_W, 16), manSky[i], manSky[Math.min(3, i + 1)], 5);
  r.fill(ellipse(70, 60, 9, 9, Math.PI, Math.PI * 2, 14), c.s3, c.pearl, 6);
  paintPlanes(r, manSea, f);
  for (let k = 0; k < 6; k++) {
    const s = wave(f, 0.6, k) * 2;
    r.fill(rect(62 - k + s, 64 + k * 4, 16 + k * 2, 1), c.s3);
  }

  // The campanile of San Marco and the low line of the city across the water.
  r.fill([[0, 58], [12, 54], [56, 56], [60, 60], [0, 60]], c.tower);
  r.fill(rect(20, 14, 10, 46), c.tower, c.towerL, 3);
  r.fill(rect(19, 12, 12, 4), c.towerL);
  r.fill(rect(22, 16, 6, 6), c.s1);
  r.fill([[19, 12], [31, 12], [25, 2]], c.tower);
  r.fill([[40, 56], [44, 48], [48, 56]], c.tower);

  // The mandolin, tilted, its bowl split into ribs of light and shadow.
  const at = (pts: Pt[]) => place(pts, 110, 62, 0.6);
  r.fill(at(ellipse(0, 10, 18, 22, 0, Math.PI * 2, 28)), c.body, c.bodyL, 4);
  r.fill(at(ellipse(0, 10, 18, 22, -Math.PI / 2, Math.PI / 2, 14)), c.bodyD, c.body, 6);
  r.fill(at(ellipse(0, 6, 13, 16, 0, Math.PI * 2, 24)), c.top);
  r.fill(at(ellipse(0, 0, 4, 4, 0, Math.PI * 2, 12)), c.ebony);
  r.stroke(at(ellipse(0, 0, 5, 5, 0, Math.PI * 2, 12)), c.pearl);
  r.fill(at([[-3, -14], [3, -14], [2, -46], [-2, -46]]), c.ebony);
  r.fill(at([[-4, -46], [4, -46], [3, -56], [-3, -56]]), c.bodyD);
  r.fill(at(rect(-5, 14, 10, 2)), c.ebony);
  const buzz = f.still ? 0 : wave(f, 9) * 0.5;
  for (let k = 0; k < 4; k++) {
    const x = -1.5 + k;
    const [[x0, y0], [x1, y1]] = at([[x, -46], [x + (k === 1 || k === 2 ? buzz : 0), 15]]);
    r.line(x0, y0, x1, y1, c.string);
  }
}

// ---------------------------------------------------------------------------
// 30. Spring: birds over a meadow, a stream, and a thunderstorm passing over
// ---------------------------------------------------------------------------

const spgB = palette({
  sky: "#7ab4dc",
  skyL: "#a4d0ec",
  cloud: "#3a4458",
  cloudL: "#5a6478",
  bolt: "#fff6b0",
  grass: "#4a8a3a",
  grassL: "#6aaa4a",
  grassD: "#2e5e28",
  water: "#4a8ac4",
  waterL: "#9ccaee",
  bird: "#1c1c24",
  bloom: "#f4e04a",
  bloomP: "#e47aa4",
});
const spgSky = fracture(341, [[spgB.c.sky, spgB.c.skyL], [spgB.c.skyL, spgB.c.sky]], 3, [-8, -8, 168, 64]);
const spgField = fracture(347, [[spgB.c.grass, spgB.c.grassL], [spgB.c.grassL, spgB.c.grass], [spgB.c.grass, spgB.c.grassD]], 4, [-8, 54, 168, 108]);
const spgBirds: Pt[] = [[30, 22], [46, 14], [58, 28], [40, 34], [70, 18]];
const spgFlowers: Pt[] = [[12, 70], [24, 88], [44, 74], [100, 92], [118, 72], [146, 86], [62, 96], [140, 66]];

function renderSpringB(r: Raster, f: Frame) {
  const { c } = spgB;
  paintPlanes(r, spgSky, f);

  // The storm on the right: dark planes and a bolt that flashes now and then.
  r.fill(([[100, 6], [130, 0], [164, 4], [164, 40], [136, 34], [112, 30], [96, 20]] as Pt[]).map((p) => drift(p, f, 0.8)), c.cloud, c.cloudL, 4);
  r.fill([[110, 22], [140, 12], [164, 20], [164, 30], [124, 30]], c.cloudL, c.cloud, 6);
  if (f.still || wave(f, 0.5) > 0.85) {
    r.stroke([[134, 32], [128, 42], [134, 44], [126, 58]], c.bolt, false);
    r.stroke([[135, 32], [129, 42], [135, 44], [127, 58]], c.bolt, false);
  }

  paintPlanes(r, spgField, f);

  // The stream, winding forward, its ripples catching the light.
  r.fill([[70, 56], [80, 56], [96, 72], [84, 84], [104, 100], [60, 100], [72, 84], [64, 70]], c.water, c.waterL, 3);
  for (let k = 0; k < 6; k++) {
    const p = f.still ? k / 6 : (f.t * 0.15 + k / 6) % 1;
    const y = 58 + p * 40;
    const x = 72 + Math.sin(y * 0.15) * 6 + p * 6;
    r.fill(rect(x, y, 3, 1), c.waterL);
  }

  for (const [x, y] of spgFlowers) {
    r.dot(x, y, c.bloom);
    r.dot(x + 1, y + 1, c.bloomP);
  }

  // The birds, wheeling and dipping.
  spgBirds.forEach(([x, y], i) => {
    const bx = x + wave(f, 0.3, i * 2) * 6;
    const by = y + wave(f, 0.5, i) * 3;
    const flap = wave(f, 3 + i * 0.4, i) > 0 ? -2 : 1;
    r.stroke([[bx - 4, by + flap], [bx, by + 1], [bx + 4, by + flap]], c.bird, false);
  });
}

// ---------------------------------------------------------------------------
// 31. Albinoni's Adagio: an oboe on a stack of paper, a Venetian window at dusk
// ---------------------------------------------------------------------------

const albB = palette({
  w0: "#1c1620",
  w1: "#2c2230",
  w2: "#3e3040",
  dusk: "#6a4a7a",
  duskL: "#c2788a",
  sea: "#344a6a",
  stone: "#a89880",
  table: "#4a2c1c",
  tableL: "#6a4428",
  paper: "#ece0c4",
  paperS: "#b8a888",
  oboe: "#2a1810",
  oboeL: "#9a6a42",
  silver: "#d4d8e0",
});
const albBack = fracture(351, [[albB.c.w0, albB.c.w1], [albB.c.w1, albB.c.w2], [albB.c.w1, albB.c.w0]], 4);
const albView = fracture(357, [[albB.c.dusk, albB.c.duskL], [albB.c.duskL, albB.c.dusk]], 3, [108, 8, 142, 48]);
const albArch: Pt[] = [...ellipse(125, 22, 17, 14, Math.PI, Math.PI * 2, 14), [142, 58], [108, 58]];
const albLight = { [albB.c.w0]: albB.c.w1, [albB.c.w1]: albB.c.w2, [albB.c.table]: albB.c.tableL };

function renderAlbinoniB(r: Raster, f: Frame) {
  const { c } = albB;
  paintPlanes(r, albBack, f);
  r.tint([[108, 58], [142, 58], [150, 100], [60, 100]], albLight, 5);

  // The arched window: a dusk sky over the lagoon.
  r.fill(ellipse(125, 22, 20, 17, Math.PI, Math.PI * 2, 14).concat([[145, 60], [105, 60]] as Pt[]), c.stone);
  paintPlanes(r, albView.map((p) => ({ ...p, pts: clipConvex(p.pts, albArch) })), f);
  r.fill(clipConvex(rect(108, 46, 34, 12), albArch), c.sea);
  for (let k = 0; k < 3; k++) r.fill(rect(116 + k * 4 + wave(f, 0.4, k), 49 + k * 3, 8, 1), c.duskL);
  r.fill(rect(124, 10, 2, 48), c.stone);

  // The table and a tall stack of paper, the score on top.
  r.fill([[0, 70], [160, 64], [160, 100], [0, 100]], c.table, c.tableL, 3);
  for (let k = 0; k < 6; k++) r.fill([[18, 84 - k * 2], [56, 82 - k * 2], [58, 84 - k * 2], [20, 86 - k * 2]], k % 2 ? c.paper : c.paperS);
  const sheet = ([[16, 64], [58, 62], [60, 72], [18, 74]] as Pt[]).map((p) => drift(p, f, 0.4));
  r.fill(sheet, c.paper);
  for (let k = 0; k < 4; k++) r.line(20, 66 + k * 2, 56, 64 + k * 2, c.paperS);

  // The oboe lies across the table, its keys glinting slowly.
  const at = (pts: Pt[]) => place(pts, 98, 80, -0.18);
  r.fill(at([[-34, -3], [30, -4], [30, 3], [-34, 2]]), c.oboe, c.oboeL, 4);
  r.line(...(at([[-34, -3]])[0] as [number, number]), ...(at([[30, -4]])[0] as [number, number]), c.oboeL);
  r.fill(at([[30, -3], [40, -6], [40, 6], [30, 3]]), c.oboe, c.oboeL, 5);
  r.fill(at(rect(-40, -1, 6, 2)), c.paperS);
  r.fill(at(rect(-4, -3, 3, 6)), c.silver);
  const glint = f.still ? -1 : Math.floor(f.t * 0.8) % 6;
  for (let k = 0; k < 6; k++) {
    const [[x, y]] = at([[-26 + k * 9, -1]]);
    r.dot(x, y, k === glint ? c.paper : c.silver);
  }
}

// ---------------------------------------------------------------------------
// 32. Eine kleine Nachtmusik: five players on a Viennese terrace at night,
//     a lantern, and a rocket climbing like the opening phrase
// ---------------------------------------------------------------------------

const nmB = palette({
  n0: "#0a0e22",
  n1: "#141c3a",
  n2: "#22305a",
  star: "#f4ecc0",
  rocket: "#ffd06a",
  rocketL: "#ff8a4a",
  hedge: "#0c1a14",
  hedgeL: "#1a3424",
  stone: "#8a8aa0",
  stoneD: "#4a4c64",
  sil: "#06070e",
  lamp: "#ffcc66",
  glow: "#3a3a50",
});
const nmSky = fracture(361, [[nmB.c.n0, nmB.c.n1], [nmB.c.n1, nmB.c.n2], [nmB.c.n1, nmB.c.n0]], 4, [-8, -8, 168, 70]);
const nmStars: Pt[] = [[12, 10], [46, 6], [70, 22], [96, 8], [150, 14], [84, 34], [20, 40], [140, 44]];
const nmLight = { [nmB.c.n0]: nmB.c.n1, [nmB.c.n1]: nmB.c.n2, [nmB.c.n2]: nmB.c.glow, [nmB.c.stoneD]: nmB.c.stone };

/** A seated string player in silhouette; `big` for the cello and bass. */
function playerB(r: Raster, f: Frame, x: number, big: number, phase: number) {
  const { c } = nmB;
  const bow = wave(f, 1.2, phase) * 3;
  r.fill(ellipse(x, 52 - big * 4, 3, 3.4, 0, Math.PI * 2, 12), c.sil);
  r.fill([[x - 5, 56 - big * 4], [x + 5, 56 - big * 4], [x + 6, 74], [x - 6, 74]], c.sil);
  r.fill(rect(x - 6, 74, 12, 2), c.sil);
  r.line(x - 4, 76, x - 5, 84, c.sil);
  r.line(x + 4, 76, x + 5, 84, c.sil);
  if (big) {
    r.fill(ellipse(x + 8, 70, 4 + big, 8 + big * 2, 0, Math.PI * 2, 14), c.sil);
    r.line(x + 8, 70, x + 8, 48 - big * 6, c.sil);
    r.line(x - 2 + bow, 66, x + 18 + bow, 72, c.stone);
  } else {
    r.fill(ellipse(x + 4, 55, 5, 2.5, -0.3, Math.PI * 2 - 0.3, 10), c.sil);
    r.line(x - 6 + bow, 50, x + 16 + bow, 60, c.stone);
  }
}

function renderNachtmusikB(r: Raster, f: Frame) {
  const { c } = nmB;
  paintPlanes(r, nmSky, f);
  nmStars.forEach(([x, y], i) => {
    if (f.still || wave(f, 0.7, i * 1.3) > -0.4) r.dot(x, y, c.star);
  });

  // The rocket climbs, trailing sparks, bursts, and begins again.
  const p = f.still ? 0.6 : (f.t * 0.12) % 1;
  const ry = 64 - p * 56;
  if (p < 0.8) {
    for (let k = 1; k < 8; k++) r.dot(128 + Math.sin(k) * 0.6, ry + k * 3, k < 3 ? c.rocket : c.rocketL);
    r.fill([[127, ry - 2], [130, ry - 2], [128.5, ry - 5]], c.rocket);
  } else {
    const s = (p - 0.8) * 60;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      r.dot(128 + Math.cos(a) * s, ry + Math.sin(a) * s, k % 2 ? c.rocket : c.star);
    }
  }

  // Hedges and the terrace.
  r.fill([[0, 60], [30, 54], [70, 58], [110, 54], [160, 60], [160, 80], [0, 80]], c.hedge, c.hedgeL, 3);
  r.fill(rect(0, 80, 160, 20), c.stoneD, c.stone, 4);
  r.line(0, 80, 160, 80, c.stone);

  // The lantern on its post lights the players.
  const sway = wave(f, 0.6) * 1;
  r.tint(ellipse(36, 60, 40, 30, 0, Math.PI * 2, 20), nmLight, 5);
  r.line(26, 30, 26, 88, c.sil);
  r.line(26, 30, 36, 30, c.sil);
  r.line(36, 30, 36 + sway, 34, c.sil);
  r.fill(rect(33 + sway, 34, 6, 8), c.lamp);
  r.fill([[32 + sway, 34], [40 + sway, 34], [36 + sway, 31]], c.sil);

  // Two violins, a viola, a cello and a double bass.
  playerB(r, f, 52, 0, 0);
  playerB(r, f, 70, 0, 0.4);
  playerB(r, f, 88, 0, 0.8);
  playerB(r, f, 106, 1, 1.2);
  playerB(r, f, 126, 2, 1.6);
}

// ---------------------------------------------------------------------------
// 33. The Magic Flute: a stage with three temples, the Queen of the Night's
//     crescent, and the golden flute
// ---------------------------------------------------------------------------

const mfB = palette({
  k0: "#0c0a1c",
  k1: "#1a1634",
  k2: "#2a2450",
  star: "#f4eec8",
  moon: "#e8e4f4",
  stone: "#c2b496",
  stoneD: "#8a7a5e",
  door: "#2a1e14",
  curtain: "#8a1c24",
  curtainL: "#b0303a",
  gilt: "#d8b04a",
  giltL: "#fae08a",
  boards: "#4a2e1a",
  boardsL: "#6a4428",
});
const mfSky = fracture(371, [[mfB.c.k0, mfB.c.k1], [mfB.c.k1, mfB.c.k2], [mfB.c.k1, mfB.c.k0]], 4, [16, -8, 144, 72]);
const mfStars: Pt[] = [[30, 10], [52, 18], [72, 6], [96, 14], [112, 26], [40, 30], [118, 8]];

/** A temple front: pediment, columns and a dark doorway. */
function templeB(r: Raster, x: number, w: number, top: number) {
  const { c } = mfB;
  r.fill([[x - 2, top + 6], [x + w / 2, top], [x + w + 2, top + 6]], c.stone, c.stoneD, 4);
  r.fill(rect(x, top + 6, w, 2), c.stoneD);
  for (let k = 0; k < 4; k++) r.fill(rect(x + 1 + k * ((w - 4) / 3), top + 8, 2, 66 - top - 8), c.stone, c.stoneD, 3);
  r.fill(rect(x + w / 2 - 3, top + 14, 6, 66 - top - 14), c.door);
  r.fill(rect(x - 2, 66, w + 4, 2), c.stoneD);
}

function renderMagicFluteB(r: Raster, f: Frame) {
  const { c } = mfB;
  paintPlanes(r, mfSky, f);
  mfStars.forEach(([x, y], i) => {
    if (f.still || wave(f, 0.8, i * 2.1) > -0.3) r.dot(x, y, c.star);
  });
  r.fill(ellipse(124, 18, 7, 7, 0, Math.PI * 2, 18), c.moon);
  r.fill(ellipse(127, 16, 6, 6, 0, Math.PI * 2, 18), c.k1, c.k2, 5);

  // Three temples: Reason, Wisdom (the tallest, in the middle) and Nature.
  templeB(r, 30, 22, 40);
  templeB(r, 66, 28, 30);
  templeB(r, 108, 22, 40);

  // The stage floor.
  r.fill([[16, 68], [144, 68], [160, 100], [0, 100]], c.boards, c.boardsL, 3);
  for (let x = 0; x <= 160; x += 16) r.line(80 + (x - 80) * 0.8, 68, x, 100, c.k0);

  // The magic flute floats over the stage, sparkling.
  const bob = wave(f, 0.6) * 1.5;
  r.fill([[58, 82 + bob], [102, 76 + bob], [103, 79 + bob], [59, 85 + bob]], c.gilt, c.giltL, 5);
  for (let k = 0; k < 5; k++) r.dot(70 + k * 6, 82 - k * 0.9 + bob, c.door);
  const tw = f.still ? 0 : Math.floor(f.t * 2) % 4;
  ([[56, 76], [106, 72], [80, 70], [92, 88]] as Pt[]).forEach(([x, y], i) => {
    if (i !== tw) {
      r.dot(x, y + bob, c.giltL);
      r.dot(x - 1, y + bob, c.gilt);
      r.dot(x + 1, y + bob, c.gilt);
    }
  });

  // The proscenium: red curtains drawn back and a gilt border.
  r.fill([[0, 0], [18, 0], [16, 30], [22, 100], [0, 100]], c.curtain, c.curtainL, 5);
  r.fill([[160, 0], [142, 0], [144, 30], [138, 100], [160, 100]], c.curtain, c.curtainL, 5);
  for (const x of [4, 9, 14]) r.line(x, 0, x + 2, 100, c.curtainL);
  for (const x of [146, 151, 156]) r.line(x, 0, x - 2, 100, c.curtainL);
  r.fill(rect(0, 0, 160, 4), c.gilt, c.giltL, 4);
}

// ---------------------------------------------------------------------------
// 34. Pathétique: the boy Moscheles copying the sonata in a library by lamplight
// ---------------------------------------------------------------------------

const patB = palette({
  l0: "#120e0c",
  l1: "#221a14",
  l2: "#34281e",
  glow: "#5a4228",
  shelf: "#4a2e1a",
  shelfL: "#6a4428",
  red: "#8a2a24",
  green: "#2e5a3a",
  blue: "#2c3e6a",
  ochre: "#b0843a",
  paper: "#ece0c4",
  paperS: "#b0a080",
  ink: "#141012",
  skin: "#dcb894",
  coat: "#3a4a6a",
  lamp: "#ffd27a",
});
const patBack = fracture(381, [[patB.c.l0, patB.c.l1], [patB.c.l1, patB.c.l2], [patB.c.l1, patB.c.l0]], 4);
const patLight = { [patB.c.l0]: patB.c.l1, [patB.c.l1]: patB.c.l2, [patB.c.l2]: patB.c.glow, [patB.c.shelf]: patB.c.shelfL };
const patSpines = [patB.c.red, patB.c.green, patB.c.blue, patB.c.ochre, patB.c.red, patB.c.blue, patB.c.green];

function renderPathetiqueB(r: Raster, f: Frame) {
  const { c } = patB;
  paintPlanes(r, patBack, f);

  // Bookshelves filling the right of the room.
  r.fill(rect(100, 0, 60, 74), c.shelf);
  for (let row = 0; row < 4; row++) {
    const y = 4 + row * 18;
    for (let x = 103, k = row * 3; x < 156; k++) {
      const w = 3 + ((k * 5) % 3);
      const h = 12 + ((k * 7) % 4);
      r.fill(rect(x, y + 15 - h, w, h), patSpines[k % patSpines.length]);
      r.dot(x + 1, y + 17 - h, c.paperS);
      x += w + 1;
    }
    r.fill(rect(100, y + 15, 60, 3), c.shelfL);
  }

  // The lamp and its pool of light.
  const flick = f.still ? 0 : wave(f, 2.2) * 2;
  r.tint(ellipse(66, 60, 44 + flick, 34 + flick, 0, Math.PI * 2, 24), patLight, 6);
  r.fill([[40, 46], [52, 46], [49, 54], [43, 54]], c.ochre);
  r.fill(rect(44, 54, 4, 10), c.ochre);
  r.fill(ellipse(46, 50, 3, 3, 0, Math.PI * 2, 10), c.lamp);

  // The desk.
  r.fill([[10, 64], [130, 64], [136, 72], [4, 72]], c.shelfL, c.shelf, 3);
  r.fill(rect(10, 72, 4, 24), c.shelf);
  r.fill(rect(124, 72, 4, 24), c.shelf);

  // The library's printed copy, propped up, and the boy's own page.
  r.fill([[56, 44], [78, 42], [80, 62], [58, 64]], c.paper, c.paperS, 2);
  for (let k = 0; k < 5; k++) r.line(59, 48 + k * 3, 77, 46 + k * 3, c.paperS);
  r.fill([[86, 64], [116, 64], [118, 70], [84, 70]], c.paper);
  const done = f.still ? 5 : Math.floor((f.t * 0.6) % 6);
  for (let k = 0; k < done; k++) r.dot(90 + k * 4, 66 + (k % 2), c.ink);

  // Moscheles, ten years old, bent over the page with his pen.
  const scr = wave(f, 3) * 0.6;
  r.fill([[94, 44], [106, 44], [110, 64], [90, 64]], c.coat);
  r.fill(ellipse(100, 39, 4, 4.5, 0, Math.PI * 2, 14), c.skin);
  r.fill(ellipse(100, 37, 5, 4, Math.PI, Math.PI * 2, 10), c.l2);
  r.line(94, 50, 96 + scr, 63, c.coat);
  r.line(96 + scr, 63, 99 + scr, 58, c.ink);
}

// ---------------------------------------------------------------------------
// 35. Symphony No. 5: a door, four blows of the opening rhythm, and a
//     yellowhammer on a bare branch
// ---------------------------------------------------------------------------

const fifB = palette({
  d0: "#100c10",
  d1: "#201820",
  d2: "#322634",
  storm: "#4a3a52",
  door: "#5a3418",
  doorL: "#7a4a24",
  iron: "#8a8a94",
  bar: "#e8dcc0",
  hit: "#ff6a3a",
  branch: "#2a1c14",
  yellow: "#f2cc2a",
  rust: "#a0602a",
  ink: "#0a0808",
});
const fifBack = fracture(391, [[fifB.c.d0, fifB.c.d1], [fifB.c.d1, fifB.c.d2], [fifB.c.d2, fifB.c.storm]], 4);
const FIF_BARS: [number, number][] = [[64, 6], [74, 6], [84, 6], [94, 22]];

function renderFifthB(r: Raster, f: Frame) {
  const { c } = fifB;
  paintPlanes(r, fifBack, f);

  // The heavy door, its knocker swinging on each blow.
  const step = f.still ? -1 : Math.floor(f.t * 2.4) % 6;
  r.fill(rect(10, 16, 42, 80), c.ink);
  r.fill(rect(13, 19, 36, 77), c.door, c.doorL, 3);
  for (const y of [30, 60, 86]) r.fill(rect(13, y, 36, 3), c.iron, c.ink, 6);
  r.fill(ellipse(40, 52, 4, 4, 0, Math.PI * 2, 12), c.iron);
  const swing = step >= 0 && step < 4 ? 2 : 0;
  r.stroke(ellipse(40, 58 - swing, 4, 5, 0, Math.PI, 10), c.iron, false);

  // Short, short, short, long: the bars light one by one.
  FIF_BARS.forEach(([x, w], i) => {
    r.fill(rect(x, 34, w, 10), i === step ? c.hit : c.bar);
    r.fill(rect(x, 44, w, 2), c.storm);
  });
  r.line(62, 50, 118, 50, c.storm);

  // A bare branch, and a yellowhammer singing on it.
  r.fill([[160, 68], [124, 72], [112, 70], [124, 69], [160, 64]], c.branch);
  r.line(130, 70, 122, 60, c.branch);
  r.line(144, 67, 150, 58, c.branch);
  const hop = wave(f, 0.9) > 0.7 ? -1 : 0;
  const bx = 138;
  const by = 62 + hop;
  r.fill(ellipse(bx, by, 6, 4, 0, Math.PI * 2, 14), c.yellow, c.rust, 4);
  r.fill(ellipse(bx - 5, by - 3, 3, 3, 0, Math.PI * 2, 10), c.yellow);
  r.fill([[bx + 5, by - 1], [bx + 12, by + 2], [bx + 5, by + 2]], c.rust);
  r.fill([[bx - 8, by - 3], [bx - 11, by - 2], [bx - 8, by - 1]], c.iron);
  r.dot(bx - 6, by - 4, c.ink);
  if (!f.still && wave(f, 0.9) > 0.7) {
    r.dot(bx - 14, by - 6, c.bar);
    r.dot(bx - 17, by - 8, c.bar);
  }
}

// ---------------------------------------------------------------------------
// 36. Pastoral Symphony: arriving in the countryside, a brook, a cottage, birds
// ---------------------------------------------------------------------------

const pasC = palette({
  s0: "#8fb6d6",
  s1: "#b6d2e6",
  cloud: "#eef2ea",
  hill: "#5f8a3c",
  hillL: "#82a94e",
  hillD: "#3e6430",
  field: "#c9b45a",
  brook: "#5a8fc0",
  brookL: "#a8cbe6",
  wall: "#e6dcc4",
  roof: "#9a4a2e",
  tree: "#2e4a26",
  trunk: "#4a3222",
  bird: "#2a2a2e",
});
const pasSkyC = fracture(401, [[pasC.c.s0, pasC.c.s1], [pasC.c.s1, pasC.c.s0], [pasC.c.s1, pasC.c.cloud]], 4, [-8, -8, 168, 52]);
const pasFieldsC = fracture(403, [[pasC.c.hill, pasC.c.hillL], [pasC.c.hillL, pasC.c.field], [pasC.c.hill, pasC.c.hillD]], 4, [-8, 50, 168, 108]);

function renderPastoralC(r: Raster, f: Frame) {
  const { c } = pasC;
  paintPlanes(r, pasSkyC, f);

  // Far hills, then the patchwork of fields.
  r.fill(([[-4, 52], [30, 36], [62, 46], [96, 32], [130, 44], [164, 36], [164, 56], [-4, 56]] as Pt[]).map((p) => drift(p, f, 0.5)), c.hillD, c.hill, 5);
  paintPlanes(r, pasFieldsC.map((p) => ({ ...p, pts: clipBox(p.pts, -8, 52, 168, 108) })), f);

  // The brook winds down from the hills; its glints move with the current.
  const brook: Pt[] = [[92, 52], [98, 52], [86, 66], [100, 80], [80, 100], [56, 100], [76, 80], [64, 66]];
  r.fill(brook, c.brook);
  for (let k = 0; k < 8; k++) {
    const p = f.still ? k / 8 : (f.t * 0.08 + k / 8) % 1;
    const y = 54 + p * 44;
    const x = y < 66 ? 95 - (y - 54) * 0.9 : y < 80 ? 84 + (y - 66) * 0.6 : 92 - (y - 80) * 1.0;
    r.fill(rect(x - 2, y, 3, 1), c.brookL);
  }

  // The cottage on the far bank, and a tree beside it.
  r.fill(rect(118, 50, 18, 12), c.wall);
  r.fill([[115, 51], [127, 41], [139, 51]], c.roof);
  r.fill(rect(124, 55, 4, 7), c.trunk);
  r.fill(rect(130, 53, 3, 3), c.brook);
  r.fill(rect(144, 46, 3, 16), c.trunk);
  const sway = wave(f, 0.35) * 1.2;
  r.fill(ellipse(145.5 + sway, 40, 10, 9, 0, Math.PI * 2, 18), c.tree, c.hillD, 4);
  r.fill(ellipse(26, 66, 4, 3, 0, Math.PI * 2, 10), c.tree);
  r.fill(ellipse(18, 70, 6, 4, 0, Math.PI * 2, 12), c.tree);

  // Birds wheeling over the hills: the cuckoo, quail and nightingale of the score.
  for (let i = 0; i < 4; i++) {
    const bx = 30 + i * 14 + wave(f, 0.12, i * 1.6) * 8;
    const by = 18 + (i % 2) * 7 + wave(f, 0.2, i * 2.3) * 2;
    const flap = !f.still && wave(f, 1.6, i) > 0 ? 1 : 0;
    r.line(bx - 3, by - flap, bx, by + 1, c.bird);
    r.line(bx, by + 1, bx + 3, by - flap, c.bird);
  }
}

// ---------------------------------------------------------------------------
// 37. Waltz in C-sharp minor: a couple turning under a chandelier
// ---------------------------------------------------------------------------

const walC = palette({
  b0: "#24121c",
  b1: "#3a1e2c",
  b2: "#55303e",
  gilt: "#d8b45a",
  giltD: "#8a6a2c",
  crystal: "#f2ead2",
  floor: "#6a4228",
  floorL: "#8e5c36",
  gown: "#d8c8e4",
  gownD: "#9a86b0",
  coat: "#121016",
  skin: "#e2c4a6",
  hair: "#2a1a12",
});
const walBackC = fracture(411, [[walC.c.b0, walC.c.b1], [walC.c.b1, walC.c.b2], [walC.c.b1, walC.c.b0]], 4, [-8, -8, 168, 72]);
const walFloorC = fracture(413, [[walC.c.floor, walC.c.floorL], [walC.c.floorL, walC.c.floor]], 3, [-8, 70, 168, 108]);
const walGlowC = { [walC.c.b0]: walC.c.b1, [walC.c.b1]: walC.c.b2, [walC.c.floor]: walC.c.floorL };

function renderWaltzC(r: Raster, f: Frame) {
  const { c } = walC;
  paintPlanes(r, walBackC, f);
  paintPlanes(r, walFloorC, f);
  r.tint([[64, 22], [96, 22], [130, 100], [30, 100]], walGlowC, 5);

  // Tall gilt panels along the wall.
  for (const x of [8, 136]) {
    r.stroke(rect(x, 14, 16, 50), c.giltD);
    r.stroke(rect(x + 3, 17, 10, 44), c.giltD);
  }

  // The chandelier, swaying a little, its candles glinting.
  const sw = wave(f, 0.3) * 1.5;
  r.line(80, 0, 80 + sw, 10, c.gilt);
  r.fill(ellipse(80 + sw, 16, 16, 4, 0, Math.PI * 2, 20), c.gilt, c.giltD, 4);
  r.fill([[70 + sw, 18], [90 + sw, 18], [80 + sw, 26]], c.giltD);
  for (let k = 0; k < 7; k++) {
    const x = 66 + k * 4.6 + sw;
    r.line(x, 12, x, 14, c.crystal);
    if (f.still || wave(f, 2.2, k * 1.3) > -0.5) r.dot(x, 11, c.crystal);
    r.dot(x, 19 + (k % 2), c.crystal);
  }

  // The couple turns: the gown swings out one way, then the other.
  const turn = wave(f, 0.6);
  const x = 80 + wave(f, 0.15) * 10;
  r.fill([[x - 3, 46], [x + 3, 46], [x + 14 + turn * 6, 82], [x - 14 + turn * 6, 82]], c.gown, c.gownD, 5);
  r.fill([[x + 2 + turn * 6, 78], [x + 14 + turn * 6, 82], [x - 14 + turn * 6, 82]], c.gownD);
  r.fill(rect(x - 2, 38, 5, 9), c.gown);
  r.fill(ellipse(x, 34, 2.5, 3, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(x, 32, 3, 2, Math.PI, Math.PI * 2, 8), c.hair);
  // Her partner, in a black tailcoat, half hidden behind her.
  const px = x + 6;
  r.fill([[px - 3, 34], [px + 4, 34], [px + 5, 60], [px + 8, 66], [px + 1, 62], [px - 1, 82], [px - 4, 82]], c.coat);
  r.fill(ellipse(px, 30, 2.5, 3, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(px, 28, 3, 2, Math.PI, Math.PI * 2, 8), c.hair);
  thick(r, px - 2, 38, x - 4, 40, c.coat);
  r.line(x + 2, 40, px - 2, 38, c.skin);
}

// ---------------------------------------------------------------------------
// 38. Ballade No. 1: a story told in a storm, a tower on a cliff over the sea
// ---------------------------------------------------------------------------

const balC = palette({
  n0: "#0c0e16",
  n1: "#181c2c",
  n2: "#262c44",
  bolt: "#f2f0dc",
  sea: "#1a2c3a",
  seaL: "#2e4a5a",
  foam: "#c8d4dc",
  rock: "#2a2626",
  rockL: "#4a4240",
  tower: "#5a5250",
  towerL: "#7a706a",
  lamp: "#f0b84a",
});
const balSkyC = fracture(421, [[balC.c.n0, balC.c.n1], [balC.c.n1, balC.c.n2], [balC.c.n1, balC.c.n0]], 5, [-8, -8, 168, 70]);
const balSeaC = fracture(423, [[balC.c.sea, balC.c.seaL], [balC.c.seaL, balC.c.sea]], 4, [-8, 66, 168, 108]);
const balFlashC = { [balC.c.n0]: balC.c.n2, [balC.c.n1]: balC.c.n2, [balC.c.n2]: balC.c.foam, [balC.c.sea]: balC.c.seaL };

function renderBalladeC(r: Raster, f: Frame) {
  const { c } = balC;
  paintPlanes(r, balSkyC, f);
  paintPlanes(r, balSeaC, f);

  // Now and then the lightning lights the sky; the bolt forks down to the sea.
  const strike = !f.still && wave(f, 0.21) > 0.93;
  if (strike) r.tint(rect(0, 0, ART_W, ART_H), balFlashC, 6);
  const bolt: Pt[] = [[34, 0], [30, 14], [38, 18], [28, 36], [36, 40], [26, 62]];
  r.stroke(bolt, strike || f.still || wave(f, 0.21) > 0.85 ? c.bolt : c.n2, false);

  // Waves roll in: crests rise and fall along the swell.
  for (let k = 0; k < 9; k++) {
    const x = 4 + k * 12;
    const y = 74 + (k % 3) * 7 + wave(f, 0.7, k * 1.1) * 1.5;
    r.fill([[x - 6, y + 2], [x, y - 2 - wave(f, 0.7, k) * 1.5], [x + 6, y + 2]], c.foam, c.seaL, 6);
  }

  // The cliff and its tower; a single window lit.
  r.fill([[100, 100], [108, 70], [118, 62], [138, 58], [164, 56], [164, 100]], c.rock, c.rockL, 3);
  r.fill([[108, 70], [118, 62], [124, 72], [112, 80]], c.rockL, c.rock, 5);
  r.fill([[128, 26], [146, 26], [148, 60], [126, 60]], c.tower, c.towerL, 4);
  r.fill([[137, 26], [146, 26], [148, 60], [137, 60]], c.rock, c.tower, 6);
  for (let x = 126; x < 148; x += 5) r.fill(rect(x, 21, 3, 5), c.tower);
  r.fill(rect(126, 24, 22, 2), c.tower);
  const lit = f.still || wave(f, 1.7) > -0.7;
  r.fill([...ellipse(133, 38, 2, 2, Math.PI, Math.PI * 2, 6), [135, 44], [131, 44]], lit ? c.lamp : c.n0);
  r.fill(rect(140, 48, 2, 4), c.n0);

  // Spray bursts where the sea meets the rock.
  const sp = wave(f, 0.5);
  if (f.still || sp > 0) {
    for (let k = 0; k < 6; k++) r.dot(104 + k * 2, 70 - sp * 4 - (k % 3) * 2, c.foam);
  }
}

// ---------------------------------------------------------------------------
// 39. Wedding March: the wedding in the moonlit wood of A Midsummer Night's Dream,
//     trumpets raised for the fanfare, fairies among the trees
// ---------------------------------------------------------------------------

const wedC = palette({
  w0: "#0e1a1a",
  w1: "#16282a",
  w2: "#22383a",
  tree: "#0a1412",
  leaf: "#2a4a36",
  leafL: "#46704a",
  moon: "#eef0d8",
  brass: "#e0b64a",
  brassD: "#9a7428",
  gown: "#f2eee4",
  gownS: "#bcb8b0",
  robe: "#6a2e4a",
  skin: "#dcc0a2",
  fairy: "#f6e8a0",
  bloom: "#e89ab0",
});
const wedBackC = fracture(431, [[wedC.c.w0, wedC.c.w1], [wedC.c.w1, wedC.c.w2], [wedC.c.w1, wedC.c.w0]], 4);
const wedFairiesC: Pt[] = [[22, 30], [40, 18], [58, 34], [104, 22], [122, 36], [140, 16], [30, 50], [132, 52]];

/** A herald's long trumpet, bell up, with its banner. */
function wedTrumpetC(r: Raster, x: number, y: number, dir: 1 | -1, lift: number) {
  const { c } = wedC;
  const bx = x + dir * 22;
  const by = y - 14 - lift;
  r.line(x, y, bx, by, c.brass);
  r.line(x, y + 1, bx, by + 1, c.brassD);
  r.fill([[bx, by - 3], [bx + dir * 4, by - 5], [bx + dir * 5, by + 3], [bx, by + 3]], c.brass);
  const mx = x + dir * 10;
  const my = y - 6 - lift / 2;
  r.fill([[mx, my], [mx + dir * 6, my - 3], [mx + dir * 6, my + 5], [mx, my + 7]], c.robe);
}

function renderWeddingC(r: Raster, f: Frame) {
  const { c } = wedC;
  paintPlanes(r, wedBackC, f);
  r.fill(ellipse(80, 14, 7, 7, 0, Math.PI * 2, 18), c.moon);

  // Two great trees lean in to make an arch, hung with blossom.
  r.fill([[0, 100], [6, 40], [26, 6], [50, 0], [18, 44], [16, 100]], c.tree);
  r.fill([[160, 100], [154, 40], [134, 6], [110, 0], [142, 44], [144, 100]], c.tree);
  r.fill(([[-4, 0], [70, -4], [56, 8], [30, 14], [10, 30]] as Pt[]).map((p) => drift(p, f, 0.6)), c.leaf, c.leafL, 4);
  r.fill(([[164, 0], [90, -4], [104, 8], [130, 14], [150, 30]] as Pt[]).map((p) => drift(p, f, 0.6)), c.leaf, c.leafL, 4);
  for (const [x, y] of [[20, 26], [34, 12], [52, 6], [108, 6], [126, 12], [140, 26], [12, 40], [148, 40]] as Pt[]) {
    r.fill(rect(x, y, 2, 2), c.bloom);
  }

  // The ground of the wood.
  r.fill(([[0, 84], [80, 80], [160, 84], [160, 100], [0, 100]] as Pt[]).map((p) => drift(p, f, 0.4)), c.leaf, c.w1, 6);

  // The bride and groom beneath the arch.
  r.fill([[72, 52], [78, 52], [86, 86], [64, 86]], c.gown, c.gownS, 4);
  r.fill(ellipse(75, 48, 3, 3.5, 0, Math.PI * 2, 12), c.skin);
  r.fill([[71, 46], [79, 46], [84, 70], [70, 60]], c.gownS, c.gown, 8);
  r.fill(ellipse(75, 45, 3.5, 1.5, 0, Math.PI * 2, 10), c.bloom);
  r.fill([[84, 50], [91, 50], [92, 86], [83, 86]], c.robe);
  r.fill(ellipse(87.5, 46, 3, 3.5, 0, Math.PI * 2, 12), c.skin);
  r.fill(rect(84, 41, 7, 2), c.brass);

  // Heralds' trumpets lift for the fanfare that opens the march.
  const lift = f.still ? 0 : Math.max(0, wave(f, 0.4)) * 3;
  wedTrumpetC(r, 46, 66, -1, lift);
  wedTrumpetC(r, 114, 66, 1, lift);

  // Fairies drift and blink among the branches.
  wedFairiesC.forEach(([x, y], i) => {
    const fx = x + wave(f, 0.3, i * 1.7) * 3;
    const fy = y + wave(f, 0.4, i * 2.9) * 2;
    if (f.still || wave(f, 0.9, i * 2.1) > -0.4) r.dot(fx, fy, c.fairy);
  });
}

// ---------------------------------------------------------------------------
// 40. Italian Symphony: the Bay of Naples in sunlight, Vesuvius, cypresses
// ---------------------------------------------------------------------------

const itaC = palette({
  s0: "#5aa0d8",
  s1: "#86bce4",
  sun: "#fff0b0",
  sea: "#1e6a9e",
  seaL: "#3a8cbe",
  glint: "#e8f4fa",
  volc: "#7a5a4a",
  volcD: "#4e3a32",
  smoke: "#d6d0c8",
  wall: "#e8c890",
  wallL: "#f2dcae",
  roof: "#c46a3a",
  cypress: "#1e3a22",
  green: "#5e8a3a",
});
const itaSkyC = fracture(441, [[itaC.c.s0, itaC.c.s1], [itaC.c.s1, itaC.c.s0], [itaC.c.s1, itaC.c.sun]], 4, [-8, -8, 168, 50]);
const itaSeaC = fracture(443, [[itaC.c.sea, itaC.c.seaL], [itaC.c.seaL, itaC.c.sea]], 3, [-8, 48, 168, 82]);
const itaTownC = fracture(447, [[itaC.c.wall, itaC.c.wallL], [itaC.c.wallL, itaC.c.wall], [itaC.c.wall, itaC.c.roof]], 3, [-8, 76, 110, 108]);

function renderItalianC(r: Raster, f: Frame) {
  const { c } = itaC;
  paintPlanes(r, itaSkyC, f);
  r.fill(ellipse(28, 16, 8, 8, 0, Math.PI * 2, 20), c.sun);

  // Vesuvius across the bay, a plume of smoke drifting off it.
  r.fill([[70, 50], [96, 22], [104, 22], [140, 50]], c.volc, c.volcD, 5);
  r.fill([[96, 22], [100, 24], [104, 22], [120, 50], [100, 50]], c.volcD, c.volc, 4);
  for (let k = 0; k < 6; k++) {
    const p = f.still ? k / 6 : (f.t * 0.05 + k / 6) % 1;
    r.fill(ellipse(100 + p * 30, 18 - p * 14, 3 + p * 5, 2 + p * 2, 0, Math.PI * 2, 12), c.smoke);
  }

  paintPlanes(r, itaSeaC, f);
  for (let k = 0; k < 10; k++) {
    const x = 20 + ((k * 37) % 130) + wave(f, 0.6, k) * 2;
    const y = 54 + ((k * 11) % 24);
    if (f.still || wave(f, 0.8, k * 1.9) > -0.2) r.fill(rect(x, y, 3, 1), c.glint);
  }

  // The town stepping down to the shore, a sail out on the water.
  paintPlanes(r, itaTownC, f);
  for (const [x, y] of [[8, 84], [22, 80], [40, 88], [58, 82], [76, 90], [92, 86]] as Pt[]) {
    r.fill(rect(x, y, 10, 8), c.wallL, c.wall, 3);
    r.fill([[x - 1, y], [x + 5, y - 4], [x + 11, y]], c.roof);
    r.fill(rect(x + 3, y + 3, 2, 3), c.volcD);
  }
  const sx = 60 + wave(f, 0.04) * 10;
  r.fill([[sx, 64], [sx + 6, 64], [sx + 4, 66], [sx + 1, 66]], c.volcD);
  r.fill([[sx + 3, 54], [sx + 3, 63], [sx + 8, 63]], c.glint);

  // Cypresses on the hillside, bending a little in the warm wind.
  r.fill([[110, 100], [118, 66], [164, 60], [164, 100]], c.green, c.cypress, 3);
  const b = wave(f, 0.4) * 1.2;
  for (const [x, h] of [[126, 34], [138, 44], [150, 38]] as Pt[]) {
    r.fill([[x - 4, 100 - h / 2], [x + b, 100 - h - 30], [x + 4, 100 - h / 2], [x, 96]], c.cypress);
  }
}

// ---------------------------------------------------------------------------
// 41. Schubert's Sonata in B-flat, Andante: a lone wanderer on an autumn road at dusk
// ---------------------------------------------------------------------------

const schC = palette({
  d0: "#2a2238",
  d1: "#4a3448",
  d2: "#7a4a4a",
  glow: "#d88a4a",
  ground: "#3a2a22",
  groundL: "#5a4030",
  road: "#8a7058",
  tree: "#1a1414",
  leaf: "#c4622e",
  leafL: "#e09a3e",
  coat: "#16141a",
  hat: "#0e0c10",
});
const schSkyC = fracture(451, [[schC.c.d0, schC.c.d1], [schC.c.d1, schC.c.d2], [schC.c.d2, schC.c.glow]], 4, [-8, -8, 168, 66]);
const schGroundC = fracture(453, [[schC.c.ground, schC.c.groundL], [schC.c.groundL, schC.c.ground]], 3, [-8, 62, 168, 108]);
const schLeavesC: Pt[] = [[30, 10], [48, 22], [16, 34], [62, 8], [40, 40], [74, 30], [24, 52], [56, 48]];

function renderSchubertC(r: Raster, f: Frame) {
  const { c } = schC;
  paintPlanes(r, schSkyC, f);
  // The low sun, almost down.
  r.fill(ellipse(118, 64, 12, 12, Math.PI, Math.PI * 2, 16), c.glow);
  paintPlanes(r, schGroundC, f);

  // The road narrowing towards the horizon.
  r.fill([[110, 64], [126, 64], [150, 100], [70, 100]], c.road, c.groundL, 5);

  // A bare tree on the left, its last leaves letting go one by one.
  r.fill([[22, 100], [30, 100], [28, 40], [25, 40]], c.tree);
  r.stroke([[27, 60], [12, 42], [6, 30]], c.tree, false);
  r.stroke([[27, 52], [44, 34], [56, 24]], c.tree, false);
  r.stroke([[27, 44], [34, 22], [32, 8]], c.tree, false);
  r.stroke([[44, 34], [58, 38]], c.tree, false);
  r.stroke([[12, 42], [4, 46]], c.tree, false);
  schLeavesC.forEach(([x, y], i) => {
    const p = f.still ? 0 : (f.t * 0.04 + i / schLeavesC.length) % 1;
    const lx = x + p * 30 + wave(f, 0.9, i) * 3;
    const ly = y + p * 60;
    r.fill(rect(lx, ly, 2, 1), i % 2 ? c.leaf : c.leafL);
  });
  for (let x = 4; x < 60; x += 5) r.fill(rect(x, 92 + (x % 3), 2, 1), x % 2 ? c.leaf : c.leafL);

  // The wanderer, coat and hat, walking slowly away along the road.
  const step = wave(f, 0.5);
  const wx = 114 - (f.still ? 0 : (f.t * 0.15) % 6);
  r.fill([[wx - 3, 74], [wx + 3, 74], [wx + 4, 88], [wx - 4, 88]], c.coat);
  r.fill(ellipse(wx, 71, 2, 2.5, 0, Math.PI * 2, 10), c.coat);
  r.fill(rect(wx - 3, 68, 7, 1), c.hat);
  r.fill(rect(wx - 2, 66, 5, 2), c.hat);
  r.line(wx - 2, 88, wx - 2 - step, 94, c.coat);
  r.line(wx + 2, 88, wx + 2 + step, 94, c.coat);
  r.line(wx + 4, 76, wx + 6, 94, c.tree);
}

// ---------------------------------------------------------------------------
// 42. Intermezzo Op. 118 No. 2: a summer evening at Bad Ischl, a letter to Clara
// ---------------------------------------------------------------------------

const intC = palette({
  s0: "#e0a882",
  s1: "#c88a86",
  s2: "#8a7092",
  mount: "#5a5a7e",
  mountL: "#7a7a9a",
  snow: "#ece6ee",
  pine: "#2e3e3a",
  meadow: "#6a8a4e",
  river: "#9ab8d0",
  table: "#5a3a26",
  tableL: "#7a5232",
  paper: "#f0e6d0",
  ink: "#2a2028",
  seal: "#a82a2a",
  rose: "#d86a7a",
});
const intSkyC = fracture(461, [[intC.c.s0, intC.c.s1], [intC.c.s1, intC.c.s2], [intC.c.s0, intC.c.s1]], 4, [-8, -8, 168, 48]);
const intMeadowC = fracture(463, [[intC.c.meadow, intC.c.pine], [intC.c.meadow, intC.c.mountL]], 3, [-8, 44, 168, 76]);

function renderIntermezzoC(r: Raster, f: Frame) {
  const { c } = intC;
  paintPlanes(r, intSkyC, f);

  // The Alps above the spa town, snow catching the evening light.
  r.fill([[-4, 50], [18, 22], [34, 34], [56, 12], [80, 36], [104, 18], [128, 38], [150, 20], [164, 30], [164, 50]], c.mount, c.mountL, 3);
  for (const [x, y] of [[56, 12], [104, 18], [150, 20], [18, 22]] as Pt[]) r.fill([[x - 5, y + 6], [x, y], [x + 5, y + 6], [x, y + 4]], c.snow);
  paintPlanes(r, intMeadowC, f);

  // The river winding through, a few pines along it.
  r.fill(([[60, 46], [70, 46], [96, 60], [130, 76], [104, 76], [78, 60]] as Pt[]).map((p) => drift(p, f, 0.4)), c.river);
  for (const x of [20, 30, 44, 140, 152]) r.fill([[x - 4, 64], [x, 48], [x + 4, 64]], c.pine);

  // The table in the foreground.
  r.fill([[0, 76], [160, 72], [160, 100], [0, 100]], c.table, c.tableL, 3);

  // A letter, sealed, and a rose laid across it.
  const lift = wave(f, 0.3) * 0.5;
  const letter: Pt[] = [[30, 80 + lift], [86, 76 + lift], [90, 96], [32, 99]];
  r.fill(letter, c.paper);
  r.stroke(letter, c.tableL);
  for (let k = 0; k < 4; k++) r.line(38, 84 + k * 3, 74, 81 + k * 3, c.ink);
  r.fill(ellipse(78, 90, 3, 3, 0, Math.PI * 2, 10), c.seal);
  r.line(96, 92, 124, 82, c.pine);
  r.fill(ellipse(126, 81, 4, 3.5, 0, Math.PI * 2, 12), c.rose, c.seal, 4);
  r.fill([[104, 88], [108, 84], [110, 90]], c.meadow);
}

// ---------------------------------------------------------------------------
// 43. Of Foreign Lands and Peoples: a child's globe and a picture book of far-off places
// ---------------------------------------------------------------------------

const forC = palette({
  w0: "#2a2a3e",
  w1: "#3a3a52",
  w2: "#4e4a66",
  ocean: "#3a7ab0",
  oceanL: "#5a9ac8",
  land: "#c8a85a",
  landG: "#6a9a4a",
  brass: "#c8a04a",
  wood: "#6a4428",
  page: "#efe4c8",
  pageS: "#c8b890",
  sand: "#e0b870",
  red: "#b04a3a",
  ink: "#2a2222",
  sail: "#f4eee0",
});
const forBackC = fracture(471, [[forC.c.w0, forC.c.w1], [forC.c.w1, forC.c.w2], [forC.c.w1, forC.c.w0]], 4);
const forGlobeC = fracture(473, [[forC.c.ocean, forC.c.oceanL], [forC.c.oceanL, forC.c.ocean]], 3, [96, 8, 150, 62]);

function renderForeignLandsC(r: Raster, f: Frame) {
  const { c } = forC;
  paintPlanes(r, forBackC, f);

  // The globe on its stand, turning slowly so the continents slide past.
  const disc = ellipse(123, 35, 22, 22, 0, Math.PI * 2, 32);
  paintPlanes(r, forGlobeC.map((p) => ({ ...p, pts: clipConvex(p.pts, disc) })), f);
  const spin = f.still ? 0 : (f.t * 2) % 88;
  for (const [lx, ly, w, h, col] of [[0, 22, 14, 10, c.land], [24, 28, 10, 18, c.landG], [46, 20, 18, 12, c.land], [64, 40, 12, 8, c.landG]] as [number, number, number, number, number][]) {
    for (const off of [0, 88]) {
      const x = 101 + ((lx + spin + off) % 88) - 22;
      const blob = clipConvex(ellipse(x + w / 2, ly + h / 2, w / 2, h / 2, 0, Math.PI * 2, 12), disc);
      if (blob.length > 2) r.fill(blob, col);
    }
  }
  r.stroke(ellipse(123, 35, 25, 25, Math.PI * 0.6, Math.PI * 1.9, 20), c.brass, false);
  r.fill(rect(121, 60, 4, 10), c.brass);
  r.fill(rect(112, 70, 22, 3), c.wood);

  // The open picture book: a desert with pyramids, and a ship under sail.
  r.fill([[8, 62], [52, 58], [52, 96], [10, 98]], c.page, c.pageS, 2);
  r.fill([[52, 58], [96, 62], [94, 98], [52, 96]], c.page, c.pageS, 2);
  r.line(52, 58, 52, 96, c.pageS);
  r.fill([[14, 84], [48, 82], [48, 92], [14, 94]], c.sand);
  r.fill([[18, 84], [26, 72], [34, 84]], c.sand, c.land, 6);
  r.fill([[30, 83], [38, 70], [46, 82]], c.sand, c.land, 6);
  r.fill(ellipse(42, 66, 3, 3, 0, Math.PI * 2, 10), c.red);
  r.fill([[56, 82], [92, 84], [92, 94], [56, 92]], c.oceanL, c.ocean, 4);
  const rock = wave(f, 0.6) * 0.8;
  r.fill([[64, 84 + rock], [84, 85 + rock], [80, 89 + rock], [67, 88 + rock]], c.wood);
  r.line(74, 84 + rock, 74, 66 + rock, c.ink);
  r.fill([[75, 67 + rock], [75, 82 + rock], [84, 82 + rock]], c.sail);
  r.fill([[73, 68 + rock], [73, 82 + rock], [65, 82 + rock]], c.sail);
  r.fill([[74, 66 + rock], [79, 67 + rock], [74, 69 + rock]], c.red);
}

// ---------------------------------------------------------------------------
// 44. Roman Carnival Overture: a carnival night in Rome, lanterns and saltarello dancers
// ---------------------------------------------------------------------------

const romC = palette({
  n0: "#140e22",
  n1: "#24183a",
  n2: "#3a2450",
  stone: "#8a6a50",
  stoneL: "#a8866a",
  stoneD: "#5a4232",
  lampR: "#e84a3a",
  lampY: "#f6c84a",
  lampG: "#5ac87a",
  cord: "#3a2a1a",
  skirt: "#c42a3a",
  skirtL: "#e8a84a",
  white: "#f0e8d8",
  skin: "#d8b08a",
  dark: "#100c14",
  spark: "#fff4c0",
});
const romSkyC = fracture(481, [[romC.c.n0, romC.c.n1], [romC.c.n1, romC.c.n2], [romC.c.n1, romC.c.n0]], 4, [-8, -8, 168, 60]);
const romWallC = fracture(483, [[romC.c.stone, romC.c.stoneL], [romC.c.stoneD, romC.c.stone]], 3, [-8, 30, 168, 72]);

function romDancerC(r: Raster, f: Frame, x: number, phase: number, skirt: number, alt: number) {
  const { c } = romC;
  const hop = Math.abs(wave(f, 2.2, phase)) * 3;
  const swing = wave(f, 1.1, phase) * 3;
  const y = 66 - hop;
  r.fill([[x - 2, y], [x + 2, y], [x + 8 + swing, y + 14], [x - 8 + swing, y + 14]], skirt, alt, 4);
  r.fill(rect(x - 2, y - 8, 5, 8), c.white);
  r.fill(ellipse(x, y - 11, 2.5, 3, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(x, y - 13, 3, 1.5, 0, Math.PI * 2, 8), c.dark);
  thick(r, x + 2, y - 7, x + 7, y - 13 - swing, c.skin);
  r.fill(ellipse(x + 8, y - 15 - swing, 3, 3, 0, Math.PI * 2, 10), c.lampY);
  r.line(x - 2, y - 7, x - 7, y - 4 + swing, c.skin);
  r.line(x - 1, y + 14, x - 2, y + 20 + hop, c.skin);
  r.line(x + 2, y + 14, x + 3, y + 20 + hop, c.skin);
}

function renderRomanC(r: Raster, f: Frame) {
  const { c } = romC;
  paintPlanes(r, romSkyC, f);

  // Fireworks bloom and fade over the rooftops.
  for (const [fx, fy, ph] of [[34, 14, 0], [124, 10, 2.4], [80, 6, 4.1]] as [number, number, number][]) {
    const b = wave(f, 0.5, ph);
    if (f.still || b > 0) {
      const rad = 3 + (f.still ? 4 : b * 6);
      for (let k = 0; k < 8; k++) r.dot(fx + Math.cos(k * 0.785) * rad, fy + Math.sin(k * 0.785) * rad, c.spark);
      r.dot(fx, fy, c.lampY);
    }
  }

  // Arcades of old Roman stone behind the square.
  paintPlanes(r, romWallC, f);
  for (let x = 6; x < 160; x += 22) {
    r.fill([...ellipse(x + 7, 44, 7, 7, Math.PI, Math.PI * 2, 10), [x + 14, 72], [x, 72]], c.n0);
  }
  r.fill(rect(-1, 28, 162, 3), c.stoneL);
  r.fill(([[0, 72], [160, 72], [160, 100], [0, 100]] as Pt[]), c.stoneD, c.stone, 4);

  // Strings of lanterns swing across the square.
  for (const [y0, sag, ph] of [[20, 10, 0], [34, 8, 1.4]] as [number, number, number][]) {
    let prev: Pt = [0, y0];
    for (let k = 1; k <= 16; k++) {
      const x = k * 10;
      const y = y0 + Math.sin((k / 16) * Math.PI) * (sag + wave(f, 0.5, ph) * 1.5);
      r.line(prev[0], prev[1], x, y, c.cord);
      if (k < 16) {
        const col = [c.lampR, c.lampY, c.lampG][k % 3];
        const on = f.still || wave(f, 1.3, k + ph) > -0.6;
        r.fill(ellipse(x, y + 3, 2, 2.5, 0, Math.PI * 2, 8), on ? col : c.n2);
      }
      prev = [x, y];
    }
  }

  // Saltarello: two dancers leaping, a tambourine raised.
  romDancerC(r, f, 62, 0, c.skirt, c.skirtL);
  romDancerC(r, f, 98, 1.6, c.skirtL, c.skirt);
}

// ---------------------------------------------------------------------------
// 45. Carmen, Prelude: the bullring in Seville, a toreador's cape, a red rose
// ---------------------------------------------------------------------------

const carC = palette({
  s0: "#f0c060",
  s1: "#f6dc8a",
  sun: "#fff4c8",
  wall: "#e8dcc0",
  wallS: "#c8b48a",
  ochre: "#c8803a",
  sand: "#e0b06a",
  sandL: "#ecc888",
  red: "#c41e2a",
  redD: "#7e1018",
  gold: "#e8c040",
  black: "#141010",
  skin: "#d8a880",
  crowd: "#8a5a3a",
  leaf: "#2e5a2a",
});
const carSkyC = fracture(491, [[carC.c.s0, carC.c.s1], [carC.c.s1, carC.c.sun], [carC.c.s1, carC.c.s0]], 3, [-8, -8, 168, 34]);
const carSandC = fracture(493, [[carC.c.sand, carC.c.sandL], [carC.c.sandL, carC.c.sand], [carC.c.sand, carC.c.ochre]], 4, [-8, 60, 168, 108]);

function renderCarmenC(r: Raster, f: Frame) {
  const { c } = carC;
  paintPlanes(r, carSkyC, f);

  // The curved stands of the bullring, arches above, the crowd stirring.
  r.fill([[-4, 34], [164, 34], [164, 62], [-4, 62]], c.wall, c.wallS, 3);
  for (let x = 2; x < 160; x += 12) r.fill([...ellipse(x + 4, 38, 4, 3, Math.PI, Math.PI * 2, 8), [x + 8, 46], [x, 46]], c.ochre);
  r.fill(rect(-1, 46, 162, 2), c.redD);
  for (let x = 1; x < 160; x += 3) {
    const bob = wave(f, 1.5, x * 0.7) > 0.6 ? 1 : 0;
    r.dot(x, 51 - bob, c.crowd);
    r.dot(x + 1, 54 - ((x * 3) % 2), c.crowd);
  }
  r.fill(rect(-1, 57, 162, 4), c.redD, c.red, 6);
  paintPlanes(r, carSandC, f);

  // The toreador, sweeping his cape.
  const sweep = wave(f, 0.45);
  const tx = 52;
  r.fill([[tx - 3, 64], [tx + 3, 64], [tx + 3, 78], [tx - 3, 78]], c.gold, c.black, 6);
  r.fill(rect(tx - 3, 78, 2, 12), c.black);
  r.fill(rect(tx + 1, 78, 2, 12), c.black);
  r.fill(ellipse(tx, 60, 2.5, 3, 0, Math.PI * 2, 10), c.skin);
  r.fill([[tx - 4, 57], [tx + 4, 57], [tx + 2, 55], [tx - 2, 55]], c.black);
  const cx = tx + 10 + sweep * 8;
  r.fill(([[tx + 3, 66], [cx + 10, 64 - sweep * 4], [cx + 14, 82], [cx - 2, 90], [tx + 4, 74]] as Pt[]).map((p) => drift(p, f, 0.5)), c.red, c.redD, 4);

  // A red rose lies in the sand: Carmen's flower.
  r.line(122, 92, 140, 84, c.leaf);
  r.fill([[128, 90], [132, 86], [134, 91]], c.leaf);
  r.fill(ellipse(118, 93, 5, 4, 0, Math.PI * 2, 14), c.red, c.redD, 5);
  r.stroke(ellipse(118, 93, 2.5, 2, 0.4, Math.PI * 1.7, 8), c.redD, false);

  // A fan, open, with the dust of the ring drifting past it.
  r.fill(ellipse(144, 72, 12, 10, Math.PI * 1.1, Math.PI * 1.9, 10).concat([[144, 72]]), c.black);
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * 1.15 + k * 0.17;
    r.line(144, 72, 144 + Math.cos(a) * 11, 72 + Math.sin(a) * 9, c.gold);
  }
  for (let k = 0; k < 6; k++) {
    const p = f.still ? k / 6 : (f.t * 0.06 + k / 6) % 1;
    r.dot(70 + p * 80, 86 - k * 2 + wave(f, 0.8, k) * 2, c.sandL);
  }
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
  {
    id: "new-world",
    alt: "A steamship crossing a dusky sea toward a far city on the horizon, the moon rising, with a cor anglais laid across the foreground.",
    colors: nwA.colors,
    motifs: { ship: [78, 62, 16], moon: [38, 20, 11], horn: [128, 80, 18] },
    render: renderNewWorldA,
  },
  {
    id: "moldau",
    alt: "A river rising from two springs in green hills and widening as it winds down past a castle on a rock.",
    colors: vltA.colors,
    motifs: { springs: [50, 32, 14], river: [70, 78, 20], castle: [132, 38, 18] },
    render: renderMoldauA,
  },
  {
    id: "moldau-hunt",
    alt: "A hunter on horseback blowing a brass horn in a dark pine forest by the river, a stag leaping away.",
    colors: vltHunt.colors,
    motifs: { hunter: [56, 72, 18], stag: [124, 72, 16] },
    render: renderMoldauHunt,
  },
  {
    id: "moldau-wedding",
    alt: "A village wedding on a riverside green: couples whirling in a polka under a garland, a fiddler on a barrel and a red-roofed cottage.",
    colors: vltWed.colors,
    motifs: { dancers: [74, 68, 26], fiddler: [24, 68, 12], cottage: [129, 38, 18] },
    render: renderMoldauWedding,
  },
  {
    id: "moldau-nymphs",
    alt: "Night on the river: pale water nymphs dancing in a ring on silvery water under a full moon, castle ruins on the rocks.",
    colors: vltNym.colors,
    motifs: { nymphs: [70, 74, 30], moon: [118, 20, 12], ruins: [18, 30, 16] },
    render: renderMoldauNymphs,
  },
  {
    id: "moldau-rapids",
    alt: "White water crashing between dark rocks in a narrow gorge, spray flying.",
    colors: vltRap.colors,
    motifs: { rapids: [80, 76, 26] },
    render: renderMoldauRapids,
  },
  {
    id: "moldau-vysehrad",
    alt: "The wide river at sunset flowing past Vyšehrad castle on its high rock, the spires of Prague in the haze.",
    colors: vltVys.colors,
    motifs: { castle: [132, 24, 22], river: [60, 76, 24], prague: [42, 44, 16] },
    render: renderMoldauVysehrad,
  },
  {
    id: "mountain-king",
    alt: "A troll king with a gold crown on a stone throne in a torchlit cave, trolls hopping toward him from both sides.",
    colors: mkA.colors,
    motifs: { king: [80, 46, 20], trolls: [32, 72, 18], torch: [132, 38, 12] },
    render: renderMountainKingA,
  },
  {
    id: "anitra",
    alt: "A dancer in swirling veils inside a striped desert tent by lamplight, a purse of gold coins spilling on a cushion.",
    colors: aniA.colors,
    motifs: { dancer: [82, 54, 20], lamp: [48, 20, 13], purse: [26, 80, 12] },
    render: renderAnitraA,
  },
  {
    id: "vienna-woods",
    alt: "A zither lying on a garden table at the edge of a sunlit beech wood, a bird singing on a branch above.",
    colors: vwA.colors,
    motifs: { zither: [70, 76, 22], bird: [102, 25, 12], woods: [30, 34, 22] },
    render: renderViennaWoodsA,
  },
  {
    id: "tchaikovsky-concerto",
    alt: "A concert grand with its lid raised on a curtained stage, four horns behind it and bursts of light rising from the keyboard.",
    colors: tcA.colors,
    motifs: { piano: [80, 60, 26], horns: [56, 30, 20], keys: [36, 56, 12] },
    render: renderTchaikovskyA,
  },
  {
    id: "rachmaninoff-adagio",
    alt: "A piano by an open window at dawn, birches and a still lake outside, a flute and a clarinet lying on the piano lid.",
    colors: rcA.colors,
    motifs: { window: [114, 36, 26], piano: [48, 68, 24], woodwinds: [52, 58, 14] },
    render: renderRachmaninoffA,
  },
  {
    id: "great-gate",
    alt: "A great stone gate with a round arch and a dome shaped like a warrior's helmet, a bell tower beside it and a crowd passing beneath.",
    colors: ggA.colors,
    motifs: { gate: [66, 60, 26], dome: [66, 16, 14], bells: [129, 38, 12] },
    render: renderGreatGateA,
  },
  {
    id: "steppes",
    alt: "A caravan of laden camels crossing a wide, sunlit steppe, horsemen riding alongside.",
    colors: stpA.colors,
    motifs: { caravan: [80, 62, 24], riders: [60, 78, 18], steppe: [130, 30, 18] },
    render: renderSteppesA,
  },
  {
    id: "danse-macabre",
    alt: "A hooded skeletal Death playing the fiddle in a moonlit graveyard while skeletons dance, a church clock at midnight behind.",
    colors: dmA.colors,
    motifs: { death: [74, 52, 18], skeletons: [34, 70, 18], clock: [138, 22, 12] },
    render: renderDanseMacabreA,
  },
  {
    id: "jesu-joy",
    alt: "A church choir singing in a wooden gallery beneath silver organ pipes, a ribbon of notes flowing in threes above them, and a brass trumpet on the rail.",
    colors: jjB.colors,
    motifs: { choir: [54, 62, 22], triplets: [74, 44, 22], trumpet: [134, 84, 16] },
    render: renderJesuJoyB,
  },
  {
    id: "badinerie",
    alt: "A boxwood baroque flute lying on a diagonal against blue planes, notes skipping off it, and a red jester's mask in the corner.",
    colors: badB.colors,
    motifs: { flute: [84, 62, 26], notes: [106, 26, 22], mask: [30, 26, 16] },
    render: renderBadinerieB,
  },
  {
    id: "blacksmith",
    alt: "A dark forge: a hammer rising and falling on an anvil, a glowing hearth, and rain falling past the open door.",
    colors: bsB.colors,
    motifs: { anvil: [92, 72, 20], hearth: [136, 44, 18], rain: [24, 54, 20] },
    render: renderBlacksmithB,
  },
  {
    id: "mandolin",
    alt: "A bowl-backed mandolin held at a tilt against a sunset over the Venice lagoon, with the bell tower of San Marco on the far shore.",
    colors: manB.colors,
    motifs: { mandolin: [106, 56, 28], venice: [28, 40, 20] },
    render: renderMandolinB,
  },
  {
    id: "spring",
    alt: "Birds wheeling over a green spring meadow with flowers, a winding stream, and a dark thundercloud with a flash of lightning.",
    colors: spgB.colors,
    motifs: { birds: [50, 24, 22], stream: [82, 80, 20], storm: [132, 26, 22] },
    render: renderSpringB,
  },
  {
    id: "albinoni",
    alt: "An oboe lying on a table beside a stack of paper and a page of music, by an arched window over the Venice lagoon at dusk.",
    colors: albB.colors,
    motifs: { oboe: [98, 80, 24], paper: [38, 74, 20], window: [125, 34, 20] },
    render: renderAlbinoniB,
  },
  {
    id: "nachtmusik",
    alt: "Five string players in silhouette on a Viennese terrace at night, lit by a lantern, while a firework rocket climbs into the starry sky.",
    colors: nmB.colors,
    motifs: { players: [90, 66, 30], rocket: [128, 30, 18], lantern: [36, 38, 12] },
    render: renderNachtmusikB,
  },
  {
    id: "magic-flute",
    alt: "A theatre stage framed by red curtains, with three temples under a starry night and a crescent moon, and a golden flute floating over the boards.",
    colors: mfB.colors,
    motifs: { temples: [80, 48, 28], flute: [80, 80, 18], moon: [124, 18, 11] },
    render: renderMagicFluteB,
  },
  {
    id: "pathetique",
    alt: "A boy copying music by lamplight at a library desk, a printed score propped before him and bookshelves behind.",
    colors: patB.colors,
    motifs: { copyist: [96, 54, 18], shelves: [130, 36, 26], score: [68, 54, 14] },
    render: renderPathetiqueB,
  },
  {
    id: "fifth",
    alt: "A heavy wooden door with an iron knocker, four bars of short-short-short-long lighting in turn, and a yellowhammer singing on a bare branch.",
    colors: fifB.colors,
    motifs: { door: [30, 56, 24], motif: [86, 40, 22], bird: [136, 62, 13] },
    render: renderFifthB,
  },
  {
    id: "pastoral",
    alt: "Green hills and a patchwork of fields under a pale sky, a brook winding down past a cottage and a tree, and birds wheeling overhead.",
    colors: pasC.colors,
    motifs: { brook: [86, 76, 16], cottage: [134, 48, 16], birds: [52, 22, 22] },
    render: renderPastoralC,
  },
  {
    id: "waltz",
    alt: "A couple turning in a dark ballroom beneath a swaying gilt chandelier, her pale gown swinging out over the parquet.",
    colors: walC.colors,
    motifs: { dancers: [84, 58, 22], chandelier: [80, 16, 17] },
    render: renderWaltzC,
  },
  {
    id: "ballade",
    alt: "A stone tower on a cliff above a stormy night sea, one window lit, lightning forking down and waves breaking on the rocks.",
    colors: balC.colors,
    motifs: { tower: [137, 40, 18], storm: [32, 28, 22], sea: [50, 82, 20] },
    render: renderBalladeC,
  },
  {
    id: "wedding-march",
    alt: "A bride and groom beneath an arch of blossoming trees in a moonlit wood, two heralds' trumpets raised, fairies glimmering in the branches.",
    colors: wedC.colors,
    motifs: { couple: [80, 66, 16], trumpets: [80, 56, 40], fairies: [40, 28, 20] },
    render: renderWeddingC,
  },
  {
    id: "italian",
    alt: "The Bay of Naples in bright sun: Vesuvius trailing smoke across the water, a sail, a town of terracotta roofs and dark cypresses.",
    colors: itaC.colors,
    motifs: { vesuvius: [100, 32, 22], bay: [60, 64, 18], town: [50, 88, 18] },
    render: renderItalianC,
  },
  {
    id: "schubert-sonata",
    alt: "A lone figure in coat and hat walking away down an autumn road at dusk, a bare tree letting its last leaves fall.",
    colors: schC.colors,
    motifs: { wanderer: [112, 80, 14], tree: [30, 44, 26], sunset: [118, 58, 16] },
    render: renderSchubertC,
  },
  {
    id: "intermezzo",
    alt: "Alpine peaks glowing in a summer evening above a river valley, and in front a sealed letter with a rose laid beside it.",
    colors: intC.colors,
    motifs: { mountains: [80, 28, 26], letter: [60, 88, 18], rose: [124, 82, 10] },
    render: renderIntermezzoC,
  },
  {
    id: "foreign-lands",
    alt: "A turning globe on a brass stand beside an open picture book showing pyramids in the desert and a ship under sail.",
    colors: forC.colors,
    motifs: { globe: [123, 35, 25], book: [30, 80, 18], ship: [74, 80, 14] },
    render: renderForeignLandsC,
  },
  {
    id: "roman-carnival",
    alt: "A carnival night in a Roman square: strings of coloured lanterns, fireworks over old stone arcades, and two dancers leaping with a tambourine.",
    colors: romC.colors,
    motifs: { dancers: [80, 62, 22], lanterns: [80, 28, 22], fireworks: [80, 10, 14] },
    render: renderRomanC,
  },
  {
    id: "carmen",
    alt: "A sunlit bullring with whitewashed arches and a crowd, a toreador sweeping his red cape, a red rose and an open fan on the sand.",
    colors: carC.colors,
    motifs: { toreador: [60, 72, 18], rose: [122, 90, 12], bullring: [80, 46, 20] },
    render: renderCarmenC,
  },
];
