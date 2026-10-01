// Songs a visitor adds themselves. They are kept in this browser's IndexedDB
// and never leave the device, so only the person who added them hears them.

import type { PaintingId } from "./paintings";

/** What the player needs to know about any piece, built-in or added. */
export type Playable = { title: string; composer: string; ogg: string; mp3: string };

export type OwnSong = {
  id: string;
  title: string;
  /** Whoever the visitor says made it; may be empty. */
  artist: string;
  file: Blob;
  added: number;
};

/** The biggest file accepted, so one song cannot fill the browser's storage. */
export const MAX_BYTES = 200 * 1024 * 1024;

/** Added songs borrow a painting, chosen from their id so it stays the same each visit. */
const BORROWED: PaintingId[] = ["gymnopedie", "clair-de-lune", "gnossienne", "nocturne", "moonlight", "gondola"];

export function borrowedPainting(id: string): PaintingId {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BORROWED[h % BORROWED.length];
}

/** "my_song-final.mp3" → "my song final". */
export function titleFromFile(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled";
}

const DB = "classican";
const STORE = "songs";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = tx.onabort = () => reject(tx.error ?? req.error);
    });
  } finally {
    db.close();
  }
}

/** Every saved song, oldest first. */
export async function listSongs(): Promise<OwnSong[]> {
  const all = await run("readonly", (s) => s.getAll() as IDBRequest<OwnSong[]>);
  return all.sort((a, b) => a.added - b.added);
}

export function saveSong(song: OwnSong) {
  return run("readwrite", (s) => s.put(song));
}

export function deleteSong(id: string) {
  return run("readwrite", (s) => s.delete(id));
}
