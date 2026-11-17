"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { REVIEW_PREF_EVENT, countReview, readReviewMode } from "@/lib/reviewBadge";
import { listQcTaskOwners } from "@/lib/supabase/queries";

// How many clips wait for review (per the person's own setting). Refreshes every minute,
// when the page is pulled to refresh, and when the setting changes.
export function useReviewBadge(): number {
  const auth = useAuth();
  const [count, setCount] = useState(0);
  const load = useCallback(() => {
    if (auth.ownOnly) return;
    listQcTaskOwners()
      .then((items) => setCount(countReview(items, readReviewMode(), auth.staffId)))
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
