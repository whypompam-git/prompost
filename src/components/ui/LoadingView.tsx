import Image from "next/image";
import { APP_LOGO_SRC } from "@/config/branding";

// Shown while a page loads: the PromPost logo with a soft orange glow turning around it.
// One steady element (no blocks that restart and flicker as several loading states follow
// each other during a single navigation).
export function LoadingView() {
  return (
    <div className="flex flex-1 items-center justify-center p-8" aria-busy="true" aria-label="กำลังโหลด">
      <div className="pp-glow relative flex h-24 w-24 items-center justify-center">
        <span className="pp-glow-ring" aria-hidden="true" />
        <Image src={APP_LOGO_SRC} alt="" width={64} height={64} priority className="relative h-16 w-16 rounded-2xl shadow-card" />
      </div>
      <span className="sr-only">กำลังโหลด...</span>
    </div>
  );
}
