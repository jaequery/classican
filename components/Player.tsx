"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Track } from "@/lib/site";

const VOLUME_KEY = "classican:volume";

type Props = {
  tracks: Track[];
  onPlayingChange: (playing: boolean) => void;
  /** The piece now loaded, so the painting and facts can follow it. */
  onTrackChange: (index: number) => void;
};

/**
 * One continuous playlist. Pieces play in order and loop; a piece that fails
 * to load is skipped, and if every piece fails the player says so quietly.
 */
export function Player({ tracks, onPlayingChange, onTrackChange }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [status, setStatus] = useState("");

  const want = useRef(false); // the visitor's intent to hear music
  const switching = useRef(false); // a track change is under way; ignore the pause it causes
  const failures = useRef(0);
  const indexRef = useRef(0);

  const track = tracks[index];

  const setWant = useCallback(
    (on: boolean) => {
      want.current = on;
      setPlaying(on);
      onPlayingChange(on);
      if (!on) setLoading(false);
      if ("mediaSession" in navigator) navigator.mediaSession.playbackState = on ? "playing" : "paused";
    },
    [onPlayingChange],
  );

  const load = useCallback(
    (i: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const t = tracks[i];
      indexRef.current = i;
      setIndex(i);
      onTrackChange(i);
      setUnavailable(false);
      audio.src = audio.canPlayType("audio/mpeg") ? t.mp3 : t.ogg;
      if ("mediaSession" in navigator && "MediaMetadata" in window) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.composer, album: "classican" });
      }
    },
    [onTrackChange, tracks],
  );

  const start = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch((err: unknown) => {
      // Load failures arrive through the "error" event; only a refused play needs handling here.
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        switching.current = false;
        setWant(false);
      }
    });
  }, [setWant]);

  const go = useCallback(
    (i: number) => {
      const n = tracks.length;
      load(((i % n) + n) % n);
      if (want.current) {
        switching.current = true;
        start();
      }
    },
    [load, start, tracks.length],
  );

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || want.current) return;
    setWant(true);
    if (!audio.src || audio.error) load(indexRef.current);
    start();
  }, [load, setWant, start]);

  const pause = useCallback(() => {
    if (!want.current) return;
    setWant(false);
    audioRef.current?.pause();
  }, [setWant]);

  const toggle = useCallback(() => (want.current ? pause() : play()), [pause, play]);
  const next = useCallback(() => go(indexRef.current + 1), [go]);

  // Restore the visitor's volume from last time.
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(VOLUME_KEY));
      if (saved >= 0 && saved <= 100 && localStorage.getItem(VOLUME_KEY) !== null) setVolume(saved);
    } catch {
      // Storage can be blocked; the default volume is fine.
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume / 100;
    audio.muted = muted;
  }, [volume, muted]);

  useEffect(() => {
    load(0);
  }, [load]);

  // Audio events.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onWaiting = () => want.current && setLoading(true);
    const onPlaying = () => {
      failures.current = 0;
      switching.current = false;
      setLoading(false);
      const t = tracks[indexRef.current];
      setStatus(`Now playing ${t.title} by ${t.composer}.`);
    };
    const onError = () => {
      failures.current++;
      if (failures.current >= tracks.length) {
        failures.current = 0;
        switching.current = false;
        audio.pause();
        setWant(false);
        setUnavailable(true);
        setStatus("Music is unavailable right now. Press play to try again.");
        return;
      }
      go(indexRef.current + 1);
    };
    // Keep the controls honest when playback changes outside the page
    // (media keys, the OS player, headphones unplugged).
    const onPause = () => {
      if (switching.current || audio.ended || audio.error || !want.current) return;
      setWant(false);
    };
    const onPlay = () => !want.current && setWant(true);

    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("ended", next);
    audio.addEventListener("error", onError);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("ended", next);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [go, next, setWant, tracks]);

  // Hardware media keys and the OS "now playing" panel.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", play],
      ["pause", pause],
      ["nexttrack", next],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // Unsupported action in this browser.
      }
    }
  }, [next, pause, play]);

  // Space plays and pauses from anywhere that isn't already a control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== " " || e.repeat || e.defaultPrevented) return;
      if ((e.target as Element | null)?.closest?.("button, input, a, select, textarea")) return;
      e.preventDefault();
      toggle();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle]);

  const changeVolume = (v: number) => {
    setVolume(v);
    if (v > 0 && muted) setMuted(false);
    try {
      localStorage.setItem(VOLUME_KEY, String(v));
    } catch {
      // Not saved; it still applies for this visit.
    }
  };

  const silent = muted || volume === 0;

  return (
    <section className="player" aria-label="Music player">
      <p className="now">
        {unavailable ? (
          <span className="title">Music is unavailable right now.</span>
        ) : (
          <>
            <span className="title">{track.title}</span>
            <span className="composer">
              {track.composer}
              {loading ? " · Loading" : ""}
            </span>
          </>
        )}
      </p>

      <div className="controls">
        <button type="button" className="control play" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 4h3.5v12H5zM11.5 4H15v12h-3.5z" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M6 3.5v13L16.5 10z" />
            </svg>
          )}
        </button>
        <button type="button" className="control" onClick={next} aria-label="Next piece">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M14 4h2v12h-2zM4 4v12l8.5-6z" />
          </svg>
        </button>

        <div className="volume">
          <button
            type="button"
            className="control"
            onClick={() => (volume === 0 ? changeVolume(60) : setMuted((m) => !m))}
            aria-label={silent ? "Unmute" : "Mute"}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 7.5h3.5L11 4v12l-4.5-3.5H3z" />
              {silent ? (
                <path d="M13.3 7.3l1.1-1.1 1.8 1.8 1.8-1.8 1.1 1.1-1.8 1.8 1.8 1.8-1.1 1.1-1.8-1.8-1.8 1.8-1.1-1.1 1.8-1.8z" />
              ) : (
                <path d="M13.2 6.6a4.8 4.8 0 0 1 0 6.8l-1.1-1.1a3.2 3.2 0 0 0 0-4.6zM15.3 4.5a7.8 7.8 0 0 1 0 11l-1.1-1.1a6.2 6.2 0 0 0 0-8.8z" />
              )}
            </svg>
          </button>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={muted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            aria-label="Volume"
            aria-valuetext={`${muted ? 0 : volume}%`}
          />
        </div>
      </div>

      <p className="visually-hidden" role="status">
        {status}
      </p>
      <audio ref={audioRef} preload="none" />
    </section>
  );
}
