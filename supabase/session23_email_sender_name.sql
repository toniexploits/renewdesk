-- Custom email sender name for Agency plan users.
-- When set, emails appear as "Acme Agency <invoices@renewdeskapp.com>"
-- instead of the generic RenewDesk sender name.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_sender_name TEXT;
