"use client";

import { useId, useState } from "react";
import { ageAtWriting, type Composer, type Track } from "@/lib/site";

/**
 * A gallery wall label beside the painting: who wrote the piece, when, where
 * and for what. "More" opens how it was received and a short biography.
 */
export function WallLabel({ track, composer }: { track: Track; composer: Composer }) {
  const [open, setOpen] = useState(false);
  const moreId = useId();
  const { details } = track;
  return (
    <aside className="wall" aria-label="About this piece">
      <p className="wall-who">
        {track.composer}
        <span>
          {composer.origin}, {composer.born}–{composer.died}
        </span>
      </p>
      <p className="wall-what">
        {track.title}, <span>{details.year}</span>
      </p>
      <p className="wall-meta">
        {details.instruments} · {details.place}
      </p>
      <div id={moreId} className={open ? "wall-more open" : "wall-more"} inert={!open}>
        <div>
          <p>
            <span className="wall-key">In its day</span>
            {details.reception}
          </p>
          <p>
            <span className="wall-key">The composer</span>
            Aged {ageAtWriting(details, composer)} when writing it, and born in {composer.birthplace}. {composer.money}{" "}
            {composer.also}
          </p>
        </div>
      </div>
      <button type="button" className="wall-toggle" aria-expanded={open} aria-controls={moreId} onClick={() => setOpen((o) => !o)}>
        {open ? "Less" : "More"}
      </button>
    </aside>
  );
}

/** The label beside a song the visitor added: just what they told us about it. */
export function OwnLabel({ title, artist }: { title: string; artist: string }) {
  return (
    <aside className="wall" aria-label="About this piece">
      <p className="wall-who">
        {artist || "Your song"}
        <span>Added by you</span>
      </p>
      <p className="wall-what">{title}</p>
      <p className="wall-meta wall-last">Kept in this browser, for you alone.</p>
    </aside>
  );
}
