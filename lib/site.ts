// Everything a visitor reads, and every piece they hear, lives here.

import type { PaintingId } from "./paintings";

/**
 * A short, true thing about the piece. `motif` names something in the
 * painting (see `motifs` in lib/paintings.ts); while the fact shows, the
 * painting dims around it. Without one the fact sits quietly in a corner.
 */
export type Fact = { text: string; motif?: string };

export type Track = {
  title: string;
  composer: string;
  performer: string;
  /** Wikimedia Commons file page, where the public-domain status is recorded. */
  source: string;
  ogg: string;
  /** Commons' own MP3 transcode of `ogg`, used where the browser plays MP3. */
  mp3: string;
  /** The background painting made for this piece. */
  painting: PaintingId;
  /** Shown one at a time while the piece plays. Keep each to a sentence or two, and only what a source confirms. */
  facts: Fact[];
};

export type Site = {
  name: string;
  tagline: string;
  description: string;
  /** Seconds from one fact to the next while music plays. */
  factSeconds: number;
  tracks: Track[];
};

export const site: Site = {
  name: "classican",
  tagline: "Classical music for studying and deep work.",
  description:
    "A continuous playlist of public-domain classical recordings over pixel paintings of each piece, with a few quiet facts about its history. Press play and get to work.",
  factSeconds: 40,
  tracks: [
    {
      title: "Gymnopédie No. 1",
      composer: "Erik Satie",
      performer: "Robin Alciatore (via Musopen)",
      source:
        "https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/9/90/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/9/90/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg.mp3",
      painting: "gymnopedie",
      facts: [
        { text: "Satie wrote his three Gymnopédies in 1888, in his early twenties.", motif: "dancers" },
        { text: "The title comes from the gymnopaedia, a festival in ancient Sparta where young men danced.", motif: "frieze" },
        { text: "Satie was playing piano in Montmartre’s cabarets, such as Le Chat Noir, around the time he wrote them.", motif: "composer" },
        { text: "The score asks for it to be played “Lent et douloureux”: slow and sorrowful." },
        { text: "Claude Debussy, Satie’s friend, later arranged two of the Gymnopédies for orchestra." },
      ],
    },
    {
      title: "Clair de lune",
      composer: "Claude Debussy",
      performer: "Laurens Goedhart",
      source:
        "https://commons.wikimedia.org/wiki/File:Clair_de_lune_(Claude_Debussy)_Suite_bergamasque.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/b/be/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/b/be/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg.mp3",
      painting: "clair-de-lune",
      facts: [
        { text: "“Clair de lune” means “moonlight”. It is the third of four movements in Debussy’s Suite bergamasque.", motif: "moon" },
        { text: "The title comes from a poem by Paul Verlaine, which pictures masked dancers and fountains under the moon.", motif: "fountain" },
        { text: "Debussy began the suite around 1890 but did not publish it until 1905, revising it first." },
        { text: "It is in D-flat major, and its opening is marked pp: very softly." },
      ],
    },
    {
      title: "Goldberg Variations: Aria",
      composer: "Johann Sebastian Bach",
      performer: "Kimiko Ishizaka (Open Goldberg Variations)",
      source: "https://commons.wikimedia.org/wiki/File:Goldberg_Variations_01_Aria.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/4/42/Goldberg_Variations_01_Aria.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/4/42/Goldberg_Variations_01_Aria.ogg/Goldberg_Variations_01_Aria.ogg.mp3",
      painting: "goldberg",
      facts: [
        { text: "Bach published the Goldberg Variations in 1741: this Aria, thirty variations, then the Aria again.", motif: "harpsichord" },
        { text: "It was written for a harpsichord with two keyboards, so the hands can cross without colliding.", motif: "keyboards" },
        { text: "Every variation is built on the bass line of this Aria, not on its tune." },
        { text: "Bach’s first biographer told a story that it was played to soothe a count’s sleepless nights. Historians doubt it, but the name of the young harpsichordist in the story, Goldberg, stuck.", motif: "candle" },
        { text: "Every third variation, up to the 27th, is a canon, where one voice imitates another." },
        { text: "This recording by Kimiko Ishizaka was crowdfunded and released into the public domain in 2012." },
      ],
    },
    {
      title: "Gnossienne No. 1",
      composer: "Erik Satie",
      performer: "La Pianista",
      source: "https://commons.wikimedia.org/wiki/File:Satie_-_Gnossienne_1.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/9/91/Satie_-_Gnossienne_1.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/9/91/Satie_-_Gnossienne_1.ogg/Satie_-_Gnossienne_1.ogg.mp3",
      painting: "gnossienne",
      facts: [
        { text: "Satie’s title may come from “gnosis”, knowledge, or from an old word for a dance of Knossos on Crete.", motif: "columns" },
        { text: "Satie wrote it without bar lines or a time signature.", motif: "stave" },
        { text: "Besides its tempo mark, “Lent”, the score whispers odd advice to the pianist, like “Très luisant” (very shiny) and “Questionnez” (ask questions)." },
        { text: "It dates from around 1890. Satie may have been inspired by music he heard at the 1889 Paris World’s Fair." },
      ],
    },
    {
      title: "Nocturne in E-flat major, Op. 9 No. 2",
      composer: "Frédéric Chopin",
      performer: "Al Goldstein collection, Pandora Music repository at ibiblio.org",
      source:
        "https://commons.wikimedia.org/wiki/File:Frederic_Chopin_-_Nocturne_Eb_major_Opus_9,_number_2.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Frederic_Chopin_-_Nocturne_Eb_major_Opus_9%2C_number_2.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/5/5c/Frederic_Chopin_-_Nocturne_Eb_major_Opus_9%2C_number_2.ogg/Frederic_Chopin_-_Nocturne_Eb_major_Opus_9%2C_number_2.ogg.mp3",
      painting: "nocturne",
      facts: [
        { text: "Chopin wrote it around 1830–31, when he was about twenty, and it was published in 1832.", motif: "piano" },
        { text: "The nocturne, a dreamy “night piece” for piano, was invented by the Irish composer John Field. Chopin made the form famous.", motif: "window" },
        { text: "Chopin left Poland in 1830 and never went back. From 1831 he made his home in Paris.", motif: "rooftops" },
        { text: "Each time the melody comes back, Chopin decorates it a little more, like an opera singer ornamenting a tune." },
        { text: "It is in 12/8 time: four slow beats, each divided into three." },
      ],
    },
  ],
};
