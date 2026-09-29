-- Staff's own bank account, self-entered from /profile so the owner can pay
-- salaries with one tap (deep-link into the staff's bank app).
alter table staff add column if not exists bank_name text;
alter table staff add column if not exists bank_account_no text;
alter table staff add column if not exists bank_account_name text;
