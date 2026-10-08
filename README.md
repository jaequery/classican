# classican

One screen of public-domain classical music for studying and deep work. The only interface is a
small player at bottom centre: previous, play/pause, next and volume. Behind it is an original pixel
painting of the piece that is playing: Greek dancers for Satie's Gymnopédie, Verlaine's moonlit park
for Clair de lune, Bach's two-keyboard harpsichord, and so on. While music plays, a short fact about
the piece's history comes every 40 seconds or so: the painting dims gently around the thing the fact
is about, and the words sit beside that pool of light for a few seconds before the light returns.
A piece that tells a story follows it as it plays: when the Moldau reaches the forest hunt, the
peasant wedding or the nymphs dancing by moonlight, the painting turns to that scene and a card
marked "The story" says what the music is depicting.
Listeners can make an account to like pieces and leave comments on them; everyone else can read them.
A thin bar along the top says what changed on the site lately, marked "New" and dated; × dismisses
it until the next update.
No search, no other pages.

## Run

Needs Node.js 20.9 or newer.

```sh
npm install
npm run dev        # http://localhost:3000
# or, for production:
npm run build && npm start
```

Pieces play in shuffle: the page opens on a random piece and tries to play it straight away, and
next (or the end of a piece) picks another at random. Previous, or Left, goes back to the piece
before; it is unavailable until there is a previous piece. Next then returns to the piece you left.
Going back keeps music playing or paused as it was. Most
browsers block autoplay on a first visit, so then the visitor's first click or key starts the music.
The composer line says “Paused” when music is paused, including when the browser blocks autoplay.
A piece that fails to load is skipped; if every piece fails, the player says so and shows
“Press play to try again.” beneath the message. Pressing play retries the recording.
Once the recording has loaded, elapsed and total time appear beneath the composer. The readout
follows playback, holds its place while paused, and clears when changing pieces until the new duration is known.
Drag the progress slider beside the time to move within the piece, or focus it and use the arrow keys.
Seeking keeps music playing or paused as it was, and story paintings follow the new position in either direction.
Space plays and pauses from anywhere on the page, and M mutes; media keys (including
previous) and the OS "now playing" panel work too, and the browser tab names the piece that is on.
“Piece & recording details” on the wall label opens the piece's background, composer biography,
performer credit and recording's Commons page. “Hide details” closes it again and stays visible
while you scroll through the details on a smaller screen.
The volume button shows the player's current percentage, or “Muted” while muted. Up and Down adjust
the level; on phones, use the device's volume buttons for the listening volume.
Volume and mute are remembered between visits and applied before playback starts. Unmute or raise
the player's volume to hear music again. If browser storage is blocked, settings last for this visit.
Open “Keyboard shortcuts” beneath the player controls for a quick guide to all the keys.
It starts collapsed, and opening or closing it does not start the music. While typing, keys work as
usual; Space activates a focused control.

## Accounts, likes and comments

Beside next in the player are a heart and a button labeled “Comments,” each with its count for the piece now
playing. Comments opens a panel listing what listeners have said about that piece. The
piece title and close button stay visible while you scroll through a long thread. On phones and
narrower desktops, comments stop above the player, even when a long piece title wraps or the
keyboard shortcuts guide is open. Anyone
using a keyboard starts on the panel's close button and can Tab through its actions. Closing the panel
with that button or Escape returns focus to the control that opened it. Anyone
can read likes and comments; pressing the heart, or "Sign in" in the panel, opens a dialog to sign in
or create an account with a name, email and password. Signed in, a listener can like and unlike any
piece, comment on it (up to 1,000 characters) and delete their own comments. Comments show the
writer's name, never their email.

If saving a like fails, the message stays just above the player, including when the piece title
wraps or the keyboard shortcuts guide is open.

The comment form shows its character count and limit as you write, ignoring spaces at either end.
If a draft is too long, it tells you how many characters to remove before you can post, keeping your text intact.

Use Show beside the password field to check what you typed, and Hide to mask it again.
Passwords start hidden when opening the dialog or switching between sign-in and account creation.

Everything listeners make is kept in Postgres on Neon, connected through Vercel's Neon integration,
which sets `DATABASE_URL` (`POSTGRES_URL` also works). The tables (`users`, `sessions`, `likes`,
`comments`, in `lib/db.ts`) are created on the first request if they aren't there yet, so there is no
migration step. To run the site locally with accounts, put a Neon connection string (a dev branch, not
production) in `.env.local` as `DATABASE_URL`; without one, the music plays but signing in fails.
Passwords are stored as salted scrypt hashes, and sign-ins as a hash of an httpOnly cookie that lasts
30 days.

```sh
npm test           # account, like and comment rules (lib/community.ts), on an in-process Postgres (PGlite)
```

## Stack

- Next.js (App Router), React Server Components, TypeScript, plain CSS custom properties
- `app/page.tsx` is a server component; the player, the painting canvas, the comments panel and the sign-in dialog are the client code
- `app/api/` holds small route handlers for accounts, likes and comments; the rules live in `lib/community.ts`
- Playfair Display SemiBold (titles) and Source Serif 4 Medium/SemiBold (everything else) are self-hosted
  from `app/fonts/` (SIL Open Font License, `app/fonts/*-OFL.txt`), falling back to Georgia and serif
- No remote images, fonts or icons. The paintings are drawn in code and the icons are inline SVG

## Changing things

| What | Where |
| --- | --- |
| Name, tagline, description | `lib/site.ts` (`name`, `tagline`, `description`) |
| Playlist | `lib/site.ts` (`tracks`) |
| Facts about each piece | `lib/site.ts` (`facts` on each track) |
| The story a piece tells, and when | `lib/site.ts` (`story` on each track) |
| Time from one fact to the next | `lib/site.ts` (`factSeconds`) |
| What's new in the top bar, and its date | `lib/site.ts` (`update`; leave it out to hide the bar) |
| Paintings | `lib/paintings.ts` |
| Palette of the frame | `app/globals.css` (`:root`) |
| Who may like, comment or delete | `lib/community.ts` |
| Comment length, shared types | `lib/social.ts` |
| Password and session rules | `lib/auth.ts` |
| Where accounts, likes and comments are kept | `lib/db.ts` (tables), `lib/session.ts` (`DATABASE_URL`) |

**Adding a piece.** A piece's likes and comments are kept under an id made from its composer and
title (`pieceId` in `lib/site.ts`), so renaming a piece leaves them behind. Append an entry to `tracks` with `title`, `composer`, `performer`, the Commons
file page as `source`, the `ogg` and `mp3` URLs, the id of its `painting`, and its `facts`. Use only
recordings whose licence allows it.

**Facts.** Each fact is a sentence or two a beginner can enjoy, and only something a source
confirms. Word legends as stories. Give a fact a `motif` (a name from its painting's `motifs`) and
the light gathers there while it shows; without one it sits in the top-left corner. Record the
source for each fact in `mockups/facts.md`.

**Stories.** A piece whose composer wrote a story into it gets a `story`: beats in order, each with
`at` (seconds into that recording), the `text` to show, the `scene` painting to turn to (the piece's
own painting if absent) and a `motif` in that scene. Cue times belong to the recording, so a new
recording needs new times. Tell only what the composer's programme or the score's section titles say,
and record the source and how each cue was found in `mockups/story.md`.

**Adding a painting.** Each painting depicts its piece: a palette plus a `render(raster, frame)`
function that draws into a 160×100 buffer of palette indices with `fill`, `tint`, `stroke`, `line`
and `dot` from `lib/raster.ts`. `fracture()` makes the angular background planes. List the things a
fact can point at in `motifs` as `[x, y, radius]` in art pixels. Give it an `alt` that describes the
picture: it becomes the background's accessible name. Add it to the `paintings` array with a new
`PaintingId`.

**Frame palette.** The chrome uses four tokens only: `--canvas` #181818, `--surface` #262626,
`--ink` #FAFAFA and `--muted` #A3A3A3. Colour belongs to the paintings.

## Motion

While music plays the painting drifts a little faster; paused, it settles, and facts pause too.
When the piece changes, its painting dissolves in and its facts start again from the first. On a
narrow screen the painting pans so the lit motif stays in view above the player. Under
`prefers-reduced-motion` nothing moves: paintings change with an instant swap, the light and the
words appear without fading, and hover changes are immediate.

## Audio sources

Every recording is streamed from Wikimedia Commons and marked **public domain** on its file page
(Public domain, the Public Domain Mark, or a CC0 dedication).
The player uses Commons' MP3 transcode where the browser supports MP3, and the original Ogg otherwise.

| Piece | Composer | Performer / source | Commons file |
| --- | --- | --- | --- |
| Gymnopédie No. 1 | Erik Satie | Robin Alciatore (via Musopen) | [File:Erik Satie - gymnopedies - la 1 ere. lent et douloureux.ogg](https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg) |
| Clair de lune | Claude Debussy | Laurens Goedhart | [File:Clair de lune (Claude Debussy) Suite bergamasque.ogg](https://commons.wikimedia.org/wiki/File:Clair_de_lune_(Claude_Debussy)_Suite_bergamasque.ogg) |
| Goldberg Variations: Aria | Johann Sebastian Bach | Kimiko Ishizaka (Open Goldberg Variations) | [File:Goldberg Variations 01 Aria.ogg](https://commons.wikimedia.org/wiki/File:Goldberg_Variations_01_Aria.ogg) |
| Gnossienne No. 1 | Erik Satie | La Pianista | [File:Satie - Gnossienne 1.ogg](https://commons.wikimedia.org/wiki/File:Satie_-_Gnossienne_1.ogg) |
| Nocturne in E-flat major, Op. 9 No. 2 | Frédéric Chopin | Al Goldstein collection, Pandora Music repository at ibiblio.org | [File:Frederic Chopin - Nocturne Eb major Opus 9, number 2.ogg](https://commons.wikimedia.org/wiki/File:Frederic_Chopin_-_Nocturne_Eb_major_Opus_9,_number_2.ogg) |
| Symphony No. 9 "From the New World": Largo | Antonín Dvořák | Musopen | [File:Antonin Dvorak - symphony no. 9 in e minor 'from the new world', op. 95 - ii. largo.ogg](https://commons.wikimedia.org/wiki/File:Antonin_Dvorak_-_symphony_no._9_in_e_minor_%27from_the_new_world%27,_op._95_-_ii._largo.ogg) |
| Má vlast: Vltava (The Moldau) | Bedřich Smetana | Musopen | [File:Bedrich Smetana - ma vlast - i. vltava 'the moldau'.ogg](https://commons.wikimedia.org/wiki/File:Bedrich_Smetana_-_ma_vlast_-_i._vltava_%27the_moldau%27.ogg) |
| Peer Gynt: In the Hall of the Mountain King | Edvard Grieg | Musopen Symphony (Czech National Symphony Orchestra) | [File:Musopen - In the Hall Of The Mountain King.ogg](https://commons.wikimedia.org/wiki/File:Musopen_-_In_the_Hall_Of_The_Mountain_King.ogg) |
| Peer Gynt: Anitra's Dance | Edvard Grieg | Musopen Symphony Orchestra | [File:Grieg, Peer Gynt Suite No. 1, Op. 46 - III. Anitra's Dance.ogg](https://commons.wikimedia.org/wiki/File:Grieg,_Peer_Gynt_Suite_No._1,_Op._46_-_III._Anitra%27s_Dance.ogg) |
| Tales from the Vienna Woods, Op. 325 | Johann Strauss II | Musopen | [File:Johann Strauss - G'schichten aus dem Wienerwald, Op.325.ogg](https://commons.wikimedia.org/wiki/File:Johann_Strauss_-_G%27schichten_aus_dem_Wienerwald,_Op.325.ogg) |
| Piano Concerto No. 1 in B-flat minor: Allegro non troppo e molto maestoso | Pyotr Ilyich Tchaikovsky | Musopen | [File:Tchaikovsky, Concerto No.1 in B-flat minor Op.23, I. Allegro.ogg](https://commons.wikimedia.org/wiki/File:Tchaikovsky,_Concerto_No.1_in_B-flat_minor_Op.23,_I._Allegro.ogg) |
| Piano Concerto No. 2 in C minor: Adagio sostenuto | Sergei Rachmaninoff | Musopen | [File:Sergei Rachmaninoff - piano concerto no. 2 in c minor, op. 18 - ii. adagio sostenuto.ogg](https://commons.wikimedia.org/wiki/File:Sergei_Rachmaninoff_-_piano_concerto_no._2_in_c_minor,_op._18_-_ii._adagio_sostenuto.ogg) |
| Pictures at an Exhibition: The Great Gate of Kiev | Modest Mussorgsky | Musopen | [File:Modest Mussorgsky - pictures at an exhibition - x. la grande porte de kiev - allegro alla breve. maestoso. con grandezza.ogg](https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_pictures_at_an_exhibition_-_x._la_grande_porte_de_kiev_-_allegro_alla_breve._maestoso._con_grandezza.ogg) |
| In the Steppes of Central Asia | Alexander Borodin | Musopen Symphony Orchestra | [File:Alexander Borodin - In The Steppes Of Central Asia.ogg](https://commons.wikimedia.org/wiki/File:Alexander_Borodin_-_In_The_Steppes_Of_Central_Asia.ogg) |
| Danse macabre, Op. 40 | Camille Saint-Saëns | Leopold Stokowski and the Philadelphia Orchestra (Victor, 1925) | [File:PhiladelphiaSymphonyOrchestra-DanseMacabre.ogg](https://commons.wikimedia.org/wiki/File:PhiladelphiaSymphonyOrchestra-DanseMacabre.ogg) |
| Jesu, Joy of Man’s Desiring | Johann Sebastian Bach | Orchestra Gli Armonici (via Musopen) | [File:Bach, BWV 147, 10. Jesus bleibet meine Freude.ogg](https://commons.wikimedia.org/wiki/File:Bach,_BWV_147,_10._Jesus_bleibet_meine_Freude.ogg) |
| Orchestral Suite No. 2 in B minor: Badinerie | Johann Sebastian Bach | European Archive (via Musopen) | [File:Bach, Johann Sebastian - Suite No.2 in B Minor - X. Badinerie.ogg](https://commons.wikimedia.org/wiki/File:Bach,_Johann_Sebastian_-_Suite_No.2_in_B_Minor_-_X._Badinerie.ogg) |
| Harpsichord Suite No. 5 in E major: The Harmonious Blacksmith | George Frideric Handel | Musopen | [File:Handel - Suites for Harpsichord - No.5 in E major - The Harmonious Blacksmith.ogg](https://commons.wikimedia.org/wiki/File:Handel_-_Suites_for_Harpsichord_-_No.5_in_E_major_-_The_Harmonious_Blacksmith.ogg) |
| Mandolin Concerto in C major, RV 425 | Antonio Vivaldi | The Milan Baroque Soloists (via Musopen) | [File:Antonio Vivaldi, Mandolin Concerto in C major, RV 425.ogg](https://commons.wikimedia.org/wiki/File:Antonio_Vivaldi,_Mandolin_Concerto_in_C_major,_RV_425.ogg) |
| The Four Seasons, Spring: Allegro | Antonio Vivaldi | The Modena Chamber Orchestra (via Musopen) | [File:The Modena Chamber Orchestra - Vivaldi's Spring, RV 269 - I. Allegro.ogg](https://commons.wikimedia.org/wiki/File:The_Modena_Chamber_Orchestra_-_Vivaldi%27s_Spring,_RV_269_-_I._Allegro.ogg) |
| Oboe Concerto in D minor, Op. 9 No. 2: Adagio | Tomaso Albinoni | Musopen | [File:Albinoni, Concerto for Oboe and Strings No. 2 in D minor, Op. 9, II. Adagio.ogg](https://commons.wikimedia.org/wiki/File:Albinoni,_Concerto_for_Oboe_and_Strings_No._2_in_D_minor,_Op._9,_II._Adagio.ogg) |
| Eine kleine Nachtmusik, K. 525: Allegro | Wolfgang Amadeus Mozart | Musopen | [File:Mozart K525 Serenade in G Major 1 - Allegro.ogg](https://commons.wikimedia.org/wiki/File:Mozart_K525_Serenade_in_G_Major_1_-_Allegro.ogg) |
| The Magic Flute: Overture | Wolfgang Amadeus Mozart | Musopen | [File:Mozart - Magic Flute Overture.ogg](https://commons.wikimedia.org/wiki/File:Mozart_-_Magic_Flute_Overture.ogg) |
| Pathétique Sonata: Adagio cantabile | Ludwig van Beethoven | Musopen | [File:Beethoven, Sonata No. 8 in C Minor Pathetique, Op. 13 - II. Adagio cantabile.ogg](https://commons.wikimedia.org/wiki/File:Beethoven,_Sonata_No._8_in_C_Minor_Pathetique,_Op._13_-_II._Adagio_cantabile.ogg) |
| Symphony No. 5 in C minor: Allegro con brio | Ludwig van Beethoven | Musopen | [File:Ludwig van Beethoven - symphony no. 5 in c minor, op. 67 - i. allegro con brio.ogg](https://commons.wikimedia.org/wiki/File:Ludwig_van_Beethoven_-_symphony_no._5_in_c_minor,_op._67_-_i._allegro_con_brio.ogg) |
| Pastoral Symphony: Allegro ma non troppo | Ludwig van Beethoven | Musopen | [File:Ludwig van Beethoven - symphony no. 6 in f major 'pastoral', op. 68 - i. allegro non troppo.ogg](https://commons.wikimedia.org/wiki/File:Ludwig_van_Beethoven_-_symphony_no._6_in_f_major_%27pastoral%27,_op._68_-_i._allegro_non_troppo.ogg) |
| Waltz in C-sharp minor, Op. 64 No. 2 | Frédéric Chopin | Musopen | [File:Chopin-waltz-op-64-no-2-in-c-sharp-minor.oga](https://commons.wikimedia.org/wiki/File:Chopin-waltz-op-64-no-2-in-c-sharp-minor.oga) |
| Ballade No. 1 in G minor, Op. 23 | Frédéric Chopin | Musopen | [File:Frederic Chopin - ballade no. 1 in g minor, op. 23.ogg](https://commons.wikimedia.org/wiki/File:Frederic_Chopin_-_ballade_no._1_in_g_minor,_op._23.ogg) |
| A Midsummer Night's Dream: Wedding March | Felix Mendelssohn | European Archive (via Musopen) | [File:A Midsummer Night's Dream Op. 61 Wedding March (Mendelssohn) European Archive.ogg](https://commons.wikimedia.org/wiki/File:A_Midsummer_Night%27s_Dream_Op._61_Wedding_March_(Mendelssohn)_European_Archive.ogg) |
| Italian Symphony: Allegro vivace | Felix Mendelssohn | Musopen | [File:Felix Mendelssohn - symphony no. 4 in a major 'italian', op. 90 - i. allegro vivace.ogg](https://commons.wikimedia.org/wiki/File:Felix_Mendelssohn_-_symphony_no._4_in_a_major_%27italian%27,_op._90_-_i._allegro_vivace.ogg) |
| Piano Sonata in B-flat major, D. 960: Andante sostenuto | Franz Schubert | Musopen | [File:Franz Schubert - sonata in b flat, d. 960 - ii. andante sostenuto.ogg](https://commons.wikimedia.org/wiki/File:Franz_Schubert_-_sonata_in_b_flat,_d._960_-_ii._andante_sostenuto.ogg) |
| Intermezzo in A major, Op. 118 No. 2 | Johannes Brahms | Musopen | [File:Johannes Brahms - klavierstucke, op. 118 - ii. intermezzo.ogg](https://commons.wikimedia.org/wiki/File:Johannes_Brahms_-_klavierstucke,_op._118_-_ii._intermezzo.ogg) |
| Scenes from Childhood: Of Foreign Lands and Peoples | Robert Schumann | Musopen | [File:Robert Schumann - scenes from childhood, op. 15 - i. of foreign lands and peoples.ogg](https://commons.wikimedia.org/wiki/File:Robert_Schumann_-_scenes_from_childhood,_op._15_-_i._of_foreign_lands_and_peoples.ogg) |
| Roman Carnival Overture, Op. 9 | Hector Berlioz | Musopen | [File:Hector Berlioz - roman carnival overture, op. 9.ogg](https://commons.wikimedia.org/wiki/File:Hector_Berlioz_-_roman_carnival_overture,_op._9.ogg) |
| Carmen: Prelude to Act 1 | Georges Bizet | Musopen | [File:Carmen - Prelude to Act 1.ogg](https://commons.wikimedia.org/wiki/File:Carmen_-_Prelude_to_Act_1.ogg) |
| Piano Concerto in A minor: Allegro molto moderato | Edvard Grieg | Musopen | [File:Edvard Grieg - piano concerto in a minor, op. 16 - i. allegro molto moderato.ogg](https://commons.wikimedia.org/wiki/File:Edvard_Grieg_-_piano_concerto_in_a_minor,_op._16_-_i._allegro_molto_moderato.ogg) |
| 1812 Overture | Pyotr Ilyich Tchaikovsky | Skidmore College Orchestra (via Musopen) | [File:Pyotr Ilyich Tchaikovsky - 1812 overture.ogg](https://commons.wikimedia.org/wiki/File:Pyotr_Ilyich_Tchaikovsky_-_1812_overture.ogg) |
| Romeo and Juliet, Overture-Fantasy | Pyotr Ilyich Tchaikovsky | Skidmore College Orchestra (via Musopen) | [File:Pyotr Ilyich Tchaikovsky - romeo and juliet- overture-fantasy.ogg](https://commons.wikimedia.org/wiki/File:Pyotr_Ilyich_Tchaikovsky_-_romeo_and_juliet-_overture-fantasy.ogg) |
| The Blue Danube, Op. 314 | Johann Strauss II | European Archive (via Musopen) | [File:Strauss, An der schönen blauen Donau.ogg](https://commons.wikimedia.org/wiki/File:Strauss,_An_der_sch%C3%B6nen_blauen_Donau.ogg) |
| The Hebrides (Fingal’s Cave), Op. 26 | Felix Mendelssohn | Musopen Symphony Orchestra | [File:Mendelssohn - Hebrides Overture Fingal's Cave.ogg](https://commons.wikimedia.org/wiki/File:Mendelssohn_-_Hebrides_Overture_Fingal%27s_Cave.ogg) |
| Orpheus in the Underworld: Overture | Jacques Offenbach | Musopen (Carl Binder’s arrangement) | [File:Offenbach - Orpheus in the Underworld - Overture.ogg](https://commons.wikimedia.org/wiki/File:Offenbach_-_Orpheus_in_the_Underworld_-_Overture.ogg) |
| Il trovatore: Anvil Chorus | Giuseppe Verdi | Musopen | [File:Giuseppe Verdi - Anvil Chorus.ogg](https://commons.wikimedia.org/wiki/File:Giuseppe_Verdi_-_Anvil_Chorus.ogg) |
| La traviata: Libiamo ne’ lieti calici | Giuseppe Verdi | Musopen | [File:La Traviata - Act 1 - Libiamo ne' lieti calici.ogg](https://commons.wikimedia.org/wiki/File:La_Traviata_-_Act_1_-_Libiamo_ne%27_lieti_calici.ogg) |
| Lohengrin: Bridal Chorus | Richard Wagner | Musopen | [File:Richard Wagner - Treulich geführt.ogg](https://commons.wikimedia.org/wiki/File:Richard_Wagner_-_Treulich_gef%C3%BChrt.ogg) |
| Flight of the Bumblebee | Nikolai Rimsky-Korsakov | United States Army Band | [File:Rimsky-Korsakov - flight of the bumblebee.oga](https://commons.wikimedia.org/wiki/File:Rimsky-Korsakov_-_flight_of_the_bumblebee.oga) |
| Symphony No. 94 “Surprise”: Andante | Joseph Haydn | Serge Koussevitzky and the Boston Symphony Orchestra | [File:Haydn; Symphony No. 94 "Surprise", 2. Andante.ogg](https://commons.wikimedia.org/wiki/File:Haydn;_Symphony_No._94_%22Surprise%22,_2._Andante.ogg) |
| The Marriage of Figaro: Overture | Wolfgang Amadeus Mozart | Musopen | [File:Mozart, The Marriage of Figaro (overture).ogg](https://commons.wikimedia.org/wiki/File:Mozart,_The_Marriage_of_Figaro_(overture).ogg) |
| Grande valse brillante in E-flat major, Op. 18 | Frédéric Chopin | Olga Gurevich (via Musopen) | [File:Chopin - Grande valse brillante in E flat major, Op. 18.ogg](https://commons.wikimedia.org/wiki/File:Chopin_-_Grande_valse_brillante_in_E_flat_major,_Op._18.ogg) |
| Étude in C minor, Op. 25 No. 12 "Ocean" | Frédéric Chopin | Donald Betts (via Musopen) | [File:Frederic Chopin - etude no. 12 in c minor, op. 25.ogg](https://commons.wikimedia.org/wiki/File:Frederic_Chopin_-_etude_no._12_in_c_minor,_op._25.ogg) |
| The Four Seasons, Winter: Largo | Antonio Vivaldi | The Modena Chamber Orchestra (via Musopen) | [File:The Modena Chamber Orchestra - Vivaldi's Winter, RV 297 - II. Largo.ogg](https://commons.wikimedia.org/wiki/File:The_Modena_Chamber_Orchestra_-_Vivaldi%27s_Winter,_RV_297_-_II._Largo.ogg) |
| Hungarian Dance No. 1 in G minor | Johannes Brahms | Strolling Strings, United States Air Force Band | [File:Hungarian Dance No. 1 Brahms US Air Force Bands.ogg](https://commons.wikimedia.org/wiki/File:Hungarian_Dance_No._1_Brahms_US_Air_Force_Bands.ogg) |
| Academic Festival Overture, Op. 80 | Johannes Brahms | Musopen | [File:Johannes Brahms - academic festival overture, op. 80.ogg](https://commons.wikimedia.org/wiki/File:Johannes_Brahms_-_academic_festival_overture,_op._80.ogg) |
| Italian Concerto, BWV 971: First movement | Johann Sebastian Bach | Radek Materka (via Musopen) | [File:J. S. Bach - Italian Concerto, BWV. 971 - 1. Without tempo indication.ogg](https://commons.wikimedia.org/wiki/File:J._S._Bach_-_Italian_Concerto,_BWV._971_-_1._Without_tempo_indication.ogg) |
| Violin Partita No. 3 in E major: Preludio | Johann Sebastian Bach | Gordon Rowland, guitar (via Musopen) | [File:Johann Sebastian Bach - partita no. 3 in e major, bwv 1006 - 1. preludio.ogg](https://commons.wikimedia.org/wiki/File:Johann_Sebastian_Bach_-_partita_no._3_in_e_major,_bwv_1006_-_1._preludio.ogg) |
| Piano Concerto in A minor: Allegro affettuoso | Robert Schumann | Musopen | [File:Schumann - Piano Concerto in A minor Op.54 - I. Allegro.ogg](https://commons.wikimedia.org/wiki/File:Schumann_-_Piano_Concerto_in_A_minor_Op.54_-_I._Allegro.ogg) |
| Introduction and Rondo Capriccioso, Op. 28 | Camille Saint-Saëns | Skidmore College Orchestra (via Musopen) | [File:Camille Saint-Saens - introduction et rondo capriccioso, op. 28.ogg](https://commons.wikimedia.org/wiki/File:Camille_Saint-Saens_-_introduction_et_rondo_capriccioso,_op._28.ogg) |
| Der Freischütz: Overture | Carl Maria von Weber | Skidmore College Orchestra (via Musopen) | [File:Carl Maria von Weber - der freischutz, j. 277 - overture.ogg](https://commons.wikimedia.org/wiki/File:Carl_Maria_von_Weber_-_der_freischutz,_j._277_-_overture.ogg) |
| Asturias (Leyenda) | Isaac Albéniz | Musopen (guitar arrangement) | [File:Isaac Albeniz - suite espanola op. 47 - leyenda.ogg](https://commons.wikimedia.org/wiki/File:Isaac_Albeniz_-_suite_espanola_op._47_-_leyenda.ogg) |
| Carnival Overture, Op. 92 | Antonín Dvořák | United States Air Force Band (via Musopen), wind-band arrangement by Leigh Steiger | [File:Antonin Dvorak - carnival overture, op. 92.ogg](https://commons.wikimedia.org/wiki/File:Antonin_Dvorak_-_carnival_overture,_op._92.ogg) |
| Egmont Overture, Op. 84 | Ludwig van Beethoven | Musopen | [File:Beethoven EgmontOvertureOp.84 LudwigVanBeethoven-EgmontOvertureOp.84.ogg](https://commons.wikimedia.org/wiki/File:Beethoven_EgmontOvertureOp.84_LudwigVanBeethoven-EgmontOvertureOp.84.ogg) |
| Night on Bald Mountain | Modest Mussorgsky | Musopen | [File:Modest Mussorgsky - night on bald mountain.ogg](https://commons.wikimedia.org/wiki/File:Modest_Mussorgsky_-_night_on_bald_mountain.ogg) |
| William Tell Overture | Gioachino Rossini | United States Marine Band (transcription by Wenzel Sedlak) | [File:Gioachino Rossini, William Tell Overture (military band version, 2000).ogg](https://commons.wikimedia.org/wiki/File:Gioachino_Rossini,_William_Tell_Overture_(military_band_version,_2000).ogg) |
| Hungarian Rhapsody No. 2 | Franz Liszt | United States Navy Band (concert band arrangement) | [File:Hungarian Rhapsody No 2.ogg](https://commons.wikimedia.org/wiki/File:Hungarian_Rhapsody_No_2.ogg) |
| Te Deum: Prelude | Marc-Antoine Charpentier | Ian Dollins, organ (via Musopen) | [File:Charpentier, Te Deum (Prelude).ogg](https://commons.wikimedia.org/wiki/File:Charpentier,_Te_Deum_(Prelude).ogg) |
| Má vlast: Šárka | Bedřich Smetana | Musopen | [File:Bedrich Smetana - ma vlast - iii. sarka.ogg](https://commons.wikimedia.org/wiki/File:Bedrich_Smetana_-_ma_vlast_-_iii._sarka.ogg) |

`mockups/` holds the design concepts explored for the site: `concept-*.html` for the first version,
`facts-concept-*.html` for the facts and paintings (Concept 4, Spotlight, was built), and
`facts.md`, the fact sheet with sources, and `story.md`, the story sheet with cue times and sources.
