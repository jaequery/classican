"use client";

import { useState } from "react";
import type { Site } from "@/lib/site";
import { Player } from "./Player";
import { Scene } from "./Scene";

/** The paintings and the player share one piece of state: whether music is playing. */
export function Studio({ site }: { site: Site }) {
  const [playing, setPlaying] = useState(false);
  return (
    <>
      <Scene playing={playing} paintingSeconds={site.paintingSeconds} />
      <Player tracks={site.tracks} onPlayingChange={setPlaying} />
    </>
  );
}
