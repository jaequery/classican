"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PieceComment, PieceSocial } from "@/lib/social";

export type SocialStatus = "loading" | "ready" | "error";

/** The error a failed API response carries, or a general one when the network failed. */
async function errorOf(res: Response | null) {
  if (!res) return "Couldn't reach classican. Check your connection and try again.";
  try {
    return ((await res.json()) as { error?: string }).error ?? "Something went wrong. Try again.";
  } catch {
    return "Something went wrong. Try again.";
  }
}

const send = (url: string, init?: RequestInit) => fetch(url, init).catch(() => null);

/**
 * The likes and comments of the piece now loaded. It reloads when the piece
 * changes or the visitor signs in or out, and ignores answers about a piece
 * that is no longer playing. Likes show at once and are taken back if saving
 * fails. A 401 means the session ended elsewhere: `onSignedOut` is called.
 */
export function usePieceSocial(id: string, signedIn: boolean, onSignedOut: () => void) {
  const [data, setData] = useState<PieceSocial | null>(null);
  const [status, setStatus] = useState<SocialStatus>("loading");
  const [message, setMessage] = useState("");
  const current = useRef(id);
  const loads = useRef(0);
  const likes = useRef(0);
  current.current = id;

  const load = useCallback(() => {
    const seq = ++loads.current;
    setStatus("loading");
    send(`/api/pieces/${id}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res?.ok) throw new Error();
        const next = (await res.json()) as PieceSocial;
        if (seq !== loads.current) return;
        setData(next);
        setStatus("ready");
      })
      .catch(() => seq === loads.current && setStatus("error"));
  }, [id]);

  // A new piece starts blank; signing in or out keeps the counts on show while they refresh.
  useEffect(() => {
    setData(null);
    setMessage("");
  }, [id]);
  useEffect(load, [load, signedIn]);

  const toggleLike = useCallback(async () => {
    if (!data) return;
    const on = !data.liked;
    const seq = ++likes.current;
    const before = data;
    setMessage("");
    setData({ ...data, liked: on, likes: data.likes + (on ? 1 : -1) });
    const res = await send(`/api/pieces/${id}/like`, { method: on ? "PUT" : "DELETE" });
    if (current.current !== id || seq !== likes.current) return;
    if (res?.ok) {
      const saved = (await res.json()) as Pick<PieceSocial, "likes" | "liked">;
      setData((d) => d && { ...d, ...saved });
      return;
    }
    setData((d) => d && { ...d, liked: before.liked, likes: before.likes });
    if (res?.status === 401) return onSignedOut();
    setMessage(on ? "Couldn't save your like. Try again." : "Couldn't take your like back. Try again.");
  }, [data, id, onSignedOut]);

  /** Post a comment; resolves to an error to show, or null once it is posted. */
  const addComment = useCallback(
    async (text: string) => {
      const res = await send(`/api/pieces/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res?.status === 401) onSignedOut();
      if (!res?.ok) return errorOf(res);
      const comment = (await res.json()) as PieceComment;
      if (current.current === id) setData((d) => d && { ...d, comments: [comment, ...d.comments] });
      return null;
    },
    [id, onSignedOut],
  );

  /** Delete one of the visitor's own comments; resolves to an error to show, or null. */
  const removeComment = useCallback(
    async (commentId: string) => {
      const res = await send(`/api/comments/${commentId}`, { method: "DELETE" });
      if (res?.status === 401) onSignedOut();
      if (!res?.ok && res?.status !== 404) return errorOf(res);
      setData((d) => d && { ...d, comments: d.comments.filter((c) => c.id !== commentId) });
      return null;
    },
    [onSignedOut],
  );

  return { data, status, message, reload: load, toggleLike, addComment, removeComment };
}

export { errorOf, send };
