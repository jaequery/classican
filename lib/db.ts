// Everything visitors make (accounts, sessions, likes, comments) is kept in
// Postgres. Only lib/community.ts runs queries; lib/session.ts picks the database.

export type Row = Record<string, unknown>;

/** Run one SQL statement with `$1`-style parameters and get its rows back. */
export type Db = (text: string, params?: unknown[]) => Promise<Row[]>;

/** The tables, created on first use if they aren't there yet. Safe to run again. */
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    email text NOT NULL UNIQUE,
    name text NOT NULL,
    password_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash text PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS likes (
    piece_id text NOT NULL,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (piece_id, user_id)
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id uuid PRIMARY KEY,
    piece_id text NOT NULL,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS comments_piece_idx ON comments (piece_id, created_at DESC)`,
];

/** `db`, with the tables made before its first query. */
export function withSchema(db: Db): Db {
  let ready: Promise<void> | undefined;
  const migrate = async () => {
    for (const statement of SCHEMA) await db(statement);
  };
  return async (text, params) => {
    ready ??= migrate().catch((err) => {
      ready = undefined;
      throw err;
    });
    await ready;
    return db(text, params);
  };
}

/** Postgres timestamps come back as Dates from some drivers and strings from others. */
export const iso = (value: unknown) => new Date(value as string | Date).toISOString();
