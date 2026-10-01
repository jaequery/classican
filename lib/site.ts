// Everything a visitor reads, and every piece they hear, lives here.

import type { PaintingId } from "./paintings";

/**
 * A short, true thing about the piece. `motif` names something in the
 * painting (see `motifs` in lib/paintings.ts); while the fact shows, the
 * painting dims around it. Without one the fact sits quietly in a corner.
 */
export type Fact = { text: string; motif?: string };

/** Where and when a piece was written, and how it was received. Every value is sourced in mockups/details.md. */
export type PieceDetails = {
  /** As shown, e.g. "c. 1890, published 1905". */
  year: string;
  /** One year to measure the composer's age against: the year written, or the middle of a range. */
  composedYear: number;
  /** Finished before the composer's birthday that year, so they were a year younger. */
  beforeBirthday?: boolean;
  /** The date is uncertain, so the age reads "about". */
  approximate?: boolean;
  place: string;
  instruments: string;
  /** How it was received in its own time, in a sentence or two. */
  reception: string;
};

export type Composer = {
  born: number;
  died: number;
  birthplace: string;
  /** Nationality, as a gallery label gives it. */
  origin: string;
  money: string;
  /** One more short, true thing about their life. */
  also: string;
};

export type Track = {
  title: string;
  composer: ComposerName;
  performer: string;
  /** Wikimedia Commons file page, where the public-domain status is recorded. */
  source: string;
  ogg: string;
  /** Commons' own MP3 transcode of `ogg`, used where the browser plays MP3. */
  mp3: string;
  /** The background painting made for this piece. */
  painting: PaintingId;
  details: PieceDetails;
  /** Shown one at a time while the piece plays. Keep each to a sentence or two, and only what a source confirms. */
  facts: Fact[];
};

export type Site = {
  name: string;
  tagline: string;
  description: string;
  /** Seconds from one fact to the next while music plays. */
  factSeconds: number;
  composers: typeof composers;
  tracks: Track[];
};

/** The composer's age when writing the piece, worked out from their birth year. */
export function ageAtWriting(details: PieceDetails, composer: Composer) {
  const age = details.composedYear - composer.born - (details.beforeBirthday ? 1 : 0);
  return details.approximate ? `about ${age}` : String(age);
}

const composers = {
  "Erik Satie": {
    born: 1866,
    died: 1925,
    birthplace: "Honfleur, France",
    origin: "French",
    money: "Earned a modest living as a cabaret pianist and was often short of money; from 1898 he lived in one room in Arcueil.",
    also: "Left the Paris Conservatoire in 1882, then went back to study at the Schola Cantorum at 39.",
  },
  "Claude Debussy": {
    born: 1862,
    died: 1918,
    birthplace: "Saint-Germain-en-Laye, France",
    origin: "French",
    money: "Had a taste for luxury and a reputation for debts, and topped up his income by teaching and writing.",
    also: "Entered the Paris Conservatoire at ten and won the Prix de Rome in 1884.",
  },
  "Johann Sebastian Bach": {
    born: 1685,
    died: 1750,
    birthplace: "Eisenach, Germany",
    origin: "German",
    money: "A salaried musician all his life: well paid as court music director at Köthen, then cantor of St Thomas in Leipzig.",
    also: "Had 20 children; four became composers.",
  },
  "Frédéric Chopin": {
    born: 1810,
    died: 1849,
    birthplace: "Żelazowa Wola, Poland",
    origin: "Polish",
    money: "Earned a handsome income from publishing and from teaching wealthy pupils, so he rarely needed to give public concerts.",
    also: "Left Poland in 1830, never returned, and settled in Paris.",
  },
  "Robert Schumann": {
    born: 1810,
    died: 1856,
    birthplace: "Zwickau, Germany",
    origin: "German",
    money: "Clara Wieck’s father opposed their marriage, doubting he could provide for her; she was the better-known performer.",
    also: "An injured finger ended his hopes of a concert career, so he turned to composing.",
  },
  "Edvard Grieg": {
    born: 1843,
    died: 1907,
    birthplace: "Bergen, Norway",
    origin: "Norwegian",
    money: "From 1874 he received a yearly artist’s stipend from the Norwegian state.",
    also: "Trained at the Leipzig Conservatory.",
  },
  "Wolfgang Amadeus Mozart": {
    born: 1756,
    died: 1791,
    birthplace: "Salzburg, now Austria",
    origin: "Austrian",
    money: "By 1788 his income had fallen sharply, and he wrote to his friend Michael Puchberg begging for loans.",
    also: "Toured Europe’s courts as a child prodigy for three and a half years.",
  },
  "Ludwig van Beethoven": {
    born: 1770,
    died: 1827,
    birthplace: "Bonn, Germany",
    origin: "German",
    money: "From 1809, three noble patrons promised him 4,000 florins a year to stay in Vienna, though not all kept paying.",
    also: "His hearing began to fail around 1798.",
  },
  "Camille Saint-Saëns": {
    born: 1835,
    died: 1921,
    birthplace: "Paris, France",
    origin: "French",
    money: "His post as organist at La Madeleine paid comfortably, and a later legacy let him concentrate on composing.",
    also: "A child prodigy with perfect pitch before he was three.",
  },
  "Felix Mendelssohn": {
    born: 1809,
    died: 1847,
    birthplace: "Hamburg, Germany",
    origin: "German",
    money: "Came from a wealthy family; his father, Abraham, was a banker.",
    also: "In 1829 he conducted Bach’s St Matthew Passion in Berlin, sparking the Bach revival.",
  },
} satisfies Record<string, Composer>;

export type ComposerName = keyof typeof composers;

export const site: Site = {
  name: "classican",
  tagline: "Classical music to work by, and to fall in love with.",
  description:
    "A continuous playlist of public-domain classical recordings, each set to a pixel painting of what the music is about, with notes on what to listen for and the lives of the composers who wrote it. Press play and let it carry you.",
  factSeconds: 40,
  composers,
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
      details: {
        year: "1888",
        composedYear: 1888,
        beforeBirthday: true,
        place: "Paris, France",
        instruments: "Solo piano",
        reception: "Little noticed at first. People began to pay attention after Debussy orchestrated it in 1897.",
      },
      facts: [
        { text: "Satie wrote his three Gymnopédies in 1888, in his early twenties.", motif: "dancers" },
        { text: "The title comes from the gymnopaedia, a festival in ancient Sparta where young men danced.", motif: "frieze" },
        { text: "Satie was playing piano in Montmartre’s cabarets, such as Le Chat Noir, around the time he wrote them.", motif: "composer" },
        { text: "The score asks for it to be played “Lent et douloureux”: slow and sorrowful." },
        { text: "Claude Debussy, Satie’s friend, later arranged two of the Gymnopédies for orchestra." },
        { text: "Listen to the left hand: it rocks gently between two soft chords while the melody floats above, never hurrying.", motif: "dancers" },
        { text: "Satie lived alone in a single room in Arcueil. After he died, friends found two pianos there, one stacked on top of the other.", motif: "composer" },
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
      details: {
        year: "c. 1890, published 1905",
        composedYear: 1890,
        approximate: true,
        place: "Probably Paris, France",
        instruments: "Solo piano",
        reception: "Debussy did not want to publish this early work. He agreed in 1905, when a publisher expected his later fame to sell it.",
      },
      facts: [
        { text: "“Clair de lune” means “moonlight”. It is the third of four movements in Debussy’s Suite bergamasque.", motif: "moon" },
        { text: "The title comes from a poem by Paul Verlaine, which pictures masked dancers and fountains under the moon.", motif: "fountain" },
        { text: "Debussy began the suite around 1890 but did not publish it until 1905, revising it first." },
        { text: "It is in D-flat major, and its opening is marked pp: very softly." },
        { text: "Listen for the middle section, where the left hand breaks into rippling arpeggios, like moonlight moving on water.", motif: "fountain" },
        { text: "Debussy entered the Paris Conservatoire at ten, and spent his life bending the rules he learned there." },
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
      details: {
        year: "c. 1740, published 1741",
        composedYear: 1740,
        approximate: true,
        place: "Leipzig, Germany",
        instruments: "Harpsichord with two keyboards",
        reception: "One of the few works Bach published in his lifetime. It became widely known only after Glenn Gould’s 1955 recording.",
      },
      facts: [
        { text: "Bach published the Goldberg Variations in 1741: this Aria, thirty variations, then the Aria again.", motif: "harpsichord" },
        { text: "It was written for a harpsichord with two keyboards, so the hands can cross without colliding.", motif: "keyboards" },
        { text: "Every variation is built on the bass line of this Aria, not on its tune." },
        { text: "Listen for the small trills and turns decorating the melody: Bach wrote each one into the score.", motif: "keyboards" },
        { text: "Bach’s music was little played for decades after his death, until Mendelssohn revived his St Matthew Passion in 1829." },
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
      details: {
        year: "c. 1890, published 1893",
        composedYear: 1890,
        approximate: true,
        place: "Paris, France",
        instruments: "Solo piano",
        reception: "How it was first received is not recorded. It was first printed in the magazine Le Figaro musical in 1893.",
      },
      facts: [
        { text: "Satie’s title may come from “gnosis”, knowledge, or from an old word for a dance of Knossos on Crete.", motif: "columns" },
        { text: "Satie wrote it without bar lines or a time signature.", motif: "stave" },
        { text: "Besides its tempo mark, “Lent”, the score whispers odd advice to the pianist, like “Très luisant” (very shiny) and “Questionnez” (ask questions)." },
        { text: "It dates from around 1890. Satie may have been inspired by music he heard at the 1889 Paris World’s Fair." },
        { text: "Listen to the bass: it plods steadily, chord after chord, while the melody above winds and twists as it pleases.", motif: "stave" },
        { text: "Satie bought seven identical grey velvet suits and wore nothing else for years, earning the nickname “the Velvet Gentleman”." },
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
      details: {
        year: "1830–32, published 1832",
        composedYear: 1830,
        approximate: true,
        place: "On the move between Warsaw, Vienna and Paris",
        instruments: "Solo piano",
        reception: "Critics were mixed about Chopin’s nocturnes when they came out. This one is now often called his most famous piece.",
      },
      facts: [
        { text: "Chopin wrote it around 1830–31, when he was about twenty, and it was published in 1832.", motif: "piano" },
        { text: "The nocturne, a dreamy “night piece” for piano, was invented by the Irish composer John Field. Chopin made the form famous.", motif: "window" },
        { text: "Chopin left Poland in 1830 and never went back. From 1831 he made his home in Paris.", motif: "rooftops" },
        { text: "Listen each time the melody comes back: Chopin decorates it a little more, like an opera singer ornamenting a tune." },
        { text: "It is in 12/8 time: four slow beats, each divided into three." },
        { text: "Chopin disliked big concert halls. He gave only about thirty public concerts in his life, preferring the intimacy of private salons.", motif: "piano" },
      ],
    },
    {
      title: "Cello Suite No. 1 in G major: Prelude",
      composer: "Johann Sebastian Bach",
      performer: "Pablo Casals (Naxos Historical, restored by Ward Marston)",
      source: "https://commons.wikimedia.org/wiki/File:Bach_-_Cello_Suite_no._1_in_G_major,_BWV_1007_-_I._Pr%C3%A9lude.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/9/9d/Bach_-_Cello_Suite_no._1_in_G_major%2C_BWV_1007_-_I._Pr%C3%A9lude.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/9/9d/Bach_-_Cello_Suite_no._1_in_G_major%2C_BWV_1007_-_I._Pr%C3%A9lude.ogg/Bach_-_Cello_Suite_no._1_in_G_major%2C_BWV_1007_-_I._Pr%C3%A9lude.ogg.mp3",
      painting: "cello-prelude",
      details: {
        year: "c. 1717–23",
        composedYear: 1720,
        approximate: true,
        place: "Probably Köthen, Germany",
        instruments: "Solo cello",
        reception: "The suites stayed largely unknown until Pablo Casals found an edition in 1889. His 1936–39 recordings made them famous.",
      },
      facts: [
        { text: "At thirteen, Pablo Casals found a worn copy of Bach’s cello suites in a Barcelona music shop. He practised them for over a decade before playing them in public.", motif: "score" },
        { text: "Listen for one instrument playing two parts: the cello sketches a bass line and a melody above it at the same time.", motif: "cello" },
        { text: "Bach wrote the six suites around 1720, while he was music director at the court of Köthen." },
        { text: "No copy in Bach’s own hand survives. The music reached us through copies, one of them made by his wife, Anna Magdalena." },
        { text: "Before Casals, the suites were treated mostly as exercises. His recordings from the 1930s, heard here, made them concert music." },
      ],
    },
    {
      title: "Träumerei",
      composer: "Robert Schumann",
      performer: "Musopen",
      source: "https://commons.wikimedia.org/wiki/File:Robert_Schumann_-_scenes_from_childhood,_op._15_-_vii._dreaming.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/0/06/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_vii._dreaming.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/0/06/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_vii._dreaming.ogg/Robert_Schumann_-_scenes_from_childhood%2C_op._15_-_vii._dreaming.ogg.mp3",
      painting: "traumerei",
      details: {
        year: "1838",
        composedYear: 1838,
        beforeBirthday: true,
        place: "Leipzig, Germany",
        instruments: "Solo piano",
        reception: "Clara Wieck, who married Schumann in 1840, loved the set. How the wider public first received it is less well recorded.",
      },
      facts: [
        { text: "“Träumerei” means “dreaming”. It is the seventh of thirteen short pieces in Schumann’s Scenes from Childhood, written in 1838.", motif: "dreamer" },
        { text: "Listen for the opening phrase: one long reach upward that gently settles. Almost the whole piece grows from that single gesture.", motif: "window" },
        { text: "Schumann said he gave the pieces their titles only after writing them. Another in the set is “Knight of the Hobby-Horse”.", motif: "horse" },
        { text: "He wrote them while fighting to marry the pianist Clara Wieck, whose father opposed the match. They married in 1840." },
      ],
    },
    {
      title: "Prelude in C major, BWV 846",
      composer: "Johann Sebastian Bach",
      performer: "Kimiko Ishizaka (Open Well-Tempered Clavier)",
      source: "https://commons.wikimedia.org/wiki/File:Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier,_Book_1_-_01_Prelude_No._1_in_C_major,_BWV_846.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/b/b6/Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier%2C_Book_1_-_01_Prelude_No._1_in_C_major%2C_BWV_846.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/b/b6/Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier%2C_Book_1_-_01_Prelude_No._1_in_C_major%2C_BWV_846.ogg/Kimiko_Ishizaka_-_Bach_-_Well-Tempered_Clavier%2C_Book_1_-_01_Prelude_No._1_in_C_major%2C_BWV_846.ogg.mp3",
      painting: "well-tempered",
      details: {
        year: "c. 1720–22, printed 1801",
        composedYear: 1720,
        approximate: true,
        place: "Köthen, Germany",
        instruments: "Keyboard: harpsichord or clavichord",
        reception: "It passed around in handwritten copies and was not printed until 1801, 51 years after Bach died.",
      },
      facts: [
        { text: "This prelude opens Bach’s Well-Tempered Clavier: 24 preludes and fugues, one in every major and minor key.", motif: "circle" },
        { text: "Listen for the single pattern: each bar is one chord, broken into the same rising figure and played twice. Only the harmony moves.", motif: "figure" },
        { text: "Bach compiled the book in 1722 “for the use and profit of musical youth eager to learn”." },
        { text: "More than a century later, Charles Gounod sang a new melody over this prelude, left exactly as Bach wrote it, and called it Ave Maria." },
        { text: "Kimiko Ishizaka recorded it for a crowdfunded project and gave the recording to the public domain, like her Goldberg Variations.", motif: "keyboard" },
      ],
    },
    {
      title: "Peer Gynt: Morning Mood",
      composer: "Edvard Grieg",
      performer: "Musopen Symphony (Czech National Symphony Orchestra)",
      source: "https://commons.wikimedia.org/wiki/File:Musopen_-_Morning.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/1/1a/Musopen_-_Morning.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/1/1a/Musopen_-_Morning.ogg/Musopen_-_Morning.ogg.mp3",
      painting: "morning-mood",
      details: {
        year: "1874–75, first performed 1876",
        composedYear: 1874,
        approximate: true,
        place: "Bergen, Norway",
        instruments: "Orchestra: woodwind, horns, trumpets, timpani and strings",
        reception: "The 1876 premiere in Christiania (now Oslo) was a triumph. The Peer Gynt suites became some of Grieg’s best-known works.",
      },
      facts: [
        { text: "Grieg wrote it for Henrik Ibsen’s play Peer Gynt, first staged in 1876." },
        { text: "In the play it greets sunrise in the Moroccan desert, not over a Norwegian fjord.", motif: "desert" },
        { text: "Listen for the opening tune passing back and forth between flute and oboe, a little brighter each time.", motif: "flute" },
        { text: "Listen for the moment the whole orchestra swells, as if the sun has cleared the horizon, before it all settles again.", motif: "sun" },
        { text: "Grieg later gathered the music into two concert suites. Morning Mood opens the first." },
        { text: "Grieg’s first piano teacher was his mother, in Bergen. Later he composed in a small hut by the water at his home, Troldhaugen." },
      ],
    },
    {
      title: "Piano Sonata No. 16 in C major, K. 545: Allegro",
      composer: "Wolfgang Amadeus Mozart",
      performer: "Musopen",
      source: "https://commons.wikimedia.org/wiki/File:Wolfgang_Amadeus_Mozart_-_sonata_no._16_in_c_major,_k.545_%27sonata_facile%27_-_i._allegro.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/3/38/Wolfgang_Amadeus_Mozart_-_sonata_no._16_in_c_major%2C_k.545_%27sonata_facile%27_-_i._allegro.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/3/38/Wolfgang_Amadeus_Mozart_-_sonata_no._16_in_c_major%2C_k.545_%27sonata_facile%27_-_i._allegro.ogg/Wolfgang_Amadeus_Mozart_-_sonata_no._16_in_c_major%2C_k.545_%27sonata_facile%27_-_i._allegro.ogg.mp3",
      painting: "mozart-salon",
      details: {
        year: "1788, published 1805",
        composedYear: 1788,
        place: "Vienna, Austria",
        instruments: "Solo piano",
        reception: "Mozart called it “a little keyboard sonata for beginners”. It was not published in his lifetime.",
      },
      facts: [
        { text: "Mozart entered it in his catalogue on 26 June 1788 as “a little keyboard sonata for beginners”.", motif: "fortepiano" },
        { text: "Listen for the scales that race up and down after the opening tune: the plainest materials, made to sparkle." },
        { text: "That same summer Mozart finished his last three symphonies, in under seven weeks.", motif: "candles" },
        { text: "It was not published until 1805, fourteen years after Mozart died." },
        { text: "Mozart was composing by the age of five, and toured the courts of Europe as a child prodigy.", motif: "portrait" },
      ],
    },
    {
      title: "Air on the G String",
      composer: "Johann Sebastian Bach",
      performer: "The Air Force Strings, United States Air Force Band",
      source: "https://commons.wikimedia.org/wiki/File:Air.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/5/55/Air.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/5/55/Air.ogg/Air.ogg.mp3",
      painting: "air",
      details: {
        year: "c. 1730",
        composedYear: 1730,
        approximate: true,
        place: "Leipzig, Germany",
        instruments: "Strings and continuo",
        reception: "How it was received in Bach’s day is not recorded. It became famous through August Wilhelmj’s 1871 violin arrangement.",
      },
      facts: [
        { text: "This Air is the second movement of Bach’s Orchestral Suite No. 3 in D major, written for strings and continuo." },
        { text: "Its nickname comes from an 1871 arrangement by the violinist August Wilhelmj, who set it to be played on the violin’s lowest string alone: G.", motif: "violin" },
        { text: "Listen for the bass: it walks in steady, even steps beneath the long held notes of the melody." },
        { text: "Bach wrote the suite during his years in Leipzig, where he was cantor of St Thomas Church.", motif: "window" },
      ],
    },
    {
      title: "Moonlight Sonata: Adagio sostenuto",
      composer: "Ludwig van Beethoven",
      performer: "Paul Pitman (via Musopen)",
      source: "https://commons.wikimedia.org/wiki/File:Ludwig_van_Beethoven_-_sonata_no._14_in_c_sharp_minor_%27moonlight%27,_op._27_no._2_-_i._adagio_sostenuto.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/4/48/Ludwig_van_Beethoven_-_sonata_no._14_in_c_sharp_minor_%27moonlight%27%2C_op._27_no._2_-_i._adagio_sostenuto.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/4/48/Ludwig_van_Beethoven_-_sonata_no._14_in_c_sharp_minor_%27moonlight%27%2C_op._27_no._2_-_i._adagio_sostenuto.ogg/Ludwig_van_Beethoven_-_sonata_no._14_in_c_sharp_minor_%27moonlight%27%2C_op._27_no._2_-_i._adagio_sostenuto.ogg.mp3",
      painting: "moonlight",
      details: {
        year: "1801, published 1802",
        composedYear: 1801,
        beforeBirthday: true,
        approximate: true,
        place: "Vienna, Austria",
        instruments: "Solo piano",
        reception: "Already popular in his lifetime. His pupil Czerny reported him grumbling, “Surely I’ve written better things.”",
      },
      facts: [
        { text: "Beethoven never called it the Moonlight Sonata. Five years after his death, the critic Ludwig Rellstab likened it to moonlight on Lake Lucerne, and the name stuck.", motif: "lake" },
        { text: "Listen for three layers: deep octaves in the bass, a constant murmur of triplets, and above them a quiet melody, like a voice.", motif: "moon" },
        { text: "Beethoven published it in 1802 as a “sonata quasi una fantasia”: a sonata in the manner of a fantasy." },
        { text: "The score asks for the dampers to stay off throughout, so the harmonies blur softly into one another." },
        { text: "He wrote it as his hearing began to fail. In 1801 he first confided his deafness to friends in letters.", motif: "boat" },
      ],
    },
    {
      title: "The Carnival of the Animals: The Swan",
      composer: "Camille Saint-Saëns",
      performer: "Alisa Weilerstein, cello, and Jason Yoder, piano, at the White House",
      source: "https://commons.wikimedia.org/wiki/File:20091104_Alisa_Weilerstein_and_Jason_Yoder_-_Saint_Sa%C3%ABns%27_The_Swan.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/2/2a/20091104_Alisa_Weilerstein_and_Jason_Yoder_-_Saint_Sa%C3%ABns%27_The_Swan.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/2/2a/20091104_Alisa_Weilerstein_and_Jason_Yoder_-_Saint_Sa%C3%ABns%27_The_Swan.ogg/20091104_Alisa_Weilerstein_and_Jason_Yoder_-_Saint_Sa%C3%ABns%27_The_Swan.ogg.mp3",
      painting: "swan",
      details: {
        year: "1886, published 1887",
        composedYear: 1886,
        beforeBirthday: true,
        place: "A small village in Austria, on holiday",
        instruments: "Cello and two pianos",
        reception: "Saint-Saëns banned publication of the Carnival in his lifetime, except for The Swan, which he allowed in 1887.",
      },
      facts: [
        { text: "Listen to the piano rippling like water, while the cello’s long, unbroken melody glides above it.", motif: "swan" },
        { text: "The Swan is the thirteenth of fourteen movements in Saint-Saëns’ Carnival of the Animals, written in 1886." },
        { text: "Saint-Saëns thought the Carnival too frivolous and barred its publication in his lifetime, with one exception: The Swan." },
        { text: "In 1905 the ballerina Anna Pavlova first danced The Dying Swan to it, choreographed by Michel Fokine.", motif: "reeds" },
        { text: "Saint-Saëns gave his first public recital at ten, offering to play any of Beethoven’s sonatas from memory as an encore." },
      ],
    },
    {
      title: "Venetian Gondola Song, Op. 30 No. 6",
      composer: "Felix Mendelssohn",
      performer: "Membeth (Wikimedia Commons)",
      source: "https://commons.wikimedia.org/wiki/File:Mendelssohn.Venetianisches.Gondellied.opus.30.6.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/c/c7/Mendelssohn.Venetianisches.Gondellied.opus.30.6.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c7/Mendelssohn.Venetianisches.Gondellied.opus.30.6.ogg/Mendelssohn.Venetianisches.Gondellied.opus.30.6.ogg.mp3",
      painting: "gondola",
      details: {
        year: "1833–34, published 1835",
        composedYear: 1833,
        approximate: true,
        place: "Probably Düsseldorf, Germany",
        instruments: "Solo piano",
        reception: "His Songs Without Words were widely popular with amateur pianists, and he went on to publish eight books of them.",
      },
      facts: [
        { text: "It comes from Mendelssohn’s Songs Without Words: short piano pieces shaped like songs, with the piano doing the singing.", motif: "gondola" },
        { text: "Listen for the lilting rhythm below, like an oar dipping and lifting, under a melody that sings like a gondolier.", motif: "gondolier" },
        { text: "Mendelssohn titled very few of these songs himself. The Venetian Gondola Songs are among the handful he named." },
        { text: "He saw Venice in 1830, on a long journey through Italy, and was a fine watercolourist who painted the places he travelled.", motif: "palazzi" },
      ],
    },
    {
      title: "Nocturne in E minor, Op. 72 No. 1",
      composer: "Frédéric Chopin",
      performer: "Musopen",
      source: "https://commons.wikimedia.org/wiki/File:Chopin_-_Nocturne_Op._posth._72_no._1.ogg",
      ogg: "https://upload.wikimedia.org/wikipedia/commons/c/c2/Chopin_-_Nocturne_Op._posth._72_no._1.ogg",
      mp3: "https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c2/Chopin_-_Nocturne_Op._posth._72_no._1.ogg/Chopin_-_Nocturne_Op._posth._72_no._1.ogg.mp3",
      painting: "warsaw",
      details: {
        year: "1827, published 1855",
        composedYear: 1827,
        approximate: true,
        place: "Warsaw, Poland",
        instruments: "Solo piano",
        reception: "Published only after his death, so it had no audience in his lifetime. It was his first nocturne.",
      },
      facts: [
        { text: "Chopin wrote this nocturne in Warsaw around 1827, when he was about seventeen.", motif: "manuscript" },
        { text: "Listen for the left hand’s wide, rolling arpeggios, sweeping under a melody that moves as slowly as a voice." },
        { text: "It was published only in 1855, six years after his death, which is why it carries the late opus number 72.", motif: "candle" },
        { text: "Chopin left Poland at twenty and never returned, but after his death his heart was carried back to Warsaw. It rests in the Church of the Holy Cross.", motif: "window" },
      ],
    },
  ],
};
