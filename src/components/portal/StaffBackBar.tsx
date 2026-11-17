"use client";

import { ArrowLeft } from "lucide-react";

// Shown only to staff looking at a client's link from inside the system: a way back, because a
// phone app opened from the home screen has no browser back button on pages opened from it.
export function StaffBackBar() {
  function back() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = window.matchMedia("(max-width: 767px)").matches ? "/v2/clients" : "/dashboard";
  }
  return (
    <button
      onClick={back}
      className="fixed left-2 top-[max(0.5rem,env(safe-area-inset-top))] z-[60] flex items-center gap-1 rounded-full bg-black/70 py-1.5 pl-2 pr-3 text-xs font-semibold text-white shadow-lg backdrop-blur"
    >
      <ArrowLeft size={14} /> กลับระบบ
    </button>
  );
}
