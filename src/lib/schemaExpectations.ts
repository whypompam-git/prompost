// What the app expects to exist in the database, per table. The system-check
// page probes each with a zero-row select, so a migration that hasn't been
// applied shows up as a named missing column instead of a blank page.
// Add to this list whenever a migration adds a column the app reads.
export const SCHEMA_EXPECTATIONS: { table: string; columns: string; migration: string }[] = [
  { table: "staff", columns: "bank_name, bank_account_no, bank_account_name", migration: "0018" },
  { table: "content_sets", columns: "id, name, items", migration: "0017" },
  { table: "client_notes", columns: "id, client_id, note, note_date, deleted_at", migration: "0019, 0020" },
  { table: "clients", columns: "priority, brand_brief, brand_images, manager_id", migration: "0021, 0022, 0028" },
  { table: "client_packages", columns: "amount", migration: "0023" },
  { table: "receipts", columns: "client_package_id, description", migration: "0023, 0026" },
  { table: "tasks", columns: "cover_url", migration: "0024" },
  { table: "transactions", columns: "occurred_time, receipt_id", migration: "0016, 0024" },
  { table: "agency_settings", columns: "signature_url", migration: "0025" },
  { table: "quotations", columns: "file_url", migration: "0027" },
  { table: "doc_counters", columns: "kind, year, last_no", migration: "0029" },
];
