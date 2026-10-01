"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { MAX_BYTES, titleFromFile } from "@/lib/library";

type Props = {
  songs: { id: string; title: string; artist: string }[];
  /** Resolves to a message to show when the song could only be partly added, or not at all. */
  onAdd: (file: File, title: string, artist: string) => Promise<string | void>;
  onRemove: (id: string) => void;
};

/**
 * A button in the player that opens a small dialog: pick an audio file, name
 * it, and it joins the playlist. Your songs are listed there to remove.
 */
export function AddSong({ songs, onAdd, onRemove }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const headingId = useId();

  const reset = () => {
    formRef.current?.reset();
    setFile(null);
    setTitle("");
    setArtist("");
  };

  const pick = (f: File | null) => {
    setMessage("");
    if (f && !f.type.startsWith("audio/")) {
      setMessage("That file is not audio. Choose an MP3, Ogg, WAV, M4A or similar.");
      formRef.current?.reset();
      setFile(null);
      return;
    }
    if (f && f.size > MAX_BYTES) {
      setMessage("That file is over 200 MB. Choose a smaller one.");
      formRef.current?.reset();
      setFile(null);
      return;
    }
    setFile(f);
    if (f) setTitle(titleFromFile(f.name));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    const name = title.trim() || titleFromFile(file.name);
    const note = await onAdd(file, name, artist.trim());
    setBusy(false);
    setMessage(note || `Added ${name}. It plays after the other pieces.`);
    reset();
  };

  return (
    <>
      <button
        type="button"
        className="control"
        onClick={() => {
          setMessage("");
          dialogRef.current?.showModal();
        }}
        aria-label="Add your own song"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M9 4h2v5h5v2h-5v5H9v-5H4V9h5z" />
        </svg>
      </button>

      <dialog ref={dialogRef} className="add-song" aria-labelledby={headingId} onClose={reset}>
        <h2 id={headingId}>Your songs</h2>
        <p className="add-note">Songs you add stay in this browser. Nobody else can hear them.</p>

        <form ref={formRef} onSubmit={submit}>
          <label>
            Audio file
            <input type="file" accept="audio/*" required onChange={(e) => pick(e.target.files?.[0] ?? null)} />
          </label>
          <label>
            Title
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
          </label>
          <label>
            Artist
            <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={120} placeholder="Optional" />
          </label>
          <div className="add-actions">
            <button type="submit" className="add-primary" disabled={!file || busy}>
              {busy ? "Adding…" : "Add song"}
            </button>
            <button type="button" className="add-secondary" onClick={() => dialogRef.current?.close()}>
              Close
            </button>
          </div>
        </form>

        <p className="add-message" role="status">
          {message}
        </p>

        {songs.length > 0 && (
          <ul className="add-list">
            {songs.map((s) => (
              <li key={s.id}>
                <span>
                  {s.title}
                  {s.artist && <span className="add-artist"> · {s.artist}</span>}
                </span>
                <button type="button" className="add-secondary" onClick={() => onRemove(s.id)} aria-label={`Remove ${s.title}`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </dialog>
    </>
  );
}
