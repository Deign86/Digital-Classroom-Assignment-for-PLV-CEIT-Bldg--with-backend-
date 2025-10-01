-- ============================================
-- COMPLETE DATABASE RESET - Start From Scratch
-- ============================================
-- ⚠️ WARNING: This deletes EVERYTHING in your database!
-- ⚠️ All data will be permanently lost!
-- ⚠️ Only run this if you want to start completely fresh!
-- ============================================

-- ============================================
-- STEP 0: Disable RLS First (allows deletion)
-- ============================================

ALTER TABLE IF EXISTS public.schedules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.booking_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.signup_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.classrooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 1: Drop All Policies First
-- ============================================

-- Drop ALL policies on ALL tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename || ' CASCADE';
    END LOOP;
END $$;

-- ============================================
-- STEP 2: Drop All Triggers
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS update_schedules_updated_at ON public.schedules CASCADE;
DROP TRIGGER IF EXISTS update_booking_requests_updated_at ON public.booking_requests CASCADE;
DROP TRIGGER IF EXISTS update_signup_requests_updated_at ON public.signup_requests CASCADE;
DROP TRIGGER IF EXISTS update_classrooms_updated_at ON public.classrooms CASCADE;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles CASCADE;
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users CASCADE;

-- ============================================
-- STEP 3: Drop All Functions
-- ============================================

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_admin_user(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- ============================================
-- STEP 4: Drop All Tables (with CASCADE)
-- ============================================

-- Drop dependent tables first (those with foreign keys)
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.booking_requests CASCADE;
DROP TABLE IF EXISTS public.signup_requests CASCADE;

-- Drop independent tables
DROP TABLE IF EXISTS public.classrooms CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- STEP 5: Clean up Supabase Auth Users (Optional)
-- ============================================

-- ⚠️ WARNING: This deletes all auth users!
-- Uncomment the next line ONLY if you want to delete all authentication users
-- DELETE FROM auth.users;

-- ============================================
-- STEP 6: Verify Clean State
-- ============================================

-- Check what tables still exist (should be none of ours)
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('users', 'profiles', 'classrooms', 'booking_requests', 'schedules', 'signup_requests');
  
  IF table_count = 0 THEN
    RAISE NOTICE '✅ All application tables dropped successfully';
  ELSE
    RAISE WARNING '⚠️ Some tables still exist: % tables found', table_count;
  END IF;
END $$;

-- ============================================
-- SUCCESS!
-- ============================================

SELECT 
  '✅ Database reset complete!' as status,
  'All tables, functions, triggers, and policies have been removed.' as details,
  'Next steps:' as step_1,
  '1. Run database/schema.sql to recreate base tables' as step_2,
  '2. Run database/supabase_auth_setup.sql to set up authentication' as step_3,
  '3. Create your admin user in Supabase Dashboard' as step_4;
