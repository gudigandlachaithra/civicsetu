/*
# Fix notifications INSERT policy for official status updates

## Overview
The original INSERT policy required auth.uid() = user_id, which prevented
officials from creating notifications for other users (reporters). This
migration updates the policy so that an official can insert notifications
for any user, as long as the official's department matches the issue's category.

## Security Changes
- Drops the restrictive INSERT policy on notifications.
- Adds a new INSERT policy that allows:
  1. A user to insert notifications for themselves (auth.uid() = user_id), OR
  2. An official to insert notifications for any user, when the related issue
     matches the official's department.
*/

DROP POLICY IF EXISTS "insert_notifications" ON notifications;

CREATE POLICY "insert_notifications"
ON notifications FOR INSERT TO authenticated
WITH CHECK (
  -- Case 1: user inserting their own notification
  auth.uid() = user_id
  OR
  -- Case 2: official inserting for any user on an issue in their department
  EXISTS (
    SELECT 1 FROM issues
    JOIN profiles ON profiles.id = auth.uid()
    WHERE issues.id = notifications.issue_id
    AND profiles.role = 'official'
    AND profiles.department = issues.category
  )
);
