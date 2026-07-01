-- Session 15: Team members (Agency plan)
-- Agency plan owners can invite team members who share access to their workspace.

-- ── Team invitations ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_invitations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'member',
  token         UUID        NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  status        TEXT        NOT NULL DEFAULT 'pending',  -- pending | accepted | revoked
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT now() + interval '7 days',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE team_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_manages_invitations"
  ON team_invitations FOR ALL
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Public read for token-based acceptance (no auth required to look up invite)
CREATE POLICY "public_read_invitation_by_token"
  ON team_invitations FOR SELECT
  USING (true);

-- ── Team members ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS team_members (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  member_user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role             TEXT        NOT NULL DEFAULT 'member',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (owner_id, member_user_id)
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Owner can manage their team roster
CREATE POLICY "owner_manages_team_members"
  ON team_members FOR ALL
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Team members can read their own membership row (to discover owner_id on login)
CREATE POLICY "member_reads_own_membership"
  ON team_members FOR SELECT
  USING (member_user_id = auth.uid());

-- ── Updated RLS on data tables ────────────────────────────────────────────────
-- Each table gets an additional SELECT (and where appropriate INSERT/UPDATE)
-- policy so team members can access the owner's data.
--
-- NOTE: If your current policies are FOR ALL, you may need to split them into
-- separate SELECT / INSERT / UPDATE / DELETE policies first.  The policies below
-- assume you already have an owner policy and we are ADDING team-member access.

-- invoices
CREATE POLICY "team_member_select_invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = invoices.user_id
        AND team_members.member_user_id = auth.uid()
    )
  );

CREATE POLICY "team_member_insert_invoices"
  ON invoices FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = invoices.user_id
        AND team_members.member_user_id = auth.uid()
    )
  );

CREATE POLICY "team_member_update_invoices"
  ON invoices FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = invoices.user_id
        AND team_members.member_user_id = auth.uid()
    )
  );

-- quotes
CREATE POLICY "team_member_select_quotes"
  ON quotes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = quotes.user_id
        AND team_members.member_user_id = auth.uid()
    )
  );

CREATE POLICY "team_member_insert_quotes"
  ON quotes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = quotes.user_id
        AND team_members.member_user_id = auth.uid()
    )
  );

CREATE POLICY "team_member_update_quotes"
  ON quotes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = quotes.user_id
        AND team_members.member_user_id = auth.uid()
    )
  );

-- invoice_payments
CREATE POLICY "team_member_select_invoice_payments"
  ON invoice_payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN invoices i ON i.id = invoice_payments.invoice_id
      WHERE tm.owner_id = i.user_id
        AND tm.member_user_id = auth.uid()
    )
  );

CREATE POLICY "team_member_insert_invoice_payments"
  ON invoice_payments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM team_members tm
      JOIN invoices i ON i.id = invoice_payments.invoice_id
      WHERE tm.owner_id = i.user_id
        AND tm.member_user_id = auth.uid()
    )
  );

-- bank_accounts (read-only for team members, for PDF generation)
CREATE POLICY "team_member_select_bank_accounts"
  ON bank_accounts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = bank_accounts.user_id
        AND team_members.member_user_id = auth.uid()
    )
  );

-- profiles (read-only for team members, for business details on PDFs)
CREATE POLICY "team_member_select_profiles"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.owner_id = profiles.id
        AND team_members.member_user_id = auth.uid()
    )
  );
