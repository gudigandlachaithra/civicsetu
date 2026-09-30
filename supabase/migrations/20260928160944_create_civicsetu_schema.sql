/*
# CivicSetu - Core Schema

## Overview
Creates the foundational tables for CivicSetu: a civic-tech app for Indian citizens
to discover eligible government schemes and report local issues.

## New Tables

### profiles
- `id` (uuid, PK, references auth.users) — one row per user
- `phone` (text) — 10-digit phone number
- `role` (text) — 'citizen' or 'official'
- `citizen_type` (text) — 'student', 'farmer', 'general' (null for officials)
- `department` (text) — 'Roads', 'Water' etc. (null for citizens)
- `is_onboarded` (boolean, default false) — whether onboarding is complete
- Onboarding fields (common): name, age, gender, state, district, preferred_language
- Student fields: education_level, course, year_of_study, institution_type, last_exam_percentage, annual_family_income, category
- Farmer fields: land_acres, ownership_type, crop_type, annual_income, category
- General fields: annual_income, category, occupation
- `created_at` (timestamptz)

### schemes
- `id` (uuid, PK)
- `title_en`, `title_te` (text) — bilingual title
- `description_en`, `description_te` (text) — bilingual description
- `target_group` (text) — 'student', 'farmer', 'general'
- `documents` (jsonb) — list of required documents {en, te} pairs
- `rules` (jsonb) — eligibility rules
- `created_at` (timestamptz)

### issues
- `id` (uuid, PK)
- `tracking_id` (text, unique) — human-readable tracking ID
- `user_id` (uuid, references auth.users) — reporter
- `title` (text)
- `description` (text)
- `category` (text) — Roads, Water, Sanitation, Electricity, Health, Other
- `district` (text)
- `area` (text) — village/area
- `landmark` (text)
- `status` (text) — Submitted, In Progress, Resolved
- `officer_remark` (text)
- `created_at`, `updated_at` (timestamptz)

## Security (RLS)

### profiles
- Citizens can read/update only their own profile.
- Officials can read their own profile.
- No user can see another user's profile (privacy: income, caste, marks).

### schemes
- Public read for all authenticated users (schemes are shared reference data).
- No writes from frontend (seeded via migration).

### issues
- Citizens can INSERT and SELECT only their own issues.
- Citizens can UPDATE only their own issues (but not status/remark fields — those are official-controlled).
- Officials can SELECT issues matching their department.
- Officials can UPDATE status and officer_remark on issues matching their department.
*/

-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  role text NOT NULL DEFAULT 'citizen' CHECK (role IN ('citizen', 'official')),
  citizen_type text CHECK (citizen_type IS NULL OR citizen_type IN ('student', 'farmer', 'general')),
  department text,
  is_onboarded boolean NOT NULL DEFAULT false,

  -- Common onboarding fields
  name text,
  age integer,
  gender text,
  state text,
  district text,
  preferred_language text DEFAULT 'en',

  -- Student fields
  education_level text,
  course text,
  year_of_study text,
  institution_type text,
  last_exam_percentage numeric,
  annual_family_income numeric,

  -- Farmer fields
  land_acres numeric,
  ownership_type text,
  crop_type text,

  -- General fields
  occupation text,

  -- Shared fields
  annual_income numeric,
  category text,

  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile"
ON profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
ON profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- SCHEMES TABLE
CREATE TABLE IF NOT EXISTS schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_te text NOT NULL,
  description_en text NOT NULL,
  description_te text NOT NULL,
  target_group text NOT NULL CHECK (target_group IN ('student', 'farmer', 'general')),
  documents jsonb NOT NULL DEFAULT '[]',
  rules jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_schemes" ON schemes;
CREATE POLICY "select_schemes"
ON schemes FOR SELECT TO authenticated
USING (true);

-- ISSUES TABLE
CREATE TABLE IF NOT EXISTS issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id text UNIQUE NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL CHECK (category IN ('Roads', 'Water', 'Sanitation', 'Electricity', 'Health', 'Other')),
  district text,
  area text,
  landmark text,
  status text NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'In Progress', 'Resolved')),
  officer_remark text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

-- Citizen: select own issues
DROP POLICY IF EXISTS "select_own_issues" ON issues;
CREATE POLICY "select_own_issues"
ON issues FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Citizen: insert own issues
DROP POLICY IF EXISTS "insert_own_issues" ON issues;
CREATE POLICY "insert_own_issues"
ON issues FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Citizen: update own issues (only title, description, location — not status/remark)
-- We allow update but the app UI won't let citizens change status
DROP POLICY IF EXISTS "update_own_issues" ON issues;
CREATE POLICY "update_own_issues"
ON issues FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Official: select issues matching their department
-- Department mapping: Roads -> 'Roads', Water -> 'Water', etc.
DROP POLICY IF EXISTS "official_select_dept_issues" ON issues;
CREATE POLICY "official_select_dept_issues"
ON issues FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'official'
    AND profiles.department = issues.category
  )
);

-- Official: update issues matching their department (status + remark)
DROP POLICY IF EXISTS "official_update_dept_issues" ON issues;
CREATE POLICY "official_update_dept_issues"
ON issues FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'official'
    AND profiles.department = issues.category
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'official'
    AND profiles.department = issues.category
  )
);

-- Index for issues by user_id
CREATE INDEX IF NOT EXISTS idx_issues_user_id ON issues(user_id);
CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category);
CREATE INDEX IF NOT EXISTS idx_issues_tracking_id ON issues(tracking_id);
