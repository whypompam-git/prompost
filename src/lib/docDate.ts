// Document dates are stored as timestamptz (created_at). Pin edited dates to
// noon Bangkok time so the displayed day never shifts with the viewer's zone.
export const toInputDate = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const fromInputDate = (date: string) => `${date}T12:00:00+07:00`;
