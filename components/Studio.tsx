"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { pieceId, type Site } from "@/lib/site";
import { formatCount, type Me } from "@/lib/social";
import { AuthDialog, type AuthMode } from "./AuthDialog";
import { Comments } from "./Comments";
import { Player } from "./Player";
import { Scene } from "./Scene";
import { usePieceSocial } from "./usePieceSocial";
import { WallLabel } from "./WallLabel";

/**
 * The painting and its wall label follow the piece the player has loaded; its facts only rotate while music plays,
 * and a piece with a story turns its painting to each scene as the music reaches it.
 * Its likes and comments follow it too: anyone can read them, and signed-in listeners can add their own.
 */
export function Studio({ site }: { site: Site }) {
  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [auth, setAuth] = useState<AuthMode | null>(null);
  const [talking, setTalking] = useState(false);
  const commentsId = useId();
  const clock = useRef(0);
  const track = site.tracks[index];

  useEffect(() => {
    fetch("/api/me", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<Me | null>) : null))
      .then(setMe, () => setMe(null));
  }, []);

  const signedOut = useCallback(() => {
    setMe(null);
    setAuth("signin");
  }, []);
  const signOut = useCallback(() => {
    fetch("/api/auth/logout", { method: "POST" }).finally(() => setMe(null));
  }, []);
  const closeComments = useCallback(() => setTalking(false), []);

  const social = usePieceSocial(pieceId(track), Boolean(me), signedOut);
  const { data } = social;

  const actions = (
    <>
      <button
        type="button"
        className={data?.liked ? "control count liked" : "control count"}
        aria-pressed={Boolean(data?.liked)}
        onClick={() => (me ? social.toggleLike() : setAuth("signin"))}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M10 17.2 8.9 16.2C4.8 12.5 2 10 2 6.9 2 4.4 4 2.5 6.4 2.5c1.4 0 2.7.6 3.6 1.7.9-1.1 2.2-1.7 3.6-1.7C16 2.5 18 4.4 18 6.9c0 3.1-2.8 5.6-6.9 9.3z" />
        </svg>
        <span className="visually-hidden">Like</span>
        <span className="tally">{data ? formatCount(data.likes) : ""}</span>
      </button>
      <button
        type="button"
        className="control count"
        aria-expanded={talking}
        aria-controls={commentsId}
        onClick={() => setTalking((t) => !t)}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M3 3.5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H8l-4 3v-3H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" />
        </svg>
        <span className="visually-hidden">Comments</span>
        <span className="tally">{data ? formatCount(data.comments.length) : ""}</span>
      </button>
    </>
  );

  return (
    <>
      <Scene
        playing={playing}
        painting={track.painting}
        facts={track.facts}
        story={track.story}
        clock={clock}
        factSeconds={site.factSeconds}
      />
      <WallLabel track={track} composer={site.composers[track.composer]} />
      <Comments
        id={commentsId}
        open={talking}
        onClose={closeComments}
        title={track.title}
        me={me}
        data={data}
        status={social.status}
        onRetry={social.reload}
        onAuth={setAuth}
        onSignOut={signOut}
        addComment={social.addComment}
        removeComment={social.removeComment}
      />
      <Player tracks={site.tracks} onPlayingChange={setPlaying} onTrackChange={setIndex} actions={actions} clock={clock} />
      <AuthDialog mode={auth} onModeChange={setAuth} onSignedIn={setMe} />
      <p className={social.message ? "notice" : "visually-hidden"} role="status">
        {social.message}
      </p>
    </>
  );
}
