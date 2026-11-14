-- Progress Tracking: the owner can set a person's goal; who set it is shown, and
-- a goal set by someone else can't be changed by the person themselves.
alter table staff_goals add column if not exists set_by uuid references staff(id) on delete set null;
