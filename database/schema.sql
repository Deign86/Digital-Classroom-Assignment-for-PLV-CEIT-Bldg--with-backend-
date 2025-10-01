-- Database Schema for PLV CEIT Digital Classroom Assignment System
-- Run these SQL commands in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'faculty')),
  department TEXT,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster email lookups
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- CLASSROOMS TABLE
-- ============================================
CREATE TABLE classrooms (
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
CREATE INDEX idx_classrooms_name ON classrooms(name);
CREATE INDEX idx_classrooms_building ON classrooms(building);

-- ============================================
-- SIGNUP REQUESTS TABLE
-- ============================================
CREATE TABLE signup_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  password TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_feedback TEXT,
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for signup requests
CREATE INDEX idx_signup_requests_email ON signup_requests(email);
CREATE INDEX idx_signup_requests_status ON signup_requests(status);

-- ============================================
-- BOOKING REQUESTS TABLE
-- ============================================
CREATE TABLE booking_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  faculty_name TEXT NOT NULL,
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
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
CREATE INDEX idx_booking_requests_faculty ON booking_requests(faculty_id);
CREATE INDEX idx_booking_requests_classroom ON booking_requests(classroom_id);
CREATE INDEX idx_booking_requests_date ON booking_requests(date);
CREATE INDEX idx_booking_requests_status ON booking_requests(status);

-- ============================================
-- SCHEDULES TABLE
-- ============================================
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  classroom_id UUID NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  classroom_name TEXT NOT NULL,
  faculty_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE INDEX idx_schedules_classroom ON schedules(classroom_id);
CREATE INDEX idx_schedules_faculty ON schedules(faculty_id);
CREATE INDEX idx_schedules_date ON schedules(date);
CREATE INDEX idx_schedules_status ON schedules(status);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE signup_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Users: Anyone can read (for login), but only insert during signup
CREATE POLICY "Users are viewable by everyone" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can be inserted by anyone" ON users
  FOR INSERT WITH CHECK (true);

-- Classrooms: Everyone can read
CREATE POLICY "Classrooms are viewable by everyone" ON classrooms
  FOR SELECT USING (true);

CREATE POLICY "Classrooms can be modified by admins" ON classrooms
  FOR ALL USING (true);

-- Signup Requests: Anyone can insert, everyone can read
CREATE POLICY "Signup requests are viewable by everyone" ON signup_requests
  FOR SELECT USING (true);

CREATE POLICY "Signup requests can be created by anyone" ON signup_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Signup requests can be updated by anyone" ON signup_requests
  FOR UPDATE USING (true);

-- Booking Requests: Anyone can create, everyone can read
CREATE POLICY "Booking requests are viewable by everyone" ON booking_requests
  FOR SELECT USING (true);

CREATE POLICY "Booking requests can be created by anyone" ON booking_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Booking requests can be updated by anyone" ON booking_requests
  FOR UPDATE USING (true);

-- Schedules: Everyone can read and modify
CREATE POLICY "Schedules are viewable by everyone" ON schedules
  FOR SELECT USING (true);

CREATE POLICY "Schedules can be created by anyone" ON schedules
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Schedules can be updated by anyone" ON schedules
  FOR UPDATE USING (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Insert default admin user
INSERT INTO users (email, name, role, department, password) VALUES
('registrar@plv.edu.ph', 'PLV CEIT Registrar', 'admin', 'Administration', 'admin123');

-- Insert default faculty user
INSERT INTO users (email, name, role, department, password) VALUES
('pgalarosa@plv.edu.ph', 'Paulo Galarosa', 'faculty', 'Information Technology', 'faculty123');

-- Insert default classrooms
INSERT INTO classrooms (name, capacity, equipment, building, floor, is_available) VALUES
('CEIT-101', 50, ARRAY['Projector', 'Whiteboard', 'AC'], 'CEIT Building', 1, true),
('CEIT-102', 40, ARRAY['Projector', 'Computers', 'AC'], 'CEIT Building', 1, true),
('CEIT-201', 60, ARRAY['TV', 'AC', 'Sound System'], 'CEIT Building', 2, true),
('CEIT-LAB1', 30, ARRAY['Computers', 'Projector', 'Lab Equipment'], 'CEIT Building', 1, true);

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
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classrooms_updated_at BEFORE UPDATE ON classrooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_signup_requests_updated_at BEFORE UPDATE ON signup_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_requests_updated_at BEFORE UPDATE ON booking_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at BEFORE UPDATE ON schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
