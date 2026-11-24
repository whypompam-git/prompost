"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { REVIEW_PREF_EVENT, countReview, readReviewMode, type BadgeData } from "@/lib/reviewBadge";

// The menu on a phone and the sidebar on a laptop both ask for this number: share one request
// (and reuse the answer for 20 seconds) instead of sending one each.
let shared: { at: number; p: Promise<BadgeData> } | null = null;
export function fetchBadge(force = false): Promise<BadgeData> {
  if (!force && shared && Date.now() - shared.at < 20_000) return shared.p;
  const p = fetch("/api/drafts/badge", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<BadgeData>) : Promise.reject(new Error("badge"))));
  shared = { at: Date.now(), p };
  p.catch(() => {
    if (shared?.p === p) shared = null;
  });
  return p;
}

// How many clips wait for review (per the person's own setting). Refreshes every minute,
// when the page is pulled to refresh, and when the setting changes.
export function useReviewBadge(): number {
  const auth = useAuth();
  const [count, setCount] = useState(0);
  const load = useCallback(() => {
    if (auth.ownOnly) return;
    fetchBadge()
      .then((d) => setCount(countReview(d.review, readReviewMode(), auth.staffId)))
      .catch(() => {});
  }, [auth.ownOnly, auth.staffId]);
  const refresh = useCallback(() => {
    shared = null;
    load();
  }, [load]);
  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), 90_000);
    window.addEventListener("pp:refresh", refresh);
    window.addEventListener(REVIEW_PREF_EVENT, load);
    return () => {
      clearInterval(t);
      window.removeEventListener("pp:refresh", refresh);
      window.removeEventListener(REVIEW_PREF_EVENT, load);
    };
  }, [load, refresh]);
  return count;
}
