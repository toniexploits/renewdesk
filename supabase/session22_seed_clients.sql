-- Seed the clients table from existing invoices.
-- Takes the most recent email/phone for each unique client name per user.
-- Skips any client name that already exists for that user.

INSERT INTO clients (user_id, name, email, phone)
SELECT DISTINCT ON (user_id, client_name)
  user_id,
  client_name        AS name,
  client_email       AS email,
  client_phone       AS phone
FROM invoices
WHERE client_name IS NOT NULL
  AND trim(client_name) != ''
ORDER BY user_id, client_name, created_at DESC
ON CONFLICT DO NOTHING;
