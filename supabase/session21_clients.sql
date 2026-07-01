-- Client directory — stores reusable client profiles.
-- Available to agency plan owners and their team members.

CREATE TABLE IF NOT EXISTS clients (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  email        TEXT,
  phone        TEXT,
  contact_name TEXT,
  address      TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Owner full access
CREATE POLICY "owner_manages_clients"
  ON clients FOR ALL
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Team member read access
CREATE POLICY "team_member_select_clients"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = clients.user_id
        AND team_members.member_user_id = auth.uid()
    )
  );

-- Team member write access
CREATE POLICY "team_member_insert_clients"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = clients.user_id
        AND team_members.member_user_id = auth.uid()
    )
  );

CREATE POLICY "team_member_update_clients"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = clients.user_id
        AND team_members.member_user_id = auth.uid()
    )
  );
