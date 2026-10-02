import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// Everything visitors make (accounts, sessions, likes, comments) is kept in one
// small JSON file on the server's disk. Only lib/social.ts reads or writes it.

export type User = {
  id: string;
  /** Lower-cased, so one address can only sign up once. */
  email: string;
  /** Shown beside their comments; their email never is. */
  name: string;
  passwordHash: string;
  createdAt: string;
};

/** A signed-in browser. Only a hash of its cookie token is kept. */
export type Session = { tokenHash: string; userId: string; expiresAt: string };

export type Like = { pieceId: string; userId: string; createdAt: string };

export type Comment = { id: string; pieceId: string; userId: string; text: string; createdAt: string };

export type Data = { users: User[]; sessions: Session[]; likes: Like[]; comments: Comment[] };

export type Store = {
  /** Look at the data. */
  read<T>(fn: (data: Data) => T): Promise<T>;
  /** Change the data; the change is saved before the promise settles, or not at all if `fn` throws. */
  write<T>(fn: (data: Data) => T): Promise<T>;
};

const empty = (): Data => ({ users: [], sessions: [], likes: [], comments: [] });

/**
 * A store kept in the JSON file at `path`, created on the first write. Reads and
 * writes take turns, and each write replaces the file in one rename, so a crash
 * mid-save leaves the previous version whole.
 */
export function fileStore(path: string): Store {
  let queue: Promise<unknown> = Promise.resolve();
  const turn = <T>(job: () => Promise<T>) => {
    const next = queue.then(job, job);
    queue = next.catch(() => {});
    return next;
  };

  async function load(): Promise<Data> {
    try {
      return { ...empty(), ...(JSON.parse(await readFile(path, "utf8")) as Partial<Data>) };
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return empty();
      throw err;
    }
  }

  return {
    read: (fn) => turn(async () => fn(await load())),
    write: (fn) =>
      turn(async () => {
        const data = await load();
        const result = fn(data);
        await mkdir(dirname(path), { recursive: true });
        const tmp = `${path}.${process.pid}.tmp`;
        await writeFile(tmp, JSON.stringify(data));
        await rename(tmp, path);
        return result;
      }),
  };
}
