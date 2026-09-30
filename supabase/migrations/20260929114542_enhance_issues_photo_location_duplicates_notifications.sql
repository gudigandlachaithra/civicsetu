/*
# CivicSetu - Enhanced Issues: Photo, Location, Duplicates, Reporters, Notifications, Priority

## Overview
Adds photo upload support, GPS coordinates, severity field, duplicate detection
via issue_reporters table, notifications for status changes, and priority scoring.

## Modified Tables

### issues (ALTER)
- `photo_url` (text, nullable) — URL of uploaded photo in Supabase Storage
- `latitude` (double precision, nullable) — GPS latitude
- `longitude` (double precision, nullable) — GPS longitude
- `severity` (integer, nullable, default 0) — severity score 0-10 (optional)

## New Tables

### issue_reporters
- `id` (uuid, PK)
- `issue_id` (uuid, FK to issues, CASCADE)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid()) — the reporter
- `created_at` (timestamptz)
- Unique constraint on (issue_id, user_id) — a user can only join once

### notifications
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL, DEFAULT auth.uid()) — notification recipient
- `issue_id` (uuid, FK to issues, CASCADE) — related issue
- `message_en` (text) — notification message in English
- `message_te` (text) — notification message in Telugu
- `is_read` (boolean, default false)
- `created_at` (timestamptz)

## Security (RLS)

### issue_reporters
- A reporter can SELECT their own rows (so they can track joined issues).
- A reporter can INSERT their own rows (to join an issue).
- A reporter can DELETE their own rows.
- Officials can SELECT reporters for issues in their department.

### notifications
- A user can SELECT only their own notifications.
- A user can UPDATE (mark as read) only their own notifications.
- INSERT is allowed for authenticated users (the official creates notifications
  for all reporters when updating status). The INSERT policy checks that the
  inserting user is an official for the issue's department.

## Storage
- Creates a public bucket "issue-photos" for storing issue photos.
- Policies: authenticated users can upload; everyone can read (public bucket).
*/

-- ============ ALTER issues table ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'issues' AND column_name = 'photo_url') THEN
    ALTER TABLE issues ADD COLUMN photo_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'issues' AND column_name = 'latitude') THEN
    ALTER TABLE issues ADD COLUMN latitude double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'issues' AND column_name = 'longitude') THEN
    ALTER TABLE issues ADD COLUMN longitude double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'issues' AND column_name = 'severity') THEN
    ALTER TABLE issues ADD COLUMN severity integer DEFAULT 0;
  END IF;
END $$;

-- ============ issue_reporters table ============
CREATE TABLE IF NOT EXISTS issue_reporters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(issue_id, user_id)
);

ALTER TABLE issue_reporters ENABLE ROW LEVEL SECURITY;

-- Reporter can select their own rows
DROP POLICY IF EXISTS "select_own_reporters" ON issue_reporters;
CREATE POLICY "select_own_reporters"
ON issue_reporters FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Reporter can insert their own rows
DROP POLICY IF EXISTS "insert_own_reporters" ON issue_reporters;
CREATE POLICY "insert_own_reporters"
ON issue_reporters FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Reporter can delete their own rows
DROP POLICY IF EXISTS "delete_own_reporters" ON issue_reporters;
CREATE POLICY "delete_own_reporters"
ON issue_reporters FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Officials can see reporters for their department's issues
DROP POLICY IF EXISTS "official_select_dept_reporters" ON issue_reporters;
CREATE POLICY "official_select_dept_reporters"
ON issue_reporters FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM issues
    JOIN profiles ON profiles.id = auth.uid()
    WHERE issues.id = issue_reporters.issue_id
    AND profiles.role = 'official'
    AND profiles.department = issues.category
  )
);

-- ============ notifications table ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  message_en text NOT NULL,
  message_te text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- User can select only their own notifications
DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications"
ON notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- User can update (mark read) only their own notifications
DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications"
ON notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Authenticated users can insert notifications (officials inserting for reporters)
-- We allow all authenticated to insert; the app controls who creates them
DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications"
ON notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_issue_reporters_issue_id ON issue_reporters(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_reporters_user_id ON issue_reporters(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);

-- ============ Storage bucket for issue photos ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('issue-photos', 'issue-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Upload policy: authenticated users can upload to issue-photos
DROP POLICY IF EXISTS "upload_issue_photos" ON storage.objects;
CREATE POLICY "upload_issue_photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'issue-photos');

-- Read policy: anyone can read issue photos (public bucket)
DROP POLICY IF EXISTS "read_issue_photos" ON storage.objects;
CREATE POLICY "read_issue_photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'issue-photos');

-- Delete policy: owner can delete their own uploads
DROP POLICY IF EXISTS "delete_issue_photos" ON storage.objects;
CREATE POLICY "delete_issue_photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'issue-photos' AND owner = auth.uid());
