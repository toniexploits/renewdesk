-- Session 15b: Store owner display name in team_invitations
-- Allows the /accept-invite page to show the owner's name to unauthenticated visitors
-- without needing to join to the profiles table (which requires auth).

ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS owner_name TEXT;
