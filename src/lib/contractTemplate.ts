import type { ContractInstallment, ContractKind, ContractParty, ContractTemplate, ContractTerms } from "@/lib/types";

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

// Team member on a monthly service agreement — hired for monthly deliverables, NOT an employee.
export const DEFAULT_MONTHLY_TEMPLATE: ContractTemplate = {
  title: "สัญญาจ้างบริการรายเดือน (ผลิตคอนเทนต์)",
  intro: "สัญญาฉบับนี้ทำขึ้น ณ วันที่ {{sign_date}} โดยและระหว่าง:",
  clauses: [
    {
      heading: "ข้อ 1. ขอบเขตงาน (Scope of Work)",
      body: `ผู้รับจ้างตกลงรับจ้างให้บริการผลิตคอนเทนต์แก่ผู้ว่าจ้าง โดยวัดผลจากผลงานที่ส่งมอบในแต่ละเดือน ดังนี้:
- ตัดต่อวิดีโอ: {{clips_per_month}} คลิปต่อเดือน
- ลงถ่ายทำ: {{shoot_days_per_month}} วัน/คิวต่อเดือน (ตามคิวที่นัดหมายล่วงหน้า)
- รายละเอียดงานอื่น: [ระบุ เช่น ความยาวคลิป ใส่ซับไตเติล]
- การแก้ไขงาน: แก้ไขได้ [ระบุจำนวน] ครั้งต่อคลิป ภายใต้บรีฟที่ตกลงกัน`,
    },
    {
      heading: "ข้อ 2. ระยะเวลาสัญญา",
      body: `สัญญานี้มีผลตั้งแต่วันที่ {{start_date}} ถึงวันที่ {{end_date}} (รวม {{term_months}} เดือน) เมื่อครบกำหนดคู่สัญญาอาจตกลงต่อสัญญาฉบับใหม่ได้`,
    },
    {
      heading: "ข้อ 3. การส่งมอบงานและวิธีทำงาน",
      body: `1. ผู้รับจ้างส่งมอบงานตามกำหนดส่ง (เดดไลน์) ของแต่ละงานที่ผู้ว่าจ้างแจ้งผ่านระบบ และเข้าร่วมคิวถ่ายทำตามวันที่นัดหมาย
2. ผู้รับจ้างมีอิสระในการบริหารเวลาและวิธีทำงานของตนเอง ไม่มีการกำหนดเวลาเข้า-ออกงาน ผู้ว่าจ้างพิจารณาจากผลงานที่ส่งมอบเป็นสำคัญ`,
    },
    {
      heading: "ข้อ 4. ค่าบริการและการชำระเงิน",
      body: `1. ค่าบริการเดือนละ {{monthly_fee}} บาท ({{monthly_fee_text}})
2. ผู้ว่าจ้างชำระค่าบริการทุกวันที่ {{pay_day}} ของเดือน เมื่อผู้รับจ้างส่งมอบงานครบตามขอบเขตของเดือนนั้น หากส่งไม่ครบ ผู้ว่าจ้างจ่ายตามสัดส่วนผลงานหรือตามที่ตกลงกัน
3. ภาษี: {{withholding_text}}
4. ทุกครั้งที่รับเงิน ผู้รับจ้างลงนามในใบสำคัญรับเงินผ่านระบบออนไลน์ของผู้ว่าจ้าง`,
    },
    {
      heading: "ข้อ 5. ลิขสิทธิ์และกรรมสิทธิ์ในผลงาน",
      body: `วิดีโอ ภาพ ฟุตเทจดิบ ไฟล์โปรเจกต์ และผลงานทั้งหมดที่ผลิตภายใต้สัญญานี้ เป็นลิขสิทธิ์และกรรมสิทธิ์ของผู้ว่าจ้างแต่เพียงผู้เดียว ผู้รับจ้างจะไม่นำไปใช้ เผยแพร่ หรือขายต่อ เว้นแต่ได้รับอนุญาตเป็นลายลักษณ์อักษร (ผู้ว่าจ้างอาจอนุญาตให้ใช้เป็นพอร์ตโฟลิโอได้ เมื่อลูกค้าเผยแพร่ผลงานแล้ว)`,
    },
    {
      heading: "ข้อ 6. การรักษาความลับ (NDA)",
      body: `ผู้รับจ้างจะไม่เปิดเผยข้อมูลของผู้ว่าจ้างและลูกค้าของผู้ว่าจ้าง เช่น ข้อมูลสินค้า แผนการตลาด ราคา สคริปต์ที่ยังไม่เผยแพร่ หรือข้อมูลภายในอื่นใด ทั้งระหว่างและหลังสิ้นสุดสัญญา`,
    },
    {
      heading: "ข้อ 7. การบอกเลิกสัญญา",
      body: `คู่สัญญาฝ่ายใดประสงค์จะเลิกสัญญาก่อนครบกำหนด ต้องแจ้งอีกฝ่ายล่วงหน้าไม่น้อยกว่า {{notice_days}} วัน และผู้รับจ้างต้องส่งมอบงานที่ค้างพร้อมไฟล์ทั้งหมดให้เรียบร้อย`,
    },
    {
      heading: "ข้อ 8. สถานะของคู่สัญญา",
      body: `สัญญานี้เป็นสัญญาจ้างทำของ/จ้างบริการ คู่สัญญาไม่มีนิติสัมพันธ์เป็นนายจ้างและลูกจ้างตามกฎหมายคุ้มครองแรงงาน ผู้รับจ้างรับผิดชอบภาระภาษีเงินได้ของตนเอง`,
    },
    {
      heading: "ข้อ 9. การลงนามและข้อมูลส่วนบุคคล",
      body: `สัญญานี้ทำเป็นเอกสารอิเล็กทรอนิกส์ การลงลายมือชื่ออิเล็กทรอนิกส์ผ่านระบบให้มีผลผูกพันตามกฎหมาย ผู้รับจ้างยินยอมให้ผู้ว่าจ้างเก็บข้อมูลส่วนบุคคลที่ให้ไว้ในสัญญาเพื่อใช้ในการทำสัญญา การจ่ายเงิน และภาษีเท่านั้น`,
    },
  ],
  closing: "คู่สัญญาได้อ่านและเข้าใจข้อความในสัญญานี้โดยละเอียดตลอดแล้ว จึงได้ลงลายมือชื่อไว้เป็นสำคัญ",
};

// Outsource: one batch of N clips at one price per clip; renewed with a new contract when done.
export const DEFAULT_FREELANCE_TEMPLATE: ContractTemplate = {
  title: "สัญญาจ้างทำของ (ตัดต่อวิดีโอ รายชุดงาน)",
  intro: "สัญญาฉบับนี้ทำขึ้น ณ วันที่ {{sign_date}} โดยและระหว่าง:",
  clauses: [
    {
      heading: "ข้อ 1. งานที่จ้าง",
      body: `ผู้ว่าจ้างตกลงจ้างและผู้รับจ้างตกลงรับจ้างตัดต่อวิดีโอ จำนวน {{clip_count}} คลิป ตามบรีฟและฟุตเทจที่ผู้ว่าจ้างส่งให้ผ่านระบบ
- รายละเอียดงาน: [ระบุ เช่น ความยาวคลิป ใส่ซับไตเติล เอฟเฟกต์]
- การแก้ไขงาน: แก้ไขได้ [ระบุจำนวน] ครั้งต่อคลิป ตามบรีฟที่ตกลงกัน`,
    },
    {
      heading: "ข้อ 2. ระยะเวลาและการส่งมอบ",
      body: `ผู้รับจ้างส่งมอบงานแต่ละคลิปตามกำหนดส่งที่ระบุในระบบ และส่งครบทั้ง {{clip_count}} คลิป ภายในวันที่ {{end_date}}`,
    },
    {
      heading: "ข้อ 3. ค่าจ้างและการชำระเงิน",
      body: `1. ค่าจ้างคลิปละ {{price_per_clip}} บาท รวม {{clip_count}} คลิป เป็นเงินทั้งสิ้น {{total}} บาท ({{total_text}})
2. การชำระเงิน:
{{installments}}
3. ภาษี: {{withholding_text}}
4. ทุกครั้งที่รับเงิน ผู้รับจ้างลงนามในใบสำคัญรับเงินผ่านระบบออนไลน์ของผู้ว่าจ้าง`,
    },
    {
      heading: "ข้อ 4. ลิขสิทธิ์และกรรมสิทธิ์ในผลงาน",
      body: `ผลงาน ฟุตเทจ และไฟล์ทั้งหมดที่ได้รับหรือผลิตภายใต้สัญญานี้ เป็นลิขสิทธิ์และกรรมสิทธิ์ของผู้ว่าจ้างแต่เพียงผู้เดียว ผู้รับจ้างจะไม่นำไปใช้ เผยแพร่ หรือเก็บสำเนาไว้หลังส่งมอบ เว้นแต่ได้รับอนุญาตเป็นลายลักษณ์อักษร`,
    },
    {
      heading: "ข้อ 5. การรักษาความลับ (NDA)",
      body: `ผู้รับจ้างจะไม่เปิดเผยข้อมูลของผู้ว่าจ้างและลูกค้าของผู้ว่าจ้าง รวมถึงฟุตเทจและสคริปต์ที่ยังไม่เผยแพร่ ทั้งระหว่างและหลังสิ้นสุดสัญญา`,
    },
    {
      heading: "ข้อ 6. สถานะของคู่สัญญาและการต่อสัญญา",
      body: `สัญญานี้เป็นสัญญาจ้างทำของ คู่สัญญาไม่มีนิติสัมพันธ์เป็นนายจ้างและลูกจ้าง เมื่อส่งมอบงานครบตามสัญญา ผู้ว่าจ้างอาจพิจารณาจ้างงานชุดถัดไปด้วยสัญญาฉบับใหม่`,
    },
    {
      heading: "ข้อ 7. การลงนามและข้อมูลส่วนบุคคล",
      body: `สัญญานี้ทำเป็นเอกสารอิเล็กทรอนิกส์ การลงลายมือชื่ออิเล็กทรอนิกส์ผ่านระบบให้มีผลผูกพันตามกฎหมาย ผู้รับจ้างยินยอมให้ผู้ว่าจ้างเก็บข้อมูลส่วนบุคคลที่ให้ไว้ในสัญญาเพื่อใช้ในการทำสัญญา การจ่ายเงิน และภาษีเท่านั้น`,
    },
  ],
  closing: "คู่สัญญาได้อ่านและเข้าใจข้อความในสัญญานี้โดยละเอียดตลอดแล้ว จึงได้ลงลายมือชื่อไว้เป็นสำคัญ",
};

export const DEFAULT_TEMPLATES: Record<ContractKind, ContractTemplate> = {
  client: DEFAULT_CONTRACT_TEMPLATE,
  monthly: DEFAULT_MONTHLY_TEMPLATE,
  freelance: DEFAULT_FREELANCE_TEMPLATE,
};

export const KIND_LABEL: Record<ContractKind, string> = { client: "ลูกค้า", monthly: "ทีมรายเดือน", freelance: "Outsource" };

// who is who: on a client contract we are the contractor; on the staff kinds we hire
export const roleLabels = (kind: ContractKind) =>
  kind === "client" ? { counterparty: "ผู้ว่าจ้าง", us: "ผู้รับจ้าง" } : { counterparty: "ผู้รับจ้าง", us: "ผู้ว่าจ้าง" };

// an unregistered business signs as its owner, trading under the business name (agency.name)
export function ourPartyName(agency: { name: string; businessType?: string; ownerName?: string }): string {
  const owner = agency.ownerName?.trim();
  if (agency.businessType === "company" || !owner) return agency.name;
  return agency.name.trim() ? `${owner} (ดำเนินธุรกิจภายใต้ชื่อทางการค้า “${agency.name.trim()}”)` : owner;
}

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
  { key: "seller_name", hint: "ชื่อฝั่งเรา" },
];

export const KIND_VARIABLES: Record<ContractKind, { key: string; hint: string }[]> = {
  client: [{ key: "term_months", hint: "จำนวนเดือนของสัญญา" }],
  monthly: [
    { key: "term_months", hint: "จำนวนเดือนของสัญญา" },
    { key: "monthly_fee", hint: "ค่าบริการต่อเดือน" },
    { key: "monthly_fee_text", hint: "ค่าบริการต่อเดือน (ตัวอักษร)" },
    { key: "clips_per_month", hint: "เป้าคลิปต่อเดือน" },
    { key: "shoot_days_per_month", hint: "เป้าวันถ่ายต่อเดือน" },
    { key: "pay_day", hint: "วันที่จ่ายของเดือน" },
    { key: "notice_days", hint: "แจ้งเลิกล่วงหน้า (วัน)" },
    { key: "withholding_text", hint: "เงื่อนไขภาษี" },
  ],
  freelance: [
    { key: "clip_count", hint: "จำนวนคลิปในชุด" },
    { key: "price_per_clip", hint: "ราคาต่อคลิป" },
    { key: "withholding_text", hint: "เงื่อนไขภาษี" },
  ],
};

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
  termMonths?: number;
  terms?: ContractTerms;
  clipCount?: number;
  pricePerClip?: number;
};

const withholdingText = (t?: ContractTerms) =>
  t?.withholding
    ? "ผู้ว่าจ้างหักภาษี ณ ที่จ่าย 3% และออกหนังสือรับรองการหักภาษี ณ ที่จ่ายให้ผู้รับจ้าง"
    : "ผู้ว่าจ้างจ่ายเต็มจำนวน ผู้รับจ้างรับผิดชอบยื่นภาษีเงินได้ของตนเอง";

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
    term_months: v.termMonths ? String(v.termMonths) : "[ระบุจำนวนเดือน]",
    monthly_fee: v.terms?.monthlyFee ? baht(v.terms.monthlyFee) : "[ระบุค่าบริการ]",
    monthly_fee_text: v.terms?.monthlyFee ? thaiBahtText(v.terms.monthlyFee) : "[ระบุ]",
    clips_per_month: v.terms?.clipsPerMonth ? String(v.terms.clipsPerMonth) : "-",
    shoot_days_per_month: v.terms?.shootDaysPerMonth ? String(v.terms.shootDaysPerMonth) : "-",
    pay_day: v.terms?.payDay ? String(v.terms.payDay) : "[ระบุวันที่]",
    notice_days: String(v.terms?.noticeDays ?? 30),
    withholding_text: withholdingText(v.terms),
    clip_count: v.clipCount ? String(v.clipCount) : "[ระบุจำนวน]",
    price_per_clip: v.pricePerClip ? baht(v.pricePerClip) : "[ระบุราคา]",
  };
  return text.replace(/\{\{(\w+)\}\}/g, (whole, key: string) => map[key] ?? whole);
}

export function findPlaceholders(texts: string[]): string[] {
  const found = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(/\[ระบุ[^\]]*\]/g)) found.add(m[0]);
  return [...found];
}
