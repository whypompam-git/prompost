"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { PALETTE, type ColorStem } from "@/lib/colors";
import { cn } from "@/lib/utils";

// Square app-icon tiles (like a phone home screen / a menu board).
export function AppGrid({ children, dense = false }: { children: React.ReactNode; dense?: boolean }) {
  return <div className={cn("grid gap-3", dense ? "grid-cols-3 sm:grid-cols-5 lg:grid-cols-7" : "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6")}>{children}</div>;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.trim().slice(0, 2)).toUpperCase();
}

const stem = (c?: string): ColorStem => (c && c in PALETTE ? (c as ColorStem) : "orange");

// A client: logo (or initials on the client's colour) + name. `alert` = red dot.
export function ClientTile({ href, name, logo, color, alert }: { href: string; name: string; logo?: string; color?: string; alert?: boolean }) {
  return (
    <Link href={href} className="group flex flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300">
      <span className="relative block aspect-square w-full max-w-[110px] overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition group-hover:shadow-md group-active:scale-95">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="" className="h-full w-full object-contain p-2" />
        ) : (
          <span className={cn("flex h-full w-full items-center justify-center text-2xl font-bold text-white", PALETTE[stem(color)].solid)}>{initials(name)}</span>
        )}
        {alert && <span className="absolute right-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-white bg-rose-500" aria-label="มีงานรอ" />}
      </span>
      <span className="line-clamp-2 w-full text-xs font-medium leading-tight text-gray-800">{name}</span>
    </Link>
  );
}

// A feature inside a client: icon + label.
export function FeatureTile({ href, label, icon: Icon, color = "orange", note, external }: { href: string; label: string; icon: LucideIcon; color?: ColorStem; note?: string; external?: boolean }) {
  const inner = (
    <>
      <span className={cn("flex aspect-square w-full max-w-[96px] items-center justify-center rounded-2xl shadow-card transition group-active:scale-95", PALETTE[color].pill)}>
        <Icon size={30} />
      </span>
      <span className="text-xs font-semibold leading-tight text-gray-800">{label}</span>
      {note && <span className="-mt-1 text-[10px] text-gray-400">{note}</span>}
    </>
  );
  const cls = "group flex flex-col items-center gap-1.5 rounded-2xl p-1.5 text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-300";
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {inner}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}
