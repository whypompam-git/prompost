import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "PromPost · ลงชื่อรอใช้งานก่อนใคร",
  description: "ระบบจัดการงานคอนเทนต์วิดีโอครบวงจร ตั้งแต่วางแผน ถ่าย ตัดต่อ ตรวจดราฟ ให้ลูกค้าอนุมัติ ไปจนถึงโพส ลงชื่อรอเป็นกลุ่มแรกที่ได้ใช้",
  manifest: null,
  openGraph: { title: "PromPost · ลงชื่อรอใช้งานก่อนใคร", description: "ระบบจัดการงานคอนเทนต์วิดีโอครบวงจรสำหรับทีมและเอเจนซี่", type: "website" },
};
export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function WaitlistLayout({ children }: { children: React.ReactNode }) {
  return <div className="fixed inset-0 overflow-y-auto bg-white text-gray-900">{children}</div>;
}
