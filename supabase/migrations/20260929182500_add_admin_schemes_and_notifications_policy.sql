/*
# Allow Admin scheme insertion and notifications for schemes

## Overview
1. Makes `notifications.issue_id` nullable so notifications can be created for new schemes.
2. Adds RLS INSERT policy on `schemes` table for authenticated users / admins.
3. Adds/updates RLS INSERT policy on `notifications` table so admins/officials can insert notifications for eligible citizens when a new scheme is created.
*/

-- 1. Make issue_id nullable in notifications table
ALTER TABLE notifications ALTER COLUMN issue_id DROP NOT NULL;

-- 2. Add INSERT policy for schemes table
DROP POLICY IF EXISTS "insert_schemes" ON schemes;
CREATE POLICY "insert_schemes"
ON schemes FOR INSERT TO authenticated
WITH CHECK (true);

-- 3. Update INSERT policy for notifications table to allow inserting scheme notifications
DROP POLICY IF EXISTS "insert_notifications" ON notifications;

CREATE POLICY "insert_notifications"
ON notifications FOR INSERT TO authenticated
WITH CHECK (
  -- Case 1: user inserting their own notification
  auth.uid() = user_id
  OR
  -- Case 2: notification has no issue_id (e.g. scheme notification)
  issue_id IS NULL
  OR
  -- Case 3: official inserting for any user on an issue in their department
  EXISTS (
    SELECT 1 FROM issues
    JOIN profiles ON profiles.id = auth.uid()
    WHERE issues.id = notifications.issue_id
    AND profiles.role = 'official'
    AND profiles.department = issues.category
  )
);
