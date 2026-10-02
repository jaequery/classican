import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { after, before, beforeEach, describe, test } from "node:test";
import { addComment, deleteComment, logIn, logOut, pieceSocial, setLike, signUp, userForToken } from "../lib/community";
import { COMMENT_MAX } from "../lib/social";
import { withSchema, type Db, type Row } from "../lib/db";

const PIECE = "erik-satie-gymnopedie-no-1";
const OTHER = "claude-debussy-clair-de-lune";

// A Postgres running in this process, with the same tables lib/session.ts makes
// on Neon, emptied before each test.
let pg: PGlite;
let store: Db;

before(() => {
  pg = new PGlite();
  store = withSchema(async (text, params) => (await pg.query<Row>(text, params)).rows);
});

beforeEach(() => store("TRUNCATE users, sessions, likes, comments"));

after(() => pg.close());

async function account(email = "clara@example.com", name = "Clara") {
  const result = await signUp(store, { email, name, password: "schumann1840" });
  assert.ok(result.ok, "sign-up should succeed");
  const user = await userForToken(store, result.value.token);
  assert.ok(user);
  return { ...result.value, user };
}

describe("sign up", () => {
  test("creates an account that is signed in", async () => {
    const { me, user } = await account();
    assert.deepEqual(me, { name: "Clara", email: "clara@example.com" });
    assert.equal(user.name, "Clara");
    assert.ok(!user.passwordHash.includes("schumann1840"), "the password is not stored in the clear");
  });

  test("refuses an email that already has an account, whatever its case", async () => {
    await account();
    const again = await signUp(store, { email: "  CLARA@Example.com ", name: "Clara W", password: "another-password" });
    assert.deepEqual(again, { ok: false, status: 409, error: "That email already has an account. Sign in instead." });
  });

  test("refuses missing or invalid details", async () => {
    for (const input of [
      { email: "clara@example.com", name: "  ", password: "schumann1840" },
      { email: "not-an-email", name: "Clara", password: "schumann1840" },
      { email: "clara@example.com", name: "Clara", password: "short" },
      { email: "clara@example.com", name: "x".repeat(41), password: "schumann1840" },
    ]) {
      const result = await signUp(store, input);
      assert.equal(result.ok, false);
      assert.equal(!result.ok && result.status, 400);
    }
  });
});

describe("log in and out", () => {
  test("logs in with the right password, in any email case", async () => {
    const { user } = await account();
    const result = await logIn(store, { email: "Clara@Example.com", password: "schumann1840" });
    assert.ok(result.ok);
    assert.equal((await userForToken(store, result.value.token))?.id, user.id);
  });

  test("gives one answer for a wrong password and an unknown email", async () => {
    await account();
    const wrong = await logIn(store, { email: "clara@example.com", password: "wrong-password" });
    const unknown = await logIn(store, { email: "robert@example.com", password: "schumann1840" });
    assert.deepEqual(wrong, unknown);
    assert.equal(!wrong.ok && wrong.status, 401);
  });

  test("logging out ends that session only", async () => {
    const { token } = await account();
    const second = await logIn(store, { email: "clara@example.com", password: "schumann1840" });
    assert.ok(second.ok);
    await logOut(store, token);
    assert.equal(await userForToken(store, token), null);
    assert.ok(await userForToken(store, second.value.token));
  });

  test("an unknown or missing token is signed out", async () => {
    assert.equal(await userForToken(store, undefined), null);
    assert.equal(await userForToken(store, "made-up"), null);
  });
});

describe("likes", () => {
  test("anyone sees the count; each listener sees their own like", async () => {
    const clara = await account();
    const robert = await account("robert@example.com", "Robert");
    await setLike(store, PIECE, clara.user.id, true);
    await setLike(store, PIECE, robert.user.id, true);
    assert.deepEqual(await pieceSocial(store, PIECE), { likes: 2, liked: false, comments: [] });
    assert.equal((await pieceSocial(store, PIECE, clara.user.id)).liked, true);
    assert.equal((await pieceSocial(store, OTHER, clara.user.id)).likes, 0, "likes belong to one piece");
  });

  test("liking twice is one like, and a like can be taken back", async () => {
    const { user } = await account();
    await setLike(store, PIECE, user.id, true);
    const twice = await setLike(store, PIECE, user.id, true);
    assert.equal(twice.likes, 1);
    const undone = await setLike(store, PIECE, user.id, false);
    assert.deepEqual([undone.likes, undone.liked], [0, false]);
  });

  test("liking at the same moment from two tabs is still one like", async () => {
    const { user } = await account();
    await Promise.all([setLike(store, PIECE, user.id, true), setLike(store, PIECE, user.id, true)]);
    assert.equal((await pieceSocial(store, PIECE)).likes, 1);
  });
});

describe("comments", () => {
  test("are shown newest first, by name, to everyone", async () => {
    const { user } = await account();
    await addComment(store, PIECE, user.id, "First");
    await new Promise((r) => setTimeout(r, 5));
    const posted = await addComment(store, PIECE, user.id, "  Second  ");
    assert.ok(posted.ok);
    assert.equal(posted.value.text, "Second");
    const seen = await pieceSocial(store, PIECE);
    assert.deepEqual(
      seen.comments.map((c) => [c.text, c.author, c.mine]),
      [
        ["Second", "Clara", false],
        ["First", "Clara", false],
      ],
    );
    assert.ok(!JSON.stringify(seen).includes("clara@example.com"), "emails are never shown");
    assert.equal((await pieceSocial(store, PIECE, user.id)).comments[0].mine, true);
  });

  test("refuses blank and over-long comments", async () => {
    const { user } = await account();
    const blank = await addComment(store, PIECE, user.id, "   ");
    const long = await addComment(store, PIECE, user.id, "x".repeat(COMMENT_MAX + 1));
    assert.equal(!blank.ok && blank.status, 400);
    assert.equal(!long.ok && long.status, 400);
    assert.ok((await addComment(store, PIECE, user.id, "x".repeat(COMMENT_MAX))).ok);
  });

  test("only the writer can delete a comment", async () => {
    const clara = await account();
    const robert = await account("robert@example.com", "Robert");
    const posted = await addComment(store, PIECE, clara.user.id, "Mine");
    assert.ok(posted.ok);
    assert.deepEqual(await deleteComment(store, posted.value.id, robert.user.id), {
      ok: false,
      status: 403,
      error: "You can only delete your own comments.",
    });
    assert.deepEqual(await deleteComment(store, posted.value.id, clara.user.id), { ok: true, value: null });
    assert.equal((await deleteComment(store, posted.value.id, clara.user.id)).ok, false);
    assert.equal((await pieceSocial(store, PIECE)).comments.length, 0);
  });

  test("deleting a made-up comment id is a not-found, not a crash", async () => {
    const { user } = await account();
    assert.deepEqual(await deleteComment(store, "not-a-uuid", user.id), { ok: false, status: 404, error: "That comment has already gone." });
  });

  test("writes that arrive together are all kept", async () => {
    const { user } = await account();
    await Promise.all(Array.from({ length: 20 }, (_, i) => addComment(store, PIECE, user.id, `Comment ${i}`)));
    assert.equal((await pieceSocial(store, PIECE)).comments.length, 20);
  });
});
