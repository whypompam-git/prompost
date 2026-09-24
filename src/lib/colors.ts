// Named palette used for user-configurable colors (task types, statuses,
// staff, clients). Full class strings so Tailwind keeps them.
export const PALETTE = {
  gray: { pill: "bg-gray-100 text-gray-700", solid: "bg-gray-500", label: "เทา" },
  orange: { pill: "bg-orange-100 text-orange-700", solid: "bg-orange-500", label: "ส้ม" },
  amber: { pill: "bg-amber-100 text-amber-700", solid: "bg-amber-500", label: "เหลือง" },
  emerald: { pill: "bg-emerald-100 text-emerald-700", solid: "bg-emerald-500", label: "เขียว" },
  teal: { pill: "bg-teal-100 text-teal-700", solid: "bg-teal-500", label: "เขียวน้ำทะเล" },
  sky: { pill: "bg-sky-100 text-sky-700", solid: "bg-sky-500", label: "ฟ้า" },
  blue: { pill: "bg-blue-100 text-blue-700", solid: "bg-blue-500", label: "น้ำเงิน" },
  violet: { pill: "bg-violet-100 text-violet-700", solid: "bg-violet-500", label: "ม่วง" },
  pink: { pill: "bg-pink-100 text-pink-700", solid: "bg-pink-500", label: "ชมพู" },
  rose: { pill: "bg-rose-100 text-rose-700", solid: "bg-rose-500", label: "แดง" },
} as const;

export type ColorStem = keyof typeof PALETTE;
export const COLOR_STEMS = Object.keys(PALETTE) as ColorStem[];

export function isStem(v: string | undefined | null): v is ColorStem {
  return !!v && v in PALETTE;
}

export function pillClass(stem: string | undefined | null): string {
  return PALETTE[isStem(stem) ? stem : "gray"].pill;
}

// "bg-orange-500" (Staff.avatarColor) → "orange"
export function stemFromBg(cls: string | undefined | null): ColorStem {
  const m = /^bg-([a-z]+)-\d+$/.exec(cls ?? "");
  return m && isStem(m[1]) ? m[1] : "gray";
}
