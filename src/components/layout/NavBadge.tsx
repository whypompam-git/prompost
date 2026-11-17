export function NavBadge({ n }: { n: number }) {
  if (n <= 0) return null;
  return <span className="absolute -right-2 -top-1.5 min-w-[18px] rounded-full bg-rose-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white">{n > 99 ? "99+" : n}</span>;
}
