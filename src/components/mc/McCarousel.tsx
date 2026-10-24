"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

// Big profile picture; several pictures scroll sideways (swipe, arrows or dots).
export function McCarousel({ photos }: { photos: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const next = Math.max(0, Math.min(photos.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[4/5] w-full items-center justify-center bg-gray-100 text-gray-300">
        <UserRound size={64} />
      </div>
    );
  }

  return (
    <div className="group relative bg-gray-100">
      <div
        ref={ref}
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((url) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={url} src={url} alt="" className="aspect-[4/5] w-full shrink-0 snap-center object-cover" />
        ))}
      </div>
      {photos.length > 1 && (
        <>
          <button
            onClick={() => go(index - 1)}
            className={cn("absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white print:hidden", index === 0 && "invisible")}
            aria-label="รูปก่อนหน้า"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => go(index + 1)}
            className={cn("absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-1.5 text-white print:hidden", index === photos.length - 1 && "invisible")}
            aria-label="รูปถัดไป"
          >
            <ChevronRight size={18} />
          </button>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 print:hidden">
            {photos.map((_, i) => (
              <button key={i} onClick={() => go(i)} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-4 bg-white" : "w-1.5 bg-white/60")} aria-label={`รูปที่ ${i + 1}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
