-- Add member_email to team_members so the settings page can display it
-- without needing a join to auth.users (which is not accessible via RLS).

ALTER TABLE team_members ADD COLUMN IF NOT EXISTS member_email TEXT;

-- Backfill email for any existing members by matching through team_invitations.
UPDATE team_members tm
SET member_email = ti.invited_email
FROM team_invitations ti
WHERE ti.owner_id = tm.owner_id
  AND ti.status   = 'accepted'
  AND tm.member_email IS NULL;
