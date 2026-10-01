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
  tagline: "Classical music to work by, and to fall in love with.",
  description:
    "A continuous playlist of public-domain classical recordings, each set to a pixel painting of what the music is about, with notes on what to listen for and the lives of the composers who wrote it. Press play and let it carry you.",
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
      facts: [
        { text: "Chopin wrote this nocturne in Warsaw around 1827, when he was about seventeen.", motif: "manuscript" },
        { text: "Listen for the left hand’s wide, rolling arpeggios, sweeping under a melody that moves as slowly as a voice." },
        { text: "It was published only in 1855, six years after his death, which is why it carries the late opus number 72.", motif: "candle" },
        { text: "Chopin left Poland at twenty and never returned, but after his death his heart was carried back to Warsaw. It rests in the Church of the Holy Cross.", motif: "window" },
      ],
    },
  ],
};
