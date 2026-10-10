"use client";

import { useEffect, useState } from "react";
import type { Update } from "@/lib/site";

const DISMISSED = "classican:update-dismissed";

/** Read in UTC so the date is the same wherever it is rendered. */
function formatDate(date: string) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * A thin strip along the top saying what changed on the site lately, with a "New" badge and the date.
 * Dismissing it is remembered for that update only, so the next one shows again.
 */
export function UpdateBar({ update }: { update: Update }) {
  const key = `${update.date} ${update.text}`;
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISSED) === key) setDismissed(true);
    } catch {
      // Without storage the bar simply shows on every visit.
    }
  }, [key]);

  if (dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED, key);
    } catch {
      // Dismissed for this visit only.
    }
  };

  return (
    <aside className="update" aria-label="What's new">
      <span className="update-new">New</span>
      <span className="update-text">{update.text}</span>
      <time className="update-date" dateTime={update.date}>
        {formatDate(update.date)}
      </time>
      <button type="button" className="update-close" onClick={dismiss}>
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M5 5l10 10M15 5 5 15" />
        </svg>
        <span className="visually-hidden">Dismiss</span>
      </button>
    </aside>
  );
}
