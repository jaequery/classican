"use client";

import { useEffect, useId, useRef, useState } from "react";
import { COMMENT_MAX, timeAgo, type Me, type PieceSocial } from "@/lib/social";
import type { AuthMode } from "./AuthDialog";
import type { SocialStatus } from "./usePieceSocial";

type Props = {
  id: string;
  open: boolean;
  onClose: () => void;
  title: string;
  /** The signed-in visitor; null when signed out, undefined while we find out. */
  me: Me | null | undefined;
  data: PieceSocial | null;
  status: SocialStatus;
  onRetry: () => void;
  onAuth: (mode: AuthMode) => void;
  onSignOut: () => void;
  addComment: (text: string) => Promise<string | null>;
  removeComment: (id: string) => Promise<string | null>;
};

/**
 * What listeners have said about the piece now playing. Anyone can read it;
 * signed-in listeners can write, and delete what they wrote.
 */
export function Comments({ id, open, onClose, title, me, data, status, onRetry, onAuth, onSignOut, addComment, removeComment }: Props) {
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const resetScroll = useRef(true);
  const headingId = useId();
  const fieldId = useId();
  const countId = useId();
  const length = text.trim().length;
  const blank = length === 0;
  const excess = length - COMMENT_MAX;
  const over = excess > 0;

  // A new piece starts at the beginning of its own conversation.
  useEffect(() => {
    setText("");
    setError("");
    resetScroll.current = true;
  }, [title]);

  // Hidden panels cannot scroll; defer a new piece's reset until it is visible.
  useEffect(() => {
    if (!open || !resetScroll.current || !bodyRef.current) return;
    bodyRef.current.scrollTop = 0;
    resetScroll.current = false;
  }, [open, title]);

  useEffect(() => {
    setConfirmDelete(null);
  }, [open, title, me]);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement;
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("dialog[open]") && onClose();
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open, onClose]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (blank || over || posting) return;
    setPosting(true);
    setError("");
    const problem = await addComment(text);
    setPosting(false);
    if (problem) return setError(problem);
    setText("");
  }

  async function remove(commentId: string) {
    if (deleting) return;
    setConfirmDelete(null);
    setDeleting(commentId);
    setError("");
    const problem = await removeComment(commentId);
    setDeleting(null);
    if (problem) setError(problem);
  }

  return (
    <aside id={id} className="talk" aria-labelledby={headingId} hidden={!open}>
      <header className="talk-head">
        <h2 id={headingId}>
          Comments <span>on {title}</span>
        </h2>
        <button ref={closeButton} type="button" className="control" onClick={onClose} aria-label="Close comments">
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5.4 4.3 10 8.9l4.6-4.6 1.1 1.1-4.6 4.6 4.6 4.6-1.1 1.1-4.6-4.6-4.6 4.6-1.1-1.1 4.6-4.6-4.6-4.6z" />
          </svg>
        </button>
      </header>

      <div ref={bodyRef} className="talk-body">
        {me ? (
          <form className="talk-form" onSubmit={post}>
            <label htmlFor={fieldId} className="visually-hidden">
              Your comment
            </label>
            <textarea
              id={fieldId}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What do you hear in it?"
              rows={3}
              aria-invalid={over || undefined}
              aria-describedby={countId}
            />
            <div className="talk-form-row">
              <span id={countId} className={over ? "talk-count over" : "talk-count"} aria-live="polite" aria-atomic="true">
                {over
                  ? `Remove ${excess} ${excess === 1 ? "character" : "characters"} to post.`
                  : `${length} / ${COMMENT_MAX} characters`}
              </span>
              <button type="submit" className="button primary" disabled={blank || over || posting}>
                {posting ? "Posting…" : "Post"}
              </button>
            </div>
            <p className="talk-who">
              Signed in as {me.name} ·{" "}
              <button type="button" className="link" onClick={onSignOut}>
                Sign out
              </button>
            </p>
          </form>
        ) : me === null ? (
          <p className="talk-prompt">
            <button type="button" className="link" onClick={() => onAuth("signin")}>
              Sign in
            </button>{" "}
            or{" "}
            <button type="button" className="link" onClick={() => onAuth("signup")}>
              create an account
            </button>{" "}
            to like pieces and leave comments.
          </p>
        ) : null}

        <p className="talk-error" role="alert">
          {error}
        </p>

        {status === "error" ? (
          <p className="talk-note">
            Couldn&rsquo;t load comments.{" "}
            <button type="button" className="link" onClick={onRetry}>
              Try again
            </button>
          </p>
        ) : !data ? (
          <p className="talk-note" role="status">
            Loading comments…
          </p>
        ) : data.comments.length === 0 ? (
          <p className="talk-note">No comments on this piece yet.</p>
        ) : (
          <ol className="talk-list">
            {data.comments.map((c) => (
              <li key={c.id}>
                <p className="talk-meta">
                  <span>{c.author}</span> <time dateTime={c.createdAt}>{timeAgo(c.createdAt)}</time>
                </p>
                <p className="talk-text">{c.text}</p>
                {c.mine && (
                  <div className="talk-delete">
                    {confirmDelete === c.id && <span role="status">Delete this comment?</span>}
                    <button
                      type="button"
                      className="link small"
                      onClick={() => setConfirmDelete(confirmDelete === c.id ? null : c.id)}
                      disabled={deleting !== null}
                    >
                      {deleting === c.id ? "Deleting…" : confirmDelete === c.id ? "Keep" : "Delete"}
                    </button>
                    {confirmDelete === c.id && (
                      <button type="button" className="link small" onClick={() => remove(c.id)} disabled={deleting !== null}>
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}
