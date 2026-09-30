// Everything a visitor reads, and every piece they hear, lives here.

export type Track = {
  title: string;
  composer: string;
  performer: string;
  /** Wikimedia Commons file page, where the public-domain status is recorded. */
  source: string;
  ogg: string;
  /** Commons' own MP3 transcode of `ogg`, used where the browser plays MP3. */
  mp3: string;
};

export type Site = {
  name: string;
  tagline: string;
  description: string;
  /** Seconds each background painting stays before the next one arrives. */
  paintingSeconds: number;
  /** Seconds the fast-forward control skips. */
  skipSeconds: number;
  tracks: Track[];
};

export const site: Site = {
  name: "classican",
  tagline: "Classical music for studying and deep work.",
  description:
    "A continuous playlist of public-domain classical recordings over slowly shifting pixel paintings. Press play and get to work.",
  paintingSeconds: 45,
  skipSeconds: 15,
  tracks: [
    {
      title: "Gymnopédie No. 1",
      composer: "Erik Satie",
      performer: "Robin Alciatore (via Musopen)",
      source:
        "https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/9/90/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/9/90/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg/Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg.mp3",
    },
    {
      title: "Clair de lune",
      composer: "Claude Debussy",
      performer: "Laurens Goedhart",
      source:
        "https://commons.wikimedia.org/wiki/File:Clair_de_lune_(Claude_Debussy)_Suite_bergamasque.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/b/be/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/b/be/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg.mp3",
    },
    {
      title: "Goldberg Variations: Aria",
      composer: "Johann Sebastian Bach",
      performer: "Kimiko Ishizaka (Open Goldberg Variations)",
      source: "https://commons.wikimedia.org/wiki/File:Goldberg_Variations_01_Aria.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/4/42/Goldberg_Variations_01_Aria.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/4/42/Goldberg_Variations_01_Aria.ogg/Goldberg_Variations_01_Aria.ogg.mp3",
    },
    {
      title: "Gnossienne No. 1",
      composer: "Erik Satie",
      performer: "La Pianista",
      source: "https://commons.wikimedia.org/wiki/File:Satie_-_Gnossienne_1.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/9/91/Satie_-_Gnossienne_1.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/9/91/Satie_-_Gnossienne_1.ogg/Satie_-_Gnossienne_1.ogg.mp3",
    },
    {
      title: "Nocturne in E-flat major, Op. 9 No. 2",
      composer: "Frédéric Chopin",
      performer: "Al Goldstein collection, Pandora Music repository at ibiblio.org",
      source:
        "https://commons.wikimedia.org/wiki/File:Frederic_Chopin_-_Nocturne_Eb_major_Opus_9,_number_2.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Frederic_Chopin_-_Nocturne_Eb_major_Opus_9%2C_number_2.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/5/5c/Frederic_Chopin_-_Nocturne_Eb_major_Opus_9%2C_number_2.ogg/Frederic_Chopin_-_Nocturne_Eb_major_Opus_9%2C_number_2.ogg.mp3",
    },
  ],
};
