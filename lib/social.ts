// What the browser and the server agree on about accounts, likes and comments.
// Safe to import from client components: no Node modules here.

export const COMMENT_MAX = 1000;

/** The signed-in visitor, as they see themselves. */
export type Me = { name: string; email: string };

export type PieceComment = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
  /** Written by the signed-in visitor, who may delete it. */
  mine: boolean;
};

/** A piece's likes and comments, as the visitor asking sees them. */
export type PieceSocial = { likes: number; liked: boolean; comments: PieceComment[] };

/** 7, 999, 1.2k, 12k. */
export function formatCount(n: number) {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${k < 10 ? Math.floor(k * 10) / 10 : Math.floor(k)}k`;
}

/** "just now", "5 min ago", "3 h ago", "2 d ago", then the date. */
export function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
