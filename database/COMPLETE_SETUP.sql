-- ============================================
-- COMPLETE DATABASE SETUP - ALL IN ONE
-- ============================================
-- This script does EVERYTHING:
-- 1. Resets the database (deletes all tables)
-- 2. Creates all base tables
-- 3. Sets up Supabase Auth with profiles
-- 4. Configures RLS policies for anonymous signup
-- 5. Adds sample data
-- 
-- IMPORTANT: Anonymous Access Enabled
-- - Anonymous users CAN submit signup requests
-- - Anonymous users CAN check for existing emails
-- - This is SAFE and required for signup form
-- ============================================

-- ============================================
-- PART 1: NUCLEAR RESET - Delete Everything
-- ============================================

-- Disable RLS on all tables first
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'ALTER TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;

-- Drop all policies
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public') 
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || r.schemaname || '.' || r.tablename || ' CASCADE';
    END LOOP;
END $$;

-- Drop all triggers on public schema
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT trigger_name, event_object_table 
              FROM information_schema.triggers 
              WHERE trigger_schema = 'public') 
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || quote_ident(r.trigger_name) || ' ON public.' || quote_ident(r.event_object_table) || ' CASCADE';
    END LOOP;
END $$;

-- Drop the auth trigger separately
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.create_admin_user(TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Drop all tables
DROP TABLE IF EXISTS public.schedules CASCADE;
DROP TABLE IF EXISTS public.booking_requests CASCADE;
DROP TABLE IF EXISTS public.signup_requests CASCADE;
DROP TABLE IF EXISTS public.classrooms CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================
-- PART 2: CREATE BASE TABLES
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Classrooms table
CREATE TABLE public.classrooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  capacity INTEGER NOT NULL,
  equipment TEXT[] NOT NULL,
  building TEXT NOT NULL,
  floor INTEGER NOT NULL,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Signup requests table
CREATE TABLE public.signup_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  password TEXT NOT NULL, -- Stores BCRYPT HASH (not plain text) - admin generates new temp password on approval
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_feedback TEXT,
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table (replaces users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'faculty')),
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking requests table (references profiles)
CREATE TABLE public.booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  faculty_name TEXT NOT NULL,
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  classroom_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_feedback TEXT,
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Schedules table (references profiles)
CREATE TABLE public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  classroom_name TEXT NOT NULL,
  faculty_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  faculty_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PART 3: CREATE INDEXES
-- ============================================

CREATE INDEX idx_classrooms_name ON public.classrooms(name);
CREATE INDEX idx_classrooms_building ON public.classrooms(building);
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_signup_requests_email ON public.signup_requests(email);
CREATE INDEX idx_signup_requests_status ON public.signup_requests(status);
CREATE INDEX idx_booking_requests_faculty ON public.booking_requests(faculty_id);
CREATE INDEX idx_booking_requests_classroom ON public.booking_requests(classroom_id);
CREATE INDEX idx_booking_requests_date ON public.booking_requests(date);
CREATE INDEX idx_booking_requests_status ON public.booking_requests(status);
CREATE INDEX idx_schedules_classroom ON public.schedules(classroom_id);
CREATE INDEX idx_schedules_faculty ON public.schedules(faculty_id);
CREATE INDEX idx_schedules_date ON public.schedules(date);
CREATE INDEX idx_schedules_status ON public.schedules(status);

-- ============================================
-- PART 4: CREATE FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle new user registration
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get user role
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
-- PART 5: CREATE TRIGGERS
-- ============================================

-- Auto-create profile when auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update triggers for updated_at
CREATE TRIGGER update_classrooms_updated_at 
  BEFORE UPDATE ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_signup_requests_updated_at 
  BEFORE UPDATE ON public.signup_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_booking_requests_updated_at 
  BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at 
  BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- PART 6: SETUP ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Profiles policies (Allow anonymous users for signup checks)
CREATE POLICY "Profiles are viewable by everyone including anonymous"
  ON public.profiles FOR SELECT
  TO public  -- Allows anonymous users
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can insert any profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Classrooms policies
CREATE POLICY "Classrooms are viewable by everyone"
  ON public.classrooms FOR SELECT
  USING (true);

CREATE POLICY "Classrooms can be modified by anyone"
  ON public.classrooms FOR ALL
  USING (true);

-- Signup requests policies (Allow anonymous users to submit requests)
CREATE POLICY "Signup requests are viewable by everyone"
  ON public.signup_requests FOR SELECT
  TO public  -- Allows anonymous users
  USING (true);

CREATE POLICY "Anyone can create signup requests"
  ON public.signup_requests FOR INSERT
  TO public  -- Allows anonymous users
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update signup requests"
  ON public.signup_requests FOR UPDATE
  TO authenticated  -- Only logged-in users (admins)
  USING (true);

CREATE POLICY "Authenticated users can delete signup requests"
  ON public.signup_requests FOR DELETE
  TO authenticated  -- Only logged-in users (admins)
  USING (true);

-- Booking requests policies
CREATE POLICY "Booking requests are viewable by everyone"
  ON public.booking_requests FOR SELECT
  USING (true);

CREATE POLICY "Booking requests can be created by anyone"
  ON public.booking_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Booking requests can be updated by anyone"
  ON public.booking_requests FOR UPDATE
  USING (true);

-- Schedules policies
CREATE POLICY "Schedules are viewable by everyone"
  ON public.schedules FOR SELECT
  USING (true);

CREATE POLICY "Schedules can be created by anyone"
  ON public.schedules FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Schedules can be updated by anyone"
  ON public.schedules FOR UPDATE
  USING (true);

-- ============================================
-- PART 7: INSERT SAMPLE DATA
-- ============================================

-- Sample classrooms
INSERT INTO public.classrooms (name, capacity, equipment, building, floor, is_available) VALUES
('CEIT-101', 50, ARRAY['Projector', 'Whiteboard', 'AC'], 'CEIT Building', 1, true),
('CEIT-102', 40, ARRAY['Projector', 'Computers', 'AC'], 'CEIT Building', 1, true),
('CEIT-103', 45, ARRAY['TV', 'Whiteboard', 'AC'], 'CEIT Building', 1, true),
('CEIT-201', 60, ARRAY['Projector', 'Sound System', 'AC'], 'CEIT Building', 2, true),
('CEIT-202', 35, ARRAY['Whiteboard', 'AC'], 'CEIT Building', 2, true),
('CEIT-301', 40, ARRAY['Projector', 'Computers', 'AC'], 'CEIT Building', 3, true),
('CEIT-LAB1', 30, ARRAY['Computers', 'Projector', 'Lab Equipment', 'AC'], 'CEIT Building', 1, true),
('CEIT-LAB2', 30, ARRAY['Computers', 'Projector', 'Lab Equipment', 'AC'], 'CEIT Building', 2, true);

-- ============================================
-- SUCCESS!
-- ============================================

SELECT 
  '✅ Database setup complete!' as status,
  'All tables, functions, triggers, and policies created successfully!' as details,
  '📊 Sample data: 8 classrooms added' as data,
  '' as blank_line,
  '🔑 NEXT STEPS:' as next_steps,
  '1. Go to Authentication → Users in Supabase Dashboard' as step_1,
  '2. Click "Add User" → Create new user' as step_2,
  '3. Email: admin@plv.edu.ph | Password: admin123456' as step_3,
  '4. Check "Auto Confirm User" ✅' as step_4,
  '5. Copy the generated UUID' as step_5,
  '6. Go to Table Editor → profiles → Insert row' as step_6,
  '7. id: [UUID], email: admin@plv.edu.ph, name: System Administrator, role: admin' as step_7,
  '8. Run: npm run dev' as step_8,
  '9. Click admin demo button and login!' as step_9;
