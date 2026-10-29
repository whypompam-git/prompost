// Owner-configurable per-staff access. The owner always has everything.
export const PERMISSION_KEYS = [
  "accounting",
  "documents",
  "financialTotals",
  "staffList",
  "othersPayroll",
  "mc",
  "studio",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];
export type Permissions = Record<PermissionKey, boolean>;

export const PERMISSION_LABELS: Record<PermissionKey, { label: string; hint: string }> = {
  accounting: { label: "หน้าบัญชี", hint: "เข้าหน้าบัญชี (รายการรายรับ-รายจ่าย)" },
  documents: { label: "หน้าเอกสาร", hint: "ใบเสนอราคา ใบแจ้งหนี้ ใบเสร็จ" },
  financialTotals: { label: "สรุปยอดรายรับ-รายจ่ายรวม", hint: "รายรับรวม รายจ่ายรวม กำไรสุทธิ" },
  staffList: { label: "รายชื่อพนักงาน", hint: "เห็นรายชื่อและตำแหน่งของทีมงานทั้งหมด" },
  othersPayroll: { label: "เงินเดือนของคนอื่น", hint: "เห็นตารางเงินเดือนของพนักงานทุกคน" },
  mc: { label: "หน้า MC", hint: "ดูโปรไฟล์ MC (รวมเบอร์โทร/Line) และสร้างชุดเสนอลูกค้า" },
  studio: { label: "AI สคริปต์", hint: "ดู/แก้ข้อมูล context ลูกค้าสำหรับ AI และใช้เมนู AI สคริปต์" },
};

export const NO_PERMISSIONS: Permissions = {
  accounting: false,
  documents: false,
  financialTotals: false,
  staffList: false,
  othersPayroll: false,
  mc: false,
  studio: false,
};

export const ALL_PERMISSIONS: Permissions = {
  accounting: true,
  documents: true,
  financialTotals: true,
  staffList: true,
  othersPayroll: true,
  mc: true,
  studio: true,
};

// legacyAccounting: the old can_view_accounting flag, honored until the
// owner saves the staff member once with the new toggles.
export function normalizePermissions(
  raw: Partial<Record<string, boolean>> | null | undefined,
  legacyAccounting = false,
): Permissions {
  const out = { ...NO_PERMISSIONS };
  for (const k of PERMISSION_KEYS) out[k] = Boolean(raw?.[k]);
  if (raw?.accounting === undefined && legacyAccounting) {
    out.accounting = true;
    out.documents = true;
    out.financialTotals = true;
  }
  return out;
}
