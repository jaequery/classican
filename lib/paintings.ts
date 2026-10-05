// One original pixel painting per piece, each showing what the piece is about:
// the Greek dancers behind Satie's title, the moonlit park of Verlaine's poem,
// Bach's two-keyboard harpsichord, the columns of Knossos, Chopin's piano at night,
// Casals' cello, a sleeping child, the circle of keys, a desert sunrise, a Viennese
// salon, stained glass, Lake Lucerne by moonlight, a swan, a gondola, a Warsaw desk.
// Then thirty more, from Dvořák's prairie moon and Smetana's river to the Mountain
// King's hall, the Great Gate of Kiev, Saint-Saëns' graveyard dance, Handel's forge,
// Vivaldi's spring, the Magic Flute's temples and Carmen's bullring.
// And thirty more again, from the cannon of the 1812 Overture and Fingal's Cave to
// Verdi's anvils, the bumblebee, Liszt's csárdás, William Tell's apple and Šárka's ambush.
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
  | "carmen"
  | "grieg-concerto"
  | "overture-1812"
  | "romeo-juliet"
  | "blue-danube"
  | "hebrides"
  | "orpheus"
  | "anvil-chorus"
  | "libiamo"
  | "bridal-chorus"
  | "bumblebee"
  | "surprise"
  | "figaro"
  | "valse-brillante"
  | "ocean-etude"
  | "winter"
  | "hungarian-dance"
  | "academic-festival"
  | "italian-concerto"
  | "partita-preludio"
  | "schumann-concerto"
  | "rondo-capriccioso"
  | "freischutz"
  | "asturias"
  | "carnival-overture"
  | "egmont"
  | "bald-mountain"
  | "william-tell"
  | "hungarian-rhapsody"
  | "te-deum"
  | "sarka";

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
// 46. Grieg, Piano Concerto: a grand piano on the shore of a Norwegian fjord,
//     with the timpani whose roll opens the concerto
// ---------------------------------------------------------------------------

const griegConcertoC = palette({
  s0: "#9fb8cf",
  s1: "#c9d8e4",
  cloud: "#eef2f4",
  mtn: "#3e5566",
  mtnL: "#5f7a8c",
  snow: "#f2f5f7",
  fjord: "#2e5470",
  fjordL: "#4f7d9a",
  rock: "#5a5048",
  rockL: "#7a6e62",
  grass: "#4e6e3a",
  piano: "#141416",
  pianoL: "#3a3a40",
  keys: "#f0ece0",
  drum: "#9a5e22",
  drumL: "#d79a4c",
  head: "#e8dcc0",
  cabin: "#9e2a2a",
});
const griegConcertoSkyC = fracture(500, [[griegConcertoC.c.s0, griegConcertoC.c.s1], [griegConcertoC.c.s1, griegConcertoC.c.cloud], [griegConcertoC.c.s1, griegConcertoC.c.s0]], 3, [-8, -8, 168, 46]);
const griegConcertoShoreC = fracture(503, [[griegConcertoC.c.rock, griegConcertoC.c.rockL], [griegConcertoC.c.rockL, griegConcertoC.c.grass], [griegConcertoC.c.rock, griegConcertoC.c.grass]], 4, [-8, 76, 168, 108]);

function renderGriegConcertoC(r: Raster, f: Frame) {
  const { c } = griegConcertoC;
  paintPlanes(r, griegConcertoSkyC, f);

  // Steep fjord walls on either side, snow on the peaks, a red cabin on the slope.
  r.fill([[-4, 76], [-4, 8], [18, 4], [40, 18], [62, 44], [70, 60], [74, 76]], c.mtn, c.mtnL, 5);
  r.fill([[10, 6], [18, 4], [28, 11], [20, 12], [14, 14]], c.snow);
  r.fill([[164, 76], [164, 10], [142, 6], [124, 20], [102, 46], [92, 62], [88, 76]], c.mtn, c.mtnL, 4);
  r.fill([[134, 12], [142, 6], [152, 10], [144, 14], [138, 16]], c.snow);
  r.fill(rect(130, 38, 8, 6), c.cabin);
  r.fill([[129, 38], [134, 34], [139, 38]], c.piano);
  r.dot(132, 41, c.drumL);

  // The fjord itself, light glinting as it ripples away to the horizon.
  r.fill([[70, 58], [92, 58], [104, 76], [58, 76]], c.fjord, c.fjordL, 4);
  for (let k = 0; k < 6; k++) {
    const y = 61 + k * 2.6;
    const x = 81 + wave(f, 0.5, k * 1.3) * (2 + k);
    r.fill(rect(x - 2 - k, y, 3 + k, 1), c.fjordL);
  }
  paintPlanes(r, griegConcertoShoreC, f);

  // The grand piano on the shore, lid raised.
  r.fill([[88, 70], [116, 50], [126, 70]], c.pianoL, c.piano, 6);
  r.line(106, 70, 113, 58, c.piano);
  r.fill(rect(84, 70, 42, 6), c.piano);
  r.fill(ellipse(126, 73, 4, 3, -Math.PI / 2, Math.PI / 2, 8), c.piano);
  r.fill(rect(78, 69, 7, 3), c.keys);
  for (let x = 79; x < 85; x += 2) r.dot(x, 69, c.piano);
  r.fill(rect(87, 76, 2, 11), c.piano);
  r.fill(rect(122, 76, 2, 11), c.piano);
  r.fill(rect(104, 76, 2, 8), c.pianoL);

  // The timpani, its mallets rolling on the drumhead.
  r.fill(ellipse(34, 78, 13, 12, 0, Math.PI, 14), c.drum, c.drumL, 5);
  r.fill(ellipse(34, 78, 13, 3, 0, Math.PI * 2, 18), c.head);
  r.line(24, 87, 21, 96, c.pianoL);
  r.line(44, 87, 47, 96, c.pianoL);
  const roll = Math.abs(wave(f, 6)) * 3;
  const roll2 = Math.abs(wave(f, 6, 1.6)) * 3;
  r.line(18, 64 - roll, 29, 76 - roll, c.piano);
  r.fill(ellipse(29, 76 - roll, 1.6, 1.4, 0, Math.PI * 2, 8), c.keys);
  r.line(50, 64 - roll2, 39, 76 - roll2, c.piano);
  r.fill(ellipse(39, 76 - roll2, 1.6, 1.4, 0, Math.PI * 2, 8), c.keys);
}

// ---------------------------------------------------------------------------
// 47. 1812 Overture: Moscow's golden-domed cathedral, a cannon firing,
//     a bell swinging in the tower and fireworks over the city
// ---------------------------------------------------------------------------

const overture1812C = palette({
  s0: "#1a1838",
  s1: "#33295a",
  s2: "#5a3a68",
  wall: "#ece6d8",
  wallS: "#b8ae9c",
  gold: "#e0b040",
  goldD: "#a87a20",
  roof: "#2a2430",
  ground: "#3a3028",
  groundL: "#5a4a3a",
  iron: "#1e1e22",
  ironL: "#4a4a52",
  wood: "#6a4424",
  smoke: "#a8a0a8",
  flash: "#ffd070",
  red: "#e04a3a",
  blue: "#7ab0f0",
});
const overture1812SkyC = fracture(510, [[overture1812C.c.s0, overture1812C.c.s1], [overture1812C.c.s1, overture1812C.c.s2], [overture1812C.c.s1, overture1812C.c.s0]], 4, [-8, -8, 168, 70]);
const overture1812GroundC = fracture(513, [[overture1812C.c.ground, overture1812C.c.groundL], [overture1812C.c.groundL, overture1812C.c.ground]], 3, [-8, 74, 168, 108]);

function overture1812Dome(r: Raster, x: number, y: number, w: number, h: number) {
  const { c } = overture1812C;
  r.fill(rect(x - w * 0.7, y, w * 1.4, h * 0.9), c.wall, c.wallS, 4);
  r.fill(ellipse(x, y, w, h, Math.PI, Math.PI * 2, 14), c.gold, c.goldD, 4);
  r.fill([[x - 1, y - h], [x + 1, y - h], [x, y - h - 4]], c.gold);
  r.line(x, y - h - 7, x, y - h - 2, c.gold);
  r.line(x - 2, y - h - 5, x + 2, y - h - 5, c.gold);
}

function renderOverture1812C(r: Raster, f: Frame) {
  const { c } = overture1812C;
  paintPlanes(r, overture1812SkyC, f);

  // Fireworks bursting and fading over the city.
  for (let k = 0; k < 3; k++) {
    const p = f.still ? 0.5 : (f.t * 0.12 + k / 3) % 1;
    const [bx, by] = [[30, 16], [74, 10], [148, 18]][k];
    const col = [c.flash, c.red, c.blue][k];
    const rad = 3 + p * 8;
    if (p < 0.85) for (let a = 0; a < 10; a++) {
      const ang = (a / 10) * Math.PI * 2 + k;
      r.dot(bx + Math.cos(ang) * rad, by + Math.sin(ang) * rad * 0.8, col);
      r.dot(bx + Math.cos(ang) * rad * 0.6, by + Math.sin(ang) * rad * 0.5, col);
    }
  }

  // The cathedral: a white cube under five golden domes.
  r.fill(rect(76, 44, 50, 32), c.wall, c.wallS, 3);
  for (let x = 80; x < 124; x += 8) r.fill([...ellipse(x + 3, 54, 3, 4, Math.PI, Math.PI * 2, 8), [x + 6, 64], [x, 64]], c.roof);
  overture1812Dome(r, 101, 34, 11, 12);
  overture1812Dome(r, 82, 42, 5, 6);
  overture1812Dome(r, 120, 42, 5, 6);

  // The bell tower, its bell swinging.
  r.fill(rect(134, 30, 12, 46), c.wall, c.wallS, 5);
  overture1812Dome(r, 140, 30, 5, 6);
  r.fill(rect(136, 38, 8, 10), c.roof);
  const sw = wave(f, 1.2) * 0.5;
  r.fill(place([[-2.5, 0], [2.5, 0], [3.5, 6], [-3.5, 6]], 140, 39, sw), c.gold, c.goldD, 4);
  paintPlanes(r, overture1812GroundC, f);

  // The cannon, recoiling as it fires, smoke rolling out across the ground.
  const fire = f.still ? 0 : (f.t * 0.35) % 1;
  const kick = fire < 0.1 ? 2 : 0;
  const barrel = place([[-2, -4], [30, -2.5], [31, -3.5], [31, 3.5], [30, 2.5], [-2, 4]], 14 - kick, 80, -0.3);
  r.fill(barrel, c.ironL, c.smoke, 3);
  r.stroke(barrel, c.iron);
  r.fill([[8 - kick, 92], [30 - kick, 92], [24 - kick, 82], [12 - kick, 84]], c.wood);
  r.fill(ellipse(20 - kick, 90, 7, 7, 0, Math.PI * 2, 16), c.wood, c.goldD, 3);
  r.stroke(ellipse(20 - kick, 90, 7, 7, 0, Math.PI * 2, 16), c.iron);
  r.fill(ellipse(20 - kick, 90, 2, 2, 0, Math.PI * 2, 8), c.iron);
  if (fire < 0.15) r.fill(ellipse(47, 70, 4, 3, 0, Math.PI * 2, 10), c.flash);
  for (let k = 0; k < 5; k++) {
    const p = f.still ? k / 5 : (fire + k / 5) % 1;
    r.fill(ellipse(48 + p * 22, 68 - p * 10, 2 + p * 5, 1.5 + p * 3, 0, Math.PI * 2, 10), c.smoke, c.s2, Math.round(p * 10));
  }
}

// ---------------------------------------------------------------------------
// 48. Romeo and Juliet: Juliet on her moonlit balcony, Romeo below in the
//     garden, and the crossed swords of the feuding families
// ---------------------------------------------------------------------------

const romeoJulietC = palette({
  s0: "#0e1430",
  s1: "#1e2650",
  s2: "#34306a",
  moon: "#f2ecc8",
  stone: "#a89a8a",
  stoneS: "#6e6258",
  leaf: "#16301e",
  leafL: "#2a5032",
  rose: "#c8304a",
  dress: "#ece8f0",
  cloak: "#5a2a5a",
  cloakL: "#8a3a6a",
  skin: "#e0b898",
  hair: "#3a2418",
  steel: "#d0d4dc",
  hilt: "#c8a040",
});
const romeoJulietSkyC = fracture(520, [[romeoJulietC.c.s0, romeoJulietC.c.s1], [romeoJulietC.c.s1, romeoJulietC.c.s2], [romeoJulietC.c.s1, romeoJulietC.c.s0]], 4, [-8, -8, 168, 64]);
const romeoJulietGardenC = fracture(523, [[romeoJulietC.c.leaf, romeoJulietC.c.leafL], [romeoJulietC.c.leafL, romeoJulietC.c.leaf]], 4, [-8, 70, 168, 108]);

function renderRomeoJulietC(r: Raster, f: Frame) {
  const { c } = romeoJulietC;
  paintPlanes(r, romeoJulietSkyC, f);
  r.fill(ellipse(70, 16, 7, 7, 0, Math.PI * 2, 20), c.moon);
  for (let k = 0; k < 8; k++) if (f.still || wave(f, 0.7, k * 2.1) > -0.3) r.dot(14 + k * 17, 6 + ((k * 7) % 11), c.moon);

  // The Capulets' house, with Juliet's balcony.
  r.fill(rect(106, 6, 58, 94), c.stone, c.stoneS, 5);
  r.fill([...ellipse(124, 30, 7, 6, Math.PI, Math.PI * 2, 10), [131, 44], [117, 44]], c.s0);
  r.fill(rect(104, 44, 36, 3), c.stoneS);
  for (let x = 106; x < 140; x += 4) r.fill(rect(x, 47, 2, 8), c.stone);
  r.fill(rect(104, 55, 36, 2), c.stoneS);
  r.fill([[110, 57], [134, 57], [128, 62], [116, 62]], c.stoneS);

  // Juliet leans out in a pale gown.
  const lean = wave(f, 0.3) * 0.8;
  r.fill([[119 + lean, 34], [127 + lean, 34], [129, 47], [117, 47]], c.dress);
  r.fill(ellipse(123 + lean, 31, 2.5, 3, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(123 + lean, 29.5, 3, 2, Math.PI, Math.PI * 2, 8), c.hair);
  r.line(119 + lean, 37, 113 + lean, 44, c.skin);

  // Ivy and roses climb the wall.
  for (let k = 0; k < 14; k++) {
    const y = 96 - k * 4;
    r.fill(ellipse(104 + ((k * 3) % 5), y, 2.5, 2, 0, Math.PI * 2, 8), c.leafL);
    if (k % 3 === 0) r.dot(105, y - 1, c.rose);
  }
  paintPlanes(r, romeoJulietGardenC, f);

  // Romeo in the garden below, reaching up.
  const reach = wave(f, 0.4) * 2;
  r.fill([[56, 66], [66, 66], [70, 92], [52, 92]], c.cloak, c.cloakL, 4);
  r.fill(ellipse(61, 62, 3, 3.5, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(61, 60, 3.4, 2.2, Math.PI, Math.PI * 2, 8), c.hair);
  r.line(65, 68, 80 + reach, 54 - reach, c.cloakL);
  r.line(66, 69, 81 + reach, 55 - reach, c.cloakL);
  r.dot(81 + reach, 53 - reach, c.skin);

  // Two crossed swords: the feud between the Montagues and the Capulets.
  r.line(12, 18, 40, 46, c.steel);
  r.line(13, 18, 41, 46, c.steel);
  r.line(40, 18, 12, 46, c.steel);
  r.line(41, 18, 13, 46, c.steel);
  r.line(34, 36, 42, 42, c.hilt);
  r.line(18, 36, 10, 42, c.hilt);
  r.fill(ellipse(41, 46, 2, 2, 0, Math.PI * 2, 8), c.hilt);
  r.fill(ellipse(12, 46, 2, 2, 0, Math.PI * 2, 8), c.hilt);
}

// ---------------------------------------------------------------------------
// 49. The Blue Danube: the river winding past Vienna at dawn, a couple
//     waltzing on a terrace and an autograph fan
// ---------------------------------------------------------------------------

const blueDanubeC = palette({
  s0: "#f4d8b8",
  s1: "#f8e8d0",
  s2: "#d8c8e0",
  sun: "#fff4d8",
  hill: "#6a8a6a",
  hillL: "#8aa880",
  hillF: "#4a6a52",
  river: "#3a6ab0",
  riverL: "#7aa8e0",
  spire: "#5a4a48",
  stone: "#e8dcc8",
  stoneS: "#b8a890",
  gown: "#a8c8f0",
  gownL: "#e0ecfa",
  coat: "#1a1a28",
  skin: "#e8c0a0",
  fan: "#f8f0e0",
  ink: "#2a2430",
});
const blueDanubeSkyC = fracture(530, [[blueDanubeC.c.s0, blueDanubeC.c.s1], [blueDanubeC.c.s1, blueDanubeC.c.s2], [blueDanubeC.c.s1, blueDanubeC.c.sun]], 3, [-8, -8, 168, 40]);
const blueDanubeTerraceC = fracture(533, [[blueDanubeC.c.stone, blueDanubeC.c.stoneS], [blueDanubeC.c.stoneS, blueDanubeC.c.stone]], 3, [-8, 80, 168, 108]);

function renderBlueDanubeC(r: Raster, f: Frame) {
  const { c } = blueDanubeC;
  paintPlanes(r, blueDanubeSkyC, f);
  r.fill(ellipse(124, 30, 9, 9, Math.PI, Math.PI * 2, 14), c.sun);

  // Rolling hills, and a city of spires on the far bank.
  r.fill([[-4, 44], [20, 30], [50, 36], [80, 28], [110, 34], [140, 26], [164, 32], [164, 60], [-4, 60]], c.hill, c.hillL, 5);
  for (const [x, h] of [[54, 12], [60, 7], [66, 16], [72, 8], [78, 10]]) {
    r.fill(rect(x, 42 - h, 4, h + 2), c.spire);
    r.fill([[x, 42 - h], [x + 4, 42 - h], [x + 2, 36 - h]], c.spire);
  }
  r.fill([[-4, 52], [40, 46], [90, 54], [130, 48], [164, 54], [164, 66], [-4, 66]], c.hillF);

  // The river, sweeping in a wide curve towards us, its ripples moving.
  const river: Pt[] = [[96, 50], [112, 50], [96, 60], [70, 70], [56, 82], [70, 92], [26, 92], [20, 80], [44, 66], [80, 56]];
  r.fill(river, c.river);
  for (let k = 0; k < 10; k++) {
    const p = f.still ? k / 10 : (f.t * 0.04 + k / 10) % 1;
    const y = 52 + p * 38;
    const x = 100 - p * 62 + Math.sin(p * 5) * 4;
    r.fill(rect(x - 1 - p * 3, y, 2 + p * 6, 1), c.riverL);
  }
  paintPlanes(r, blueDanubeTerraceC, f);
  r.fill(rect(-1, 78, 162, 2), c.stoneS);
  for (let x = 2; x < 160; x += 6) r.fill(rect(x, 72, 2, 6), c.stone);
  r.fill(rect(-1, 71, 162, 2), c.stone);

  // A couple turning in the waltz.
  const turn = wave(f, 0.9) * 2;
  const dx = 116 + turn;
  r.fill([[dx - 2, 68], [dx + 4, 68], [dx + 12, 94], [dx - 10, 94]], c.gown, c.gownL, 5);
  r.fill(ellipse(dx + 1, 64, 2.5, 3, 0, Math.PI * 2, 10), c.skin);
  r.fill([[dx + 6, 62], [dx + 12, 62], [dx + 13, 84], [dx + 5, 84]], c.coat);
  r.fill(rect(dx + 6, 84, 2, 10), c.coat);
  r.fill(rect(dx + 10, 84, 2, 10), c.coat);
  r.fill(ellipse(dx + 9, 58, 2.5, 3, 0, Math.PI * 2, 10), c.skin);
  r.line(dx + 4, 66, dx + 7, 64, c.coat);

  // A lady's autograph fan, open, with a few bars of music written on it.
  r.fill(ellipse(34, 98, 22, 18, Math.PI * 1.05, Math.PI * 1.95, 14).concat([[34, 98]]), c.fan);
  for (let k = 0; k <= 8; k++) {
    const a = Math.PI * 1.05 + k * 0.1125 * Math.PI;
    r.line(34 + Math.cos(a) * 6, 98 + Math.sin(a) * 5, 34 + Math.cos(a) * 22, 98 + Math.sin(a) * 18, c.stoneS);
  }
  r.stroke(ellipse(34, 98, 22, 18, Math.PI * 1.05, Math.PI * 1.95, 14), c.stoneS, false);
  r.stroke(ellipse(34, 98, 15, 12, Math.PI * 1.2, Math.PI * 1.8, 10), c.gown, false);
  r.stroke(ellipse(34, 98, 17, 14, Math.PI * 1.2, Math.PI * 1.8, 10), c.gown, false);
  for (let k = 0; k < 5; k++) {
    const a = Math.PI * 1.25 + k * 0.12 * Math.PI;
    r.fill(ellipse(34 + Math.cos(a) * 16, 98 + Math.sin(a) * 13, 1.2, 1, 0, Math.PI * 2, 6), c.ink);
  }
  r.fill(ellipse(34, 98, 3, 3, 0, Math.PI * 2, 8), c.ink);
}

// ---------------------------------------------------------------------------
// 50. The Hebrides: Fingal's Cave on Staffa, its basalt columns over a
//     rolling sea, and a small boat bringing visitors
// ---------------------------------------------------------------------------

const hebridesC = palette({
  s0: "#8a98a8",
  s1: "#b8c4cc",
  s2: "#dce2e4",
  basalt: "#2a2a30",
  basaltL: "#4a4c56",
  basaltH: "#6a6e7a",
  cave: "#0e0e14",
  grass: "#5a7a4a",
  sea: "#2a4a5a",
  seaL: "#4a7484",
  foam: "#e8eef0",
  boat: "#6a3a1e",
  sail: "#e0d8c0",
  gull: "#f4f4f4",
});
const hebridesSkyC = fracture(540, [[hebridesC.c.s0, hebridesC.c.s1], [hebridesC.c.s1, hebridesC.c.s2], [hebridesC.c.s1, hebridesC.c.s0]], 4, [-8, -8, 168, 50]);
const hebridesSeaC = fracture(543, [[hebridesC.c.sea, hebridesC.c.seaL], [hebridesC.c.seaL, hebridesC.c.sea]], 4, [-8, 62, 168, 108]);

function renderHebridesC(r: Raster, f: Frame) {
  const { c } = hebridesC;
  paintPlanes(r, hebridesSkyC, f);

  // The island: a grass cap over rows of six-sided basalt columns.
  r.fill([[-4, 14], [30, 8], [80, 10], [104, 18], [104, 24], [-4, 24]], c.grass);
  r.fill(rect(-4, 20, 108, 46), c.basalt);
  for (let x = -2; x < 104; x += 5) {
    const top = 20 + ((x * 7) % 5);
    r.fill(rect(x, top, 4, 46), c.basaltL, c.basalt, 5);
    r.line(x + 4, top, x + 4, 66, c.basalt);
    r.dot(x + 1, top, c.basaltH);
  }
  // The great arch of the cave, dark inside.
  r.fill([...ellipse(56, 66, 16, 34, Math.PI, Math.PI * 2, 18)], c.cave);
  for (let k = 0; k < 5; k++) r.line(44 + k * 6, 66, 44 + k * 6, 50 - Math.abs(k - 2) * 5, c.basaltL);
  r.fill(ellipse(56, 66, 16, 34, Math.PI * 1.15, Math.PI * 1.85, 14).concat([[56, 40]]), c.cave);

  // Gulls wheeling over the cliff.
  for (let k = 0; k < 3; k++) {
    const p = f.still ? k / 3 : (f.t * 0.03 + k / 3) % 1;
    const gx = 110 + Math.cos(p * Math.PI * 2) * 22;
    const gy = 16 + Math.sin(p * Math.PI * 2) * 6;
    const flap = wave(f, 3, k) > 0 ? 1 : 0;
    r.line(gx - 3, gy - flap, gx, gy, c.gull);
    r.line(gx, gy, gx + 3, gy - flap, c.gull);
  }

  // The sea rolling in, waves breaking into the cave mouth.
  paintPlanes(r, hebridesSeaC, f);
  for (let k = 0; k < 6; k++) {
    const y = 68 + k * 5;
    const off = f.still ? 0 : (f.t * (4 + k)) % 24;
    for (let x = -24 + off; x < 164; x += 24) {
      r.stroke(ellipse(x + k * 5, y, 6, 2, Math.PI, Math.PI * 2, 6), c.foam, false);
    }
  }
  r.fill(ellipse(56, 66, 15, 2, 0, Math.PI * 2, 12), c.foam, c.seaL, 6);

  // A small sailing boat rising and falling on the swell.
  const bob = wave(f, 0.7) * 1.5;
  r.fill([[118, 64 + bob], [140, 64 + bob], [136, 69 + bob], [122, 69 + bob]], c.boat);
  r.line(129, 64 + bob, 129, 46 + bob, c.boat);
  r.fill([[130, 47 + bob], [130, 62 + bob], [140, 62 + bob]], c.sail);
  r.fill([[128, 49 + bob], [128, 62 + bob], [120, 62 + bob]], c.sail, c.s1, 4);
}

// ---------------------------------------------------------------------------
// 51. Orpheus in the Underworld: can-can dancers kicking on a theatre stage,
//     Olympus in the clouds above, the flames of the underworld below
// ---------------------------------------------------------------------------

const orpheusC = palette({
  back: "#2a0e18",
  backL: "#4a1a28",
  curtain: "#a01828",
  curtainD: "#600c18",
  gold: "#e8b840",
  cloud: "#f0e8f0",
  cloudS: "#c8b8d0",
  sky: "#7a8ac8",
  stage: "#6a3a1e",
  stageL: "#8a5428",
  skirt: "#f8f4f0",
  frill: "#e83a6a",
  stock: "#141014",
  skin: "#f0c8a8",
  flame: "#f07a20",
  flameL: "#ffd040",
  violin: "#a8541a",
  violinD: "#5a2a0e",
});
const orpheusBackC = fracture(550, [[orpheusC.c.back, orpheusC.c.backL], [orpheusC.c.backL, orpheusC.c.back]], 4, [-8, -8, 168, 76]);
const orpheusStageC = fracture(553, [[orpheusC.c.stage, orpheusC.c.stageL], [orpheusC.c.stageL, orpheusC.c.stage]], 3, [-8, 76, 168, 108]);

function orpheusDancer(r: Raster, f: Frame, x: number, phase: number) {
  const { c } = orpheusC;
  const kick = f.still ? 0.5 : (Math.sin(f.t * 2.4 + phase) + 1) / 2;
  r.fill(ellipse(x, 48, 2.5, 3, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(x, 46, 3, 2, Math.PI, Math.PI * 2, 8), c.stock);
  r.fill(rect(x - 2, 51, 4, 8), c.stock);
  // The skirt flips up with each kick, showing its frills.
  r.fill([[x - 2, 58], [x + 2, 58], [x + 9, 60 - kick * 6], [x + 6, 66], [x - 6, 66]], c.skirt, c.frill, 5);
  r.stroke([[x + 9, 60 - kick * 6], [x + 6, 66], [x - 6, 66]], c.frill, false);
  r.line(x - 1, 66, x - 2, 78, c.stock);
  r.line(x, 66, x - 1, 78, c.stock);
  r.line(x + 1, 64, x + 4 + kick * 6, 76 - kick * 22, c.stock);
  r.line(x + 2, 64, x + 5 + kick * 6, 76 - kick * 22, c.stock);
  r.line(x - 2, 52, x - 7, 56, c.skin);
}

function renderOrpheusC(r: Raster, f: Frame) {
  const { c } = orpheusC;
  paintPlanes(r, orpheusBackC, f);

  // Olympus: the gods' clouds, painted on the backdrop.
  r.fill(rect(30, 4, 100, 26), c.sky);
  for (let k = 0; k < 6; k++) r.fill(ellipse(40 + k * 16, 24 + (k % 2) * 2, 10, 6, 0, Math.PI * 2, 14), c.cloud, c.cloudS, 4);
  r.fill([[72, 18], [88, 18], [86, 10], [74, 10]], c.gold);
  for (let x = 74; x < 88; x += 3) r.line(x, 10, x, 18, c.cloudS);

  // The flames of the underworld leaping at the back of the stage.
  for (let k = 0; k < 12; k++) {
    const h = 8 + Math.abs(wave(f, 2.2, k * 1.9)) * 8;
    const x = 20 + k * 11;
    r.fill([[x - 5, 76], [x + 5, 76], [x, 76 - h]], c.flame);
    r.fill([[x - 2, 76], [x + 2, 76], [x, 76 - h * 0.5]], c.flameL);
  }
  paintPlanes(r, orpheusStageC, f);
  for (let x = 4; x < 160; x += 10) r.fill(ellipse(x, 98, 2, 1, 0, Math.PI * 2, 6), c.flameL);

  // The line of can-can dancers.
  for (let k = 0; k < 4; k++) orpheusDancer(r, f, 54 + k * 16, k * 0.5);

  // Orpheus's violin, resting at the edge of the stage.
  r.fill(place(ellipse(0, 0, 7, 5.5, 0, Math.PI * 2, 14), 26, 86, 0.46), c.violin, c.violinD, 3);
  r.fill(place(ellipse(0, 0, 5.5, 4.5, 0, Math.PI * 2, 14), 32, 76, 0.46), c.violin, c.violinD, 3);
  r.fill([[27, 82], [32, 81], [33, 80], [28, 83]], c.violinD);
  thick(r, 34, 72, 43, 54, c.violinD);
  r.fill(ellipse(44, 52, 2, 2, 0, Math.PI * 2, 8), c.violinD);
  r.line(24, 90, 41, 56, c.gold);
  r.line(14, 70, 44, 92, c.cloud);

  // Red velvet curtains, gathered with gold cords.
  r.fill([[-4, -4], [26, -4], [18, 30], [10, 100], [-4, 100]], c.curtain, c.curtainD, 5);
  r.fill([[164, -4], [134, -4], [142, 30], [150, 100], [164, 100]], c.curtain, c.curtainD, 5);
  for (let x = 0; x < 160; x += 8) r.fill(ellipse(x + 4, 0, 5, 4, 0, Math.PI, 8), c.curtain);
  r.line(10, 36, 20, 36, c.gold);
  r.line(140, 36, 150, 36, c.gold);
}

// ---------------------------------------------------------------------------
// 52. Il trovatore, Anvil Chorus: Gypsies at their anvils in a mountain camp at dawn
// ---------------------------------------------------------------------------

const anvilC = palette({
  s0: "#3a2a4e",
  s1: "#a4506a",
  s2: "#ee9a5e",
  sun: "#ffe2a2",
  mtn: "#3e2a44",
  mtnL: "#5e3a52",
  ground: "#3a2a20",
  groundL: "#5a4030",
  iron: "#24242c",
  ironL: "#70707e",
  skin: "#c08860",
  red: "#b02a2a",
  shirt: "#e6d6b4",
  fire: "#ff9030",
  fireL: "#ffe070",
  tent: "#8a5a3a",
});
const anvilSkyC = fracture(560, [[anvilC.c.s0, anvilC.c.s1], [anvilC.c.s1, anvilC.c.s2], [anvilC.c.s1, anvilC.c.s0]], 3, [-8, -8, 168, 52]);
const anvilGroundC = fracture(561, [[anvilC.c.ground, anvilC.c.groundL], [anvilC.c.groundL, anvilC.c.ground]], 3, [-8, 64, 168, 108]);

function anvilIronC(r: Raster, x: number, y: number) {
  const { c } = anvilC;
  r.fill([[x - 8, y - 8], [x + 7, y - 8], [x + 13, y - 7], [x + 7, y - 5], [x - 8, y - 5]], c.iron);
  r.fill(rect(x - 8, y - 8, 15, 1), c.ironL);
  r.fill([[x - 3, y - 5], [x + 3, y - 5], [x + 2, y - 1], [x - 2, y - 1]], c.iron);
  r.fill([[x - 6, y - 1], [x + 6, y - 1], [x + 7, y + 2], [x - 7, y + 2]], c.iron);
}

/** A Gypsy smith beside his anvil; `lift` 1 is the hammer high, 0 is the blow. */
function anvilSmithC(r: Raster, x: number, y: number, lift: number, dir: 1 | -1) {
  const { c } = anvilC;
  thick(r, x - 2, y + 12, x - 4, y + 24, c.iron);
  thick(r, x + 1, y + 12, x + 3, y + 24, c.iron);
  r.fill([[x - 4, y], [x + 4, y], [x + 3, y + 13], [x - 3, y + 13]], c.shirt);
  r.fill(rect(x - 4, y + 9, 8, 2), c.red);
  r.fill(ellipse(x, y - 4, 3, 3.5, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(x, y - 6, 3.4, 2.2, Math.PI, Math.PI * 2, 8), c.red);
  // The hammer arm swings from high overhead down to the anvil.
  const a = -0.25 - lift * 1.9;
  const hx = x + dir * Math.cos(a) * 13;
  const hy = y + 2 + Math.sin(a) * 13;
  thick(r, x + dir * 2, y + 2, hx, hy, c.skin);
  // The handle runs on past the fist to a heavy square head.
  const ex = x + dir * Math.cos(a) * 20;
  const ey = y + 2 + Math.sin(a) * 20;
  r.line(hx, hy, ex, ey, c.tent);
  r.fill(place(rect(-3, -2.5, 6, 5), ex, ey, a), c.iron);
  r.fill(place(rect(-3, -2.5, 6, 1), ex, ey, a), c.ironL);
}

function renderAnvilChorusC(r: Raster, f: Frame) {
  const { c } = anvilC;
  paintPlanes(r, anvilSkyC, f);

  // Dawn breaks over the mountains of Biscay.
  const rise = f.still ? 0 : Math.min(4, (f.t * 0.02) % 8);
  r.fill(ellipse(118, 44 - rise, 10, 10, 0, Math.PI * 2, 24), c.sun, c.s2, 3);
  r.fill([[-4, 64], [18, 36], [34, 48], [58, 28], [84, 52], [104, 38], [128, 56], [150, 40], [164, 50], [164, 66], [-4, 66]], c.mtn, c.mtnL, 4);
  paintPlanes(r, anvilGroundC, f);

  // The camp: a tent, and a fire that has burned through the night.
  r.fill([[2, 72], [20, 44], [38, 72]], c.tent, c.groundL, 3);
  r.fill([[16, 72], [20, 56], [24, 72]], c.iron);
  for (let k = 0; k < 3; k++) r.line(38 + k * 4, 92, 50 - k * 3, 86, c.groundL);
  const fl = wave(f, 3.1);
  r.fill([[38, 90], [41, 80 - fl], [44, 86], [46, 76 + fl], [49, 85], [52, 81 - fl], [54, 90]], c.fire);
  r.fill([[42, 90], [45, 83 + fl], [47, 87], [50, 84 - fl], [51, 90]], c.fireL);

  // Two smiths beat out the rhythm, one after the other.
  const lift1 = f.still ? 1 : (Math.cos(f.t * 2.6) + 1) / 2;
  const lift2 = f.still ? 0 : (Math.cos(f.t * 2.6 + Math.PI) + 1) / 2;
  anvilIronC(r, 84, 86);
  anvilSmithC(r, 70, 62, lift1, 1);
  anvilIronC(r, 128, 86);
  anvilSmithC(r, 142, 62, lift2, -1);

  // Sparks fly from whichever anvil was just struck.
  const sparks = (x: number, lift: number, seed: number) => {
    if (lift > 0.3) return;
    const step = f.still ? 0 : Math.floor(f.t * 8);
    for (let k = 0; k < 7; k++) {
      const h = hash(k + seed, step);
      r.dot(x - 6 + h * 14, 74 - hash(step, k + seed) * 9, k % 2 ? c.fireL : c.fire);
    }
  };
  sparks(84, lift1, 3);
  sparks(128, lift2, 11);
}

// ---------------------------------------------------------------------------
// 53. La traviata, Libiamo: a toast under the chandelier at Violetta's party
// ---------------------------------------------------------------------------

const libC = palette({
  w0: "#3e1420",
  w1: "#5e2230",
  w2: "#7a3038",
  gold: "#d0a448",
  goldL: "#f4dc90",
  flame: "#fff2b8",
  gown: "#f2eadc",
  gownS: "#c4b8a2",
  black: "#141016",
  skin: "#e2b28e",
  hair: "#3a2216",
  champ: "#f0d470",
  glass: "#cfe0e6",
  cloth: "#e6ddcc",
  leaf: "#2e5a2a",
  curtain: "#8a1e2a",
});
const libWallC = fracture(570, [[libC.c.w0, libC.c.w1], [libC.c.w1, libC.c.w2], [libC.c.w1, libC.c.w0]], 4);

function libGlassC(r: Raster, x: number, y: number, f: Frame, phase: number) {
  const { c } = libC;
  r.fill([[x - 2, y - 4], [x + 2, y - 4], [x + 1, y], [x - 1, y]], c.glass, c.champ, 8);
  r.line(x, y, x, y + 3, c.glass);
  r.line(x - 1, y + 3, x + 1, y + 3, c.glass);
  for (let k = 0; k < 2; k++) {
    const p = f.still ? 0.4 + k * 0.3 : (f.t * 0.5 + k * 0.5 + phase) % 1;
    r.dot(x + (k ? 1 : -1), y - 5 - p * 6, c.goldL);
  }
}

function renderLibiamoC(r: Raster, f: Frame) {
  const { c } = libC;
  paintPlanes(r, libWallC, f);

  // Heavy curtains frame the salon.
  r.fill([[-4, -4], [22, -4], [16, 40], [24, 100], [-4, 100]], c.curtain, c.w0, 5);
  r.fill([[164, -4], [138, -4], [144, 40], [136, 100], [164, 100]], c.curtain, c.w0, 5);
  r.line(12, 0, 8, 98, c.w0);
  r.line(148, 0, 152, 98, c.w0);

  // The chandelier sways a little; its candles flicker.
  const sway = wave(f, 0.5) * 1.5;
  r.line(80, 0, 80 + sway, 8, c.gold);
  r.fill(ellipse(80 + sway, 14, 16, 4, 0, Math.PI, 14), c.gold, c.goldL, 3);
  r.fill(ellipse(80 + sway, 13, 16, 2, 0, Math.PI * 2, 14), c.goldL);
  for (let k = -3; k <= 3; k++) {
    const x = 80 + sway + k * 5;
    r.line(x, 9, x, 12, c.gown);
    r.dot(x, 8 - (wave(f, 5, k) > 0.5 ? 1 : 0), c.flame);
  }
  for (let k = -2; k <= 2; k++) r.dot(80 + sway + k * 6, 19, c.goldL);

  // Guests in the shadows behind.
  for (const [x, h] of [[34, 30], [46, 28], [114, 29], [126, 31]] as [number, number][]) {
    r.fill(ellipse(x, h + 18, 3, 3.5, 0, Math.PI * 2, 10), c.w0);
    r.fill([[x - 5, h + 22], [x + 5, h + 22], [x + 6, h + 44], [x - 6, h + 44]], c.w0);
  }

  // Violetta in white, Alfredo in black, raising their glasses to each other.
  const lift = wave(f, 0.7) * 2;
  r.fill([[54, 46], [62, 46], [72, 84], [44, 84]], c.gown, c.gownS, 4);
  r.fill([[54, 46], [62, 46], [60, 56], [56, 56]], c.gownS);
  r.fill(ellipse(58, 40, 3.5, 4, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(58, 37, 4, 3, Math.PI, Math.PI * 2, 8), c.hair);
  r.fill(ellipse(62, 37, 2, 2, 0, Math.PI * 2, 6), c.gown);
  thick(r, 61, 48, 72, 40 - lift, c.skin);
  libGlassC(r, 73, 38 - lift, f, 0);

  r.fill([[96, 44], [104, 44], [106, 70], [94, 70]], c.black);
  r.fill([[98, 44], [102, 44], [100, 52]], c.gown);
  thick(r, 96, 70, 95, 86, c.black);
  thick(r, 102, 70, 104, 86, c.black);
  r.fill(ellipse(100, 39, 3.5, 4, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(100, 36, 4, 2.5, Math.PI, Math.PI * 2, 8), c.hair);
  thick(r, 95, 47, 86, 40 + lift, c.black);
  libGlassC(r, 85, 38 + lift, f, 0.5);

  // The supper table, with glasses, a bottle and a white camellia.
  r.fill([[20, 84], [140, 84], [148, 100], [12, 100]], c.cloth, c.gownS, 3);
  r.fill(rect(24, 70, 4, 14), c.leaf);
  r.fill(rect(25, 66, 2, 4), c.leaf);
  r.dot(25, 72, c.goldL);
  for (const x of [36, 52, 108, 120]) libGlassC(r, x, 84, f, x * 0.01);
  r.line(124, 88, 136, 84, c.leaf);
  r.fill([[128, 87], [131, 84], [133, 88]], c.leaf);
  r.fill(ellipse(132, 82, 4, 3.5, 0, Math.PI * 2, 12), c.gown, c.gownS, 3);
  r.dot(132, 82, c.gownS);
}

// ---------------------------------------------------------------------------
// 54. Lohengrin, Bridal Chorus: Elsa and the Swan Knight led by torchlight to the bridal chamber
// ---------------------------------------------------------------------------

const briC = palette({
  st0: "#1e1a2a",
  st1: "#2e2a3e",
  st2: "#463e54",
  warm: "#f0b860",
  warmL: "#ffe0a0",
  white: "#f4f0e6",
  whiteS: "#c4c0cc",
  veil: "#dcdcea",
  armour: "#a8b0c0",
  armourD: "#5e6474",
  skin: "#e2b896",
  hair: "#d8b050",
  gown: "#6a3a5a",
  gownL: "#8e5276",
  flame: "#ff9a30",
  blue: "#3a5aa0",
});
const briHallC = fracture(580, [[briC.c.st0, briC.c.st1], [briC.c.st1, briC.c.st2], [briC.c.st1, briC.c.st0]], 4);

function briMaidC(r: Raster, f: Frame, x: number, y: number, phase: number) {
  const { c } = briC;
  const bob = wave(f, 0.8, phase) > 0.3 ? 1 : 0;
  r.fill([[x - 3, y - bob], [x + 3, y - bob], [x + 6, y + 26], [x - 6, y + 26]], c.gown, c.gownL, 4);
  r.fill(ellipse(x, y - 4 - bob, 2.6, 3, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(x, y - 6 - bob, 3, 2, Math.PI, Math.PI * 2, 8), c.hair);
  // A torch held high, its flame bending.
  r.line(x + 4, y + 8 - bob, x + 6, y - 8 - bob, c.armourD);
  const lean = wave(f, 3, phase);
  r.fill([[x + 4, y - 8 - bob], [x + 6 + lean, y - 15 - bob], [x + 8, y - 8 - bob]], c.flame);
  r.dot(x + 6, y - 10 - bob, c.warmL);
}

function renderBridalChorusC(r: Raster, f: Frame) {
  const { c } = briC;
  paintPlanes(r, briHallC, f);

  // A rose window and the pointed arch of the bridal chamber, warm inside.
  r.fill(ellipse(50, 18, 11, 11, 0, Math.PI * 2, 22), c.st2);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + (f.still ? 0 : f.t * 0.02);
    r.fill([[50, 18], [50 + Math.cos(a) * 10, 18 + Math.sin(a) * 10], [50 + Math.cos(a + 0.4) * 10, 18 + Math.sin(a + 0.4) * 10]], k % 2 ? c.blue : c.gownL);
  }
  r.stroke(ellipse(50, 18, 11, 11, 0, Math.PI * 2, 22), c.whiteS);
  r.fill([[112, 100], [112, 40], [118, 24], [130, 14], [142, 24], [148, 40], [148, 100]], c.warm, c.warmL, 4 + Math.round(wave(f, 0.6) * 2));
  r.stroke([[112, 100], [112, 40], [118, 24], [130, 14], [142, 24], [148, 40], [148, 100]], c.st0, false);
  // The bridal bed inside, with its canopy and pillows.
  r.fill([[116, 40], [144, 40], [140, 46], [120, 46]], c.gownL);
  r.line(120, 46, 120, 74, c.gown);
  r.line(140, 46, 140, 74, c.gown);
  r.fill(rect(120, 62, 20, 10), c.white, c.whiteS, 3);
  r.fill(rect(120, 56, 20, 6), c.gownL, c.gown, 4);
  r.fill(ellipse(124, 61, 3, 1.6, 0, Math.PI * 2, 8), c.white);
  r.fill(ellipse(136, 61, 3, 1.6, 0, Math.PI * 2, 8), c.white);
  r.fill(rect(-4, 92, 168, 12), c.st0, c.st1, 4);

  // The bridal pair walk slowly toward the chamber.
  const step = f.still ? 0 : wave(f, 0.25) * 3;
  const ex = 72 + step;
  r.fill([[ex - 4, 46], [ex + 4, 46], [ex + 9, 90], [ex - 13, 92]], c.white, c.whiteS, 3);
  r.fill([[ex - 4, 38], [ex - 1, 36], [ex - 18, 92], [ex - 24, 92]], c.veil, c.white, 6);
  r.fill(ellipse(ex, 40, 3.2, 3.8, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(ex, 37, 3.6, 2.2, Math.PI, Math.PI * 2, 8), c.hair);
  r.fill(ellipse(ex, 35, 3, 1.2, 0, Math.PI * 2, 8), c.white);

  const lx = 90 + step;
  r.fill([[lx - 4, 44], [lx + 4, 44], [lx + 5, 70], [lx - 5, 70]], c.armour, c.armourD, 4);
  thick(r, lx - 3, 70, lx - 4, 90, c.armourD);
  thick(r, lx + 1, 70, lx + 2, 90, c.armourD);
  r.fill(ellipse(lx, 39, 3.2, 3.8, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(lx, 36, 3.8, 2.6, Math.PI, Math.PI * 2, 8), c.armour);
  r.fill([[lx - 4, 44], [lx + 6, 44], [lx + 9, 80], [lx + 4, 82]], c.white, c.whiteS, 2);
  // His shield bears the swan that brought him.
  r.fill([[lx + 6, 54], [lx + 16, 54], [lx + 16, 64], [lx + 11, 72], [lx + 6, 64]], c.blue);
  r.fill(ellipse(lx + 11, 64, 3.5, 2, 0, Math.PI * 2, 10), c.white);
  r.line(lx + 13, 63, lx + 13, 58, c.white);
  r.dot(lx + 12, 58, c.white);
  thick(r, lx - 3, 50, ex + 3, 52, c.skin);

  // The bridesmaids follow with torches.
  briMaidC(r, f, 22, 62, 0);
  briMaidC(r, f, 40, 64, 1.7);
}

// ---------------------------------------------------------------------------
// 55. Flight of the Bumblebee: Prince Gvidon, turned into a bumblebee, flies over the sea
// ---------------------------------------------------------------------------

const bumC = palette({
  s0: "#8ec4e4",
  s1: "#b8dcee",
  cloud: "#eef6fa",
  sea: "#2a6a96",
  seaL: "#3e88b2",
  foam: "#d8eef6",
  isle: "#4a7a3a",
  wall: "#e8dcc0",
  dome: "#d8a030",
  domeG: "#3a8a5a",
  yellow: "#f4c020",
  black: "#141210",
  wing: "#e8f4fa",
  white: "#fafaf6",
  beak: "#e88a30",
  sail: "#f0e6cc",
  hull: "#6a3a22",
});
const bumSkyC = fracture(590, [[bumC.c.s0, bumC.c.s1], [bumC.c.s1, bumC.c.cloud], [bumC.c.s1, bumC.c.s0]], 3, [-8, -8, 168, 56]);
const bumSeaC = fracture(591, [[bumC.c.sea, bumC.c.seaL], [bumC.c.seaL, bumC.c.sea], [bumC.c.seaL, bumC.c.foam]], 4, [-8, 56, 168, 108]);

function renderBumblebeeC(r: Raster, f: Frame) {
  const { c } = bumC;
  paintPlanes(r, bumSkyC, f);
  paintPlanes(r, bumSeaC, f);

  // The island city of Prince Gvidon on the horizon, golden domes and white walls.
  r.fill([[-4, 58], [6, 48], [52, 46], [66, 58]], c.isle);
  r.fill(rect(10, 40, 36, 10), c.wall);
  for (let x = 10; x < 46; x += 4) r.fill(rect(x, 38, 2, 2), c.wall);
  for (const [x, h, col] of [[16, 8, c.dome], [28, 12, c.domeG], [40, 8, c.dome]] as [number, number, number][]) {
    r.fill(rect(x - 3, 40 - h, 6, h), c.wall);
    r.fill(ellipse(x, 40 - h, 4.5, 5, Math.PI, Math.PI * 2, 12), col);
    r.line(x, 40 - h - 5, x, 40 - h - 8, col);
  }

  // The tsar's ship, sailing for home.
  const roll = wave(f, 0.7) * 1.5;
  r.fill([[112, 70 + roll], [148, 70 - roll], [142, 78], [118, 78]], c.hull);
  r.line(130, 70, 130, 44, c.hull);
  r.fill([[131, 46], [146, 50 - roll], [146, 66 - roll], [131, 66]], c.sail, c.wing, 3);
  r.fill([[129, 48], [116, 52 + roll], [116, 66 + roll], [129, 66]], c.sail, c.wing, 3);
  r.fill([[130, 44], [136, 42], [130, 40]], c.beak);

  // The Swan-Bird who worked the magic, gliding below.
  const sx = 30 + wave(f, 0.3) * 3;
  r.fill(ellipse(sx, 84, 9, 4, 0, Math.PI * 2, 16), c.white);
  r.fill([[sx - 8, 82], [sx - 2, 80], [sx - 12, 76]], c.white);
  // A long curved neck: what makes a swan a swan.
  r.stroke([[sx + 6, 83], [sx + 9, 78], [sx + 9, 74], [sx + 7, 70], [sx + 8, 66]], c.white, false);
  r.stroke([[sx + 7, 83], [sx + 10, 78], [sx + 10, 74], [sx + 8, 70], [sx + 9, 66]], c.white, false);
  r.fill(ellipse(sx + 10, 65, 2.4, 1.8, 0, Math.PI * 2, 8), c.white);
  r.fill([[sx + 12, 64], [sx + 15, 66], [sx + 12, 66]], c.beak);
  r.dot(sx + 10, 64, c.black);
  r.line(sx - 8, 89, sx + 10, 89, c.foam);

  // The bumblebee zigzags at full speed, leaving a buzzing trail.
  const at = (t: number): Pt => [80 + Math.sin(t * 1.9) * 16 + Math.sin(t * 5.3) * 4, 40 + Math.sin(t * 2.7) * 9 + Math.cos(t * 6.1) * 3];
  const t0 = f.still ? 0.4 : f.t;
  for (let k = 8; k > 0; k--) {
    const [x, y] = at(t0 - k * 0.06);
    if (k % 2 === 0) r.dot(x, y, c.black);
  }
  const [bx, by] = at(t0);
  const flap = f.still ? 1 : Math.floor(f.t * 20) % 2;
  r.fill(ellipse(bx - 2, by - 5 - flap * 2, 4, 3, 0, Math.PI * 2, 10), c.wing);
  r.fill(ellipse(bx + 3, by - 5 - (1 - flap) * 2, 4, 3, 0, Math.PI * 2, 10), c.wing);
  r.fill(ellipse(bx, by, 7, 4.5, 0, Math.PI * 2, 16), c.yellow);
  for (const dx of [-3, 1, 5]) r.fill(rect(bx + dx, by - 4, 2, 9), c.black);
  r.fill(ellipse(bx - 8, by - 1, 3, 3, 0, Math.PI * 2, 10), c.black);
  r.dot(bx - 9, by - 2, c.white);
  r.line(bx - 9, by - 4, bx - 11, by - 7, c.black);
  r.line(bx + 7, by, bx + 9, by + 1, c.black);
}

// ---------------------------------------------------------------------------
// 56. Surprise Symphony, Andante: a London concert room, a dozing listener and the drum stroke
// ---------------------------------------------------------------------------

const surC = palette({
  w0: "#d8c8a4",
  w1: "#e8dcbc",
  w2: "#c4b088",
  gold: "#c89a40",
  goldL: "#f0d890",
  flame: "#fff4c0",
  copper: "#b0602a",
  copperL: "#d8884a",
  head: "#f0e6cc",
  coat: "#3a4a7a",
  coatL: "#566aa0",
  wig: "#f2f0ea",
  skin: "#e6b896",
  chair: "#7a2a2a",
  wood: "#5a3a22",
  black: "#1a1614",
  burst: "#fff8e0",
});
const surWallC = fracture(600, [[surC.c.w0, surC.c.w1], [surC.c.w1, surC.c.w2], [surC.c.w0, surC.c.w2]], 4);

function renderSurpriseC(r: Raster, f: Frame) {
  const { c } = surC;
  paintPlanes(r, surWallC, f);

  // Pilasters and a candle chandelier in the Hanover Square Rooms.
  for (const x of [8, 64, 150]) {
    r.fill(rect(x - 3, 0, 6, 88), c.w1, c.w2, 3);
    r.fill(rect(x - 4, 0, 8, 3), c.gold);
  }
  r.line(96, 0, 96, 6, c.gold);
  r.fill(ellipse(96, 10, 12, 3, 0, Math.PI, 12), c.gold, c.goldL, 4);
  for (let k = -2; k <= 2; k++) {
    r.line(96 + k * 5, 6, 96 + k * 5, 9, c.head);
    r.dot(96 + k * 5, 5 - (wave(f, 4, k) > 0.6 ? 1 : 0), c.flame);
  }
  r.fill(rect(-4, 86, 168, 18), c.wood, c.black, 3);

  // Once in a while, the drum: one loud stroke in a quiet tune.
  const cyc = f.still ? 7.2 : f.t % 8;
  const bang = cyc > 7 ? 1 - (cyc - 7) : 0;

  // A listener nods off in his chair... and starts awake.
  const nod = bang > 0 ? 0 : Math.min(3, cyc * 0.5);
  const jump = bang > 0 ? 3 : 0;
  r.fill([[24, 58], [50, 58], [50, 90], [24, 90]], c.chair);
  r.fill(rect(22, 40, 6, 50), c.chair);
  r.fill([[30, 54 - jump], [44, 54 - jump], [46, 76], [28, 76]], c.coat, c.coatL, 3);
  thick(r, 30, 76, 32, 90, c.black);
  thick(r, 40, 76, 42, 90, c.black);
  r.fill(ellipse(38, 46 - jump + nod, 5, 5.5, 0, Math.PI * 2, 14), c.skin);
  r.fill(ellipse(36, 44 - jump + nod, 6.5, 4.5, Math.PI * 0.9, Math.PI * 2.1, 12), c.wig);
  r.fill(ellipse(32, 50 - jump + nod, 2.5, 2, 0, Math.PI * 2, 8), c.wig);
  if (bang > 0) {
    r.fill(rect(39, 44 - jump, 2, 2), c.black);
    r.fill(rect(42, 44 - jump, 2, 2), c.black);
    r.fill(ellipse(41, 49 - jump, 1.5, 1.5, 0, Math.PI * 2, 6), c.black);
    thick(r, 44, 58 - jump, 52, 46 - jump, c.coat);
  } else {
    r.line(39, 45 + nod, 41, 45 + nod, c.black);
    r.line(42, 45 + nod, 44, 45 + nod, c.black);
    thick(r, 44, 60, 46, 70, c.coat);
  }

  // The kettledrum, its stick, and the burst of sound.
  r.fill(ellipse(112, 66, 18, 5, 0, Math.PI * 2, 20), c.head);
  r.fill(ellipse(112, 66, 18, 18, 0, Math.PI, 20), c.copper, c.copperL, 5);
  r.stroke(ellipse(112, 66, 18, 5, 0, Math.PI * 2, 20), c.gold);
  thick(r, 102, 82, 98, 90, c.black);
  thick(r, 122, 82, 126, 90, c.black);
  const sy = bang > 0 ? 62 : 46 + wave(f, 0.6) * 2;
  r.line(126, sy - 14, 116, sy, c.wood);
  r.fill(ellipse(116, sy, 2, 2, 0, Math.PI * 2, 8), c.head);
  if (bang > 0) {
    for (let k = 0; k < 9; k++) {
      const a = Math.PI + (k / 8) * Math.PI;
      const r0 = 22;
      const r1 = 22 + 10 * bang;
      r.line(112 + Math.cos(a) * r0, 62 + Math.sin(a) * r0 * 0.7, 112 + Math.cos(a) * r1, 62 + Math.sin(a) * r1 * 0.7, c.burst);
    }
  }

  // The tune on the stand: notes that tiptoe, then one fat chord.
  r.fill(rect(70, 30, 18, 14), c.head);
  r.line(79, 44, 79, 70, c.wood);
  for (let k = 0; k < 4; k++) r.line(71, 33 + k * 3, 87, 33 + k * 3, c.w2);
  for (let k = 0; k < 4; k++) r.dot(73 + k * 3, 39 - (k % 2) * 2, c.black);
  r.fill(rect(85, 33, 2, 7), c.black);
}

// ---------------------------------------------------------------------------
// 57. The Marriage of Figaro, Overture: Figaro measures the room while Susanna tries on her bonnet
// ---------------------------------------------------------------------------

const figC = palette({
  w0: "#e8d2a8",
  w1: "#f2e2c0",
  w2: "#d4b886",
  tile: "#b8603a",
  tileL: "#d07e52",
  sky: "#8ec8e8",
  sun: "#fff0b0",
  orange: "#f08a20",
  leaf: "#3a6a2a",
  wood: "#6a3e22",
  woodL: "#8e5a32",
  glass: "#bcd8e4",
  jacket: "#2e6a5a",
  skin: "#dca880",
  hair: "#2a1a12",
  dress: "#e6e0f0",
  bonnet: "#f6f2e6",
  rose: "#e0506a",
  ink: "#1e1612",
});
const figWallC = fracture(610, [[figC.c.w0, figC.c.w1], [figC.c.w1, figC.c.w2], [figC.c.w0, figC.c.w2]], 4, [-8, -8, 168, 70]);
const figFloorC = fracture(611, [[figC.c.tile, figC.c.tileL], [figC.c.tileL, figC.c.tile]], 3, [-8, 70, 168, 108]);

function renderFigaroC(r: Raster, f: Frame) {
  const { c } = figC;
  paintPlanes(r, figWallC, f);
  paintPlanes(r, figFloorC, f);
  for (let x = -6; x < 166; x += 12) r.line(x, 70, x - 14, 100, c.tile);

  // An arched window onto the Andalusian morning, an orange tree outside.
  r.fill([[20, 58], [20, 26], [24, 16], [34, 10], [44, 16], [48, 26], [48, 58]], c.sky);
  r.fill(ellipse(40, 20, 4, 4, 0, Math.PI * 2, 10), c.sun);
  r.fill(ellipse(30, 44, 9, 8, 0, Math.PI * 2, 16), c.leaf);
  r.fill(rect(29, 50, 2, 8), c.wood);
  for (const [x, y] of [[26, 42], [33, 40], [30, 47], [35, 46]] as Pt[]) r.fill(rect(x, y, 2, 2), c.orange);
  r.stroke([[20, 58], [20, 26], [24, 16], [34, 10], [44, 16], [48, 26], [48, 58]], c.woodL);
  r.line(34, 10, 34, 58, c.woodL);
  r.fill(rect(17, 58, 34, 3), c.woodL);

  // Figaro on his knees, measuring where the bed will go: "five, ten, twenty".
  const reach = wave(f, 0.9) * 4;
  r.fill([[52, 64], [62, 62], [66, 76], [54, 78]], c.jacket);
  r.fill(rect(54, 78, 14, 4), c.ink);
  thick(r, 66, 80, 76, 82, c.ink);
  r.fill(ellipse(57, 58, 3.4, 3.8, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(57, 55, 4, 2.4, Math.PI, Math.PI * 2, 8), c.hair);
  r.fill(rect(53, 56, 2, 4), c.hair);
  thick(r, 62, 66, 72 + reach, 76, c.skin);
  // The measuring rod, marked in tens.
  r.fill(rect(72 + reach, 76, 40, 2), c.bonnet);
  for (let k = 0; k <= 8; k++) r.dot(72 + reach + k * 5, 76, c.ink);
  // Chalk marks for the bed's corners.
  for (const [x, y] of [[74, 88], [118, 88], [80, 96], [124, 96]] as Pt[]) {
    r.line(x - 2, y, x + 2, y, c.bonnet);
    r.line(x, y - 1, x, y + 1, c.bonnet);
  }

  // Susanna at the mirror, trying on the bonnet she sewed for her wedding.
  r.fill([[124, 18], [150, 18], [150, 64], [124, 64]], c.woodL);
  r.fill([[127, 21], [147, 21], [147, 61], [127, 61]], c.glass, c.w1, 3);
  const tilt = wave(f, 0.5) * 0.15;
  r.fill([[108, 44], [116, 44], [122, 90], [100, 90]], c.dress, c.w2, 3);
  r.fill(rect(106, 54, 12, 2), c.rose);
  r.fill(ellipse(112, 38, 3.6, 4, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(112, 35, 4, 2.6, Math.PI, Math.PI * 2, 8), c.hair);
  r.fill(place(ellipse(0, 0, 7, 3.2, Math.PI, Math.PI * 2, 12), 112, 34, tilt), c.bonnet);
  r.fill(place(rect(-8, 0, 16, 1), 112, 34, tilt), c.bonnet);
  r.fill(ellipse(117, 32, 1.6, 1.6, 0, Math.PI * 2, 6), c.rose);
  thick(r, 116, 46, 115, 36, c.skin);
  // Her reflection, softer.
  r.fill(ellipse(137, 38, 3.4, 3.8, 0, Math.PI * 2, 12), c.skin, c.glass, 6);
  r.fill(ellipse(137, 34, 6, 2.8, Math.PI, Math.PI * 2, 12), c.bonnet, c.glass, 6);
  r.fill([[133, 44], [141, 44], [143, 61], [131, 61]], c.dress, c.glass, 6);
}

// ---------------------------------------------------------------------------
// 58. Grande valse brillante: sylphs in white dancing by moonlight on the 1909 Paris stage
// ---------------------------------------------------------------------------

const valseBrillanteC = palette({
  n0: "#101a3a",
  n1: "#1e2c58",
  n2: "#34477e",
  moon: "#f2ecc8",
  glow: "#9fb0d6",
  tree: "#0c1426",
  tree2: "#18284a",
  floor: "#3a3c5c",
  floorL: "#55587e",
  white: "#f4f2ec",
  whiteS: "#b8bcd2",
  skin: "#e2c8b0",
  black: "#141018",
  red: "#9a1c28",
  redD: "#5a0e18",
  gold: "#e0b040",
});
const valseBrillanteSkyC = fracture(620, [[valseBrillanteC.c.n0, valseBrillanteC.c.n1], [valseBrillanteC.c.n1, valseBrillanteC.c.n2], [valseBrillanteC.c.n1, valseBrillanteC.c.n0]], 4, [-8, -8, 168, 76]);
const valseBrillanteFloorC = fracture(621, [[valseBrillanteC.c.floor, valseBrillanteC.c.floorL], [valseBrillanteC.c.floorL, valseBrillanteC.c.floor]], 3, [-8, 74, 168, 108]);

function valseBrillanteSylphC(r: Raster, f: Frame, x: number, y: number, phase: number) {
  const { c } = valseBrillanteC;
  const sway = wave(f, 0.6, phase) * 1.5;
  const lift = wave(f, 0.6, phase + 1) > 0.3 ? 1 : 0;
  const hx = x + sway;
  y -= lift;
  // Long white romantic tutu, bodice, head and the little wings of a sylph.
  r.fill([[hx - 7, y - 6], [hx - 2, y - 17], [hx + 2, y - 17], [hx + 7, y - 6]], c.white, c.whiteS, 4);
  r.fill(rect(hx - 2, y - 23, 4, 7), c.white);
  r.fill(ellipse(hx, y - 26, 2.2, 2.6, 0, Math.PI * 2, 10), c.skin);
  r.fill([[hx - 2, y - 21], [hx - 7, y - 25], [hx - 6, y - 18]], c.whiteS);
  r.fill([[hx + 2, y - 21], [hx + 7, y - 25], [hx + 6, y - 18]], c.whiteS);
  // Arms lifted in a curve above the head.
  r.line(hx - 2, y - 22, hx - 5, y - 30 - sway, c.skin);
  r.line(hx + 2, y - 22, hx + 5, y - 30 + sway, c.skin);
  r.line(hx - 1, y - 6, hx - 1, y, c.whiteS);
  r.line(hx + 1, y - 6, hx + 2, y - 1, c.whiteS);
}

function renderValseBrillanteC(r: Raster, f: Frame) {
  const { c } = valseBrillanteC;
  paintPlanes(r, valseBrillanteSkyC, f);

  // The moon, with a soft halo.
  r.fill(ellipse(104, 20, 13, 12, 0, Math.PI * 2, 24), c.n2, c.glow, 4);
  r.fill(ellipse(104, 20, 8, 8, 0, Math.PI * 2, 20), c.moon);

  // The painted forest of the set: dark trees framing a glade.
  for (const [tx, h, w] of [[26, 58, 14], [44, 46, 10], [130, 54, 13], [114, 44, 9]] as [number, number, number][]) {
    r.fill(rect(tx - 1, 76 - h * 0.4, 3, h * 0.4), c.tree);
    r.fill([[tx - w, 76 - h * 0.35], [tx, 76 - h], [tx + w, 76 - h * 0.35]].map((p) => drift(p as Pt, f, 0.6)), c.tree, c.tree2, 3);
  }
  paintPlanes(r, valseBrillanteFloorC, f);
  r.tint(ellipse(90, 82, 40, 8, 0, Math.PI * 2, 24), { [c.floor]: c.floorL, [c.floorL]: c.glow }, 6);

  // Sylphs in a half circle, and the poet in his black tunic at the centre.
  valseBrillanteSylphC(r, f, 52, 86, 0);
  valseBrillanteSylphC(r, f, 70, 80, 1.2);
  valseBrillanteSylphC(r, f, 108, 80, 2.4);
  valseBrillanteSylphC(r, f, 126, 86, 3.6);
  const px = 89;
  r.fill(rect(px - 3, 64, 6, 10), c.black);
  r.fill(ellipse(px, 60, 2.4, 2.8, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(px, 58.5, 2.6, 1.6, Math.PI, Math.PI * 2, 8), c.black);
  r.line(px - 2, 74, px - 4, 86, c.white);
  r.line(px + 2, 74, px + 3, 86, c.white);
  r.line(px - 3, 66, px - 9, 60 + wave(f, 0.5) * 2, c.white);
  r.line(px + 3, 66, px + 9, 70, c.white);

  // Red velvet curtains and a gold-fringed valance frame the stage.
  r.fill([[-2, -2], [16, -2], [12, 40], [16, 102], [-2, 102]], c.red, c.redD, 5);
  r.fill([[144, -2], [162, -2], [162, 102], [144, 102], [148, 40]], c.red, c.redD, 5);
  r.fill(rect(-2, -2, 164, 8), c.red);
  for (let x = 0; x < 160; x += 10) r.fill(ellipse(x + 5, 6, 5, 4, 0, Math.PI, 8), c.redD);
  for (let x = 1; x < 160; x += 3) r.dot(x, 9 + ((x / 3) % 2), c.gold);

  // Footlights along the front of the stage, flickering a little.
  for (let x = 22; x < 140; x += 9) {
    r.fill(rect(x, 96, 4, 2), c.black);
    if (wave(f, 2.1, x) > -0.6) r.dot(x + 2, 95, c.gold);
  }
}

// ---------------------------------------------------------------------------
// 59. “Ocean” Étude: rolling waves under a storm, a lighthouse, light breaking through
// ---------------------------------------------------------------------------

const oceanEtudeC = palette({
  s0: "#2a3346",
  s1: "#3e4a62",
  s2: "#5a6680",
  sun: "#f4e0a0",
  sunL: "#fff4d0",
  deep: "#0e2a3c",
  sea: "#16445a",
  seaL: "#2a6a7e",
  crest: "#7ab0b8",
  foam: "#eef4f2",
  rock: "#24221e",
  rockL: "#4a463e",
  tower: "#e8e2d4",
  band: "#b02a24",
  lamp: "#ffd860",
  gull: "#f0f0ea",
});
const oceanEtudeSkyC = fracture(630, [[oceanEtudeC.c.s0, oceanEtudeC.c.s1], [oceanEtudeC.c.s1, oceanEtudeC.c.s2], [oceanEtudeC.c.s1, oceanEtudeC.c.s0]], 4, [-8, -8, 168, 50]);

/** One rolling row of sea: a crest line that rises and falls, filled down to the bottom. */
function oceanEtudeRowC(r: Raster, f: Frame, y: number, amp: number, len: number, speed: number, a: number, b: number, level: number) {
  const { c } = oceanEtudeC;
  const pts: Pt[] = [];
  const t = f.still ? 0 : f.t * speed;
  for (let x = -4; x <= 164; x += 4) pts.push([x, y + Math.sin(x / len + t) * amp + Math.sin(x / (len * 0.43) - t * 0.7) * amp * 0.35]);
  r.fill([...pts, [164, 102], [-4, 102]], a, b, level);
  for (const [x, py] of pts) if (Math.sin(x / len + t) < -0.75) r.dot(x, py, c.foam);
}

function renderOceanEtudeC(r: Raster, f: Frame) {
  const { c } = oceanEtudeC;
  paintPlanes(r, oceanEtudeSkyC, f);

  // Light breaking through the storm clouds: the climax turns to C major.
  r.fill([[86, -2], [124, -2], [116, 46], [70, 46]], c.s2, c.sun, 3);
  r.fill(ellipse(104, 8, 9, 6, 0, Math.PI * 2, 18), c.sun, c.sunL, 6);

  // The lighthouse on its rock, its beam sweeping.
  r.fill([[118, 58], [124, 44], [146, 46], [154, 60]], c.rock, c.rockL, 4);
  r.fill([[130, 46], [129.5, 22], [138.5, 22], [138, 46]], c.tower);
  for (const y of [28, 38]) r.fill(rect(129.6, y, 8.8, 4), c.band);
  r.fill(rect(129, 16, 10, 6), c.rock);
  r.fill(rect(131, 17, 6, 4), c.lamp);
  r.fill([[128, 15], [134, 10], [140, 15]], c.band);
  const sweep = f.still ? 0.4 : Math.sin(f.t * 0.5);
  if (sweep > -0.2) r.fill([[132, 19], [132 - 40 * sweep - 10, 12], [132 - 40 * sweep - 10, 26]], c.s2, c.lamp, 5);

  // Rows of rolling waves, deeper and bigger towards us.
  oceanEtudeRowC(r, f, 50, 1.5, 9, 0.6, c.sea, c.seaL, 4);
  oceanEtudeRowC(r, f, 60, 2.5, 11, 0.5, c.seaL, c.sea, 6);
  oceanEtudeRowC(r, f, 72, 3.5, 14, 0.45, c.sea, c.deep, 5);
  oceanEtudeRowC(r, f, 86, 5, 18, 0.4, c.deep, c.sea, 4);

  // A great breaking wave rearing up on the left, its foam curling over.
  const rise = wave(f, 0.4) * 2;
  r.fill([[-4, 102], [-4, 60 - rise], [10, 50 - rise], [30, 46 - rise], [44, 54 - rise], [38, 60], [50, 80], [62, 102]], c.seaL, c.crest, 5);
  r.fill([[10, 50 - rise], [30, 46 - rise], [44, 54 - rise], [40, 58 - rise], [32, 52 - rise], [20, 53 - rise]], c.foam, c.crest, 4);
  for (let k = 0; k < 10; k++) r.dot(30 + k * 2 + wave(f, 1.3, k) * 2, 58 - rise + (k % 3) * 2, c.foam);

  // Gulls riding the wind.
  for (let k = 0; k < 3; k++) {
    const gx = 50 + k * 18 + wave(f, 0.3, k * 2) * 6;
    const gy = 22 + k * 5 + wave(f, 0.7, k) * 2;
    const flap = wave(f, 2.2, k) > 0 ? 2 : 0;
    r.line(gx - 3, gy - flap, gx, gy, c.gull);
    r.line(gx, gy, gx + 3, gy - flap, c.gull);
  }
}

// ---------------------------------------------------------------------------
// 60. Winter, Largo: by the fire indoors while the rain pours down outside
// ---------------------------------------------------------------------------

const winterC = palette({
  w0: "#4a2c1e",
  w1: "#5e3a26",
  w2: "#744a30",
  stone: "#8a8278",
  stoneD: "#5a544c",
  soot: "#1a1210",
  f0: "#c8401c",
  f1: "#f0901c",
  f2: "#ffe070",
  log: "#3e2616",
  night: "#1a2640",
  nightL: "#2c3c5e",
  rain: "#8aa4c8",
  snow: "#eef0f4",
  wood: "#2a1a10",
  chair: "#7a1e28",
  chairL: "#9e3038",
  shawl: "#3a5a3a",
  skin: "#e0b890",
  rug: "#6a4a7a",
});
const winterWallC = fracture(640, [[winterC.c.w0, winterC.c.w1], [winterC.c.w1, winterC.c.w2], [winterC.c.w1, winterC.c.w0]], 4, [-8, -8, 168, 80]);

function renderWinterC(r: Raster, f: Frame) {
  const { c } = winterC;
  paintPlanes(r, winterWallC, f);
  r.fill(rect(-2, 78, 164, 24), c.wood);
  for (let y = 82; y < 100; y += 5) r.line(0, y, 160, y, c.log);

  // The window: night, rain slanting past, snow left on the sill.
  r.fill(rect(108, 14, 36, 44), c.night);
  for (let k = 0; k < 26; k++) {
    const sx = 108 + ((k * 13.7) % 36);
    const sy = 14 + ((k * 7.3 + (f.still ? 0 : f.t * 24)) % 44);
    r.line(sx, sy, sx - 1, sy + 3, c.rain);
  }
  r.stroke(rect(108, 14, 36, 44), c.wood);
  r.fill(rect(125, 14, 2, 44), c.wood);
  r.fill(rect(108, 35, 36, 2), c.wood);
  r.fill(rect(104, 57, 44, 4), c.wood);
  r.fill([[106, 57], [146, 57], [144, 55], [108, 55]], c.snow);

  // The stone fireplace with its fire.
  r.fill(rect(4, 26, 52, 54), c.stone, c.stoneD, 4);
  r.fill(rect(0, 22, 60, 5), c.stoneD);
  r.fill([[14, 80], [14, 46], [46, 46], [46, 80]], c.soot);
  r.fill(ellipse(30, 46, 16, 8, Math.PI, Math.PI * 2, 12), c.soot);
  r.fill(rect(16, 74, 28, 4), c.log);
  r.fill([[18, 72], [40, 70], [42, 74], [20, 76]], c.log);
  for (let k = 0; k < 5; k++) {
    const fx = 19 + k * 5.5;
    const h = 14 + Math.sin(k * 2.1) * 4 + wave(f, 2.4, k * 1.7) * 3;
    r.fill([[fx - 4, 73], [fx + 1 + wave(f, 3, k) * 1.5, 73 - h], [fx + 4, 73]], c.f0, c.f1, 6);
    r.fill([[fx - 2, 73], [fx + 1, 73 - h * 0.55], [fx + 3, 73]], c.f1, c.f2, 7);
  }
  // Firelight warms the wall and floor around it.
  r.tint(ellipse(30, 70, 46, 26, 0, Math.PI * 2, 24), { [c.w0]: c.w1, [c.w1]: c.w2, [c.wood]: c.log, [c.stoneD]: c.stone }, 4 + Math.round(wave(f, 1.7) * 2));

  // A rug, and an armchair turned to the fire, its sitter wrapped in a shawl.
  r.fill(ellipse(70, 90, 30, 6, 0, Math.PI * 2, 20), c.rug);
  r.fill([[60, 86], [62, 54], [72, 48], [84, 50], [88, 86]], c.chair, c.chairL, 4);
  r.fill(rect(56, 70, 36, 10), c.chairL, c.chair, 3);
  r.fill(rect(58, 80, 3, 7), c.wood);
  r.fill(rect(87, 80, 3, 7), c.wood);
  r.fill(ellipse(66, 52, 5, 5.5, 0, Math.PI * 2, 14), c.skin);
  r.fill([[58, 70], [60, 58], [70, 56], [72, 70]], c.shawl);
  r.fill(ellipse(66, 49, 5, 3, Math.PI, Math.PI * 2, 10), c.log);
  // Hands held out towards the warmth.
  r.line(60, 62, 52, 63 + wave(f, 0.5) * 0.6, c.skin);
}

// ---------------------------------------------------------------------------
// 61. Hungarian Dance No. 1: a village csárdás, a violinist playing by lantern light
// ---------------------------------------------------------------------------

const hungarianDanceC = palette({
  d0: "#2a1838",
  d1: "#46284e",
  d2: "#7a3a4a",
  ember: "#d87040",
  thatch: "#8a6a30",
  thatchD: "#5a4220",
  wall: "#e8dcc0",
  ground: "#5a4028",
  groundL: "#7a5834",
  lamp: "#ffd060",
  red: "#c8202c",
  redD: "#801420",
  green: "#2e6a34",
  white: "#f2eee4",
  black: "#141010",
  skin: "#d8a880",
  violin: "#a0521c",
});
const hungarianDanceSkyC = fracture(650, [[hungarianDanceC.c.d0, hungarianDanceC.c.d1], [hungarianDanceC.c.d1, hungarianDanceC.c.d2], [hungarianDanceC.c.d1, hungarianDanceC.c.d0]], 4, [-8, -8, 168, 52]);
const hungarianDanceGroundC = fracture(651, [[hungarianDanceC.c.ground, hungarianDanceC.c.groundL], [hungarianDanceC.c.groundL, hungarianDanceC.c.ground]], 3, [-8, 70, 168, 108]);

function renderHungarianDanceC(r: Raster, f: Frame) {
  const { c } = hungarianDanceC;
  paintPlanes(r, hungarianDanceSkyC, f);
  r.fill(rect(-2, 48, 164, 4), c.ember, c.d2, 6);

  // Whitewashed cottages with thatched roofs.
  for (const [hx, w] of [[8, 34], [116, 40]] as [number, number][]) {
    r.fill(rect(hx, 50, w, 22), c.wall);
    r.fill([[hx - 4, 52], [hx + w / 2, 32], [hx + w + 4, 52]], c.thatch, c.thatchD, 5);
    r.fill(rect(hx + w / 2 - 3, 58, 6, 6), c.lamp);
    r.fill(rect(hx + w / 2 - 0.5, 58, 1, 6), c.thatchD);
  }
  paintPlanes(r, hungarianDanceGroundC, f);

  // A string of lanterns across the square, swaying.
  r.stroke([[-2, 14], [40, 24], [80, 20], [120, 24], [162, 14]], c.black, false);
  for (let k = 0; k < 8; k++) {
    const lx = 10 + k * 20;
    const ly = 20 + Math.abs(Math.sin(k * 1.3)) * 3 + wave(f, 0.8, k) * 1;
    r.fill(ellipse(lx, ly + 3, 2.5, 3, 0, Math.PI * 2, 10), k % 3 === 0 ? c.red : c.lamp);
  }

  // The violinist, bow racing.
  const vx = 30;
  r.fill([[vx - 5, 88], [vx - 4, 66], [vx + 4, 66], [vx + 5, 88]], c.black);
  r.fill(rect(vx - 3, 66, 6, 8), c.white);
  r.fill(ellipse(vx, 61, 3, 3.5, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(vx, 58, 4, 1.6, Math.PI, Math.PI * 2, 8), c.black);
  r.fill(rect(vx - 5, 58, 10, 1), c.black);
  r.fill(place(ellipse(0, 0, 5, 2.4, 0, Math.PI * 2, 12), vx + 6, 65, -0.4), c.violin);
  r.line(vx + 10, 63, vx + 16, 60, c.black);
  const bow = wave(f, 3.2) * 5;
  r.line(vx + 2 + bow, 70, vx + 12 + bow, 58, c.wall);
  r.line(vx - 2, 68, vx + 3 + bow * 0.6, 69, c.white);

  // The dancing couple, her red skirt flaring as they turn.
  const turn = wave(f, 0.9);
  const dx = 88;
  r.fill([[dx - 12 - turn * 4, 86], [dx - 4, 70], [dx + 2, 70], [dx + 8 - turn * 2, 86]], c.red, c.redD, 4);
  for (let x = dx - 10 - turn * 4; x < dx + 7 - turn * 2; x += 3) r.dot(x, 84, c.green);
  r.fill(rect(dx - 4, 62, 6, 9), c.white);
  r.fill([[dx - 4, 64], [dx + 2, 64], [dx + 1, 70], [dx - 3, 70]], c.black);
  r.fill(ellipse(dx - 1, 58, 2.8, 3.2, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(dx - 1, 56.5, 3.4, 2.4, Math.PI, Math.PI * 2, 8), c.red);
  const mx = dx + 14;
  r.fill(rect(mx - 3, 60, 7, 12), c.white);
  r.fill(rect(mx - 3, 62, 7, 7), c.black);
  r.fill(rect(mx - 3, 72, 3, 14), c.black);
  r.fill(rect(mx + 1, 72, 3, 12 - Math.max(0, turn) * 4), c.black);
  r.fill(ellipse(mx + 0.5, 56, 3, 3.4, 0, Math.PI * 2, 12), c.skin);
  r.fill(rect(mx - 4, 52, 9, 2), c.black);
  r.line(mx - 3, 63, dx + 1, 64, c.white);
  r.line(mx + 4, 62, mx + 8, 55 + turn * 2, c.white);
}

// ---------------------------------------------------------------------------
// 62. Academic Festival Overture: students raising their steins in a university hall
// ---------------------------------------------------------------------------

const academicFestivalC = palette({
  h0: "#d8c49a",
  h1: "#e8d8b0",
  h2: "#bca070",
  gold: "#d8a838",
  goldD: "#a07020",
  blue: "#4a6aa0",
  blueL: "#8aaad0",
  fresco: "#c88a6a",
  wood: "#5a3418",
  woodL: "#7a4a24",
  parch: "#f2e8cc",
  seal: "#b01c20",
  ribbon: "#2a4a8a",
  coat: "#2a2a3a",
  coat2: "#3e2a2a",
  skin: "#e0b48c",
  cap1: "#c02a2a",
  cap2: "#2a8a4a",
  cap3: "#e0c040",
  stein: "#c8c8c0",
  beer: "#e8b030",
  foam: "#fbf6e8",
});
const academicFestivalWallC = fracture(660, [[academicFestivalC.c.h0, academicFestivalC.c.h1], [academicFestivalC.c.h1, academicFestivalC.c.h2], [academicFestivalC.c.h0, academicFestivalC.c.h2]], 4, [-8, 10, 168, 70]);

function renderAcademicFestivalC(r: Raster, f: Frame) {
  const { c } = academicFestivalC;
  paintPlanes(r, academicFestivalWallC, f);

  // A painted ceiling over gilded cornices.
  r.fill(rect(-2, -2, 164, 12), c.fresco, c.blueL, 5);
  for (let x = 0; x < 160; x += 20) r.fill(ellipse(x + 10, 4, 6, 3, 0, Math.PI * 2, 12), c.blue, c.blueL, 6);
  r.fill(rect(-2, 10, 164, 3), c.gold, c.goldD, 6);

  // Tall arched windows, light falling in.
  for (const wx of [10, 40, 70]) {
    r.fill([...ellipse(wx + 7, 24, 7, 7, Math.PI, Math.PI * 2, 10), [wx + 14, 56], [wx, 56]], c.blue, c.blueL, 6);
    r.stroke([...ellipse(wx + 7, 24, 7, 7, Math.PI, Math.PI * 2, 10), [wx + 14, 56], [wx, 56]], c.gold);
    r.line(wx + 7, 18, wx + 7, 56, c.gold);
    r.tint([[wx, 56], [wx + 14, 56], [wx + 22, 70], [wx + 6, 70]], { [c.h0]: c.h1, [c.h2]: c.h0 }, 8);
  }

  // The dais: a lectern, and the doctor’s diploma with its red seal and ribbon.
  r.fill(rect(96, 50, 64, 20), c.wood, c.woodL, 4);
  r.fill(rect(96, 48, 64, 3), c.gold);
  r.fill([[104, 50], [108, 34], [118, 34], [120, 50]], c.woodL, c.wood, 3);
  const unroll = wave(f, 0.3) * 1.5;
  r.fill(rect(124, 20 - unroll, 26, 30 + unroll), c.parch);
  r.fill(rect(122, 18 - unroll, 30, 3), c.h2);
  r.fill(rect(122, 49, 30, 3), c.h2);
  for (let y = 25; y < 40; y += 3) r.line(128, y, 146, y, c.h2);
  r.fill(ellipse(137, 43, 4, 4, 0, Math.PI * 2, 12), c.seal);
  r.fill([[135, 46], [133, 54], [137, 50]], c.ribbon);
  r.fill([[139, 46], [141, 54], [137, 50]], c.ribbon);

  // The floor, and a row of students in coloured caps, steins raised to sing.
  r.fill(rect(-2, 70, 164, 32), c.wood, c.woodL, 2);
  const caps = [c.cap1, c.cap2, c.cap3, c.cap1, c.cap2, c.cap3];
  for (let k = 0; k < 6; k++) {
    const sx = 12 + k * 26;
    const sy = 80 + (k % 2) * 4;
    const up = wave(f, 1.1, k * 1.3) > 0 ? 3 : 0;
    r.fill([[sx - 9, 102], [sx - 7, sy + 4], [sx + 7, sy + 4], [sx + 9, 102]], k % 2 ? c.coat : c.coat2);
    r.fill(ellipse(sx, sy - 2, 4.5, 5, 0, Math.PI * 2, 14), c.skin);
    r.fill(rect(sx - 5, sy - 8, 10, 3), caps[k]);
    r.fill(rect(sx - 6, sy - 6, 12, 1), c.coat);
    r.line(sx + 6, sy + 6, sx + 10, sy - 6 - up, c.skin);
    r.fill(rect(sx + 8, sy - 14 - up, 6, 8), c.stein);
    r.fill(rect(sx + 9, sy - 12 - up, 4, 5), c.beer);
    r.fill(ellipse(sx + 11, sy - 14 - up, 3.5, 1.6, 0, Math.PI * 2, 10), c.foam);
  }
}

// ---------------------------------------------------------------------------
// 63. Italian Concerto: an Italian piazza, a band of strings against a lone soloist, two keyboards
// ---------------------------------------------------------------------------

const italianConcertoC = palette({
  s0: "#f0c890",
  s1: "#f6dcae",
  s2: "#e8b078",
  terra: "#c8683a",
  terraL: "#dc8a56",
  ochre: "#e0a850",
  shade: "#8a4426",
  cypress: "#1e3a24",
  cypressL: "#2e5432",
  stone: "#e8d8b8",
  stoneD: "#b8a07a",
  coat: "#3a2a4a",
  coat2: "#6a2a2a",
  skin: "#e0b48c",
  wood: "#7a3a14",
  ivory: "#f4ecd8",
  ebony: "#1a1414",
  case: "#2a4a3a",
  gold: "#d8a838",
});
const italianConcertoSkyC = fracture(670, [[italianConcertoC.c.s0, italianConcertoC.c.s1], [italianConcertoC.c.s1, italianConcertoC.c.s2], [italianConcertoC.c.s0, italianConcertoC.c.s2]], 3, [-8, -8, 168, 40]);
const italianConcertoWallC = fracture(671, [[italianConcertoC.c.terra, italianConcertoC.c.terraL], [italianConcertoC.c.terraL, italianConcertoC.c.ochre], [italianConcertoC.c.terra, italianConcertoC.c.shade]], 4, [-8, 22, 100, 78]);

function italianConcertoPlayerC(r: Raster, f: Frame, x: number, y: number, coat: number, phase: number) {
  const { c } = italianConcertoC;
  r.fill([[x - 4, y + 16], [x - 3, y + 4], [x + 3, y + 4], [x + 4, y + 16]], coat);
  r.fill(ellipse(x, y, 2.6, 3, 0, Math.PI * 2, 10), c.skin);
  r.fill(place(ellipse(0, 0, 3.5, 1.8, 0, Math.PI * 2, 10), x + 4, y + 5, -0.5), c.wood);
  const bow = wave(f, 1.6, phase) * 3;
  r.line(x + 1 + bow, y + 10, x + 9 + bow, y + 2, c.stone);
}

function renderItalianConcertoC(r: Raster, f: Frame) {
  const { c } = italianConcertoC;
  paintPlanes(r, italianConcertoSkyC, f);

  // Cypresses on the hills beyond.
  r.fill([[96, 40], [120, 30], [150, 34], [164, 40], [164, 50], [96, 50]], c.cypressL);
  for (const [tx, h] of [[108, 22], [128, 28], [146, 20]] as [number, number][]) {
    r.fill(ellipse(tx, 46 - h / 2, 3, h / 2, 0, Math.PI * 2, 12).map((p) => drift(p, f, 0.3)), c.cypress);
  }

  // A terracotta loggia, its arches full of players: the tutti.
  paintPlanes(r, italianConcertoWallC, f);
  r.fill(rect(-2, 20, 96, 4), c.stone);
  for (let k = 0; k < 4; k++) {
    const ax = 4 + k * 23;
    r.fill([...ellipse(ax + 8, 36, 8, 8, Math.PI, Math.PI * 2, 10), [ax + 16, 66], [ax, 66]], c.shade);
    r.fill(rect(ax + 16, 28, 3, 40), c.stone, c.stoneD, 4);
    italianConcertoPlayerC(r, f, ax + 8, 46, k % 2 ? c.coat : c.coat2, k * 0.9);
  }
  r.fill(rect(-2, 66, 96, 3), c.stone);

  // The paved piazza, and the lone soloist standing apart in the sun.
  r.fill(rect(-2, 69, 164, 14), c.stone, c.stoneD, 3);
  r.fill([[94, 50], [164, 50], [164, 70], [94, 70]], c.ochre, c.s2, 4);
  italianConcertoPlayerC(r, f, 120, 52, c.coat2, 2.5);
  r.fill(rect(112, 68, 16, 2), c.shade);

  // In front, the two keyboards of the harpsichord: one loud, one soft.
  r.fill(rect(-2, 82, 164, 20), c.case);
  r.fill(rect(-2, 82, 164, 2), c.gold);
  for (const [ky, kh] of [[85, 6], [93, 7]] as [number, number][]) {
    r.fill(rect(4, ky, 152, kh), c.ivory);
    for (let x = 4; x < 156; x += 4) r.line(x, ky, x, ky + kh - 1, c.stoneD);
    for (let x = 6; x < 156; x += 4) if (x % 28 !== 18 && x % 28 !== 2) r.fill(rect(x, ky, 2, kh * 0.55), c.ebony);
  }
  // Keys go down as the music runs across them.
  const run = f.still ? 60 : 8 + ((f.t * 22) % 144);
  r.fill(rect(Math.round(run / 4) * 4 + 0.5, 93, 3, 7), c.stoneD);
}

// ---------------------------------------------------------------------------
// 64. Bach, Partita No. 3, Preludio: a guitar, a violin on the wall, the 1720 manuscript
// ---------------------------------------------------------------------------

const partitaC = palette({
  w0: "#5a3a22",
  w1: "#7a5432",
  w2: "#9a6e40",
  gold: "#d8a850",
  light: "#f0d898",
  sky: "#a8c8d8",
  skyL: "#d8ecf0",
  cream: "#f2e6c8",
  ink: "#2a1a10",
  wood: "#c47a34",
  woodL: "#e09a50",
  woodD: "#7a3e18",
  floor: "#3a2414",
  string: "#e8e0c8",
});
const partitaWallC = fracture(681, [[partitaC.c.w0, partitaC.c.w1], [partitaC.c.w1, partitaC.c.w2], [partitaC.c.w1, partitaC.c.w0]], 4, [-8, -8, 168, 90]);
const partitaFloorC = fracture(683, [[partitaC.c.floor, partitaC.c.w0], [partitaC.c.w0, partitaC.c.floor]], 3, [-8, 88, 168, 108]);

function renderPartitaC(r: Raster, f: Frame) {
  const { c } = partitaC;
  paintPlanes(r, partitaWallC, f);
  paintPlanes(r, partitaFloorC, f);

  // A window of Köthen daylight, its beam falling across the room.
  r.fill(rect(8, 8, 28, 36), c.sky, c.skyL, 5);
  r.fill(rect(21, 8, 2, 36), c.ink);
  r.fill(rect(8, 25, 28, 2), c.ink);
  r.stroke(rect(7, 7, 30, 38), c.ink);
  r.tint([[8, 44], [36, 44], [92, 90], [50, 90]], { [c.w0]: c.w1, [c.w1]: c.w2, [c.w2]: c.gold, [c.floor]: c.w0 }, 6 + Math.round(wave(f, 0.2) * 2));

  // The violin it was written for, hanging on the wall.
  const vx = 80;
  r.fill(ellipse(vx, 38, 7, 6, 0, Math.PI * 2, 16), c.woodD, c.wood, 6);
  r.fill(ellipse(vx, 27, 6, 5, 0, Math.PI * 2, 16), c.woodD, c.wood, 6);
  r.fill(rect(vx - 2, 30, 4, 4), c.woodD);
  r.fill(rect(vx - 1, 9, 2, 15), c.ink);
  r.fill(ellipse(vx, 8, 2, 2, 0, Math.PI * 2, 8), c.woodD);
  r.dot(vx - 3, 34, c.ink);
  r.dot(vx + 3, 34, c.ink);
  r.line(vx, 4, vx, 2, c.ink);

  // The manuscript on its stand, dated 1720, almost all running semiquavers.
  r.line(113, 52, 113, 90, c.ink);
  r.line(113, 90, 105, 94, c.ink);
  r.line(113, 90, 121, 94, c.ink);
  r.fill([[96, 16], [130, 18], [129, 52], [97, 50]], c.cream);
  for (let s = 0; s < 3; s++) {
    for (let l = 0; l < 4; l++) r.line(99, 21 + s * 10 + l * 2, 127, 22 + s * 10 + l * 2, c.w2);
    for (let x = 100; x < 127; x += 2) r.dot(x, 21 + s * 10 + Math.round(3 + 2.5 * Math.sin(x * 0.7 + s)), c.ink);
  }

  // The notes stream off the page towards the guitar that plays them here.
  for (let k = 0; k < 14; k++) {
    const p = f.still ? k / 14 : (f.t * 0.05 + k / 14) % 1;
    const x = 96 - p * 46;
    const y = 40 + p * 22 + Math.sin(p * 9 + (f.still ? 0 : f.t * 0.6)) * 4;
    r.dot(x, y, c.light);
    if (k % 3 === 0) r.dot(x, y - 1, c.light);
  }

  // A guitar, leaning in the light.
  const g = (pts: Pt[]) => place(pts, 36, 76, 0.42 + wave(f, 0.25) * 0.02);
  r.fill(g(ellipse(0, 8, 12, 10, 0, Math.PI * 2, 22)), c.wood, c.woodL, 4);
  r.fill(g(ellipse(0, -7, 9, 8, 0, Math.PI * 2, 20)), c.wood, c.woodL, 4);
  r.fill(g(ellipse(0, -1, 3.5, 3.5, 0, Math.PI * 2, 12)), c.ink);
  r.fill(g(rect(-2, -48, 4, 34)), c.woodD);
  r.fill(g([[-3, -56], [3, -56], [2.5, -48], [-2.5, -48]]), c.ink);
  r.fill(g(rect(-4, 11, 8, 2)), c.ink);
  for (const sx of [-1, 0.5]) {
    const [a, b] = g([[sx, 11], [sx, -54]]);
    r.line(a[0], a[1], b[0], b[1], c.string);
  }
}

// ---------------------------------------------------------------------------
// 65. Schumann, Piano Concerto: Clara at the piano, the oboe singing her name
// ---------------------------------------------------------------------------

const schConC = palette({
  h0: "#3a1e24",
  h1: "#5a2e30",
  h2: "#7a4436",
  gold: "#d8b060",
  goldL: "#f4dc98",
  flame: "#fff0b0",
  stage: "#8a5a34",
  stageL: "#a8743e",
  black: "#141012",
  ivory: "#f0e8d4",
  dress: "#2e5a4a",
  dressL: "#4a7e66",
  skin: "#e0b898",
  hair: "#4a2a1a",
  suit: "#22202a",
});
const schConHallC = fracture(691, [[schConC.c.h0, schConC.c.h1], [schConC.c.h1, schConC.c.h2], [schConC.c.h1, schConC.c.h0]], 4, [-8, -8, 168, 70]);
const schConStageC = fracture(693, [[schConC.c.stage, schConC.c.stageL], [schConC.c.stageL, schConC.c.stage]], 3, [-8, 70, 168, 108]);

function renderSchumannConcertoC(r: Raster, f: Frame) {
  const { c } = schConC;
  paintPlanes(r, schConHallC, f);
  paintPlanes(r, schConStageC, f);

  // The hall: gilded pilasters and a chandelier of flickering candles.
  for (const x of [6, 46, 112, 152]) r.fill(rect(x - 2, 0, 4, 70), c.gold, c.goldL, 3);
  r.fill(rect(-1, 68, 162, 3), c.gold);
  r.line(80, 0, 80, 8, c.gold);
  r.fill([[66, 12], [94, 12], [88, 18], [72, 18]], c.gold, c.goldL, 5);
  for (let k = 0; k < 6; k++) {
    const x = 68 + k * 5;
    r.line(x, 12, x, 9, c.ivory);
    if (f.still || hash(k, Math.floor(f.t * 3)) > 0.25) r.dot(x, 8, c.flame);
  }

  // The grand piano, lid raised.
  r.fill([[30, 54], [92, 54], [92, 62], [30, 62]], c.black);
  r.fill(ellipse(88, 58, 8, 4, -Math.PI / 2, Math.PI / 2, 10).concat([[60, 62], [60, 54]]), c.black);
  r.fill([[36, 54], [88, 54], [56, 30]], c.black);
  r.line(56, 30, 62, 54, c.gold);
  r.fill(rect(30, 54, 10, 3), c.ivory);
  for (let x = 31; x < 40; x += 2) r.dot(x, 54, c.black);
  for (const x of [34, 64, 88]) r.fill(rect(x - 1, 62, 2, 14), c.black);

  // Clara at the keyboard, her hands moving.
  r.fill([[14, 76], [34, 76], [28, 58], [20, 58]], c.dress, c.dressL, 5);
  r.fill([[20, 50], [28, 50], [28, 60], [20, 60]], c.dress);
  r.fill(ellipse(24, 45, 3.5, 4, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(23, 42, 4, 2.5, Math.PI, Math.PI * 2, 10), c.hair);
  r.fill(ellipse(20, 44, 2, 2, 0, Math.PI * 2, 8), c.hair);
  const hand = wave(f, 2.2) * 1.5;
  r.line(27, 52, 32 + hand, 54, c.skin);
  r.line(27, 53, 35 - hand, 55, c.skin);

  // The oboist, and the four notes of the theme rising: C–H–A–A, “Chiara”.
  const ox = 126;
  r.fill([[ox - 6, 76], [ox + 6, 76], [ox + 5, 50], [ox - 5, 50]], c.suit);
  r.fill(ellipse(ox, 45, 3.5, 4, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(ox, 42, 4, 2.2, Math.PI, Math.PI * 2, 10), c.hair);
  r.line(ox - 2, 48, ox - 10, 62, c.black);
  r.line(ox - 1, 48, ox - 9, 62, c.black);
  r.fill([[ox - 12, 62], [ox - 7, 62], [ox - 8, 65], [ox - 11, 65]], c.black);
  r.line(ox - 4, 53, ox - 7, 56, c.skin);
  for (let k = 0; k < 4; k++) {
    const p = f.still ? 0.4 : (f.t * 0.08 + k * 0.25) % 1;
    const x = ox - 18 - k * 9 + Math.sin(p * 6 + k) * 2;
    const y = 50 - p * 30 - k * 3;
    r.fill(ellipse(x, y, 2, 1.5, 0, Math.PI * 2, 8), c.goldL);
    r.line(x + 2, y, x + 2, y - 6, c.goldL);
  }
}

// ---------------------------------------------------------------------------
// 66. Saint-Saëns, Introduction and Rondo Capriccioso: Sarasate on a Paris stage
// ---------------------------------------------------------------------------

const rondoC = palette({
  b0: "#1a1424",
  b1: "#2c2034",
  red: "#a81e2a",
  redL: "#d43a3a",
  redD: "#5e0e18",
  gold: "#e0b040",
  glow: "#ffe8a0",
  board: "#6a4426",
  boardL: "#8a5c32",
  black: "#100c10",
  white: "#f0eadc",
  skin: "#dcae88",
  violin: "#b8602a",
  note: "#f4d878",
});
const rondoBackC = fracture(701, [[rondoC.c.b0, rondoC.c.b1], [rondoC.c.b1, rondoC.c.b0]], 4, [-8, -8, 168, 74]);
const rondoBoardC = fracture(703, [[rondoC.c.board, rondoC.c.boardL], [rondoC.c.boardL, rondoC.c.board]], 3, [-8, 74, 168, 108]);

function renderRondoC(r: Raster, f: Frame) {
  const { c } = rondoC;
  paintPlanes(r, rondoBackC, f);
  paintPlanes(r, rondoBoardC, f);

  // Red curtains gathered at either side, swagged across the top.
  const sway = wave(f, 0.3) * 1.5;
  r.fill([[-2, -2], [24, -2], [18 + sway, 40], [26, 80], [-2, 80]], c.red, c.redL, 4);
  r.fill([[162, -2], [136, -2], [142 - sway, 40], [134, 80], [162, 80]], c.red, c.redL, 4);
  for (const x of [6, 14, 146, 154]) r.line(x, 0, x + (x < 80 ? 4 : -4), 78, c.redD);
  r.fill([[-2, -2], [162, -2], [162, 6], [120, 12], [80, 8], [40, 12], [-2, 6]], c.redD, c.red, 4);
  r.fill(rect(-1, 74, 162, 2), c.gold);
  for (let x = 30; x < 132; x += 12) r.fill(ellipse(x, 79, 3, 1.5, Math.PI, Math.PI * 2, 8), c.glow);

  // The swirling rondo: notes circling back again and again.
  for (let k = 0; k < 10; k++) {
    const a = k * 0.628 + (f.still ? 0 : f.t * 0.35);
    const x = 80 + Math.cos(a) * 34;
    const y = 30 + Math.sin(a) * 12;
    r.fill(ellipse(x, y, 1.6, 1.2, 0, Math.PI * 2, 8), c.note);
    r.line(x + 1.5, y, x + 1.5, y - 4, c.note);
  }

  // Saint-Saëns conducting on his podium.
  const cx = 44;
  r.fill(rect(cx - 9, 66, 18, 8), c.board, c.black, 3);
  r.fill([[cx - 5, 66], [cx + 5, 66], [cx + 5, 46], [cx - 5, 46]], c.black);
  r.fill([[cx - 2, 46], [cx + 2, 46], [cx, 51]], c.white);
  r.fill(ellipse(cx, 41, 3.5, 4, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(cx + 1, 44, 3, 2.5, 0, Math.PI, 8), c.black);
  const beat = wave(f, 1.4) * 4;
  r.line(cx + 4, 48, cx + 12, 40 + beat, c.black);
  r.line(cx + 12, 40 + beat, cx + 18, 34 + beat, c.white);

  // Sarasate, the young Spanish virtuoso, with violin and bow.
  const sx = 104;
  r.fill([[sx - 6, 74], [sx + 6, 74], [sx + 5, 46], [sx - 5, 46]], c.black);
  r.fill(rect(sx - 6, 66, 12, 2), c.black);
  r.fill([[sx - 2, 46], [sx + 2, 46], [sx, 52]], c.white);
  r.fill(ellipse(sx, 40, 3.5, 4.5, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(sx, 37, 4, 3, Math.PI, Math.PI * 2, 10), c.black);
  r.fill(place(ellipse(0, 0, 6, 3, 0, Math.PI * 2, 14), sx - 6, 46, -0.35), c.violin);
  r.line(sx - 10, 47, sx - 20, 51, c.black);
  const bow = wave(f, 2.1) * 6;
  r.line(sx - 8 + bow, 38, sx + 2 + bow, 56, c.white);
  r.line(sx + 3, 50, sx - 1 + bow * 0.6, 48, c.skin);
}

// ---------------------------------------------------------------------------
// 67. Der Freischütz: the Wolf's Glen at midnight, magic bullets cast in the fire
// ---------------------------------------------------------------------------

const freiC = palette({
  n0: "#0c1018",
  n1: "#162030",
  n2: "#24304a",
  moon: "#f0ecd0",
  moonD: "#c8c4a0",
  rock: "#2e2a2e",
  rockL: "#4a4248",
  pine: "#0a140e",
  fire: "#e05a1a",
  fireL: "#ffb040",
  bullet: "#fff6c0",
  coat: "#3a4a2a",
  skin: "#c8a080",
  owl: "#6a5236",
});
const freiSkyC = fracture(711, [[freiC.c.n0, freiC.c.n1], [freiC.c.n1, freiC.c.n2], [freiC.c.n1, freiC.c.n0]], 3, [-8, -8, 168, 60]);
const freiRockC = fracture(713, [[freiC.c.rock, freiC.c.rockL], [freiC.c.rockL, freiC.c.rock], [freiC.c.rock, freiC.c.n0]], 4, [-8, 56, 168, 108]);

function pineC(r: Raster, x: number, base: number, h: number, c: number) {
  r.fill(rect(x - 1, base - 4, 2, 4), c);
  for (let k = 0; k < 4; k++) {
    const y = base - 4 - (k * h) / 4;
    const w = (h / 3) * (1 - k / 5);
    r.fill([[x - w, y], [x + w, y], [x, y - h / 2.6]], c);
  }
}

function renderFreischutzC(r: Raster, f: Frame) {
  const { c } = freiC;
  paintPlanes(r, freiSkyC, f);

  // The full moon, clouds sliding over it.
  r.fill(ellipse(126, 18, 10, 10, 0, Math.PI * 2, 22), c.moon, c.moonD, 3);
  const cl = f.still ? 0 : ((f.t * 1.5) % 80) - 20;
  r.fill([[100 + cl, 20], [130 + cl, 18], [140 + cl, 22], [108 + cl, 24]], c.n2);

  // The jagged walls of the glen, and the dark Bohemian forest above them.
  r.fill([[-4, 108], [-4, 20], [14, 34], [24, 28], [40, 56], [56, 64], [56, 108]], c.rock, c.rockL, 3);
  r.fill([[164, 108], [164, 30], [148, 44], [136, 40], [118, 62], [104, 66], [104, 108]], c.rock, c.rockL, 3);
  for (const [x, b, h] of [[6, 28, 22], [18, 32, 18], [30, 40, 16], [142, 42, 20], [154, 34, 24], [124, 54, 14]]) pineC(r, x, b, h, c.pine);
  paintPlanes(r, freiRockC, f);

  // A dead branch with an owl, its eyes glowing.
  r.line(140, 52, 118, 46, c.pine);
  r.line(128, 49, 124, 42, c.pine);
  r.fill(ellipse(132, 46, 3, 4, 0, Math.PI * 2, 10), c.owl);
  const blink = !f.still && hash(3, Math.floor(f.t * 0.7)) > 0.85;
  if (!blink) {
    r.dot(131, 45, c.fireL);
    r.dot(133, 45, c.fireL);
  }

  // The fire, the ladle, and the seven bullets glowing in a ring.
  const fl = wave(f, 3.1) * 2;
  r.fill([[70, 84], [90, 84], [86, 72 + fl], [80, 66 - fl], [74, 72 - fl]], c.fire, c.fireL, 5);
  r.fill([[76, 84], [84, 84], [80, 74 + fl]], c.fireL, c.bullet, 4);
  r.line(86, 70, 98, 62, c.rockL);
  r.fill(ellipse(84, 72, 4, 2, 0, Math.PI, 8), c.rockL);
  for (let k = 0; k < 7; k++) {
    const a = (k / 7) * Math.PI * 2 + (f.still ? 0 : f.t * 0.4);
    r.fill(ellipse(80 + Math.cos(a) * 16, 56 + Math.sin(a) * 6, 1.4, 1.4, 0, Math.PI * 2, 6), k === 6 ? c.fire : c.bullet);
  }

  // Max the huntsman, rifle in hand, watching from the rocks.
  const hx = 34;
  r.fill([[hx - 5, 86], [hx + 5, 86], [hx + 4, 62], [hx - 4, 62]], c.coat);
  r.fill(ellipse(hx, 58, 3, 3.5, 0, Math.PI * 2, 10), c.skin);
  r.fill([[hx - 6, 56], [hx + 6, 56], [hx + 3, 52], [hx - 3, 52]], c.coat);
  r.line(hx + 4, 52, hx + 9, 84, c.pine);
  r.line(hx + 5, 52, hx + 10, 84, c.pine);
  r.tint(ellipse(80, 76, 30, 14, 0, Math.PI * 2, 18), { [c.rock]: c.rockL, [c.rockL]: c.owl, [c.coat]: c.owl }, 4 + Math.round(fl));
}

// ---------------------------------------------------------------------------
// 68. Albéniz, Asturias (Leyenda): a flamenco night in an Andalusian courtyard
// ---------------------------------------------------------------------------

const astC = palette({
  n0: "#141a34",
  n1: "#202a4c",
  star: "#e8e4f8",
  wall: "#e8d8b8",
  wallS: "#b89c74",
  tileB: "#2a5a9a",
  tileY: "#e0b040",
  red: "#c4182a",
  redL: "#e84a4a",
  black: "#141014",
  skin: "#c89068",
  guitar: "#c87a34",
  guitarD: "#6a3414",
  lamp: "#ffd870",
  floor: "#9a5a3a",
});
const astSkyC = fracture(721, [[astC.c.n0, astC.c.n1], [astC.c.n1, astC.c.n0]], 3, [-8, -8, 168, 40]);
const astFloorC = fracture(723, [[astC.c.floor, astC.c.wallS], [astC.c.wallS, astC.c.floor], [astC.c.floor, astC.c.guitarD]], 4, [-8, 82, 168, 108]);

function renderAsturiasC(r: Raster, f: Frame) {
  const { c } = astC;
  paintPlanes(r, astSkyC, f);
  for (let k = 0; k < 9; k++) {
    if (f.still || hash(k, Math.floor(f.t * 0.8)) > 0.2) r.dot(8 + ((k * 37) % 150), 4 + ((k * 13) % 26), c.star);
  }

  // A whitewashed wall pierced by a Moorish horseshoe arch, the night beyond it.
  const arch = ellipse(80, 34, 22, 22, Math.PI * 0.82, Math.PI * 2.18, 26).concat([[98, 82], [62, 82]]);
  r.fill([[-2, 18], [162, 18], [162, 82], [-2, 82]], c.wall, c.wallS, 2);
  r.fill(arch, c.n1, c.n0, 6);
  r.stroke(ellipse(80, 34, 25, 25, Math.PI * 0.85, Math.PI * 2.15, 26), c.wallS, false);
  for (let k = 0; k < 5; k++) r.dot(66 + k * 7, 44 + ((k * 5) % 9), c.star);

  // A band of azulejo tiles along the bottom of the wall.
  for (let x = -2; x < 162; x += 6) {
    r.fill(rect(x, 76, 6, 6), c.tileB);
    r.fill([[x + 3, 77], [x + 5, 79], [x + 3, 81], [x + 1, 79]], c.tileY);
  }
  paintPlanes(r, astFloorC, f);

  // A lantern swinging gently in the archway.
  const lx = 80 + wave(f, 0.7) * 2;
  r.line(80, 12, lx, 22, c.black);
  r.fill([[lx - 3, 22], [lx + 3, 22], [lx + 2, 30], [lx - 2, 30]], c.lamp, c.wall, 4);

  // The guitarist on a stool, thumb and finger alternating on the strings.
  const gx = 36;
  r.fill(rect(gx - 6, 80, 12, 2), c.guitarD);
  r.line(gx - 5, 82, gx - 5, 90, c.guitarD);
  r.line(gx + 5, 82, gx + 5, 90, c.guitarD);
  r.fill([[gx - 5, 80], [gx + 4, 80], [gx + 4, 56], [gx - 4, 56]], c.black);
  r.fill(ellipse(gx, 51, 3.5, 4, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(gx, 48, 4, 2.5, Math.PI, Math.PI * 2, 10), c.black);
  const g = (pts: Pt[]) => place(pts, gx + 8, 70, 0.35);
  r.fill(g(ellipse(6, 0, 7, 6, 0, Math.PI * 2, 18)), c.guitar);
  r.fill(g(ellipse(-4, 0, 5.5, 5, 0, Math.PI * 2, 16)), c.guitar);
  r.fill(g(ellipse(0, 0, 1.8, 1.8, 0, Math.PI * 2, 8)), c.black);
  r.fill(g(rect(-24, -1.2, 15, 2.4)), c.guitarD);
  r.fill(g(rect(-29, -1.6, 5, 3.2)), c.black);
  const [sa, sb] = g([[11, 0], [-28, 0]]);
  r.line(sa[0], sa[1], sb[0], sb[1], c.wall);
  const pluck = wave(f, 4) > 0 ? 1 : 0;
  r.line(gx + 3, 62, gx + 10, 68 + pluck, c.skin);

  // The dancer, mid-turn, her ruffled skirt flaring.
  const dx = 116;
  const turn = wave(f, 0.9) * 4;
  r.fill([[dx - 14 - turn, 88], [dx + 14 + turn, 88], [dx + 4, 64], [dx - 4, 64]], c.red, c.redL, 4);
  for (let k = 0; k < 3; k++) r.line(dx - 12 - turn + k * 2, 86 - k * 6, dx + 12 + turn - k * 2, 86 - k * 6, c.redL);
  r.fill([[dx - 3, 64], [dx + 3, 64], [dx + 3, 50], [dx - 3, 50]], c.red);
  r.fill(ellipse(dx, 45, 3.5, 4, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(dx - 1, 42, 4, 3, Math.PI, Math.PI * 2, 10), c.black);
  r.fill(ellipse(dx + 3, 41, 1.5, 1.5, 0, Math.PI * 2, 6), c.redL);
  r.line(dx - 3, 52, dx - 10, 40 - turn, c.skin);
  r.line(dx + 3, 52, dx + 9, 42 + turn, c.skin);
  r.fill(rect(dx - 4, 88, 3, 2), c.black);
  r.fill(rect(dx + 2, 88, 3, 2), c.black);
}

// ---------------------------------------------------------------------------
// 69. Dvořák, Carnival Overture: a wanderer reaches a city at nightfall, mid-carnival
// ---------------------------------------------------------------------------

const carnC = palette({
  s0: "#3a2a5a",
  s1: "#7a4a7a",
  s2: "#e08a5a",
  s3: "#f4c47a",
  city: "#241a2e",
  cityL: "#3a2c44",
  window: "#ffd870",
  square: "#5a4a4a",
  squareL: "#7a6458",
  red: "#d43a3a",
  green: "#3aa86a",
  blue: "#4a7ad8",
  skin: "#e0b090",
  cloak: "#4a3a2a",
  moon: "#f4ecd0",
});
const carnSkyC = fracture(731, [[carnC.c.s0, carnC.c.s1], [carnC.c.s1, carnC.c.s2], [carnC.c.s2, carnC.c.s3]], 3, [-8, -8, 168, 50]);
const carnSquareC = fracture(733, [[carnC.c.square, carnC.c.squareL], [carnC.c.squareL, carnC.c.square]], 4, [-8, 70, 168, 108]);

function renderCarnivalOvertureC(r: Raster, f: Frame) {
  const { c } = carnC;
  paintPlanes(r, carnSkyC, f);
  r.fill(ellipse(140, 12, 5, 5, 0, Math.PI * 2, 14), c.moon);

  // The city's roofs and twin Gothic spires against the dusk, windows lit.
  r.fill([[40, 70], [40, 40], [52, 30], [64, 40], [64, 34], [76, 26], [88, 34], [88, 42], [100, 34], [112, 42], [112, 38], [124, 30], [136, 38], [136, 46], [162, 46], [162, 70]], c.city, c.cityL, 3);
  for (const x of [70, 82]) {
    r.fill([[x - 4, 40], [x + 4, 40], [x + 4, 20], [x, 6], [x - 4, 20]], c.city);
    r.dot(x - 3, 20, c.cityL);
    r.dot(x + 3, 20, c.cityL);
  }
  for (let k = 0; k < 18; k++) {
    const x = 44 + ((k * 23) % 114);
    const y = 44 + ((k * 7) % 20);
    if (f.still || hash(k, Math.floor(f.t * 0.5)) > 0.15) r.fill(rect(x, y, 2, 2), c.window);
  }
  paintPlanes(r, carnSquareC, f);

  // Strings of coloured lanterns swaying over the square.
  for (let row = 0; row < 2; row++) {
    const at = (k: number) => 52 + row * 8 + Math.sin((k / 8) * Math.PI) * 6 + wave(f, 1.1, k + row);
    for (let k = 0; k < 8; k++) r.line(48 + k * 13, at(k) - 2, 61 + k * 13, at(k + 1) - 2, c.squareL);
    for (let k = 0; k < 9; k++) {
      const x = 48 + k * 13;
      const y = at(k);
      r.fill(ellipse(x, y, 2, 2.5, 0, Math.PI * 2, 8), [c.red, c.green, c.window, c.blue][(k + row) % 4]);
    }
  }

  // The dancers whirl in a ring, skirts and ribbons flying.
  const spin = f.still ? 0 : f.t * 0.8;
  for (let k = 0; k < 7; k++) {
    const a = spin + (k / 7) * Math.PI * 2;
    const x = 104 + Math.cos(a) * 26;
    const y = 82 + Math.sin(a) * 6;
    const col = [c.red, c.blue, c.green][k % 3];
    r.fill([[x - 4, y + 8], [x + 4, y + 8], [x + 1, y], [x - 1, y]], col);
    r.fill(ellipse(x, y - 2, 1.8, 2, 0, Math.PI * 2, 8), c.skin);
    r.line(x + 1, y + 2, x + 5, y - 2 + Math.sin(a * 2) * 2, c.skin);
  }

  // On the hill road outside, the lone wanderer with his staff looks on.
  r.fill([[-4, 108], [-4, 62], [20, 66], [44, 80], [60, 108]], c.city, c.cityL, 2);
  const wx = 20;
  r.fill([[wx - 4, 82], [wx + 4, 82], [wx + 3, 64], [wx - 3, 64]], c.cloak);
  r.fill(ellipse(wx, 60, 2.8, 3.2, 0, Math.PI * 2, 10), c.skin);
  r.fill([[wx - 4, 58], [wx + 4, 58], [wx, 54]], c.cloak);
  r.line(wx + 6, 56, wx + 8, 84, c.squareL);
  r.line(wx + 3, 68, wx + 6, 66, c.skin);
}

// ---------------------------------------------------------------------------
// 70. Egmont Overture: Count Egmont in armour before a Flemish town, his banner high
// ---------------------------------------------------------------------------

const egmontC = palette({
  s0: "#3a2a3c",
  s1: "#6a3e46",
  dawn: "#d8875a",
  gold: "#f0c870",
  town: "#4a3a3a",
  townL: "#6e5650",
  roof: "#8e3a2e",
  win: "#f2d48a",
  steel: "#9aa2ae",
  steelD: "#5a6270",
  black: "#141016",
  ruff: "#efe8da",
  skin: "#d8a888",
  red: "#b42a2a",
  redD: "#6e1a20",
  ground: "#2e2620",
});
const egmontSkyC = fracture(740, [[egmontC.c.s0, egmontC.c.s1], [egmontC.c.s1, egmontC.c.dawn], [egmontC.c.s1, egmontC.c.s0]], 4, [-8, -8, 168, 64]);
const egmontGroundC = fracture(741, [[egmontC.c.ground, egmontC.c.town], [egmontC.c.town, egmontC.c.ground]], 3, [-8, 78, 168, 108]);

function renderEgmontC(r: Raster, f: Frame) {
  const { c } = egmontC;
  paintPlanes(r, egmontSkyC, f);
  // A low dawn sun breaking behind the town.
  r.fill(ellipse(118, 56, 14, 14, Math.PI, Math.PI * 2, 16), c.gold, c.dawn, 5);

  // The stepped gables of a Flemish town, lit windows, a belfry.
  const gables: [number, number, number][] = [[2, 18, 50], [20, 16, 44], [36, 20, 52], [92, 18, 46], [110, 16, 52], [126, 22, 42], [148, 16, 48]];
  for (const [x, w, top] of gables) {
    r.fill([[x, 80], [x, top + 6], [x + 3, top + 6], [x + 3, top + 3], [x + w / 2, top - 4], [x + w - 3, top + 3], [x + w - 3, top + 6], [x + w, top + 6], [x + w, 80]], c.town, c.townL, 3);
    for (let wy = top + 9; wy < 76; wy += 7) {
      if (hash(x, wy) > 0.45) r.fill(rect(x + w / 2 - 1, wy, 2, 3), c.win);
    }
  }
  r.fill([[60, 80], [60, 30], [66, 30], [66, 22], [69, 14], [72, 22], [72, 30], [78, 30], [78, 80]], c.town, c.townL, 2);
  r.fill(rect(66, 34, 6, 5), c.win);
  r.fill([[56, 80], [56, 44], [82, 44], [82, 80]], c.roof, c.redD, 4);
  r.fill(ellipse(69, 66, 6, 8, Math.PI, Math.PI * 2, 10).concat([[75, 80], [63, 80]]), c.black);
  paintPlanes(r, egmontGroundC, f);

  // Count Egmont, in armour and a white ruff, standing firm.
  const ex = 40;
  r.fill([[ex - 6, 62], [ex + 6, 62], [ex + 5, 80], [ex - 5, 80]], c.steel, c.steelD, 6);
  r.fill(rect(ex - 5, 80, 4, 14), c.black);
  r.fill(rect(ex + 1, 80, 4, 14), c.black);
  r.fill([[ex - 8, 62], [ex - 14, 76], [ex - 10, 94], [ex - 4, 66]], c.red, c.redD, 5);
  r.fill(ellipse(ex, 61, 6, 2, 0, Math.PI * 2, 12), c.ruff);
  r.fill(ellipse(ex, 55, 3.5, 4.5, 0, Math.PI * 2, 12), c.skin);
  r.fill(ellipse(ex, 51, 4.5, 2.5, Math.PI, Math.PI * 2, 8), c.black);
  r.fill(rect(ex - 2, 58, 4, 2), c.black);
  // His sword arm raises the banner.
  r.line(ex + 6, 64, ex + 12, 56, c.steel);
  r.line(ex + 12, 92, ex + 12, 18, c.black);
  r.fill(ellipse(ex + 12, 17, 1.5, 1.5, 0, Math.PI * 2, 6), c.gold);
  const fl = wave(f, 0.7);
  const flag: Pt[] = [];
  for (let k = 0; k <= 6; k++) flag.push([ex + 13 + k * 5, 20 + Math.sin(k * 0.9 + (f.still ? 0 : f.t * 1.1)) * 2 + fl]);
  for (let k = 6; k >= 0; k--) flag.push([ex + 13 + k * 5, 38 + k * 0.6 + Math.sin(k * 0.9 + (f.still ? 0 : f.t * 1.1)) * 2 + fl]);
  r.fill(flag.map((p) => drift(p, f, 0.3)), c.ruff, c.gold, 2);
  // The ragged red saltire of Burgundy, under which the Low Countries' nobles served.
  const fy = Math.sin(3 * 0.9 + (f.still ? 0 : f.t * 1.1)) * 2 + fl;
  r.line(ex + 16, 23 + fy, ex + 40, 37 + fy, c.red);
  r.line(ex + 17, 23 + fy, ex + 41, 37 + fy, c.red);
  r.line(ex + 16, 37 + fy, ex + 40, 23 + fy, c.red);
  r.line(ex + 17, 37 + fy, ex + 41, 23 + fy, c.red);
}

// ---------------------------------------------------------------------------
// 71. Night on Bald Mountain: witches round Chernobog, a village church at the foot
// ---------------------------------------------------------------------------

const baldMountainC = palette({
  n0: "#0c0a1a",
  n1: "#1e1430",
  n2: "#3a1e3e",
  moon: "#e8e0b0",
  rock: "#1a1620",
  rockL: "#2e2632",
  fire: "#e8622a",
  fireL: "#f8c24a",
  wing: "#060408",
  eye: "#ff4a2a",
  witch: "#100c12",
  broom: "#8a5a2a",
  church: "#c8bca0",
  churchS: "#8a806a",
  dome: "#4a8a6a",
  dawn: "#c86a5a",
});
const baldMountainSkyC = fracture(750, [[baldMountainC.c.n0, baldMountainC.c.n1], [baldMountainC.c.n1, baldMountainC.c.n2], [baldMountainC.c.n1, baldMountainC.c.n0]], 4);

function renderBaldMountainC(r: Raster, f: Frame) {
  const { c } = baldMountainC;
  paintPlanes(r, baldMountainSkyC, f);
  r.fill(ellipse(140, 16, 8, 8, 0, Math.PI * 2, 18), c.moon);
  r.fill(ellipse(143, 14, 7, 7, 0, Math.PI * 2, 18), c.n1, c.moon, 3);

  // The bare black mountain, its summit fires flickering.
  r.fill([[-4, 100], [-4, 70], [24, 52], [50, 40], [66, 38], [86, 46], [112, 62], [132, 74], [164, 82], [164, 100]], c.rock, c.rockL, 3);
  for (let k = 0; k < 4; k++) {
    const fx = 48 + k * 9;
    const h = 4 + (f.still ? 1 : Math.abs(Math.sin(f.t * 3 + k * 2)) * 3);
    r.fill([[fx - 3, 42 + (k % 2)], [fx, 42 - h], [fx + 3, 42 + (k % 2)]], c.fire, c.fireL, 5);
  }

  // Chernobog rises over the summit, wings spread, eyes burning.
  const lift = wave(f, 0.25) * 1.5;
  const wingL: Pt[] = [[60, 30], [30, 6], [36, 18], [20, 12], [30, 26], [14, 26], [40, 36]];
  const wingR: Pt[] = wingL.map(([x, y]) => [132 - x, y]);
  r.fill(wingL.map((p) => drift([p[0], p[1] + lift], f, 0.6)), c.wing);
  r.fill(wingR.map((p) => drift([p[0], p[1] + lift], f, 0.6)), c.wing);
  r.fill([[58, 40], [60, 22 + lift], [72, 22 + lift], [74, 40]], c.wing);
  r.fill(ellipse(66, 18 + lift, 6, 6, 0, Math.PI * 2, 12), c.wing);
  r.fill([[61, 14 + lift], [58, 4 + lift], [64, 12 + lift]], c.wing);
  r.fill([[71, 14 + lift], [74, 4 + lift], [68, 12 + lift]], c.wing);
  r.dot(64, 18 + lift, c.eye);
  r.dot(68, 18 + lift, c.eye);

  // Witches on broomsticks circling the mountain.
  for (let k = 0; k < 4; k++) {
    const a = (f.still ? 0 : f.t * 0.25) + k * (Math.PI / 2);
    const wx = 66 + Math.cos(a) * 44;
    const wy = 40 + Math.sin(a) * 14;
    const dir = Math.sin(a) > 0 ? -1 : 1;
    r.line(wx - 6 * dir, wy + 2, wx + 6 * dir, wy, c.broom);
    r.fill([[wx - 6 * dir, wy], [wx - 10 * dir, wy + 4], [wx - 5 * dir, wy + 3]], c.broom);
    r.fill([[wx - 2, wy + 1], [wx + 2, wy + 1], [wx + 1, wy - 5], [wx - 1, wy - 5]], c.witch);
    r.fill([[wx - 3, wy - 5], [wx + 3, wy - 5], [wx + dir, wy - 11]], c.witch);
  }

  // At the foot, a village church with an onion dome; its bell will end the night.
  r.fill(rect(120, 76, 20, 18), c.church, c.churchS, 4);
  r.fill(rect(126, 62, 8, 14), c.church, c.churchS, 4);
  r.fill(ellipse(130, 60, 5, 6, 0, Math.PI * 2, 12), c.dome);
  r.line(130, 54, 130, 49, c.church);
  r.line(128, 51, 132, 51, c.church);
  r.fill(rect(129, 66, 2, 4), c.fireL);
  r.fill(rect(127, 84, 6, 10), c.rock);
  r.fill([[-4, 100], [-4, 96], [164, 92], [164, 100]], c.dawn, c.rock, 8);
}

// ---------------------------------------------------------------------------
// 72. William Tell Overture: an Alpine meadow, a herdsman's horn, a storm and Tell's crossbow
// ---------------------------------------------------------------------------

const williamTellC = palette({
  s0: "#8ec4e8",
  s1: "#c8e4f4",
  storm: "#4a5266",
  stormD: "#2e3444",
  bolt: "#fff6c0",
  snow: "#f4f6fa",
  rock: "#7a8494",
  rockD: "#4e5664",
  grass: "#5a9a3a",
  grassL: "#8ac454",
  pine: "#1e4a2e",
  cow: "#8a4a2a",
  white: "#f2ece0",
  wood: "#a06a34",
  woodD: "#5e3a1a",
  red: "#c43a2a",
  apple: "#d8302a",
  leaf: "#3a7a2a",
});
const williamTellSkyC = fracture(760, [[williamTellC.c.s0, williamTellC.c.s1], [williamTellC.c.s1, williamTellC.c.s0]], 3, [-8, -8, 168, 50]);
const williamTellMeadowC = fracture(761, [[williamTellC.c.grass, williamTellC.c.grassL], [williamTellC.c.grassL, williamTellC.c.grass]], 4, [-8, 62, 168, 108]);

function renderWilliamTellC(r: Raster, f: Frame) {
  const { c } = williamTellC;
  paintPlanes(r, williamTellSkyC, f);

  // Storm clouds gather on the left, lightning now and then.
  const drift0 = wave(f, 0.1) * 3;
  r.fill([[-4, -4], [64 + drift0, -4], [70 + drift0, 6], [58 + drift0, 14], [40, 18], [20, 14], [-4, 20]], c.storm, c.stormD, 6);
  if (!f.still && f.t % 7 < 0.3) {
    r.stroke([[44, 14], [38, 24], [44, 26], [36, 40]], c.bolt, false);
  }
  for (let k = 0; k < 8; k++) r.line(6 + k * 7, 18 + (k % 3), 2 + k * 7, 26 + (k % 3), c.stormD);

  // Snowy Alps.
  r.fill([[-4, 66], [20, 34], [36, 46], [62, 22], [86, 44], [104, 30], [130, 50], [146, 36], [164, 52], [164, 66]], c.rock, c.rockD, 5);
  r.fill([[52, 32], [62, 22], [72, 32], [66, 30], [60, 34]], c.snow);
  r.fill([[98, 36], [104, 30], [110, 36], [104, 35]], c.snow);
  r.fill([[140, 42], [146, 36], [152, 42], [146, 41]], c.snow);
  r.fill([[14, 42], [20, 34], [26, 42], [20, 40]], c.snow);
  paintPlanes(r, williamTellMeadowC, f);
  for (const px of [6, 14, 150]) {
    r.fill([[px - 4, 70], [px, 56], [px + 4, 70]], c.pine);
    r.fill([[px - 5, 76], [px, 62], [px + 5, 76]], c.pine);
  }

  // Cows at pasture for the Ranz des vaches, a herdsman with his alphorn.
  const cows: [number, number][] = [[62, 74], [84, 80], [110, 72]];
  cows.forEach(([cx, cy], i) => {
    const nod = wave(f, 0.6, i * 2) > 0.5 ? 1 : 0;
    r.fill(rect(cx - 6, cy - 4, 12, 6), c.cow, c.white, 4);
    r.fill(rect(cx + 5, cy - 5 + nod, 4, 4), c.cow);
    for (const lx of [cx - 5, cx - 2, cx + 2, cx + 4]) r.line(lx, cy + 2, lx, cy + 5, c.woodD);
    r.dot(cx + 8, cy - 3 + nod, c.white);
  });
  r.fill(rect(128, 66, 5, 12), c.red);
  r.fill(ellipse(130.5, 63, 2.5, 3, 0, Math.PI * 2, 10), c.white);
  r.fill(rect(129, 78, 1, 6), c.woodD);
  r.fill(rect(132, 78, 1, 6), c.woodD);
  r.line(131, 66, 104, 92, c.wood);
  r.line(132, 66, 105, 92, c.wood);
  r.fill([[100, 90], [106, 88], [107, 95], [101, 95]], c.wood, c.woodD, 4);

  // Tell's crossbow and the apple, in the foreground.
  r.line(18, 96, 48, 80, c.woodD);
  r.line(19, 96, 49, 80, c.woodD);
  r.stroke([[34, 78], [44, 82], [50, 92]], c.wood, false);
  r.stroke([[34, 78], [40, 88], [50, 92]], c.woodD, false);
  r.fill(ellipse(26, 82, 4, 4, 0, Math.PI * 2, 12), c.apple);
  r.dot(25, 80, c.white);
  r.line(26, 78, 27, 76, c.woodD);
  r.fill([[27, 77], [31, 75], [29, 78]], c.leaf);
  r.line(44, 86, 62, 92, c.woodD);
  r.fill([[62, 92], [58, 90], [59, 94]], c.rock);
}

// ---------------------------------------------------------------------------
// 73. Hungarian Rhapsody No. 2: a lantern-lit csárda, a fiddler, a cimbalom and dancers
// ---------------------------------------------------------------------------

const hungarianRhapsodyC = palette({
  w0: "#3a1e14",
  w1: "#5a2e1a",
  w2: "#7a4224",
  lamp: "#f8d27a",
  glow: "#e8a04a",
  floor: "#6a4426",
  floorL: "#8a5a32",
  wood: "#a0642e",
  string: "#f0e6c8",
  black: "#141010",
  skin: "#d8a47c",
  shirt: "#f2ece0",
  red: "#c4282a",
  green: "#2e7a3a",
  blue: "#2a4a8a",
  gold: "#e8c040",
});
const hungarianRhapsodyWallC = fracture(770, [[hungarianRhapsodyC.c.w0, hungarianRhapsodyC.c.w1], [hungarianRhapsodyC.c.w1, hungarianRhapsodyC.c.w2], [hungarianRhapsodyC.c.w1, hungarianRhapsodyC.c.w0]], 4, [-8, -8, 168, 66]);
const hungarianRhapsodyFloorC = fracture(771, [[hungarianRhapsodyC.c.floor, hungarianRhapsodyC.c.floorL], [hungarianRhapsodyC.c.floorL, hungarianRhapsodyC.c.floor]], 3, [-8, 66, 168, 108]);

function renderHungarianRhapsodyC(r: Raster, f: Frame) {
  const { c } = hungarianRhapsodyC;
  paintPlanes(r, hungarianRhapsodyWallC, f);
  paintPlanes(r, hungarianRhapsodyFloorC, f);

  // A hanging lantern, its pool of warm light.
  const sway = wave(f, 0.5) * 2;
  r.line(80, 0, 80 + sway, 10, c.black);
  r.fill(rect(77 + sway, 10, 6, 7), c.lamp, c.glow, 4);
  r.tint(ellipse(80, 40, 40, 30, 0, Math.PI * 2, 24), { [c.w0]: c.w1, [c.w1]: c.w2 }, 6);
  // Folk-painted plates on the wall.
  for (const [px, col] of [[16, c.red], [34, c.blue], [126, c.green], [144, c.red]] as [number, number][]) {
    r.fill(ellipse(px, 22, 6, 6, 0, Math.PI * 2, 14), c.shirt);
    r.fill(ellipse(px, 22, 3, 3, 0, Math.PI * 2, 10), col);
  }

  // The cimbalom on its legs, hammers dancing over the strings.
  r.fill([[10, 62], [56, 62], [52, 72], [14, 72]], c.wood, c.w2, 4);
  for (let k = 0; k < 6; k++) r.line(14, 64 + k * 1.4, 52, 64 + k * 1.4, c.string);
  r.fill(rect(15, 72, 2, 20), c.w0);
  r.fill(rect(49, 72, 2, 20), c.w0);
  const hit = f.still ? 0 : Math.round(Math.sin(f.t * 6) * 2);
  r.fill([[28, 48], [36, 48], [37, 60], [27, 60]], c.shirt);
  r.fill(ellipse(32, 44, 3, 3.5, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(32, 41, 3.5, 2, Math.PI, Math.PI * 2, 8), c.black);
  r.line(28, 52, 24, 63 + hit, c.skin);
  r.line(36, 52, 40, 63 - hit, c.skin);
  r.dot(24, 64 + hit, c.black);
  r.dot(40, 64 - hit, c.black);

  // The fiddler, in an embroidered vest.
  const bow = wave(f, 1.6) * 5;
  r.fill([[70, 52], [80, 52], [81, 76], [69, 76]], c.shirt);
  r.fill([[70, 52], [74, 52], [74, 70], [70, 70]], c.black);
  r.fill([[76, 52], [80, 52], [80, 70], [76, 70]], c.black);
  for (let y = 56; y < 68; y += 4) {
    r.dot(72, y, c.red);
    r.dot(78, y, c.gold);
  }
  r.fill(rect(70, 76, 4, 16), c.black);
  r.fill(rect(76, 76, 4, 16), c.black);
  r.fill(ellipse(75, 47, 3.5, 4, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(75, 44, 4, 2.2, Math.PI, Math.PI * 2, 8), c.black);
  r.fill(place([[-2, -6], [2, -6], [3, 6], [-3, 6]], 66, 54, 1.0), c.wood);
  r.line(70, 52, 58, 58, c.wood);
  r.line(80, 58, 62 + bow, 48 - bow * 0.3, c.string);
  r.line(80, 58, 70, 54, c.skin);

  // A couple dancing the friska.
  const spin = f.still ? 0 : f.t * 1.4;
  const dx = 124;
  const ox = Math.cos(spin) * 5;
  r.fill([[dx - 12 + ox, 92], [dx - 3 + ox, 62], [dx + 6 + ox, 92]], c.red, c.gold, 2);
  r.fill(rect(dx - 5 + ox, 54, 4, 10), c.shirt);
  r.fill(ellipse(dx - 3 + ox, 50, 3, 3.5, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(dx - 3 + ox, 47, 3.2, 2, Math.PI, Math.PI * 2, 8), c.red);
  r.fill(rect(dx + 6 - ox, 52, 6, 22), c.blue);
  r.fill(rect(dx + 6 - ox, 74, 2, 18), c.black);
  r.fill(rect(dx + 10 - ox, 74, 2, 18), c.black);
  r.fill(ellipse(dx + 9 - ox, 48, 3, 3.5, 0, Math.PI * 2, 10), c.skin);
  r.fill(rect(dx + 5 - ox, 43, 8, 2), c.black);
  r.line(dx + ox, 58, dx + 6 - ox, 58, c.skin);
}

// ---------------------------------------------------------------------------
// 74. Te Deum, Prelude: trumpets and drums before a domed Baroque church, banners flying
// ---------------------------------------------------------------------------

const teDeumC = palette({
  s0: "#4a7ac8",
  s1: "#8ab4e8",
  s2: "#d4e4f4",
  stone: "#e8dcc0",
  stoneS: "#b8a882",
  dome: "#5a6a8a",
  domeL: "#8a9ab4",
  gold: "#f0c848",
  goldD: "#a87a20",
  dark: "#2a2430",
  blue: "#2a3a8a",
  fleur: "#f6eaa8",
  red: "#a82a2a",
  white: "#f6f2ea",
  skin: "#e0b090",
  drum: "#8a4a24",
});
const teDeumSkyC = fracture(780, [[teDeumC.c.s0, teDeumC.c.s1], [teDeumC.c.s1, teDeumC.c.s2], [teDeumC.c.s1, teDeumC.c.s0]], 4, [-8, -8, 168, 70]);

function renderTeDeumC(r: Raster, f: Frame) {
  const { c } = teDeumC;
  paintPlanes(r, teDeumSkyC, f);

  // The domed church of Saint-Louis: columns, pediment, gilded cross.
  r.fill(ellipse(80, 30, 20, 18, Math.PI, Math.PI * 2, 16).concat([[100, 32], [60, 32]]), c.dome, c.domeL, 4);
  for (let k = -3; k <= 3; k++) r.line(80 + k * 5, 14 + Math.abs(k) * 1.5, 80 + k * 6, 30, c.domeL);
  r.fill(rect(77, 6, 6, 6), c.gold, c.goldD, 4);
  r.line(80, 0, 80, 6, c.gold);
  r.line(78, 2, 82, 2, c.gold);
  r.fill(rect(56, 30, 48, 6), c.stone, c.stoneS, 3);
  r.fill([[44, 48], [80, 34], [116, 48]], c.stone, c.stoneS, 4);
  r.stroke([[48, 47], [80, 36], [112, 47]], c.stoneS, false);
  r.fill(rect(44, 48, 72, 40), c.stone, c.stoneS, 2);
  for (let x = 48; x < 114; x += 9) r.fill(rect(x, 52, 3, 32), c.white, c.stoneS, 3);
  r.fill(ellipse(80, 72, 6, 7, Math.PI, Math.PI * 2, 10).concat([[86, 88], [74, 88]]), c.dark);

  // Royal blue banners with gold lilies, rippling in the wind.
  for (const bx of [24, 136]) {
    r.line(bx, 94, bx, 18, c.dark);
    const pts: Pt[] = [];
    for (let k = 0; k <= 4; k++) pts.push([bx + 1 + k * 4, 20 + Math.sin(k + (f.still ? 0 : f.t * 1.3) + bx) * 1.5]);
    for (let k = 4; k >= 0; k--) pts.push([bx + 1 + k * 4, 40 + Math.sin(k + (f.still ? 0 : f.t * 1.3) + bx) * 1.5]);
    r.fill(pts, c.blue);
    r.fill([[bx + 9, 26], [bx + 11, 30], [bx + 9, 34], [bx + 7, 30]], c.fleur);
  }

  // Two trumpeters raise their bells; the timpanist strikes.
  const lift = Math.round(wave(f, 0.9) * 1.5);
  for (const tx of [12, 36]) {
    r.fill([[tx - 4, 74], [tx + 4, 74], [tx + 4, 92], [tx - 4, 92]], c.red, c.dark, 3);
    r.fill(ellipse(tx, 70, 3, 3.5, 0, Math.PI * 2, 10), c.skin);
    r.fill(ellipse(tx, 67, 3.5, 2, Math.PI, Math.PI * 2, 8), c.dark);
    r.line(tx + 2, 71, tx + 16, 64 - lift, c.gold);
    r.line(tx + 2, 72, tx + 16, 65 - lift, c.goldD);
    r.fill([[tx + 15, 61 - lift], [tx + 19, 59 - lift], [tx + 19, 68 - lift], [tx + 15, 67 - lift]], c.gold, c.goldD, 3);
    r.fill([[tx + 6, 68 - lift], [tx + 12, 66 - lift], [tx + 12, 72 - lift], [tx + 6, 74 - lift]], c.blue);
  }
  const strike = f.still ? 0 : Math.round(Math.max(0, Math.sin(f.t * 4)) * 3);
  for (const dx of [124, 140]) {
    r.fill(ellipse(dx, 84, 7, 8, 0, Math.PI, 12).concat([[dx + 7, 84], [dx - 7, 84]]), c.drum, c.goldD, 3);
    r.fill(ellipse(dx, 84, 7, 2, 0, Math.PI * 2, 12), c.white);
  }
  r.fill([[128, 62], [136, 62], [137, 80], [127, 80]], c.red, c.dark, 3);
  r.fill(ellipse(132, 58, 3, 3.5, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(132, 55, 3.5, 2, Math.PI, Math.PI * 2, 8), c.dark);
  r.line(128, 66, 122, 78 - strike, c.white);
  r.line(136, 66, 142, 78 + strike - 3, c.white);
  r.dot(122, 79 - strike, c.dark);
  r.dot(142, 79 + strike - 3, c.dark);
}

// ---------------------------------------------------------------------------
// 75. Šárka: the warrior maiden bound to an oak, Ctirad riding up, spears in the rocks
// ---------------------------------------------------------------------------

const sarkaC = palette({
  s0: "#2a3a3e",
  s1: "#4a5a52",
  s2: "#8a8a6a",
  sun: "#e8b45a",
  rock: "#5a5650",
  rockD: "#3a3634",
  leaf: "#2e4a2a",
  leafL: "#4e6e3a",
  bark: "#4a3220",
  dress: "#e8e0c8",
  hair: "#c8902a",
  skin: "#e0b898",
  rope: "#b89a5a",
  horn: "#e8d6a0",
  steel: "#a8b0b8",
  steelD: "#626a74",
  horse: "#6a4a32",
  red: "#9a2a22",
  spear: "#d8dce0",
});
const sarkaSkyC = fracture(790, [[sarkaC.c.s0, sarkaC.c.s1], [sarkaC.c.s1, sarkaC.c.s2], [sarkaC.c.s1, sarkaC.c.s0]], 4, [-8, -8, 168, 60]);
const sarkaGroundC = fracture(791, [[sarkaC.c.leaf, sarkaC.c.leafL], [sarkaC.c.leafL, sarkaC.c.leaf], [sarkaC.c.leaf, sarkaC.c.rockD]], 4, [-8, 74, 168, 108]);

function renderSarkaC(r: Raster, f: Frame) {
  const { c } = sarkaC;
  paintPlanes(r, sarkaSkyC, f);
  r.fill(ellipse(112, 52, 12, 12, Math.PI, Math.PI * 2, 14), c.sun, c.s2, 4);

  // The rocky gorge, where the other maidens wait in hiding: only their spear tips show.
  r.fill([[-4, 80], [-4, 30], [10, 22], [22, 34], [30, 28], [40, 80]], c.rock, c.rockD, 5);
  r.fill([[118, 80], [128, 36], [140, 26], [152, 34], [164, 24], [164, 80]], c.rock, c.rockD, 5);
  for (let k = 0; k < 5; k++) {
    const sx = 132 + k * 6;
    const up = f.still ? 0 : Math.max(0, Math.sin(f.t * 0.4 + k)) * 2;
    r.line(sx, 30 - up + (k % 2) * 3, sx, 40, c.steelD);
    r.fill([[sx - 1, 30 - up + (k % 2) * 3], [sx, 26 - up + (k % 2) * 3], [sx + 1, 30 - up + (k % 2) * 3]], c.spear);
  }
  for (let k = 0; k < 3; k++) {
    const sx = 14 + k * 7;
    r.line(sx, 30 + k * 2, sx, 42, c.steelD);
    r.fill([[sx - 1, 30 + k * 2], [sx, 26 + k * 2], [sx + 1, 30 + k * 2]], c.spear);
  }
  paintPlanes(r, sarkaGroundC, f);

  // The great oak, its crown stirring.
  r.fill([[44, 94], [48, 40], [56, 40], [60, 94]], c.bark);
  r.line(50, 44, 36, 30, c.bark);
  r.line(55, 44, 70, 28, c.bark);
  for (const [lx, ly, lr] of [[40, 22, 12], [58, 16, 14], [72, 26, 10], [34, 32, 8]] as [number, number, number][]) {
    r.fill(ellipse(lx + wave(f, 0.3, lx) * 0.8, ly, lr, lr * 0.8, 0, Math.PI * 2, 16), c.leaf, c.leafL, 5);
  }

  // Šárka, bound to the trunk, her hunting horn at her side.
  r.fill([[47, 56], [57, 56], [60, 88], [44, 88]], c.dress, c.s2, 3);
  r.fill([[47, 48], [52, 45], [57, 48], [58, 64], [46, 64]], c.hair);
  r.fill(ellipse(52, 51, 3, 3.5, 0, Math.PI * 2, 10), c.skin);
  r.fill(ellipse(52, 48, 3.5, 2, Math.PI, Math.PI * 2, 8), c.hair);
  for (const y of [62, 70, 78]) r.line(44, y, 60, y + 1, c.rope);
  r.fill([[60, 72], [66, 74], [68, 70], [69, 76], [61, 76]], c.horn);
  r.line(58, 66, 62, 72, c.rope);

  // Ctirad rides up, armoured, to set her free.
  const trot = Math.round(wave(f, 1.2) * 1);
  const hx = 98;
  const hy = trot;
  r.fill([[hx - 16, 66 + hy], [hx + 10, 66 + hy], [hx + 12, 72 + hy], [hx + 8, 80 + hy], [hx - 14, 80 + hy], [hx - 18, 72 + hy]], c.horse);
  r.fill([[hx - 18, 70 + hy], [hx - 14, 66 + hy], [hx - 20, 52 + hy], [hx - 25, 54 + hy]], c.horse);
  r.fill([[hx - 25, 52 + hy], [hx - 20, 50 + hy], [hx - 27, 60 + hy], [hx - 31, 59 + hy]], c.horse);
  r.line(hx - 21, 51 + hy, hx - 17, 64 + hy, c.bark);
  r.dot(hx - 24, 54 + hy, c.rockD);
  const step = f.still ? 0 : Math.round(Math.sin(f.t * 2.4) * 2);
  for (const [lx, s2] of [[hx - 14, step], [hx - 10, -step], [hx + 4, -step], [hx + 8, step]] as [number, number][]) {
    r.line(lx, 80 + hy, lx + s2, 93, c.horse);
    r.line(lx + 1, 80 + hy, lx + 1 + s2, 93, c.horse);
  }
  r.line(hx + 11, 68 + hy, hx + 15, 82 + hy, c.bark);
  r.line(hx + 12, 68 + hy, hx + 16, 82 + hy, c.bark);
  r.fill([[hx - 10, 62 + hy], [hx + 4, 62 + hy], [hx + 6, 72 + hy], [hx - 12, 72 + hy]], c.red);
  // Ctirad in mail and helm, his spear upright.
  r.fill([[hx - 7, 46 + hy], [hx + 1, 46 + hy], [hx + 2, 64 + hy], [hx - 8, 64 + hy]], c.steel, c.steelD, 4);
  r.line(hx - 3, 64 + hy, hx - 5, 76 + hy, c.steelD);
  r.line(hx - 2, 64 + hy, hx - 4, 76 + hy, c.steelD);
  r.fill(ellipse(hx - 3, 42 + hy, 3.5, 4, 0, Math.PI * 2, 10), c.steel);
  r.fill([[hx - 7, 41 + hy], [hx + 1, 41 + hy], [hx - 3, 36 + hy]], c.steel);
  r.fill(rect(hx - 6, 42 + hy, 6, 1), c.steelD);
  r.line(hx + 2, 50 + hy, hx - 2, 58 + hy, c.steel);
  r.line(hx + 4, 24 + hy, hx + 4, 74 + hy, c.bark);
  r.fill([[hx + 3, 24 + hy], [hx + 4, 19 + hy], [hx + 5, 24 + hy]], c.spear);
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
  {
    id: "grieg-concerto",
    alt: "A black grand piano with its lid raised on the rocky shore of a Norwegian fjord between snow-capped cliffs, a red cabin on the slope, and a timpani drum with its mallets rolling.",
    colors: griegConcertoC.colors,
    motifs: { timpani: [34, 82, 14], piano: [104, 72, 22], fjord: [80, 50, 20] },
    render: renderGriegConcertoC,
  },
  {
    id: "overture-1812",
    alt: "A white cathedral under golden onion domes at night, a bell swinging in its tower, fireworks bursting overhead and a cannon firing a cloud of smoke.",
    colors: overture1812C.colors,
    motifs: { cathedral: [101, 50, 26], cannon: [30, 80, 18], bells: [140, 42, 10], fireworks: [74, 12, 16] },
    render: renderOverture1812C,
  },
  {
    id: "romeo-juliet",
    alt: "Juliet in a pale gown leaning from a moonlit stone balcony hung with ivy and roses, Romeo in a cloak reaching up from the garden, and two crossed swords.",
    colors: romeoJulietC.colors,
    motifs: { balcony: [122, 44, 16], romeo: [64, 72, 16], swords: [26, 32, 16] },
    render: renderRomeoJulietC,
  },
  {
    id: "blue-danube",
    alt: "A blue river curving past green hills and a city of spires at dawn, a couple waltzing on a stone terrace, and an open fan with bars of music written on it.",
    colors: blueDanubeC.colors,
    motifs: { river: [70, 66, 20], dancers: [122, 76, 18], fan: [34, 88, 14] },
    render: renderBlueDanubeC,
  },
  {
    id: "hebrides",
    alt: "The dark arch of Fingal’s Cave in cliffs of black basalt columns, waves rolling in from a grey sea, gulls wheeling and a small sailing boat on the swell.",
    colors: hebridesC.colors,
    motifs: { cave: [56, 48, 20], waves: [100, 84, 18], boat: [130, 58, 12] },
    render: renderHebridesC,
  },
  {
    id: "orpheus",
    alt: "Four can-can dancers kicking high on a theatre stage between red velvet curtains, flames of the underworld leaping behind them, the clouds of Olympus above and a violin at the edge of the stage.",
    colors: orpheusC.colors,
    motifs: { dancers: [80, 62, 24], olympus: [80, 18, 16], violin: [24, 76, 12] },
    render: renderOrpheusC,
  },
  {
    id: "anvil-chorus",
    alt: "A Gypsy camp in the mountains at dawn: two smiths in red headscarves swing their hammers onto anvils, sparks flying, beside a tent and a dying campfire.",
    colors: anvilC.colors,
    motifs: { anvils: [106, 74, 26], dawn: [118, 40, 14], camp: [30, 74, 18] },
    render: renderAnvilChorusC,
  },
  {
    id: "libiamo",
    alt: "A red-walled salon at night under a gold chandelier: a woman in white and a man in black raise their glasses to each other above a supper table with a white camellia.",
    colors: libC.colors,
    motifs: { glasses: [79, 38, 12], chandelier: [80, 13, 14], violetta: [58, 58, 16], camellia: [132, 82, 9] },
    render: renderLibiamoC,
  },
  {
    id: "bridal-chorus",
    alt: "A torchlit stone hall: a bride in white with a long veil and a knight in silver armour with a swan on his shield walk toward a glowing arched doorway, bridesmaids following with torches.",
    colors: briC.colors,
    motifs: { bride: [72, 62, 16], chamber: [130, 52, 20], swan: [101, 62, 8], torches: [32, 60, 16] },
    render: renderBridalChorusC,
  },
  {
    id: "bumblebee",
    alt: "A bumblebee zigzagging over a blue sea, between an island city of golden domes, a white swan gliding on the water and a sailing ship heading home.",
    colors: bumC.colors,
    motifs: { bee: [80, 40, 16], swan: [34, 78, 12], ship: [130, 60, 18], city: [28, 42, 16] },
    render: renderBumblebeeC,
  },
  {
    id: "surprise",
    alt: "A candlelit Georgian concert room: a man in a powdered wig dozes in a red chair beside a copper kettledrum, until the drumstick strikes and he starts awake.",
    colors: surC.colors,
    motifs: { drum: [112, 66, 20], listener: [38, 60, 16], tune: [79, 37, 10] },
    render: renderSurpriseC,
  },
  {
    id: "figaro",
    alt: "A sunny room in a Spanish palace: Figaro kneels measuring the tiled floor with a rod while Susanna, in a pale dress, tries on her wedding bonnet in a tall mirror, an orange tree outside the arched window.",
    colors: figC.colors,
    motifs: { figaro: [60, 70, 16], bonnet: [112, 34, 9], mirror: [137, 40, 16], window: [34, 34, 16] },
    render: renderFigaroC,
  },
  {
    id: "valse-brillante",
    alt: "A moonlit stage framed by red velvet curtains: sylphs in long white tutus dance in a forest glade around a poet in a black tunic, footlights glowing below.",
    colors: valseBrillanteC.colors,
    motifs: { sylphs: [70, 70, 22], moon: [104, 20, 14], stage: [90, 92, 14] },
    render: renderValseBrillanteC,
  },
  {
    id: "ocean-etude",
    alt: "A stormy sea of rolling waves, a great wave breaking on the left, a red-banded lighthouse on a rock, gulls, and sunlight breaking through the clouds.",
    colors: oceanEtudeC.colors,
    motifs: { waves: [36, 70, 26], lighthouse: [134, 34, 16], light: [104, 12, 14] },
    render: renderOceanEtudeC,
  },
  {
    id: "winter",
    alt: "A warm room on a winter night: a log fire in a stone fireplace, someone in a red armchair holding out their hands to it, and rain streaking past a snowy window.",
    colors: winterC.colors,
    motifs: { fire: [30, 64, 16], window: [126, 36, 22], chair: [72, 66, 16] },
    render: renderWinterC,
  },
  {
    id: "hungarian-dance",
    alt: "A village square at dusk under a string of lanterns: a violinist plays beside thatched cottages while a couple dances, her red skirt flaring.",
    colors: hungarianDanceC.colors,
    motifs: { violinist: [32, 70, 14], dancers: [94, 70, 20], lanterns: [80, 22, 18] },
    render: renderHungarianDanceC,
  },
  {
    id: "academic-festival",
    alt: "A university hall with a painted ceiling and tall arched windows: a diploma with a red seal on the dais, and a row of students in coloured caps raising their beer steins.",
    colors: academicFestivalC.colors,
    motifs: { students: [70, 84, 24], diploma: [137, 36, 16], hall: [40, 34, 22] },
    render: renderAcademicFestivalC,
  },
  {
    id: "italian-concerto",
    alt: "An Italian piazza under cypress hills: string players in the arches of a terracotta loggia, a lone violinist standing in the sun, and the two keyboards of a harpsichord along the front.",
    colors: italianConcertoC.colors,
    motifs: { orchestra: [44, 50, 22], soloist: [122, 60, 12], keyboards: [80, 92, 14] },
    render: renderItalianConcertoC,
  },
  {
    id: "partita-preludio",
    alt: "A wood-panelled room in Köthen: daylight through a window, a violin hanging on the wall, a manuscript of running notes on a stand, and the notes streaming off the page towards a guitar.",
    colors: partitaC.colors,
    motifs: { guitar: [42, 70, 18], violin: [54, 28, 14], manuscript: [113, 34, 18] },
    render: renderPartitaC,
  },
  {
    id: "schumann-concerto",
    alt: "A gilded concert hall lit by a chandelier: a woman in a green dress plays a grand piano with its lid raised, while an oboist sends four golden notes rising into the air.",
    colors: schConC.colors,
    motifs: { piano: [56, 56, 22], oboe: [116, 54, 16], hall: [80, 14, 16] },
    render: renderSchumannConcertoC,
  },
  {
    id: "rondo-capriccioso",
    alt: "A Paris stage between red curtains: a conductor on his podium raises his baton, a young violinist plays, and a ring of golden notes circles above them.",
    colors: rondoC.colors,
    motifs: { violinist: [102, 54, 18], conductor: [44, 52, 16], violin: [98, 46, 10] },
    render: renderRondoC,
  },
  {
    id: "freischutz",
    alt: "The Wolf's Glen at midnight: a full moon over jagged rocks and dark pines, an owl with glowing eyes, a huntsman with a rifle, and a fire where seven glowing bullets circle.",
    colors: freiC.colors,
    motifs: { bullets: [80, 66, 18], huntsman: [36, 68, 16], forest: [20, 30, 18], moon: [126, 18, 12] },
    render: renderFreischutzC,
  },
  {
    id: "asturias",
    alt: "A whitewashed Andalusian courtyard at night with a Moorish horseshoe arch and blue tiles: a guitarist plays on a stool and a flamenco dancer turns in a red ruffled dress under a lantern.",
    colors: astC.colors,
    motifs: { guitar: [44, 68, 16], dancer: [116, 62, 22], arch: [80, 44, 22] },
    render: renderAsturiasC,
  },
  {
    id: "carnival-overture",
    alt: "A city of roofs and twin Gothic spires at dusk, strings of coloured lanterns over a square where dancers whirl in a ring, and a lone cloaked wanderer with a staff watching from the hill road.",
    colors: carnC.colors,
    motifs: { wanderer: [20, 68, 14], dancers: [104, 82, 22], city: [76, 30, 22] },
    render: renderCarnivalOvertureC,
  },
  {
    id: "egmont",
    alt: "Count Egmont in armour and a white ruff, red cloak behind him, raising a white banner with the red cross of Burgundy before the stepped gables and belfry of a Flemish town at dawn.",
    colors: egmontC.colors,
    motifs: { egmont: [40, 68, 18], banner: [64, 28, 16], town: [120, 60, 24] },
    render: renderEgmontC,
  },
  {
    id: "bald-mountain",
    alt: "A bare black mountain at night with fires on its summit, a huge winged shadow with burning eyes rising over it, witches on broomsticks circling, and a small domed church at its foot.",
    colors: baldMountainC.colors,
    motifs: { chernobog: [66, 24, 22], witches: [26, 40, 14], church: [130, 74, 14] },
    render: renderBaldMountainC,
  },
  {
    id: "william-tell",
    alt: "An Alpine meadow under snowy peaks, storm clouds and lightning on one side, cows grazing, a herdsman with a long alphorn, and a crossbow and an apple in the grass.",
    colors: williamTellC.colors,
    motifs: { mountains: [100, 36, 22], storm: [32, 12, 18], cows: [86, 76, 18], tell: [34, 86, 16] },
    render: renderWilliamTellC,
  },
  {
    id: "hungarian-rhapsody",
    alt: "A lantern-lit Hungarian tavern with painted plates on the wall: a cimbalom player with flying hammers, a fiddler in an embroidered vest, and a couple whirling in a dance.",
    colors: hungarianRhapsodyC.colors,
    motifs: { cimbalom: [33, 62, 18], fiddler: [72, 64, 16], dancers: [128, 70, 18] },
    render: renderHungarianRhapsodyC,
  },
  {
    id: "te-deum",
    alt: "A domed Baroque church with columns and a gilded cross, blue banners with gold lilies, two trumpeters raising gold trumpets and a timpanist striking his drums.",
    colors: teDeumC.colors,
    motifs: { church: [80, 46, 26], trumpets: [26, 72, 18], timpani: [132, 76, 14] },
    render: renderTeDeumC,
  },
  {
    id: "sarka",
    alt: "A warrior maiden with golden hair bound to a great oak, a hunting horn at her side, while an armoured knight rides up on a horse and spear tips glint among the rocks of a gorge.",
    colors: sarkaC.colors,
    motifs: { sarka: [52, 68, 16], ctirad: [90, 62, 20], maidens: [144, 34, 16] },
    render: renderSarkaC,
  },
];
