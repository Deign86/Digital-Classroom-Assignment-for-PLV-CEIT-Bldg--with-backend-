-- ============================================
-- SUPABASE AUTH SETUP - COMPLETE SQL SCRIPT
-- ============================================
-- Run this entire script in Supabase SQL Editor
-- Estimated time: 1-2 minutes
-- ============================================

-- STEP 1: Create Profiles Table
-- ============================================
-- This replaces the old 'users' table
-- Profiles store user data (no passwords - managed by Supabase Auth)

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'faculty')),
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase Auth users';
COMMENT ON COLUMN public.profiles.id IS 'References auth.users.id';
COMMENT ON COLUMN public.profiles.role IS 'User role: admin or faculty';

-- ============================================
-- STEP 2: Enable Row Level Security (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read profiles (needed for displaying faculty names, etc.)
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Allow admins to insert any profile (for creating users)
CREATE POLICY "Admins can insert any profile"
  ON public.profiles FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- STEP 3: Create Function to Auto-Create Profile
-- ============================================
-- This function runs automatically when a new user signs up

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, department)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'New User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'faculty'),
    NEW.raw_user_meta_data->>'department'
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, just return
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user() IS 'Auto-creates profile when user signs up';

-- ============================================
-- STEP 4: Create Trigger for New Users
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- STEP 5: Migrate Existing Users to Profiles (OPTIONAL - if you have data)
-- ============================================
-- This step migrates existing users from the old 'users' table to 'profiles'
-- Skip this if you don't have existing data

-- Check if users table exists and has data
DO $$
BEGIN
  -- Only run migration if users table exists and has data
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    -- Copy existing users to profiles (without creating auth users)
    -- Note: These users won't be able to login until they're created in Supabase Auth
    INSERT INTO public.profiles (id, email, name, role, department)
    SELECT 
      id,
      email,
      name,
      role,
      department
    FROM public.users
    WHERE NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE profiles.id = users.id
    );
    
    RAISE NOTICE 'Migrated existing users to profiles table';
  ELSE
    RAISE NOTICE 'No users table found - skipping migration';
  END IF;
END $$;

-- ============================================
-- STEP 6: Update Foreign Keys in Related Tables
-- ============================================
-- First, drop the old constraints
ALTER TABLE public.booking_requests
  DROP CONSTRAINT IF EXISTS booking_requests_faculty_id_fkey;

ALTER TABLE public.schedules
  DROP CONSTRAINT IF EXISTS schedules_faculty_id_fkey;

-- Check for orphaned records before adding constraints
DO $$
DECLARE
  orphaned_bookings INTEGER;
  orphaned_schedules INTEGER;
BEGIN
  -- Count orphaned booking requests
  SELECT COUNT(*) INTO orphaned_bookings
  FROM public.booking_requests br
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = br.faculty_id);
  
  -- Count orphaned schedules
  SELECT COUNT(*) INTO orphaned_schedules
  FROM public.schedules s
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = s.faculty_id);
  
  IF orphaned_bookings > 0 THEN
    RAISE WARNING 'Found % orphaned booking_requests. These will be deleted or you need to create matching profiles.', orphaned_bookings;
  END IF;
  
  IF orphaned_schedules > 0 THEN
    RAISE WARNING 'Found % orphaned schedules. These will be deleted or you need to create matching profiles.', orphaned_schedules;
  END IF;
END $$;

-- Option A: Delete orphaned records (RECOMMENDED for clean start)
-- Uncomment these lines if you want to delete orphaned data:
-- DELETE FROM public.booking_requests 
-- WHERE faculty_id NOT IN (SELECT id FROM public.profiles);

-- DELETE FROM public.schedules 
-- WHERE faculty_id NOT IN (SELECT id FROM public.profiles);

-- Option B: Create placeholder profiles for orphaned records
-- This preserves your data but users won't be able to login
INSERT INTO public.profiles (id, email, name, role, department)
SELECT DISTINCT 
  br.faculty_id,
  COALESCE(br.faculty_name || '@placeholder.com', 'unknown_' || br.faculty_id || '@placeholder.com'),
  COALESCE(br.faculty_name, 'Unknown User'),
  'faculty',
  'Unknown'
FROM public.booking_requests br
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = br.faculty_id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, name, role, department)
SELECT DISTINCT 
  s.faculty_id,
  COALESCE(s.faculty_name || '@placeholder.com', 'unknown_' || s.faculty_id || '@placeholder.com'),
  COALESCE(s.faculty_name, 'Unknown User'),
  'faculty',
  'Unknown'
FROM public.schedules s
WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = s.faculty_id)
ON CONFLICT (id) DO NOTHING;

-- Now add the foreign key constraints
ALTER TABLE public.booking_requests
  ADD CONSTRAINT booking_requests_faculty_id_fkey
  FOREIGN KEY (faculty_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.schedules
  ADD CONSTRAINT schedules_faculty_id_fkey
  FOREIGN KEY (faculty_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ============================================
-- STEP 7: Create Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON public.profiles(created_at);

-- ============================================
-- STEP 8: Create Helper Functions
-- ============================================

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 9: Grant Permissions
-- ============================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.classrooms TO authenticated;
GRANT SELECT ON public.schedules TO authenticated;
GRANT SELECT ON public.booking_requests TO authenticated;

-- ============================================
-- SUCCESS!
-- ============================================

SELECT 
  'Database setup complete! ✅' as status,
  'Now create your admin user in Authentication > Users' as next_step,
  'Then add admin profile in Table Editor > profiles' as step_2;
