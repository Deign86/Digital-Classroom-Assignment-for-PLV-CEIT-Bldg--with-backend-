-- Create initial admin user for testing
-- Run this in Supabase SQL Editor after resetting the database

-- First, create the auth user
-- Note: You'll need to use Supabase Dashboard > Authentication > Users > Add User
-- OR use the SQL below if you have access to auth schema

-- Create admin profile (the trigger will create auth.user automatically when we insert)
-- Password for admin will be: admin123456

DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Create auth user with password
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    gen_random_uuid(),
    'admin@plv.edu.ph',
    crypt('admin123456', gen_salt('bf')),  -- Password: admin123456
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"Admin User","role":"admin"}',
    now(),
    now(),
    '',
    ''
  )
  RETURNING id INTO admin_user_id;

  -- Create profile
  INSERT INTO public.profiles (
    id,
    email,
    name,
    role,
    department,
    created_at,
    updated_at
  ) VALUES (
    admin_user_id,
    'admin@plv.edu.ph',
    'Admin User',
    'admin',
    'Administration',
    now(),
    now()
  );

  RAISE NOTICE 'Admin user created successfully with ID: %', admin_user_id;
END $$;
