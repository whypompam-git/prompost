import type { ContractInstallment, ContractParty, ContractTemplate } from "@/lib/types";

// Starting template. Edited in the app (Documents → Contracts → template);
// {{variables}} are filled when a contract is created, "[ระบุ…]" placeholders
// are left for the person to fill in the contract editor.
export const DEFAULT_CONTRACT_TEMPLATE: ContractTemplate = {
  title: "สัญญาจ้างทำคอนเทนต์และสื่อโฆษณาออนไลน์",
  intro: "สัญญาฉบับนี้ทำขึ้น ณ วันที่ {{sign_date}} โดยและระหว่าง:",
  clauses: [
    {
      heading: "ข้อ 1. ขอบเขตงานบริการ (Scope of Work)",
      body: `ผู้รับจ้างตกลงให้บริการผลิตคอนเทนต์วิดีโอและวางแผนสื่อออนไลน์ให้แก่ผู้ว่าจ้าง ตามรายละเอียดแพ็กเกจที่เลือกดังนี้:
- แพ็กเกจที่เลือก: {{package}}
- การวางแผนและสคริปต์: จัดทำแผนคอนเทนต์รายเดือน พร้อมคิดสคริปต์วิดีโอ จำนวน [ระบุจำนวน] คลิป (ความยาวคลิปละประมาณ 1-2 นาที)
- การถ่ายทำ (Shooting): ลงพื้นที่ถ่ายทำ ณ สถานที่ที่ตกลงกัน จำนวน [ระบุจำนวน] คิว (พื้นที่ชลบุรี/ตามระยะทางที่ตกลง)
- การตัดต่อ (Post-Production): ตัดต่อวิดีโอพร้อมใส่ซับไตเติล, เอฟเฟกต์เสียง และกราฟิกประกอบพื้นฐาน
- การแก้ไขงาน: สามารถแก้ไขงานตัดต่อได้ฟรี [ระบุจำนวน] ครั้ง/คลิป (ภายใต้กรอบสคริปต์ที่อนุมัติแล้ว)
- บริการเสริม (ถ้ามี): [ระบุ เช่น ถ่ายภาพนิ่งเมนูอาหาร 10 ภาพ / ยิงโฆษณา / MC ออกหน้ากล้อง]`,
    },
    {
      heading: "ข้อ 2. ระยะเวลาการดำเนินงาน",
      body: `สัญญานี้มีผลบังคับใช้ตั้งแต่วันที่ {{start_date}} ถึงวันที่ {{end_date}}
โดยมีกำหนดการส่งมอบงานและการลงถ่ายทำตามที่ทั้งสองฝ่ายได้วางแผนร่วมกันใน Content Calendar ประจำเดือน`,
    },
    {
      heading: "ข้อ 3. ค่าบริการ เงื่อนไข และงวดการชำระเงิน",
      body: `1. มูลค่าสัญญารวม: คู่สัญญาตกลงค่าบริการตามสัญญานี้เป็นจำนวนเงินทั้งสิ้น {{total}} บาท ({{total_text}}) (ราคานี้ยังไม่รวมค่าเดินทางนอกพื้นที่ที่ระบุไว้ และบริการเสริม Add-on อื่นๆ)
2. งวดการชำระเงิน:
{{installments}}
3. ช่องทางการชำระเงิน: {{bank}}`,
    },
    {
      heading: "ข้อ 4. การตรวจรับงาน การแก้ไข และการเลื่อนคิว",
      body: `1. การตรวจรับงาน: เมื่อผู้รับจ้างส่งมอบงานตัดต่อในแต่ละชิ้นงาน ผู้ว่าจ้างต้องทำการตรวจรับและแจ้งแก้ไข (ถ้ามี) ภายใน 3 วันทำการ นับจากวันที่ได้รับงาน หากพ้นกำหนดโดยไม่มีการแจ้งตอบกลับ ถือว่าผู้ว่าจ้างได้ตรวจรับและอนุมัติงานชิ้นนั้นแล้ว
2. เงื่อนไขการแก้ไข: การขอแก้ไขงานต้องอยู่บนพื้นฐานของสคริปต์และข้อตกลงที่อนุมัติก่อนการถ่ายทำ หากผู้ว่าจ้างต้องการเปลี่ยนโครงสร้างสคริปต์ใหม่ทั้งหมด หรือต้องการถ่ายทำใหม่เนื่องจากการเปลี่ยนใจของผู้ว่าจ้าง จะมีค่าบริการเพิ่มเติมตามตกลง
3. การเลื่อนคิวถ่ายทำ: หากผู้ว่าจ้างมีความจำเป็นต้องเลื่อนคิวถ่ายทำ ต้องแจ้งให้ผู้รับจ้างทราบล่วงหน้าอย่างน้อย 3 วัน หากแจ้งกระทันหันน้อยกว่า 24 ชั่วโมง ผู้ว่าจ้างยินยอมชำระค่าเสียเวลาและค่าเตรียมอุปกรณ์เพิ่มเติม [ระบุ เช่น 1,000 บาท/ครั้ง]`,
    },
    {
      heading: "ข้อ 5. สิทธิ์ในผลงาน ลิขสิทธิ์ และภาพถ่ายบุคคล",
      body: `1. สิทธิ์การใช้งานของผู้ว่าจ้าง: ผู้ว่าจ้างมีสิทธิ์นำผลงานวิดีโอและสื่อที่ส่งมอบเรียบร้อยแล้ว ไปเผยแพร่ ประชาสัมพันธ์ หรือยิงโฆษณา (Boost Post) ในช่องทางโซเชียลมีเดียของแบรนด์ตนเองได้ตลอดระยะเวลาที่ต้องการ
2. สิทธิ์ในการแสดงผลงานของผู้รับจ้าง: ผู้รับจ้างมีสิทธิ์นำผลงานบางส่วนหรือทั้งหมดไปใช้เป็น ผลงานสะสม (Portfolio) เพื่อการประชาสัมพันธ์หรือนำเสนอโฆษณาบริการของผู้รับจ้างได้
3. ลิขสิทธิ์เพลงและเสียงประกอบ: ผู้รับจ้างจะเลือกใช้เพลง/เสียงประกอบที่ถูกต้องตามลิขสิทธิ์สำหรับการใช้งานบน Social Media หากผู้ว่าจ้างนำไปใช้ในสื่อดั้งเดิม (เช่น TV, วิทยุ) หรือช่องทางอื่นนอกเหนือข้อตกลง ผู้ว่าจ้างต้องเป็นผู้รับผิดชอบค่าลิขสิทธิ์เพิ่มเติมด้วยตนเอง`,
    },
    {
      heading: "ข้อ 6. การยกเลิกสัญญาและการผิดนัด",
      body: `1. หากผู้ว่าจ้างขอยกเลิกสัญญากลางคันโดยไม่ใช่ความผิดของผู้รับจ้าง เงินมัดจำงวดแรกจะไม่สามารถขอคืนได้ และผู้ว่าจ้างต้องชำระค่าบริการตามส่วนงานที่ได้ดำเนินการไปแล้วจริง
2. หากผู้ว่าจ้างชำระเงินล่าช้าเกินกว่า 7 วันนับจากวันครบกำหนด ผู้รับจ้างขอสงวนสิทธิ์ในการชะลอการส่งมอบงาน หรือระงับการถ่ายทำคิวถัดไป จนกว่าจะได้รับชำระเงินเรียบร้อย`,
    },
    {
      heading: "ข้อ 7. การลงนามและผลทางกฎหมาย",
      body: `สัญญานี้ทำขึ้นเป็นเอกสารอิเล็กทรอนิกส์ การแสดงเจตนาตกลง ยอมรับ หรือลงลายมือชื่ออิเล็กทรอนิกส์ (E-Signature / ลายเซ็นผ่านระบบออนไลน์) ให้ถือว่าเอกสารฉบับนี้มีผลผูกพันตามกฎหมายทุกประการ`,
    },
  ],
  closing: "คู่สัญญาได้อ่านและเข้าใจข้อความในสัญญานี้โดยละเอียดตลอดแล้ว จึงได้ลงลายมือชื่อไว้เป็นสำคัญ",
};

export const TEMPLATE_VARIABLES: { key: string; hint: string }[] = [
  { key: "sign_date", hint: "วันที่ทำสัญญา" },
  { key: "start_date", hint: "วันเริ่มสัญญา" },
  { key: "end_date", hint: "วันสิ้นสุดสัญญา" },
  { key: "package", hint: "ชื่อแพ็กเกจ" },
  { key: "total", hint: "มูลค่าสัญญารวม (ตัวเลข)" },
  { key: "total_text", hint: "มูลค่าสัญญารวม (ตัวอักษร)" },
  { key: "installments", hint: "รายการงวดชำระ (หลายบรรทัด)" },
  { key: "bank", hint: "ช่องทางชำระเงิน" },
  { key: "client_name", hint: "ชื่อผู้ว่าจ้าง" },
  { key: "seller_name", hint: "ชื่อผู้รับจ้าง" },
];

export const thaiLongDate = (iso?: string) =>
  iso
    ? new Date(`${iso.slice(0, 10)}T12:00:00+07:00`).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Bangkok",
      })
    : "[ระบุวันที่]";

const DIGITS = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const POSITIONS = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function readBelowMillion(n: number): string {
  const s = String(n);
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    const pos = s.length - i - 1;
    if (d === 0) continue;
    if (pos === 0 && d === 1 && s.length > 1) out += "เอ็ด";
    else if (pos === 1 && d === 2) out += "ยี่สิบ";
    else if (pos === 1 && d === 1) out += "สิบ";
    else out += DIGITS[d] + POSITIONS[pos];
  }
  return out;
}

function readInteger(n: number): string {
  if (n === 0) return DIGITS[0];
  const million = Math.floor(n / 1_000_000);
  const rest = n % 1_000_000;
  return (million > 0 ? `${readInteger(million)}ล้าน` : "") + (rest > 0 ? readBelowMillion(rest) : "");
}

export function thaiBahtText(amount: number): string {
  const baht = Math.floor(amount);
  const satang = Math.round((amount - baht) * 100);
  const bahtText = `${readInteger(baht)}บาท`;
  return satang === 0 ? `${bahtText}ถ้วน` : `${bahtText}${readBelowMillion(satang)}สตางค์`;
}

const baht = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export function installmentsText(items: ContractInstallment[]): string {
  if (items.length === 0) return "[ระบุงวดการชำระเงิน]";
  return items
    .map((i, idx) => {
      const pct = i.percent ? ` ${i.percent}%` : "";
      const due = i.due ? `ภายในวันที่ ${thaiLongDate(i.due)}` : "ณ วันลงนามในสัญญานี้";
      return `   * ${i.label || `งวดที่ ${idx + 1}`}${pct}: จำนวนเงิน ${baht(i.amount)} บาท ${due}`;
    })
    .join("\n");
}

export type ContractVariables = {
  signDate: string;
  startDate?: string;
  endDate?: string;
  packageName?: string;
  total: number;
  installments: ContractInstallment[];
  bank?: string;
  client: ContractParty;
  seller: ContractParty;
};

export function fillVariables(text: string, v: ContractVariables): string {
  const map: Record<string, string> = {
    sign_date: thaiLongDate(v.signDate),
    start_date: thaiLongDate(v.startDate),
    end_date: thaiLongDate(v.endDate),
    package: v.packageName || "[ระบุชื่อแพ็กเกจ]",
    total: baht(v.total),
    total_text: thaiBahtText(v.total),
    installments: installmentsText(v.installments),
    bank: v.bank || "[ระบุชื่อธนาคาร / เลขที่บัญชี / ชื่อบัญชี]",
    client_name: v.client.name,
    seller_name: v.seller.name,
  };
  return text.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => map[key] ?? whole);
}

export function findPlaceholders(texts: string[]): string[] {
  const found = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(/\[ระบุ[^\]]*\]/g)) found.add(m[0]);
  return [...found];
}
