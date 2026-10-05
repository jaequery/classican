# Story sheet

The story each piece tells, beat by beat, as shown on classican while the music plays. Each beat
has a cue time in its recording, the scene the painting turns to, and the source for what the music
depicts. Only a composer's own programme, and section titles printed in the score, are told as story.
Cue times were found from the recording's loudness and brightness over time (decoded with `ffmpeg`,
in 5-second windows) and checked against the order of sections in the score. They are close, not
exact to the bar.

## Má vlast: Vltava (The Moldau) · Bedřich Smetana

Recording: Musopen, 14:50. Smetana's programme, printed in the score, follows the river from its two
springs, one warm and one cold, past a forest hunt, a peasant wedding, nymphs dancing by moonlight,
castles and ruins, through the St John's Rapids, then wide toward Prague and past Vyšehrad until it
vanishes into the distance. The score marks the sections: *Die Quellen der Moldau*, *Waldjagd*,
*Bauernhochzeit*, *Mondschein, Nymphenreigen*, *St. Johann-Stromschnellen*, *Die Moldau im breiten
Strom*, *Vyšehrad-Motiv*.

| Cue | Beat | Scene | What in the recording marks it |
| --- | --- | --- | --- |
| 0:00 | The two springs, warm and cold: flutes, then clarinets | `moldau` | Quiet high woodwinds from the start |
| 1:10 | The streams join; the violins sing the river tune | `moldau` | Loudness jumps about 6 dB as the strings enter |
| 3:20 | Forest hunt: horn calls | `moldau-hunt` | Loud, bass-heavy brass |
| 4:40 | Peasant wedding: a polka | `moldau-wedding` | After the hunt dies away (4:15–4:35), a lighter dance |
| 6:10 | Moonlight, the nymphs' round dance; castles and ruins | `moldau-nymphs` | Near silence at 6:00–6:05, then soft, bright flutes over hushed strings |
| 8:45 | The river tune returns | `moldau` | A long crescendo out of the night music |
| 9:40 | St John's Rapids | `moldau-rapids` | Sudden bright, loud turbulence |
| 12:15 | The river wide, its tune in the major | `moldau-vysehrad` | The pause at 12:10, then fortissimo |
| 13:15 | The Vyšehrad motif in the brass | `moldau-vysehrad` | Estimated from the score's proportions |
| 14:15 | The river flows out of sight; two last chords | `moldau-vysehrad` | Diminuendo from 14:10, final chords at 14:45 |

Sources: [Vltava (Wikipedia)](https://en.wikipedia.org/wiki/Vltava_(Sm%C4%9Btana)),
[Má vlast (Wikipedia)](https://en.wikipedia.org/wiki/M%C3%A1_vlast),
and Smetana's preface to the published score, quoted in both.
