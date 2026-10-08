"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ageAtWriting, pieceId, type Composer, type Track } from "@/lib/site";

/**
 * A gallery wall label beside the painting: who wrote the piece, when, where
 * and for what. "Piece & recording details" opens how it was received, a short
 * biography and who made the recording.
 */
export function WallLabel({ track, composer }: { track: Track; composer: Composer }) {
  const [open, setOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const moreId = useId();
  const { details } = track;
  const trackId = pieceId(track);

  // Begin each new piece at its heading without closing the listener's details.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [trackId]);

  return (
    <aside
      className="wall"
      aria-label="About this piece"
      onKeyDownCapture={(e) => {
        if (e.key !== "Escape" || !open) return;
        e.preventDefault();
        // Dismiss these details without also closing an open comments panel.
        e.stopPropagation();
        toggleRef.current?.focus();
        setOpen(false);
      }}
    >
      <div ref={bodyRef} className="wall-body">
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
            <p>
              <span className="wall-key">The recording</span>
              {track.performer}, in the public domain.{" "}
              <a href={track.source} target="_blank" rel="noreferrer">
                Source on Wikimedia Commons
              </a>
            </p>
          </div>
        </div>
      </div>
      <button ref={toggleRef} type="button" className="wall-toggle" aria-expanded={open} aria-controls={moreId} onClick={() => setOpen((o) => !o)}>
        {open ? "Hide details" : "Piece & recording details"}
      </button>
    </aside>
  );
}
