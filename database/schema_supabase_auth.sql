-- ============================================
-- Database Schema for PLV CEIT Digital Classroom Assignment System
-- SUPABASE AUTH VERSION (No passwords, uses profiles)
-- ============================================
-- Run this AFTER reset_auth_setup.sql
-- Run this BEFORE supabase_auth_setup.sql
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CLASSROOMS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.classrooms (
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

-- Create index for faster classroom lookups
CREATE INDEX IF NOT EXISTS idx_classrooms_name ON public.classrooms(name);
CREATE INDEX IF NOT EXISTS idx_classrooms_building ON public.classrooms(building);

-- ============================================
-- SIGNUP REQUESTS TABLE (temporarily without user reference)
-- ============================================
CREATE TABLE IF NOT EXISTS public.signup_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_feedback TEXT,
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for signup requests
CREATE INDEX IF NOT EXISTS idx_signup_requests_email ON public.signup_requests(email);
CREATE INDEX IF NOT EXISTS idx_signup_requests_status ON public.signup_requests(status);

-- ============================================
-- BOOKING REQUESTS TABLE (will reference profiles after supabase_auth_setup.sql)
-- ============================================
-- Note: We'll create this WITHOUT foreign keys first
-- The supabase_auth_setup.sql will add the foreign key constraints
CREATE TABLE IF NOT EXISTS public.booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faculty_id UUID NOT NULL,
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

-- Create indexes for booking requests
CREATE INDEX IF NOT EXISTS idx_booking_requests_faculty ON public.booking_requests(faculty_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_classroom ON public.booking_requests(classroom_id);
CREATE INDEX IF NOT EXISTS idx_booking_requests_date ON public.booking_requests(date);
CREATE INDEX IF NOT EXISTS idx_booking_requests_status ON public.booking_requests(status);

-- ============================================
-- SCHEDULES TABLE (will reference profiles after supabase_auth_setup.sql)
-- ============================================
-- Note: We'll create this WITHOUT foreign keys first
-- The supabase_auth_setup.sql will add the foreign key constraints
CREATE TABLE IF NOT EXISTS public.schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES public.classrooms(id) ON DELETE CASCADE,
  classroom_name TEXT NOT NULL,
  faculty_id UUID NOT NULL,
  faculty_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for schedules
CREATE INDEX IF NOT EXISTS idx_schedules_classroom ON public.schedules(classroom_id);
CREATE INDEX IF NOT EXISTS idx_schedules_faculty ON public.schedules(faculty_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON public.schedules(date);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON public.schedules(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Classrooms: Everyone can read
CREATE POLICY "Classrooms are viewable by everyone" ON public.classrooms
  FOR SELECT USING (true);

CREATE POLICY "Classrooms can be modified by anyone" ON public.classrooms
  FOR ALL USING (true);

-- Signup Requests: Anyone can insert, everyone can read
CREATE POLICY "Signup requests are viewable by everyone" ON public.signup_requests
  FOR SELECT USING (true);

CREATE POLICY "Signup requests can be created by anyone" ON public.signup_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Signup requests can be updated by anyone" ON public.signup_requests
  FOR UPDATE USING (true);

-- Booking Requests: Anyone can create, everyone can read
CREATE POLICY "Booking requests are viewable by everyone" ON public.booking_requests
  FOR SELECT USING (true);

CREATE POLICY "Booking requests can be created by anyone" ON public.booking_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Booking requests can be updated by anyone" ON public.booking_requests
  FOR UPDATE USING (true);

-- Schedules: Everyone can read and modify
CREATE POLICY "Schedules are viewable by everyone" ON public.schedules
  FOR SELECT USING (true);

CREATE POLICY "Schedules can be created by anyone" ON public.schedules
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Schedules can be updated by anyone" ON public.schedules
  FOR UPDATE USING (true);

-- ============================================
-- SEED DATA - Sample Classrooms
-- ============================================

INSERT INTO public.classrooms (name, capacity, equipment, building, floor, is_available) VALUES
('CEIT-101', 50, ARRAY['Projector', 'Whiteboard', 'AC'], 'CEIT Building', 1, true),
('CEIT-102', 40, ARRAY['Projector', 'Computers', 'AC'], 'CEIT Building', 1, true),
('CEIT-103', 45, ARRAY['TV', 'Whiteboard', 'AC'], 'CEIT Building', 1, true),
('CEIT-201', 60, ARRAY['Projector', 'Sound System', 'AC'], 'CEIT Building', 2, true),
('CEIT-202', 35, ARRAY['Whiteboard', 'AC'], 'CEIT Building', 2, true),
('CEIT-301', 40, ARRAY['Projector', 'Computers', 'AC'], 'CEIT Building', 3, true),
('CEIT-LAB1', 30, ARRAY['Computers', 'Projector', 'Lab Equipment', 'AC'], 'CEIT Building', 1, true),
('CEIT-LAB2', 30, ARRAY['Computers', 'Projector', 'Lab Equipment', 'AC'], 'CEIT Building', 2, true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON public.classrooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signup_requests_updated_at BEFORE UPDATE ON public.signup_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_requests_updated_at BEFORE UPDATE ON public.booking_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON public.schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

SELECT 
  '✅ Base schema created successfully!' as status,
  'Tables created: classrooms, signup_requests, booking_requests, schedules' as details,
  'Next step: Run database/supabase_auth_setup.sql to add profiles and auth' as next_step;
