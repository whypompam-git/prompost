"use client";

import { useState } from "react";
import Image from "next/image";
import { APP_LOGO_SRC } from "@/config/branding";
import { WorkspaceSwitcher } from "@/components/workspace/WorkspaceSwitcher";
import { cn } from "@/lib/utils";

// The PromPost logo (top left) opens the workspace list: pick the workspace you work in,
// or create / join another one.
export function WorkspaceMenuButton({ size = 32, className }: { size?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={cn("shrink-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300", className)} aria-label="เลือก Workspace" title="เลือก Workspace">
        <Image src={APP_LOGO_SRC} alt="" width={size} height={size} className="rounded-lg" style={{ width: size, height: size }} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute left-3 top-14 w-[min(20rem,calc(100vw-1.5rem))]" onClick={(e) => e.stopPropagation()}>
            <WorkspaceSwitcher />
          </div>
        </div>
      )}
    </>
  );
}
