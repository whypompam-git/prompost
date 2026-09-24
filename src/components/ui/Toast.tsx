"use client";

import { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

export function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1600);
    return () => clearTimeout(t);
  }, [message, onDone]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 md:bottom-8">
      <div className="pp-pop-menu flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-xl">
        <CheckCircle2 size={16} className="text-emerald-400" />
        {message}
      </div>
    </div>
  );
}
