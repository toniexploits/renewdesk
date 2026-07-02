-- Add unique constraint so (user_id, name) pairs can be upserted without duplication.
ALTER TABLE clients
  ADD CONSTRAINT clients_user_id_name_key UNIQUE (user_id, name);
