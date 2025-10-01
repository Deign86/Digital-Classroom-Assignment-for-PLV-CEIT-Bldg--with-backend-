-- ============================================
-- FIX RLS POLICIES FOR ANONYMOUS SIGNUP
-- ============================================
-- Run this in Supabase SQL Editor to allow anonymous users
-- to submit signup requests and check for duplicates
-- ============================================

-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Signup requests are viewable by everyone" ON public.signup_requests;
DROP POLICY IF EXISTS "Signup requests can be created by anyone" ON public.signup_requests;
DROP POLICY IF EXISTS "Signup requests can be updated by anyone" ON public.signup_requests;

-- ============================================
-- PROFILES TABLE - Allow public read access
-- ============================================

-- Allow ANYONE (including anonymous users) to read profiles
CREATE POLICY "Profiles are viewable by everyone including anonymous"
  ON public.profiles FOR SELECT
  TO public
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow admins to insert any profile (for creating users)
CREATE POLICY "Admins can insert any profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- SIGNUP_REQUESTS TABLE - Allow anonymous access
-- ============================================

-- Allow ANYONE (including anonymous users) to read signup requests
CREATE POLICY "Signup requests are viewable by everyone"
  ON public.signup_requests FOR SELECT
  TO public
  USING (true);

-- Allow ANYONE (including anonymous users) to create signup requests
CREATE POLICY "Anyone can create signup requests"
  ON public.signup_requests FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow authenticated users to update signup requests
CREATE POLICY "Authenticated users can update signup requests"
  ON public.signup_requests FOR UPDATE
  TO authenticated
  USING (true);

-- Allow authenticated users to delete signup requests (admins)
CREATE POLICY "Authenticated users can delete signup requests"
  ON public.signup_requests FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if policies were created successfully
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('profiles', 'signup_requests')
ORDER BY tablename, policyname;

-- Test query (should work for anonymous users)
-- SELECT COUNT(*) FROM public.profiles;
-- SELECT COUNT(*) FROM public.signup_requests;

COMMENT ON POLICY "Profiles are viewable by everyone including anonymous" ON public.profiles IS 
  'Allows anonymous users to check for existing emails during signup';

COMMENT ON POLICY "Anyone can create signup requests" ON public.signup_requests IS 
  'Allows anonymous users to submit signup requests without authentication';
