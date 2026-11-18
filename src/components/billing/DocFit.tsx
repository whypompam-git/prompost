"use client";

import { useEffect, useRef, useState } from "react";

const DOC_PX = 794; // A4 width (210 mm) at 96 dpi

// A4 documents are 210 mm wide: on a phone that is far wider than the screen. Shrink the preview to
// fit the width (the download/print still uses the full-size document).
export function DocFit({ children }: { children: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState<number | undefined>();

  useEffect(() => {
    const measure = () => {
      const w = box.current?.clientWidth ?? DOC_PX;
      const s = Math.min(1, (w - 16) / DOC_PX);
      setScale(s);
      setHeight(inner.current ? inner.current.offsetHeight * s : undefined);
    };
    measure();
    window.addEventListener("resize", measure);
    const ro = typeof ResizeObserver !== "undefined" && inner.current ? new ResizeObserver(measure) : null;
    if (ro && inner.current) ro.observe(inner.current);
    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, []);

  return (
    <div ref={box} className="w-full overflow-hidden print:!h-auto print:overflow-visible" style={{ height }}>
      <div ref={inner} className="mx-auto origin-top print:!scale-100" style={{ width: DOC_PX, transform: `scale(${scale})`, transformOrigin: "top center" }}>
        {children}
      </div>
    </div>
  );
}
