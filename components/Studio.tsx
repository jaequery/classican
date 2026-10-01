"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Site, Track } from "@/lib/site";
import { borrowedPainting, deleteSong, listSongs, saveSong, type OwnSong, type Playable } from "@/lib/library";
import type { PaintingId } from "@/lib/paintings";
import { AddSong } from "./AddSong";
import { Player } from "./Player";
import { Scene } from "./Scene";
import { OwnLabel, WallLabel } from "./WallLabel";

/** A song the visitor added, ready to play from its object URL. */
type OwnPiece = Playable & { id: string; artist: string; painting: PaintingId };

const NO_FACTS: Track["facts"] = [];

function toPiece(song: OwnSong): OwnPiece {
  const url = URL.createObjectURL(song.file);
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    composer: song.artist || "Your song",
    ogg: url,
    mp3: url,
    painting: borrowedPainting(song.id),
  };
}

/** The painting and its wall label follow the piece the player has loaded; its facts only rotate while music plays. */
export function Studio({ site }: { site: Site }) {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [own, setOwn] = useState<OwnPiece[]>([]);
  const ownRef = useRef(own);
  ownRef.current = own;

  // The visitor's saved songs. Storage can be blocked; then there are none to restore.
  useEffect(() => {
    let live = true;
    listSongs()
      .then((songs) => live && setOwn(songs.map(toPiece)))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => () => ownRef.current.forEach((p) => URL.revokeObjectURL(p.ogg)), []);

  const tracks = useMemo<(Track | OwnPiece)[]>(() => [...site.tracks, ...own], [site.tracks, own]);
  const track = tracks[index] ?? tracks[0];

  const add = useCallback(async (file: File, title: string, artist: string) => {
    const song: OwnSong = { id: crypto.randomUUID(), title, artist, file, added: Date.now() };
    let note: string | undefined;
    try {
      await saveSong(song);
    } catch {
      note = `Added ${title} for this visit only: this browser would not save it.`;
    }
    setOwn((list) => [...list, toPiece(song)]);
    return note;
  }, []);

  const remove = useCallback((id: string) => {
    const gone = ownRef.current.find((p) => p.id === id);
    if (!gone) return;
    setOwn((list) => list.filter((p) => p.id !== id));
    URL.revokeObjectURL(gone.ogg);
    deleteSong(id).catch(() => {});
  }, []);

  return (
    <>
      <Scene
        playing={playing}
        painting={track.painting}
        facts={"facts" in track ? track.facts : NO_FACTS}
        factSeconds={site.factSeconds}
      />
      {"details" in track ? (
        <WallLabel track={track} composer={site.composers[track.composer]} />
      ) : (
        <OwnLabel title={track.title} artist={track.artist} />
      )}
      <Player tracks={tracks} onPlayingChange={setPlaying} onTrackChange={setIndex}>
        <AddSong songs={own} onAdd={add} onRemove={remove} />
      </Player>
    </>
  );
}
