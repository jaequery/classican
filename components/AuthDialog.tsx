"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Me } from "@/lib/social";
import { errorOf, send } from "./usePieceSocial";

export type AuthMode = "signin" | "signup";

type Props = {
  /** Open in this mode, or closed when null. */
  mode: AuthMode | null;
  onModeChange: (mode: AuthMode | null) => void;
  onSignedIn: (me: Me) => void;
};

/** Sign in, or create an account, with an email and password. A new account is signed in at once. */
export function AuthDialog({ mode, onModeChange, onSignedIn }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const titleId = useId();
  const errorId = useId();
  const signup = mode === "signup";

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (mode && !dialog.open) dialog.showModal();
    if (!mode && dialog.open) dialog.close();
    setError("");
  }, [mode]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    const res = await send(`/api/auth/${signup ? "signup" : "login"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(form)),
    });
    setBusy(false);
    if (!res?.ok) return setError(await errorOf(res));
    onSignedIn((await res.json()) as Me);
    onModeChange(null);
  }

  return (
    <dialog ref={ref} className="auth" aria-labelledby={titleId} onClose={() => onModeChange(null)}>
      <form onSubmit={submit}>
        <h2 id={titleId}>{signup ? "Create an account" : "Sign in"}</h2>
        <p className="auth-why">{signup ? "Like pieces and leave comments on them." : "Welcome back."}</p>
        {signup && (
          <label>
            Name <span>shown beside your comments</span>
            <input name="name" autoComplete="nickname" required maxLength={40} aria-describedby={error ? errorId : undefined} />
          </label>
        )}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required aria-describedby={error ? errorId : undefined} />
        </label>
        <label>
          Password {signup && <span>at least 8 characters</span>}
          <input
            name="password"
            type="password"
            autoComplete={signup ? "new-password" : "current-password"}
            required
            minLength={signup ? 8 : undefined}
            maxLength={200}
            aria-describedby={error ? errorId : undefined}
          />
        </label>
        <p id={errorId} className="auth-error" role="alert">
          {error}
        </p>
        <div className="auth-actions">
          <button type="submit" className="button primary" disabled={busy}>
            {busy ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}
          </button>
          <button type="button" className="button" onClick={() => onModeChange(null)}>
            Cancel
          </button>
        </div>
        <p className="auth-switch">
          {signup ? "Already have an account?" : "New here?"}{" "}
          <button type="button" className="link" onClick={() => onModeChange(signup ? "signin" : "signup")}>
            {signup ? "Sign in" : "Create an account"}
          </button>
        </p>
      </form>
    </dialog>
  );
}
