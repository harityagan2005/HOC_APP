-- Run this in MySQL to add the accountable person email column
ALTER TABLE hoc_input
  ADD COLUMN IF NOT EXISTS accountable_person_email VARCHAR(255) NULL
  AFTER accountable_person;
