"use client";

import { useState } from "react";
import type { Site } from "@/lib/site";
import { Player } from "./Player";
import { Scene } from "./Scene";
import { WallLabel } from "./WallLabel";

/** The painting and its wall label follow the piece the player has loaded; its facts only rotate while music plays. */
export function Studio({ site }: { site: Site }) {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const track = site.tracks[index];
  return (
    <>
      <Scene playing={playing} painting={track.painting} facts={track.facts} factSeconds={site.factSeconds} />
      <WallLabel track={track} composer={site.composers[track.composer]} />
      <Player tracks={site.tracks} onPlayingChange={setPlaying} onTrackChange={setIndex} />
    </>
  );
}
