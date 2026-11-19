// Waitlist sign-up options, shared by the public page, the server route and the staff list.
export const ROLES = [
  ["creator", "ครีเอเตอร์ / ทำคอนเทนต์เอง"],
  ["agency", "เอเจนซี่ / รับทำคอนเทนต์ให้ลูกค้า"],
  ["editor", "ทีมตัดต่อ / โปรดักชั่น"],
  ["brand", "เจ้าของแบรนด์ / ธุรกิจ"],
  ["other", "อื่นๆ"],
] as const;
export const TEAM_SIZES = [["solo", "คนเดียว"], ["2-5", "2–5 คน"], ["6-15", "6–15 คน"], ["16+", "16 คนขึ้นไป"]] as const;
export const CLIENT_COUNTS = [["0-3", "0–3 ราย/ช่อง"], ["4-10", "4–10 ราย/ช่อง"], ["11-30", "11–30 ราย/ช่อง"], ["30+", "มากกว่า 30"]] as const;
export const SOURCES = [["tiktok", "TikTok"], ["facebook", "Facebook"], ["instagram", "Instagram"], ["youtube", "YouTube"], ["friend", "เพื่อน / คนแนะนำ"], ["other", "อื่นๆ"]] as const;
export const INTERESTS = [
  ["pipeline", "จัดการคลิปทุกขั้นตอน Plan → โพส"],
  ["review", "ตรวจดราฟแบบเลื่อนดูคลิป + คอมเมนต์ตามวินาที"],
  ["portal", "ลิงก์ให้ลูกค้าตรวจและอนุมัติเอง"],
  ["calendar", "ปฏิทิน / ดูภาระงานทีม"],
  ["notify", "แจ้งเตือนทีมผ่าน LINE"],
  ["docs", "ใบเสนอราคา / ใบแจ้งหนี้ / บัญชี"],
] as const;
export const STATUS_LABEL: Record<string, string> = { new: "ใหม่", contacted: "ติดต่อแล้ว", invited: "เชิญแล้ว", joined: "เข้าใช้แล้ว", declined: "ไม่สนใจ" };
export const labelOf = (list: readonly (readonly [string, string])[], v: string) => list.find((x) => x[0] === v)?.[1] ?? v;

export const normalizePhone = (s: string) => s.replace(/[^\d+]/g, "").replace(/^\+66/, "0");
export const validPhone = (s: string) => /^0\d{8,9}$/.test(s);
export const validEmail = (s: string) => s === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

// LINE the people add after signing up (same official account as the gift shop by default)
export const WAITLIST_LINE_URL = "https://lin.ee/Zb7zhUI";
export const DONE_KEY = "prompost:waitlist-done";
