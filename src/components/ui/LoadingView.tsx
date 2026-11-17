"use client";

import { useState } from "react";

// Placeholder while a page loads: soft shimmering blocks shaped like content. Several of
// these can mount one after another during a single navigation (route loading, then the page's
// own loading), so the shimmer starts at the same point of a shared clock every time —
// otherwise each remount restarts it and the grey blocks flicker.
export function LoadingView() {
  const [phase] = useState(() => `-${Date.now() % 1600}ms`);
  const style = { animationDelay: phase };
  return (
    <div className="flex-1 space-y-3 p-4 sm:p-6" aria-busy="true" aria-label="กำลังโหลด" suppressHydrationWarning>
      <div className="pp-skel h-6 w-40 rounded-lg" style={style} />
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="pp-skel aspect-square rounded-2xl" style={style} />
        ))}
      </div>
      <div className="pp-skel h-20 rounded-2xl" style={style} />
      <div className="pp-skel h-20 rounded-2xl" style={style} />
      <span className="sr-only">กำลังโหลด...</span>
    </div>
  );
}
