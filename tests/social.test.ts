import assert from "node:assert/strict";
import { test } from "node:test";
import { pieceId, site } from "../lib/site";
import { formatCount, timeAgo } from "../lib/social";

test("every piece has its own readable id", () => {
  assert.equal(pieceId({ composer: "Frédéric Chopin", title: "Nocturne in E-flat major, Op. 9 No. 2" }), "frederic-chopin-nocturne-in-e-flat-major-op-9-no-2");
  const ids = site.tracks.map(pieceId);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) assert.match(id, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test("counts stay short", () => {
  assert.deepEqual([0, 999, 1000, 1290, 12_500].map(formatCount), ["0", "999", "1k", "1.2k", "12k"]);
});

test("comment times read naturally", () => {
  const now = Date.parse("2026-10-02T12:00:00Z");
  assert.equal(timeAgo("2026-10-02T11:59:30Z", now), "just now");
  assert.equal(timeAgo("2026-10-02T11:55:00Z", now), "5 min ago");
  assert.equal(timeAgo("2026-10-02T09:00:00Z", now), "3 h ago");
  assert.equal(timeAgo("2026-09-30T12:00:00Z", now), "2 d ago");
  assert.equal(timeAgo("2026-01-05T12:00:00Z", now), "5 Jan 2026");
});
