"use client";

import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createDeck, type Deck } from "@/lib/shuffle";
import { pieceId, type Track } from "@/lib/site";

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
/** Seconds the music takes to dip before the host starts, and to come back up after. */
const DUCK_RAMP = 0.4;
/** How many of the host's segments are kept, so a piece's intro and its outro need no second request. */
const VOICES_KEPT = 6;

/** What the host says, as words for the caption and the same words spoken. */
type Segment = { text: string; bytes: ArrayBuffer; buffer?: Promise<AudioBuffer | null> };
type Voiced = { text: string; buffer: AudioBuffer };
/**
 * The page's one audio graph. The music element feeds `music`, which carries the
 * listener's volume and the duck; the host's clips play into `voice`. One stream
 * means nothing for iOS to pause, and gain works where element volume is read-only.
 */
type Graph = { ctx: AudioContext; music: GainNode; voice: GainNode };

function bytesOf(base64: string) {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes.buffer;
}

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
  /** More buttons for the piece, before volume. */
  actions?: ReactNode;
  /** The composer's life dates, shown after their name. */
  dates?: string;
  /** The button that opens the piece's details: beside the title on small screens, after volume otherwise. */
  details?: ReactNode;
  /** Kept at the seconds played into the loaded piece, so the painting can follow its story. */
  clock: RefObject<number>;
};

/**
 * One continuous playlist, shuffled: it opens on a random piece, tries to play
 * straight away, and deals the rest from a shuffled deck, so every piece plays
 * once before any repeats; then the deck is reshuffled. A piece that fails
 * to load is skipped, and if every piece fails the player says so quietly.
 */
export function Player({ tracks, index, onPlayingChange, onTrackChange, actions, dates, details, clock }: Props) {
  const playerRef = useRef<HTMLElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreId = useId();
  const [moreOpen, setMoreOpen] = useState(false);
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
  const [hostEnabled, setHostEnabled] = useState(false);
  const hostEnabledRef = useRef(false); // event handlers and pending requests need the latest choice
  // What the host is saying, or why the host is off air.
  const [onAir, setOnAir] = useState<{ text: string; off?: boolean } | null>(null);

  const want = useRef(false); // the visitor's intent to hear music
  const switching = useRef(false); // a track change is under way; ignore the pause it causes
  const failures = useRef(0);
  const indexRef = useRef(0);
  const history = useRef<number[]>([]); // pieces played before this one, for "previous"
  const deck = useRef<Deck>(null); // pieces still to come this time through the list
  const blocked = useRef(false); // the browser refused to autoplay; the first gesture starts the music
  const graph = useRef<Graph | null>(null);
  const wired = useRef(false); // the music element plays through the graph
  const asleep = useRef(() => {}); // what to do when the graph won't wake: pause
  const clip = useRef<AudioBufferSourceNode | null>(null); // the host's voice, playing now
  const lines = useRef(new Map<string, Promise<Segment | null>>()); // the host's segments, by request
  const offAirShown = useRef(new Set<string>()); // each reason the host is off air is shown once a visit
  const speech = useRef(0); // the host's current segment, so a finished old one leaves the music alone
  const airing = useRef<"intro" | "outro" | null>(null); // what the host is saying now
  const levels = useRef({ volume: 80, muted: false, duck: 1 }); // for gain set from event handlers
  const introSaid = useRef(false); // the loaded piece has had its intro (or was introduced by an outro)
  const introPending = useRef(false); // the intro is being fetched or decoded
  const outro = useRef<{ next: number; voice: Voiced | null; started: boolean } | null>(null);
  const announced = useRef<number | null>(null); // the piece the last outro introduced

  const track = tracks[index];

  // The more menu closes when the listener clicks or taps anywhere else.
  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: PointerEvent) => {
      if (e.target instanceof Node && !moreRef.current?.contains(e.target)) setMoreOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [moreOpen]);

  // Captions and notices leave room for the player as titles wrap.
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

  /** Tell the listener once a visit why the host is off air, if this segment is still wanted. */
  const offAir = useCallback((reason: string, segment: number) => {
    if (!hostEnabledRef.current || segment !== speech.current || offAirShown.current.has(reason)) return;
    offAirShown.current.add(reason);
    console.warn(`classican host: ${reason}`);
    setOnAir({ text: reason, off: true });
    window.setTimeout(() => setOnAir((now) => (now?.text === reason ? null : now)), 10_000);
  }, []);

  /** The host's words and voice for a piece (and the one after it, for an outro), fetched once. Null if the host has none. */
  const line = useCallback(
    (kind: "intro" | "outro", i: number, next?: number) => {
      if (!hostEnabledRef.current) return Promise.resolve(null);
      const segment = speech.current;
      const params = new URLSearchParams({ kind, piece: pieceId(tracks[i]) });
      if (next !== undefined) params.set("next", pieceId(tracks[next]));
      const key = params.toString();
      let words = lines.current.get(key);
      if (!words) {
        words = fetch(`/api/host-voice?${key}`)
          .then(async (res) => {
            const body = (await res.json().catch(() => null)) as { text?: string; audio?: string; error?: string } | null;
            if (res.ok && body?.text && body.audio) return { text: body.text, bytes: bytesOf(body.audio) };
            throw new Error(body?.error ?? `The host is unavailable (${res.status}).`);
          })
          .catch((err: unknown) => {
            if (lines.current.get(key) === words) lines.current.delete(key); // try again next time this piece comes round
            offAir(err instanceof Error && err.message !== "Failed to fetch" ? err.message : "The host could not be reached.", segment);
            return null;
          });
        lines.current.set(key, words);
        // Keep only the latest few requests (oldest out first); the CDN has the rest.
        for (const old of lines.current.keys()) if (lines.current.size > VOICES_KEPT) lines.current.delete(old);
      }
      return words;
    },
    [offAir, tracks],
  );

  /** A segment ready to play: its voice decoded in the page's graph. Null if it can't be played. */
  const voiced = useCallback(
    (seg: Segment | null): Promise<Voiced | null> => {
      const g = graph.current;
      if (!seg || !g) return Promise.resolve(null);
      const segment = speech.current;
      // Decoding takes the bytes, so decode a copy and keep the original for another try.
      seg.buffer ??= g.ctx.decodeAudioData(seg.bytes.slice(0)).catch(() => {
        seg.buffer = undefined;
        offAir("The host's voice could not be played.", segment);
        return null;
      });
      return seg.buffer.then((buffer) => (buffer ? { text: seg.text, buffer } : null));
    },
    [offAir],
  );

  /** Set the music's and the host's levels from the volume, mute and duck; `ramp` eases a duck in or out. */
  const applyLevels = useCallback((ramp = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    const { volume, muted, duck } = levels.current;
    audio.muted = muted;
    const g = graph.current;
    if (!g || !wired.current) {
      audio.volume = (volume / 100) * duck;
      return;
    }
    // The gain does the work; element volume is read-only on iOS anyway.
    audio.volume = 1;
    const now = g.ctx.currentTime;
    g.music.gain.cancelScheduledValues(now);
    g.music.gain.setTargetAtTime(muted ? 0 : (volume / 100) * duck, now, ramp ? DUCK_RAMP / 3 : 0.01);
    g.voice.gain.cancelScheduledValues(now);
    g.voice.gain.setTargetAtTime(muted ? 0 : volume / 100, now, 0.01);
  }, []);

  /**
   * Make the page's audio graph, or wake it. Call from a tap or key: iOS only lets
   * audio start from one. The music joins the graph once it is running, so a
   * graph the browser keeps asleep never silences it.
   */
  const ensureGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    let g = graph.current;
    if (!g) {
      if (!("AudioContext" in window)) return;
      const ctx = new AudioContext();
      const music = ctx.createGain();
      const voice = ctx.createGain();
      music.connect(ctx.destination);
      voice.connect(ctx.destination);
      g = graph.current = { ctx, music, voice };
      const wire = () => {
        if (wired.current || ctx.state !== "running") return;
        try {
          ctx.createMediaElementSource(audio).connect(music);
          wired.current = true;
          applyLevels();
        } catch {
          // The element can't join the graph; the music plays as it is, without the host's voice.
          ctx.removeEventListener("statechange", wire);
        }
      };
      ctx.addEventListener("statechange", wire);
      wire();
      // Once the music plays through the graph, it is only heard while the graph runs. If the
      // system puts it to sleep (a call, Siri, another app), wake it; if it stays asleep, pause, so
      // the button never says "Pause" over silence and the next tap starts both.
      ctx.addEventListener("statechange", () => {
        if (!wired.current || ctx.state === "running" || ctx.state === "closed" || !want.current) return;
        ctx.resume().catch(() => {});
        window.setTimeout(() => {
          if (want.current && ctx.state !== "running") asleep.current();
        }, 1000);
      });
    }
    if (g.ctx.state !== "running") g.ctx.resume().catch(() => {});
  }, [applyLevels]);

  const quiet = useCallback(() => {
    speech.current++;
    airing.current = null;
    introPending.current = false;
    try {
      clip.current?.stop();
    } catch {
      // Not started yet, or already over.
    }
    clip.current = null;
    levels.current.duck = 1;
    applyLevels(true);
    setOnAir((now) => (now?.off ? now : null));
  }, [applyLevels]);

  const toggleHost = () => {
    const enabled = !hostEnabledRef.current;
    hostEnabledRef.current = enabled;
    setHostEnabled(enabled);
    // Invalidate pending introductions and outros as well as any speech in progress.
    quiet();
    setOnAir(null);
    outro.current = null;
    announced.current = null;
    if (enabled) ensureGraph();
    try {
      localStorage.setItem(HOST_KEY, String(enabled));
    } catch {
      // Not saved; it still applies for this visit.
    }
  };

  /** Play the host's voice over the music, dipped to `level`. False if it can't be heard. */
  const say = useCallback(
    (v: Voiced, level: number, kind: "intro" | "outro") => {
      const g = graph.current;
      const { volume, muted } = levels.current;
      if (!hostEnabledRef.current || muted || volume === 0) return false;
      if (!g || !wired.current || g.ctx.state !== "running") {
        offAir("The host can't be heard in this browser right now.", speech.current);
        return false;
      }
      // One voice at a time.
      try {
        clip.current?.stop();
      } catch {
        // Not started yet, or already over.
      }
      const id = ++speech.current;
      airing.current = kind;
      levels.current.duck = level;
      applyLevels(true);
      setOnAir({ text: v.text });
      const source = g.ctx.createBufferSource();
      source.buffer = v.buffer;
      source.connect(g.voice);
      source.onended = () => {
        if (id !== speech.current) return;
        clip.current = null;
        airing.current = null;
        levels.current.duck = 1;
        applyLevels(true);
        setOnAir((now) => (now?.off ? now : null));
      };
      clip.current = source;
      // The music dips first, then the host speaks.
      source.start(g.ctx.currentTime + DUCK_RAMP);
      return true;
    },
    [applyLevels, offAir],
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
    if (!audio) return;
    // The graph may have been put to sleep while the music was wanted; a play wakes it either way.
    if (hostEnabledRef.current) ensureGraph();
    else if (graph.current?.ctx.state !== "running") graph.current?.ctx.resume().catch(() => {});
    if (want.current) return;
    setWant(true);
    if (!audio.src || audio.error) load(indexRef.current);
    start();
  }, [ensureGraph, load, setWant, start]);

  /** Stop the host for a pause. An intro cut off is said again on play; an outro cut off leaves the next piece its own intro. */
  const hush = useCallback(() => {
    if (airing.current === "intro" || introPending.current) introSaid.current = false;
    if (airing.current === "outro") announced.current = null;
    quiet();
  }, [quiet]);

  const pause = useCallback(() => {
    if (!want.current) return;
    setWant(false);
    hush();
    audioRef.current?.pause();
  }, [hush, setWant]);
  useEffect(() => {
    asleep.current = pause;
  }, [pause]);

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
    levels.current.volume = volume;
    levels.current.muted = muted;
    applyLevels();
    if (muted || volume === 0) quiet();
  }, [volume, muted, applyLevels, quiet]);

  // Open on a random piece and try to play it at once. Browsers often refuse
  // until the visitor has interacted with the page; then the first click or
  // key starts it, except when using the more menu. Listening on window
  // runs after the play button and the Space hotkey, so a gesture that already
  // started the music is left alone.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Apply saved sound settings before attempting playback, without waiting
    // for the state updates to render. A muted visit must start muted too.
    try {
      hostEnabledRef.current = localStorage.getItem(HOST_KEY) === "true";
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
      if (e.target instanceof Element && e.target.closest(".player-more")) return;
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
        introPending.current = true;
        const segment = speech.current;
        line("intro", i)
          .then(voiced)
          .then((v) => {
            if (segment === speech.current) introPending.current = false;
            if (v && segment === speech.current && i === indexRef.current && want.current && !outro.current?.started && audio.currentTime < 30) {
              say(v, DUCK.intro, "intro");
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
      setWant(false);
      hush();
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
        const pending = { next, voice: null as Voiced | null, started: false };
        outro.current = pending;
        line("outro", i, next)
          .then(voiced)
          .then((v) => (pending.voice = v));
        return;
      }
      const o = outro.current;
      if (o.started || !o.voice || left > o.voice.buffer.duration + DUCK_RAMP + OUTRO_MARGIN || left < 3) return;
      // A short piece: the intro is still on; the outro waits for it, or is skipped.
      if (airing.current === "intro") return;
      o.started = true;
      // The deck could have changed (previous puts a piece back), so only announce what it will really deal.
      if (deck.current!.peek(i) !== o.next) return;
      if (say(o.voice, DUCK.outro, "outro")) announced.current = o.next;
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
  }, [clock, go, hush, line, next, say, setWant, tracks, voiced]);

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
  const state = unavailable
    ? ["Music is unavailable right now. Press play to try again."]
    : [loading ? "Loading" : !playing ? (hasPlayed ? "Paused" : "Press play to listen") : "", silent ? "Muted" : ""];
  const statusLine = state.filter(Boolean).join(" · ");

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
        <div className="playback-time" data-loaded={(duration !== null && duration > 0) || undefined}>
          {duration !== null && duration > 0 && (
            <>
              <input
                className="playback-progress"
                type="range"
                min={0}
                max={duration}
                step={1}
                value={Math.min(elapsed, duration)}
                onChange={(e) => seek(Number(e.target.value))}
                style={{ "--progress": `${(Math.min(elapsed, duration) / duration) * 100}%` } as CSSProperties}
                aria-label="Playback position"
                aria-valuetext={`${formatTime(elapsed)} of ${formatTime(duration)}`}
              />
              <span className="playback-elapsed">
                <span className="visually-hidden">Elapsed </span>
                {formatTime(elapsed)}
              </span>
              <span className="playback-total">
                <span className="visually-hidden">of </span>
                {formatTime(duration)}
              </span>
            </>
          )}
        </div>

        <div
          className="controls"
          data-hint-dismissed={hintDismissed || undefined}
          onPointerOver={() => setHintDismissed(false)}
          onFocusCapture={() => setHintDismissed(false)}
        >
          <div className="now">
            <p>
              <span className="title">{track.title}</span>
              <span className="composer">
                {track.composer}
                {dates ? ` · ${dates}` : ""}
              </span>
            </p>
            <span className="now-details">{details}</span>
          </div>

          <div className="transport">
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
          </div>

          <p className="player-status">{statusLine}</p>

          <div className="actions">
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
                <span className="control-hint" aria-hidden="true">{silent ? "Unmute" : "Mute"} <kbd>M</kbd></span>
              </button>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={muted ? 0 : volume}
                onChange={(e) => changeVolume(Number(e.target.value))}
                style={{ "--progress": `${muted ? 0 : volume}%` } as CSSProperties}
                aria-label="Volume"
                aria-valuetext={`${muted ? 0 : volume}%`}
              />
              <span className="volume-level" aria-hidden="true">
                {muted ? "Muted" : `${volume}%`}
              </span>
            </div>

            <span className="actions-details">{details}</span>

            <div
              ref={moreRef}
              className="player-more"
              onKeyDownCapture={(e) => {
                if (e.key !== "Escape" || !moreOpen) return;
                e.preventDefault();
                // Consume Escape before document listeners can also close a panel.
                e.stopPropagation();
                setMoreOpen(false);
                moreRef.current?.querySelector<HTMLButtonElement>(".more-toggle")?.focus();
              }}
            >
              <button
                type="button"
                className="control more-toggle"
                aria-label="More: radio host and keyboard shortcuts"
                aria-expanded={moreOpen}
                aria-controls={moreId}
                onClick={() => setMoreOpen((o) => !o)}
              >
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M3.5 8.5h3v3h-3zM8.5 8.5h3v3h-3zM13.5 8.5h3v3h-3z" />
                </svg>
              </button>
              <div id={moreId} className="more-menu" hidden={!moreOpen}>
                <button type="button" className="host-toggle" aria-label="Radio host" aria-pressed={hostEnabled} onClick={toggleHost}>
                  Radio host
                  <span className="switch" aria-hidden="true">
                    {hostEnabled ? "On" : "Off"}
                    <span className="switch-track" />
                  </span>
                </button>
                <div className="player-shortcuts">
                  <h2>Keyboard shortcuts</h2>
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
                  <p>While typing, keys work as usual. Space activates a focused control. Arrow keys seek when the progress slider is focused. Escape closes this menu when it has focus.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className="visually-hidden" role="status">
          {status}
        </p>
        {/* Anonymous CORS lets the music play through the audio graph; without it the graph hears silence. */}
        <audio ref={audioRef} preload="none" crossOrigin="anonymous" />
      </section>
    </>
  );
}
