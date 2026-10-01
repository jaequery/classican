# classican

One screen of public-domain classical music for studying and deep work. The only interface is a
small player at bottom centre: play/pause, next and volume. Behind it is an original pixel
painting of the piece that is playing: Greek dancers for Satie's Gymnopédie, Verlaine's moonlit park
for Clair de lune, Bach's two-keyboard harpsichord, and so on. While music plays, a short fact about
the piece's history comes every 40 seconds or so: the painting dims gently around the thing the fact
is about, and the words sit beside that pool of light for a few seconds before the light returns.
No accounts, no search, no other pages.

## Run

Needs Node.js 20.9 or newer.

```sh
npm install
npm run dev        # http://localhost:3000
# or, for production:
npm run build && npm start
```

Browsers block autoplay, so music starts when the visitor presses play. Pieces play in order and
loop. A piece that fails to load is skipped; if every piece fails, the player says so and pressing
play tries again. Space plays and pauses from anywhere on the page; media keys and the OS
"now playing" panel work too.

## Stack

- Next.js (App Router), React Server Components, TypeScript, plain CSS custom properties
- `app/page.tsx` is a server component; the player and the painting canvas are the only client code
- Inter Regular is self-hosted from `app/fonts/` (SIL Open Font License, `app/fonts/Inter-OFL.txt`),
  falling back to Arial, Helvetica, sans-serif
- No remote images, fonts or icons. The paintings are drawn in code and the icons are inline SVG

## Changing things

| What | Where |
| --- | --- |
| Name, tagline, description | `lib/site.ts` (`name`, `tagline`, `description`) |
| Playlist | `lib/site.ts` (`tracks`) |
| Facts about each piece | `lib/site.ts` (`facts` on each track) |
| Time from one fact to the next | `lib/site.ts` (`factSeconds`) |
| Paintings | `lib/paintings.ts` |
| Palette of the frame | `app/globals.css` (`:root`) |

**Adding a piece.** Append an entry to `tracks` with `title`, `composer`, `performer`, the Commons
file page as `source`, the `ogg` and `mp3` URLs, the id of its `painting`, and its `facts`. Use only
recordings whose licence allows it.

**Facts.** Each fact is a sentence or two a beginner can enjoy, and only something a source
confirms. Word legends as stories. Give a fact a `motif` (a name from its painting's `motifs`) and
the light gathers there while it shows; without one it sits in the top-left corner. Record the
source for each fact in `mockups/facts.md`.

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

Every recording is streamed from Wikimedia Commons and marked **public domain** on its file page.
The player uses Commons' MP3 transcode where the browser supports MP3, and the original Ogg otherwise.

| Piece | Composer | Performer / source | Commons file |
| --- | --- | --- | --- |
| Gymnopédie No. 1 | Erik Satie | Robin Alciatore (via Musopen) | [File:Erik Satie - gymnopedies - la 1 ere. lent et douloureux.ogg](https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg) |
| Clair de lune | Claude Debussy | Laurens Goedhart | [File:Clair de lune (Claude Debussy) Suite bergamasque.ogg](https://commons.wikimedia.org/wiki/File:Clair_de_lune_(Claude_Debussy)_Suite_bergamasque.ogg) |
| Goldberg Variations: Aria | Johann Sebastian Bach | Kimiko Ishizaka (Open Goldberg Variations) | [File:Goldberg Variations 01 Aria.ogg](https://commons.wikimedia.org/wiki/File:Goldberg_Variations_01_Aria.ogg) |
| Gnossienne No. 1 | Erik Satie | La Pianista | [File:Satie - Gnossienne 1.ogg](https://commons.wikimedia.org/wiki/File:Satie_-_Gnossienne_1.ogg) |
| Nocturne in E-flat major, Op. 9 No. 2 | Frédéric Chopin | Al Goldstein collection, Pandora Music repository at ibiblio.org | [File:Frederic Chopin - Nocturne Eb major Opus 9, number 2.ogg](https://commons.wikimedia.org/wiki/File:Frederic_Chopin_-_Nocturne_Eb_major_Opus_9,_number_2.ogg) |

`mockups/` holds the design concepts explored for the site: `concept-*.html` for the first version,
`facts-concept-*.html` for the facts and paintings (Concept 4, Spotlight, was built), and
`facts.md`, the fact sheet with sources.
