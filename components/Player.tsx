"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createDeck, type Deck } from "@/lib/shuffle";
import { pieceId, type Track } from "@/lib/site";
import { speakingTime, useHost } from "./useHost";

const VOLUME_KEY = "classican:volume";
const MUTED_KEY = "classican:muted";
const HOST_KEY = "classican:host:v1";
const VOLUME_STEP = 5;
/** The music's level while the host speaks: the intro over the opening, the outro over the last bars. */
const DUCK = { intro: 0.3, outro: 0.45 };
/** Seconds before the end to fetch the outro, so it is ready when its moment comes. */
const OUTRO_PREFETCH = 90;
/** The outro ends this many seconds before the last note. */
const OUTRO_MARGIN = 2;

function formatTime(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}

type Props = {
  tracks: Track[];
  /** The piece now loaded; the parent keeps it so the painting and facts can follow it. */
  index: number;
  onPlayingChange: (playing: boolean) => void;
  onTrackChange: (index: number) => void;
  /** More buttons for the piece, after next. */
  actions?: ReactNode;
  /** Kept at the seconds played into the loaded piece, so the painting can follow its story. */
  clock: RefObject<number>;
};

/**
 * One continuous playlist, shuffled: it opens on a random piece, tries to play
 * straight away, and deals the rest from a shuffled deck, so every piece plays
 * once before any repeats; then the deck is reshuffled. A piece that fails
 * to load is skipped, and if every piece fails the player says so quietly.
 */
export function Player({ tracks, index, onPlayingChange, onTrackChange, actions, clock }: Props) {
  const playerRef = useRef<HTMLElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [hasPrevious, setHasPrevious] = useState(false);
  const [status, setStatus] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);
  const [duck, setDuck] = useState(1);
  const [hostEnabled, setHostEnabled] = useState(true);
  const hostEnabledRef = useRef(true); // event handlers and pending requests need the latest choice
  // What the host is saying, or why the host is off air.
  const [onAir, setOnAir] = useState<{ text: string; off?: boolean } | null>(null);

  const want = useRef(false); // the visitor's intent to hear music
  const switching = useRef(false); // a track change is under way; ignore the pause it causes
  const failures = useRef(0);
  const indexRef = useRef(0);
  const history = useRef<number[]>([]); // pieces played before this one, for "previous"
  const deck = useRef<Deck>(null); // pieces still to come this time through the list
  const blocked = useRef(false); // the browser refused to autoplay; the first gesture starts the music
  const host = useHost();
  const lines = useRef(new Map<string, Promise<string | null>>()); // the host's words, by request
  const offAirShown = useRef(new Set<string>()); // each reason the host is off air is shown once a visit
  const speech = useRef(0); // the host's current segment, so a finished old one leaves the music alone
  const talking = useRef(false); // the host is speaking now
  // Some browsers (Safari, iOS) pause the music to let speech through; it resumes when the host is done.
  const heldForHost = useRef(false);
  const sound = useRef({ volume: 80, silent: false }); // for speech started from event handlers
  const introSaid = useRef(false); // the loaded piece has had its intro (or was introduced by an outro)
  const outro = useRef<{ next: number; text: string | null; started: boolean } | null>(null);
  const announced = useRef<number | null>(null); // the piece the last outro introduced

  const track = tracks[index];

  // Comments leave room for the player as titles wrap or the keyboard guide opens.
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const root = document.documentElement;
    const observer = new ResizeObserver(() => {
      root.style.setProperty("--player-height", `${player.getBoundingClientRect().height}px`);
    });
    observer.observe(player);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--player-height");
    };
  }, []);

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

  /** The host's words for a piece (and the one after it, for an outro), fetched once. Null if the host has none. */
  const line = useCallback(
    (kind: "intro" | "outro", i: number, next?: number) => {
      if (!hostEnabledRef.current) return Promise.resolve(null);
      const segment = speech.current;
      const params = new URLSearchParams({ kind, piece: pieceId(tracks[i]) });
      if (next !== undefined) params.set("next", pieceId(tracks[next]));
      const key = params.toString();
      let words = lines.current.get(key);
      if (!words) {
        words = fetch(`/api/commentary?${key}`)
          .then(async (res) => {
            const body = (await res.json().catch(() => null)) as { text?: string; error?: string } | null;
            if (res.ok && body?.text) return body.text;
            throw new Error(body?.error ?? `The host is unavailable (${res.status}).`);
          })
          .catch((err: unknown) => {
            lines.current.delete(key); // try again next time this piece comes round
            const reason = err instanceof Error && err.message !== "Failed to fetch" ? err.message : "The host could not be reached.";
            if (hostEnabledRef.current && segment === speech.current && !offAirShown.current.has(reason)) {
              offAirShown.current.add(reason);
              console.warn(`classican host: ${reason}`);
              setOnAir({ text: reason, off: true });
              window.setTimeout(() => setOnAir((now) => (now?.text === reason ? null : now)), 10_000);
            }
            return null;
          });
        lines.current.set(key, words);
      }
      return words;
    },
    [tracks],
  );

  /** Resume music the host's speech pushed aside, if the listener still wants it. */
  const release = useCallback(() => {
    if (!heldForHost.current) return;
    heldForHost.current = false;
    if (want.current) audioRef.current?.play().catch(() => {});
  }, []);

  const quiet = useCallback(() => {
    speech.current++;
    talking.current = false;
    host.stop();
    release();
    setDuck(1);
    setOnAir((now) => (now?.off ? now : null));
  }, [host, release]);

  const toggleHost = () => {
    const enabled = !hostEnabledRef.current;
    hostEnabledRef.current = enabled;
    setHostEnabled(enabled);
    // Invalidate pending introductions and outros as well as any speech in progress.
    quiet();
    setOnAir(null);
    outro.current = null;
    announced.current = null;
    if (enabled) host.unlock();
    try {
      localStorage.setItem(HOST_KEY, String(enabled));
    } catch {
      // Not saved; it still applies for this visit.
    }
  };

  const say = useCallback(
    (text: string, level: number) => {
      if (!hostEnabledRef.current || sound.current.silent) return;
      const id = ++speech.current;
      talking.current = true;
      setDuck(level);
      setOnAir({ text });
      host.speak(text, sound.current.volume / 100).then(() => {
        if (id !== speech.current) return;
        talking.current = false;
        setDuck(1);
        setOnAir((now) => (now?.off ? now : null));
        release();
      });
    },
    [host, release],
  );

  const load = useCallback(
    (i: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const t = tracks[i];
      // An outro carrying on into the piece it announced keeps talking; anything else stops the host.
      const introduced = announced.current === i;
      announced.current = null;
      if (!introduced) quiet();
      introSaid.current = introduced;
      outro.current = null;
      if (!introduced) line("intro", i);
      indexRef.current = i;
      clock.current = 0;
      setElapsed(0);
      setDuration(null);
      onTrackChange(i);
      setUnavailable(false);
      audio.src = audio.canPlayType("audio/mpeg") ? t.mp3 : t.ogg;
      // The tab names the piece, so a listener in another tab can see what is on.
      document.title = `${t.title} · ${t.composer} · classican`;
      if ("mediaSession" in navigator && "MediaMetadata" in window) {
        navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.composer, album: "classican" });
      }
    },
    [clock, line, onTrackChange, quiet, tracks],
  );

  const start = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().catch((err: unknown) => {
      // Load failures arrive through the "error" event; only a refused play needs handling here.
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        blocked.current = true;
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
    if (hostEnabledRef.current) host.unlock();
    setWant(true);
    if (!audio.src || audio.error) load(indexRef.current);
    start();
  }, [host, load, setWant, start]);

  const pause = useCallback(() => {
    if (!want.current) return;
    setWant(false);
    quiet();
    audioRef.current?.pause();
  }, [quiet, setWant]);

  const toggle = useCallback(() => (want.current ? pause() : play()), [pause, play]);
  const seek = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration) || audio.duration <= 0) return;
    const position = Math.max(0, Math.min(seconds, audio.duration));
    audio.currentTime = position;
    clock.current = position;
    setElapsed(Math.floor(position));
  };

  const next = useCallback(() => {
    history.current.push(indexRef.current);
    setHasPrevious(true);
    go(deck.current!.draw(indexRef.current));
  }, [go]);
  const prev = useCallback(() => {
    const before = history.current.pop();
    if (before === undefined) return;
    setHasPrevious(history.current.length > 0);
    // Stepping back keeps the piece we left at the top of the deck, so "next" returns to it.
    deck.current!.putBack(indexRef.current);
    go(before);
  }, [go]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = (volume / 100) * duck;
    audio.muted = muted;
    sound.current = { volume, silent: muted || volume === 0 };
    if (muted || volume === 0) quiet();
  }, [volume, muted, duck, quiet]);

  // Open on a random piece and try to play it at once. Browsers often refuse
  // until the visitor has interacted with the page; then the first click or
  // key starts it, except when opening the keyboard guide. Listening on window
  // runs after the play button and the Space hotkey, so a gesture that already
  // started the music is left alone.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Apply saved sound settings before attempting playback, without waiting
    // for the state updates to render. A muted visit must start muted too.
    try {
      hostEnabledRef.current = localStorage.getItem(HOST_KEY) !== "false";
      setHostEnabled(hostEnabledRef.current);
      const saved = localStorage.getItem(VOLUME_KEY);
      if (saved !== null && Number(saved) >= 0 && Number(saved) <= 100) {
        setVolume(Number(saved));
        audio.volume = Number(saved) / 100;
      }
      const savedMuted = localStorage.getItem(MUTED_KEY) === "true";
      setMuted(savedMuted);
      audio.muted = savedMuted;
    } catch {
      // Storage can be blocked; keep this visit's default sound settings.
    }
    const first = Math.floor(Math.random() * tracks.length);
    deck.current = createDeck(tracks.length, first);
    load(first);
    play();
    const onGesture = (e: Event) => {
      if (e.target instanceof Element && e.target.closest(".player-shortcuts, .host-toggle")) return;
      // Dismissing a control hint should not start the music.
      if (e instanceof KeyboardEvent && e.key === "Escape") return;
      if (blocked.current && !want.current) play();
    };
    window.addEventListener("click", onGesture);
    window.addEventListener("keydown", onGesture);
    return () => {
      window.removeEventListener("click", onGesture);
      window.removeEventListener("keydown", onGesture);
    };
    // Once, on mount.
  }, []);

  // Audio events.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onWaiting = () => want.current && setLoading(true);
    const onPlaying = () => {
      setHasPlayed(true);
      blocked.current = false;
      failures.current = 0;
      switching.current = false;
      setLoading(false);
      const i = indexRef.current;
      const t = tracks[i];
      setStatus(`Now playing ${t.title} by ${t.composer}.`);
      // The host introduces the piece as it begins, unless the last outro already did.
      if (hostEnabledRef.current && !introSaid.current) {
        introSaid.current = true;
        const segment = speech.current;
        line("intro", i).then((text) => {
          if (text && segment === speech.current && i === indexRef.current && want.current && !outro.current?.started && audio.currentTime < 30) {
            say(text, DUCK.intro);
          }
        });
      }
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
      go(deck.current!.draw(indexRef.current));
    };
    // Keep the controls honest when playback changes outside the page
    // (media keys, the OS player, headphones unplugged).
    const onPause = () => {
      if (switching.current || audio.ended || audio.error || !want.current) return;
      // The browser made room for the host's voice; the listener still wants the music.
      if (talking.current) {
        heldForHost.current = true;
        return;
      }
      setWant(false);
    };
    const onPlay = () => !want.current && setWant(true);
    const onTime = () => {
      clock.current = audio.currentTime;
      setElapsed(Math.floor(audio.currentTime));
      // Near the end, the host back-announces the piece and introduces the one the deck will deal next.
      const left = audio.duration - audio.currentTime;
      if (!hostEnabledRef.current || !Number.isFinite(left) || audio.paused || left > OUTRO_PREFETCH) return;
      const i = indexRef.current;
      if (!outro.current) {
        const next = deck.current!.peek(i);
        const pending = { next, text: null as string | null, started: false };
        outro.current = pending;
        line("outro", i, next).then((text) => (pending.text = text));
        return;
      }
      const o = outro.current;
      if (o.started || !o.text || left > speakingTime(o.text) + OUTRO_MARGIN || left < 3) return;
      o.started = true;
      // The deck could have changed (previous puts a piece back), so only announce what it will really deal.
      if (deck.current!.peek(i) !== o.next) return;
      announced.current = o.next;
      say(o.text, DUCK.outro);
    };
    const onDuration = () => {
      setDuration(Number.isFinite(audio.duration) && audio.duration > 0 ? Math.floor(audio.duration) : null);
    };

    // Metadata may already be ready when these listeners attach.
    onTime();
    onDuration();

    audio.addEventListener("waiting", onWaiting);
    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("ended", next);
    audio.addEventListener("error", onError);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("durationchange", onDuration);
    return () => {
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("waiting", onWaiting);
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("ended", next);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [clock, go, line, next, say, setWant, tracks]);

  // Hardware media keys and the OS "now playing" panel.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", play],
      ["pause", pause],
      ["nexttrack", next],
      ["previoustrack", prev],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // Unsupported action in this browser.
      }
    }
  }, [next, pause, play, prev]);

  const changeMute = useCallback((value: boolean) => {
    setMuted(value);
    try {
      localStorage.setItem(MUTED_KEY, String(value));
    } catch {
      // Not saved; it still applies for this visit.
    }
  }, []);

  const changeVolume = useCallback(
    (v: number) => {
      setVolume(v);
      if (v > 0 && muted) changeMute(false);
      try {
        localStorage.setItem(VOLUME_KEY, String(v));
      } catch {
        // Not saved; it still applies for this visit.
      }
    },
    [changeMute, muted],
  );

  const toggleMute = useCallback(
    () => (volume === 0 ? changeVolume(60) : changeMute(!muted)),
    [changeMute, changeVolume, muted, volume],
  );

  // Hotkeys from anywhere on the page: Space plays and pauses, Left/Right change
  // the piece, Up/Down change the volume and M mutes. Form fields keep their own keys, and a
  // focused button, link or disclosure keeps Space for its own click.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Escape") {
        setHintDismissed(true);
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("input, select, textarea, [contenteditable]:not([contenteditable='false'])")) return;
      switch (e.key) {
        case " ":
          if (e.repeat || target?.closest?.("button, a, summary")) return;
          toggle();
          break;
        case "ArrowRight":
          if (e.repeat) return;
          next();
          break;
        case "ArrowLeft":
          if (e.repeat) return;
          prev();
          break;
        case "ArrowUp":
          changeVolume(Math.min(100, volume + VOLUME_STEP));
          break;
        case "ArrowDown":
          changeVolume(Math.max(0, volume - VOLUME_STEP));
          break;
        case "m":
        case "M":
          if (e.repeat) return;
          toggleMute();
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [changeVolume, next, prev, toggle, toggleMute, volume]);

  const silent = muted || volume === 0;

  return (
    <>
      {onAir && (
        // Plain text, not a live region: screen readers would otherwise read the words over the host.
        <p className={onAir.off ? "on-air off" : "on-air"}>
          <span className="on-air-label">{onAir.off ? "Host off air" : "On air"}</span>
          {onAir.text}
        </p>
      )}
      <section ref={playerRef} className="player" aria-label="Music player">
        <p className="now">
          {unavailable ? (
            <>
              <span className="title">Music is unavailable right now.</span>
              <span className="composer">Press play to try again.</span>
            </>
          ) : (
            <>
              <span className="title">{track.title}</span>
              <span className="composer">
                {track.composer}
                {loading ? " · Loading" : !playing ? (hasPlayed ? " · Paused" : " · Press play to listen") : ""}
                {silent ? " · Muted" : ""}
              </span>
              {duration !== null && duration > 0 && (
                <span className="playback-time">
                  <input
                    className="playback-progress"
                    type="range"
                    min={0}
                    max={duration}
                    step={1}
                    value={Math.min(elapsed, duration)}
                    onChange={(e) => seek(Number(e.target.value))}
                    aria-label="Playback position"
                    aria-valuetext={`${formatTime(elapsed)} of ${formatTime(duration)}`}
                  />
                  <span>
                    <span className="visually-hidden">Elapsed </span>
                    {formatTime(elapsed)}
                    <span aria-hidden="true"> / </span>
                    <span className="visually-hidden"> of </span>
                    {formatTime(duration)}
                  </span>
                </span>
              )}
            </>
          )}
        </p>

        <div
          className="controls"
          data-hint-dismissed={hintDismissed || undefined}
          onPointerOver={() => setHintDismissed(false)}
          onFocusCapture={() => setHintDismissed(false)}
        >
          <button type="button" className="control" onClick={prev} aria-label="Previous piece" disabled={!hasPrevious}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M4 4h2v12H4zM16 4v12l-8.5-6z" />
            </svg>
            <span className="control-hint" aria-hidden="true">Previous piece <kbd>←</kbd></span>
          </button>
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
            <span className="control-hint" aria-hidden="true">{playing ? "Pause" : "Play"} <kbd>Space</kbd></span>
          </button>
          <button type="button" className="control" onClick={next} aria-label="Next piece">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M14 4h2v12h-2zM4 4v12l8.5-6z" />
            </svg>
            <span className="control-hint" aria-hidden="true">Next piece <kbd>→</kbd></span>
          </button>
          {actions}

          <div className="volume">
            <button
              type="button"
              className="control"
              onClick={toggleMute}
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
              <span className="volume-level" aria-hidden="true">
                {muted ? "Muted" : `${volume}%`}
              </span>
              <span className="control-hint" aria-hidden="true">{silent ? "Unmute" : "Mute"} <kbd>M</kbd></span>
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

        <button
          type="button"
          className="host-toggle"
          aria-label="Radio host"
          aria-pressed={hostEnabled}
          onClick={toggleHost}
        >
          Radio host <span aria-hidden="true">{hostEnabled ? "On" : "Off"}</span>
        </button>

        <details
          className="player-shortcuts"
          onKeyDownCapture={(e) => {
            if (e.key !== "Escape" || !e.currentTarget.open) return;
            e.preventDefault();
            // Consume Escape before document listeners can also close Comments.
            e.stopPropagation();
            e.currentTarget.open = false;
            e.currentTarget.querySelector("summary")?.focus();
          }}
        >
          <summary>Keyboard shortcuts</summary>
          <dl>
            <dt><kbd>Space</kbd></dt>
            <dd>Play / pause</dd>
            <dt><kbd>←</kbd> / <kbd>→</kbd></dt>
            <dd>Previous / next piece</dd>
            <dt><kbd>↓</kbd> / <kbd>↑</kbd></dt>
            <dd>Volume down / up</dd>
            <dt><kbd>M</kbd></dt>
            <dd>Mute / unmute</dd>
          </dl>
          <p>While typing, keys work as usual. Space activates a focused control. Arrow keys seek when the progress slider is focused. Escape closes this guide when it has focus.</p>
        </details>

        <p className="visually-hidden" role="status">
          {status}
        </p>
        <audio ref={audioRef} preload="none" />
      </section>
    </>
  );
}
