"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { REVIEW_PREF_EVENT, countReview, readReviewMode, type BadgeData } from "@/lib/reviewBadge";

// How many clips wait for review (per the person's own setting). Refreshes every minute,
// when the page is pulled to refresh, and when the setting changes.
export function useReviewBadge(): number {
  const auth = useAuth();
  const [count, setCount] = useState(0);
  const load = useCallback(() => {
    if (auth.ownOnly) return;
    fetch("/api/drafts/badge", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: BadgeData) => setCount(countReview(d.review, readReviewMode(), auth.staffId)))
      .catch(() => {});
  }, [auth.ownOnly, auth.staffId]);
  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    window.addEventListener("pp:refresh", load);
    window.addEventListener(REVIEW_PREF_EVENT, load);
    return () => {
      clearInterval(t);
      window.removeEventListener("pp:refresh", load);
      window.removeEventListener(REVIEW_PREF_EVENT, load);
    };
  }, [load]);
  return count;
}
