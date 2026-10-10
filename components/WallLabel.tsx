"use client";

import { useEffect, useId, useRef } from "react";
import { ageAtWriting, pieceId, type Composer, type Track } from "@/lib/site";

type Props = {
  id: string;
  open: boolean;
  onClose: () => void;
  track: Track;
  composer: Composer;
};

/**
 * The gallery wall label, kept in a side panel the player's details button opens: who wrote the piece,
 * when, where and for what, how it was received, a short biography and who made the recording.
 */
export function WallLabel({ id, open, onClose, track, composer }: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const headingId = useId();
  const { details } = track;
  const trackId = pieceId(track);

  // Begin each new piece at its heading without closing the listener's details.
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [trackId, open]);

  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("dialog[open]") && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Closing from inside the panel returns focus to the visible details button.
      const active = document.activeElement;
      if (active === document.body || !active || panelRef.current?.contains(active)) {
        const toggles = document.querySelectorAll<HTMLElement>(`[aria-controls="${CSS.escape(id)}"]`);
        [...toggles].find((t) => t.offsetParent !== null)?.focus();
      }
    };
  }, [id, open, onClose]);

  return (
    <aside ref={panelRef} id={id} className="drawer wall" aria-labelledby={headingId} hidden={!open}>
      <header className="drawer-head">
        <h2 id={headingId}>About this piece</h2>
        <button ref={closeButton} type="button" className="control" onClick={onClose} aria-label="Close details">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5.4 4.3 10 8.9l4.6-4.6 1.1 1.1-4.6 4.6 4.6 4.6-1.1 1.1-4.6-4.6-4.6 4.6-1.1-1.1 4.6-4.6-4.6-4.6z" />
          </svg>
        </button>
      </header>
      <div ref={bodyRef} className="drawer-body">
        <p className="wall-who">
          {track.composer}
          <span>
            {composer.origin}, {composer.born}–{composer.died}
          </span>
        </p>
        <p className="wall-what">{track.title}</p>
        <p className="wall-meta">{details.year}</p>
        <p className="wall-meta">
          {details.instruments} · {details.place}
        </p>
        <div className="wall-more">
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
    </aside>
  );
}
