-- A client can be billed as either a company (เลขทะเบียนนิติบุคคล) or an
-- individual (เลขประจำตัวผู้เสียภาษี) — same tax_id column, just a different
-- printed label depending on which.

alter table clients
  add column if not exists entity_type text not null default 'company';
