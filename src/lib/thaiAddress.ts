// Best-effort split of a free-text Thai address into the columns Thai Post bulk sending uses.
// Customers type it in one box, so anything we can't find is left empty and `check` says so,
// to be fixed by hand in the spreadsheet.
export type ThaiAddress = { line: string; subdistrict: string; district: string; province: string; postcode: string; check: string };

const BKK = /^(กรุงเทพมหานคร|กรุงเทพฯ?|กทม\.?)$/;

export function splitThaiAddress(raw: string): ThaiAddress {
  let s = ` ${raw.replace(/[\n\r,]+/g, " ").replace(/\s+/g, " ").trim()} `;
  let postcode = "";
  // the last 5-digit number is the postcode
  const all = [...s.matchAll(/(?<!\d)(\d{5})(?!\d)/g)];
  const pc = all[all.length - 1];
  if (pc && pc.index !== undefined) {
    postcode = pc[1];
    s = s.slice(0, pc.index) + " " + s.slice(pc.index + 5);
  }
  const grab = (re: RegExp) => {
    const m = s.match(re);
    if (!m) return "";
    s = s.replace(m[0], " ");
    return m[1].trim();
  };
  let province = grab(/\s(?:จังหวัด|จ\.)\s*([^\s]+)/);
  const district = grab(/\s(?:เขต|อำเภอ|อ\.)\s*([^\s]+)/);
  const subdistrict = grab(/\s(?:แขวง|ตำบล|ต\.)\s*([^\s]+)/);
  if (!province) {
    // "…กรุงเทพ 10230": Bangkok written without the word จังหวัด
    const words = s.trim().split(" ");
    const last = words[words.length - 1] ?? "";
    if (BKK.test(last)) {
      province = last;
      s = ` ${words.slice(0, -1).join(" ")} `;
    }
  }
  if (BKK.test(province)) province = "กรุงเทพมหานคร";
  const line = s.replace(/\s+/g, " ").trim();
  const missing = [!line && "ที่อยู่", !subdistrict && "ตำบล/แขวง", !district && "อำเภอ/เขต", !province && "จังหวัด", !postcode && "รหัสไปรษณีย์"].filter(Boolean);
  return { line, subdistrict, district, province, postcode, check: missing.length ? `ตรวจ: ${missing.join(", ")}` : "" };
}
