# classican

A single, quiet page for studying or working: one play/pause button, a continuous
classical playlist, and a slow pixel-art night skyline over water. Visitors can't pick
pieces. The page shows the current title and composer, and nothing else.

## Run

It's a static site with no dependencies or build step. Serve the folder with any static server:

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Browsers block autoplay, so music starts when the visitor presses play. Tracks play in order
and loop. A track that fails to load is skipped. If every track fails, the page says so
quietly, and pressing play tries again. The scene holds still under `prefers-reduced-motion`.

## Files

- `index.html`: markup
- `style.css`: styles
- `app.js`: canvas scene and player
- `tracks.js`: the playlist
- `mockups/`: the five design concepts explored before building (Concept 3, "Night Window", was chosen)

## Audio sources

Every recording is streamed from Wikimedia Commons and marked **public domain** on its file page.
The page uses Commons' MP3 transcode where the browser supports MP3, and the original Ogg otherwise.

| Piece | Composer | Performer / source | Commons file |
| --- | --- | --- | --- |
| Gymnopédie No. 1 | Erik Satie | Robin Alciatore (via Musopen) | [File:Erik Satie - gymnopedies - la 1 ere. lent et douloureux.ogg](https://commons.wikimedia.org/wiki/File:Erik_Satie_-_gymnopedies_-_la_1_ere._lent_et_douloureux.ogg) |
| Clair de lune | Claude Debussy | Laurens Goedhart | [File:Clair de lune (Claude Debussy) Suite bergamasque.ogg](https://commons.wikimedia.org/wiki/File:Clair_de_lune_(Claude_Debussy)_Suite_bergamasque.ogg) |
| Goldberg Variations: Aria | Johann Sebastian Bach | Kimiko Ishizaka (Open Goldberg Variations) | [File:Goldberg Variations 01 Aria.ogg](https://commons.wikimedia.org/wiki/File:Goldberg_Variations_01_Aria.ogg) |
| Gnossienne No. 1 | Erik Satie | La Pianista | [File:Satie - Gnossienne 1.ogg](https://commons.wikimedia.org/wiki/File:Satie_-_Gnossienne_1.ogg) |
| Nocturne in E-flat major, Op. 9 No. 2 | Frédéric Chopin | Al Goldstein collection, Pandora Music repository at ibiblio.org | [File:Frederic Chopin - Nocturne Eb major Opus 9, number 2.ogg](https://commons.wikimedia.org/wiki/File:Frederic_Chopin_-_Nocturne_Eb_major_Opus_9,_number_2.ogg) |

To add a piece, append an entry to `tracks.js` with its `title`, `composer`, `ogg` and `mp3` URLs.
Use only recordings whose license allows it.
