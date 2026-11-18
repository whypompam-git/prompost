import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-serif" });

// The gift page is its own little shop: nothing here should say PromPost.
export const metadata: Metadata = {
  title: "Gift",
  description: "Gift order",
  manifest: null,
  icons: { icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230a0a0a'/%3E%3Cpath d='M16 5l3 8 8 3-8 3-3 8-3-8-8-3 8-3z' fill='%23d4af37'/%3E%3C/svg%3E" },
  appleWebApp: { capable: true, statusBarStyle: "black", title: "Gift" },
};
export const viewport: Viewport = { themeColor: "#0a0a0a", width: "device-width", initialScale: 1 };

export default function GiftLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${serif.variable} fixed inset-0 overflow-y-auto bg-[#0a0a0a] text-[#f5f1e6]`}>{children}</div>;
}
