"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { clearMemo } from "@/lib/offline/cache";

const TRIGGER = 72; // px of pull needed
const MAX = 110;
const AWAY_MS = 60_000; // coming back after this long counts as "open again"

// Pull the page down from the very top on a phone → everything reloads fresh (like other
// apps). Also: when the app/tab is shown again after a minute away, drop the reuse cache and
// tell the bell/inbox to refresh — so data is fresh when you come back without polling in the
// background. Desktop keeps its reload button; this only reacts to touch.
export function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const start = useRef<number | null>(null);
  const pulling = useRef(0);

  useEffect(() => {
    let hiddenAt = 0;
    function onVis() {
      if (document.visibilityState === "hidden") hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > AWAY_MS) {
        clearMemo();
        window.dispatchEvent(new Event("pp:refresh"));
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    // a scroller of its own (list, sheet, video feed) must keep its own gestures
    function ownsGesture(el: HTMLElement | null) {
      if (location.pathname.startsWith("/v2/review")) return true;
      for (let n = el; n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.position === "fixed") return true;
        if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && n.scrollHeight > n.clientHeight) return true;
      }
      return false;
    }
    function onStart(e: TouchEvent) {
      if (busy || e.touches.length !== 1 || window.scrollY > 0 || ownsGesture(e.target as HTMLElement)) {
        start.current = null;
        return;
      }
      start.current = e.touches[0].clientY;
    }
    function onMove(e: TouchEvent) {
      if (start.current == null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy <= 0 || window.scrollY > 0) {
        pulling.current = 0;
        setPull(0);
        return;
      }
      pulling.current = Math.min(MAX, dy * 0.5);
      setPull(pulling.current);
    }
    function onEnd() {
      if (start.current == null) return;
      start.current = null;
      if (pulling.current >= TRIGGER * 0.5 * 1.4) {
        setBusy(true);
        setPull(TRIGGER * 0.6);
        clearMemo();
        setTimeout(() => window.location.reload(), 150);
      } else {
        setPull(0);
      }
      pulling.current = 0;
    }
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    document.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchmove", onMove);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onEnd);
    };
  }, [busy]);

  if (pull <= 0 && !busy) return null;
  const ready = pull >= TRIGGER * 0.7;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[90] flex justify-center md:hidden" style={{ transform: `translateY(${Math.max(0, pull - 28)}px)` }} aria-hidden>
      <div className={`flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-gray-100 ${ready ? "text-brand-600" : "text-gray-400"}`}>
        <RefreshCw size={18} className={busy ? "animate-spin" : ""} style={busy ? undefined : { transform: `rotate(${pull * 4}deg)` }} />
      </div>
    </div>
  );
}
