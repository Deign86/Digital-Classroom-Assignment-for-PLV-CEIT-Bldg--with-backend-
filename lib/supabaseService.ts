import { supabase } from './supabaseClient';
import type { User, Classroom, BookingRequest, Schedule, SignupRequest } from '../App';

// ============================================
// USER OPERATIONS (Now uses profiles table with Supabase Auth)
// ============================================

export const userService = {
  // Get all users from profiles
  async getAll(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        throw error;
      }
      
      // Filter out any invalid users (missing required fields)
      const validUsers = (data || []).filter(user => {
        const isValid = user.id && user.email && user.name && user.role;
        if (!isValid) {
          console.warn('Invalid user found in database:', user);
        }
        return isValid;
      });
      
      console.log(`Loaded ${validUsers.length} valid users from database`);
      return validUsers;
    } catch (err) {
      console.error('Failed to load users:', err);
      // Return empty array instead of throwing to allow app to continue
      return [];
    }
  },

  // Get user by email
  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  // Get user by ID
  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Note: Login is now handled by authService.signIn() in supabaseAuth.ts
  // Note: Signup is now handled by authService.signUp() in supabaseAuth.ts

  // Create new user (used when admin approves signup request)
  async create(user: Omit<User, 'id'> & { password: string }): Promise<User> {
    // Import authService dynamically to avoid circular dependency
    const { authService } = await import('./supabaseAuth');
    
    // Use admin API to create user with auto-confirmed email
    const { user: newUser, error } = await authService.createUserAsAdmin(
      user.email,
      user.password,
      user.name,
      user.role,
      user.department
    );

    if (error || !newUser) {
      throw new Error(error || 'Failed to create user');
    }

    return newUser;
  },

  // Update user profile
  async update(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete user (cascade deletes auth.users entry)
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};

// ============================================
// CLASSROOM OPERATIONS
// ============================================

export const classroomService = {
  // Get all classrooms
  async getAll(): Promise<Classroom[]> {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching classrooms:', error);
        throw error;
      }
      
      // Transform data to match Classroom interface
      const classrooms = (data || []).map((room: any) => ({
        id: room.id,
        name: room.name,
        capacity: room.capacity,
        equipment: room.equipment,
        building: room.building,
        floor: room.floor,
        isAvailable: room.is_available
      }));
      
      console.log(`Loaded ${classrooms.length} classrooms from database`);
      return classrooms;
    } catch (err) {
      console.error('Failed to load classrooms:', err);
      return [];
    }
  },

  // Get classroom by ID
  async getById(id: string): Promise<Classroom | null> {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
      id: data.id,
      name: data.name,
      capacity: data.capacity,
      equipment: data.equipment,
      building: data.building,
      floor: data.floor,
      isAvailable: data.is_available
    };
  },

  // Create classroom
  async create(classroom: Omit<Classroom, 'id'>): Promise<Classroom> {
    const { data, error } = await supabase
      .from('classrooms')
      .insert([{
        name: classroom.name,
        capacity: classroom.capacity,
        equipment: classroom.equipment,
        building: classroom.building,
        floor: classroom.floor,
        is_available: classroom.isAvailable
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      capacity: data.capacity,
      equipment: data.equipment,
      building: data.building,
      floor: data.floor,
      isAvailable: data.is_available
    };
  },

  // Update classroom
  async update(id: string, updates: Partial<Classroom>): Promise<Classroom> {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
    if (updates.equipment !== undefined) dbUpdates.equipment = updates.equipment;
    if (updates.building !== undefined) dbUpdates.building = updates.building;
    if (updates.floor !== undefined) dbUpdates.floor = updates.floor;
    if (updates.isAvailable !== undefined) dbUpdates.is_available = updates.isAvailable;

    const { data, error } = await supabase
      .from('classrooms')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      name: data.name,
      capacity: data.capacity,
      equipment: data.equipment,
      building: data.building,
      floor: data.floor,
      isAvailable: data.is_available
    };
  },

  // Delete classroom
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('classrooms')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// ============================================
// SIGNUP REQUEST OPERATIONS
// ============================================

export const signupRequestService = {
  // Get all signup requests
  async getAll(): Promise<SignupRequest[]> {
    try {
      const { data, error } = await supabase
        .from('signup_requests')
        .select('*')
        .order('request_date', { ascending: false });

      if (error) {
        console.error('Error fetching signup requests:', error);
        throw error;
      }

      const requests = (data || []).map((req: any) => ({
        id: req.id,
        email: req.email,
        name: req.name,
        department: req.department,
        password: req.password,
        requestDate: req.request_date,
        status: req.status as 'pending' | 'approved' | 'rejected',
        adminFeedback: req.admin_feedback
      }));
      
      console.log(`Loaded ${requests.length} signup requests from database`);
      return requests;
    } catch (err) {
      console.error('Failed to load signup requests:', err);
      return [];
    }
  },

  // Get signup request by email
  async getByEmail(email: string): Promise<SignupRequest | null> {
    const { data, error } = await supabase
      .from('signup_requests')
      .select('*')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      department: data.department,
      password: data.password,
      requestDate: data.request_date,
      status: data.status,
      adminFeedback: data.admin_feedback
    };
  },

  // Create signup request
  async create(request: Omit<SignupRequest, 'id' | 'requestDate'>): Promise<SignupRequest> {
    const { data, error } = await supabase
      .from('signup_requests')
      .insert([{
        email: request.email,
        name: request.name,
        department: request.department,
        password: request.password,
        status: request.status,
        admin_feedback: request.adminFeedback
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      department: data.department,
      password: data.password,
      requestDate: data.request_date,
      status: data.status,
      adminFeedback: data.admin_feedback
    };
  },

  // Update signup request
  async update(id: string, updates: Partial<SignupRequest>): Promise<SignupRequest> {
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.adminFeedback !== undefined) dbUpdates.admin_feedback = updates.adminFeedback;
    if (updates.status === 'approved' || updates.status === 'rejected') {
      dbUpdates.processed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('signup_requests')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      department: data.department,
      password: data.password,
      requestDate: data.request_date,
      status: data.status,
      adminFeedback: data.admin_feedback
    };
  }
};

// ============================================
// BOOKING REQUEST OPERATIONS
// ============================================

export const bookingRequestService = {
  // Get all booking requests
  async getAll(): Promise<BookingRequest[]> {
    try {
      const { data, error } = await supabase
        .from('booking_requests')
        .select('*')
        .order('request_date', { ascending: false });

      if (error) {
        console.error('Error fetching booking requests:', error);
        throw error;
      }

      const requests = (data || []).map((req: any) => ({
        id: req.id,
        facultyId: req.faculty_id,
        facultyName: req.faculty_name,
        classroomId: req.classroom_id,
        classroomName: req.classroom_name,
        date: req.date,
        startTime: req.start_time,
        endTime: req.end_time,
        purpose: req.purpose,
        status: req.status as 'pending' | 'approved' | 'rejected',
        requestDate: req.request_date,
        adminFeedback: req.admin_feedback
      }));
      
      console.log(`Loaded ${requests.length} booking requests from database`);
      return requests;
    } catch (err) {
      console.error('Failed to load booking requests:', err);
      return [];
    }
  },

  // Get booking requests by faculty ID
  async getByFacultyId(facultyId: string): Promise<BookingRequest[]> {
    const { data, error } = await supabase
      .from('booking_requests')
      .select('*')
      .eq('faculty_id', facultyId)
      .order('request_date', { ascending: false });

    if (error) throw error;

    return (data || []).map((req: any) => ({
      id: req.id,
      facultyId: req.faculty_id,
      facultyName: req.faculty_name,
      classroomId: req.classroom_id,
      classroomName: req.classroom_name,
      date: req.date,
      startTime: req.start_time,
      endTime: req.end_time,
      purpose: req.purpose,
      status: req.status,
      requestDate: req.request_date,
      adminFeedback: req.admin_feedback
    }));
  },

  // Create booking request
  async create(request: Omit<BookingRequest, 'id' | 'requestDate'>): Promise<BookingRequest> {
    const { data, error } = await supabase
      .from('booking_requests')
      .insert([{
        faculty_id: request.facultyId,
        faculty_name: request.facultyName,
        classroom_id: request.classroomId,
        classroom_name: request.classroomName,
        date: request.date,
        start_time: request.startTime,
        end_time: request.endTime,
        purpose: request.purpose,
        status: request.status,
        admin_feedback: request.adminFeedback
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      facultyId: data.faculty_id,
      facultyName: data.faculty_name,
      classroomId: data.classroom_id,
      classroomName: data.classroom_name,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      purpose: data.purpose,
      status: data.status,
      requestDate: data.request_date,
      adminFeedback: data.admin_feedback
    };
  },

  // Update booking request
  async update(id: string, updates: Partial<BookingRequest>): Promise<BookingRequest> {
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.adminFeedback !== undefined) dbUpdates.admin_feedback = updates.adminFeedback;
    if (updates.status === 'approved' || updates.status === 'rejected') {
      dbUpdates.processed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('booking_requests')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      facultyId: data.faculty_id,
      facultyName: data.faculty_name,
      classroomId: data.classroom_id,
      classroomName: data.classroom_name,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      purpose: data.purpose,
      status: data.status,
      requestDate: data.request_date,
      adminFeedback: data.admin_feedback
    };
  },

  // Check for conflicts
  async checkConflicts(
    classroomId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeRequestId?: string
  ): Promise<boolean> {
    // Check schedules
    const { data: schedules, error: schedError } = await supabase
      .from('schedules')
      .select('*')
      .eq('classroom_id', classroomId)
      .eq('date', date)
      .eq('status', 'confirmed');

    if (schedError) throw schedError;

    // Check both approved AND pending requests to prevent double-booking
    // This ensures that even during the approval process, conflicts are detected
    let requestQuery = supabase
      .from('booking_requests')
      .select('*')
      .eq('classroom_id', classroomId)
      .eq('date', date)
      .in('status', ['pending', 'approved']);

    if (excludeRequestId) {
      requestQuery = requestQuery.neq('id', excludeRequestId);
    }

    const { data: requests, error: reqError } = await requestQuery;
    if (reqError) throw reqError;

    // Check for time overlaps
    // Two time ranges overlap if one starts before the other ends (not at the exact same time)
    // This allows back-to-back bookings (e.g., 9:00-10:00 and 10:00-11:00 don't conflict)
    const hasTimeConflict = (bookingStartTime: string, bookingEndTime: string) => {
      // True overlap: intervals intersect if start1 < end2 AND end1 > start2
      // Using < and > (not <= or >=) allows bookings to end/start at the same time
      return startTime < bookingEndTime && endTime > bookingStartTime;
    };

    const scheduleConflict = (schedules || []).some((schedule: any) =>
      hasTimeConflict(schedule.start_time, schedule.end_time)
    );

    const requestConflict = (requests || []).some((request: any) =>
      hasTimeConflict(request.start_time, request.end_time)
    );

    return scheduleConflict || requestConflict;
  }
};

// ============================================
// SCHEDULE OPERATIONS
// ============================================

export const scheduleService = {
  // Get all schedules
  async getAll(): Promise<Schedule[]> {
    try {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching schedules:', error);
        throw error;
      }

      const schedules = (data || []).map((schedule: any) => ({
        id: schedule.id,
        classroomId: schedule.classroom_id,
        classroomName: schedule.classroom_name,
        facultyId: schedule.faculty_id,
        facultyName: schedule.faculty_name,
        date: schedule.date,
        startTime: schedule.start_time,
        endTime: schedule.end_time,
        purpose: schedule.purpose,
        status: schedule.status as 'confirmed' | 'cancelled'
      }));
      
      console.log(`Loaded ${schedules.length} schedules from database`);
      return schedules;
    } catch (err) {
      console.error('Failed to load schedules:', err);
      return [];
    }
  },

  // Get schedules by faculty ID
  async getByFacultyId(facultyId: string): Promise<Schedule[]> {
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
      .eq('faculty_id', facultyId)
      .order('date', { ascending: false });

    if (error) throw error;

    return (data || []).map((schedule: any) => ({
      id: schedule.id,
      classroomId: schedule.classroom_id,
      classroomName: schedule.classroom_name,
      facultyId: schedule.faculty_id,
      facultyName: schedule.faculty_name,
      date: schedule.date,
      startTime: schedule.start_time,
      endTime: schedule.end_time,
      purpose: schedule.purpose,
      status: schedule.status
    }));
  },

  // Create schedule
  async create(schedule: Omit<Schedule, 'id'>): Promise<Schedule> {
    const { data, error } = await supabase
      .from('schedules')
      .insert([{
        classroom_id: schedule.classroomId,
        classroom_name: schedule.classroomName,
        faculty_id: schedule.facultyId,
        faculty_name: schedule.facultyName,
        date: schedule.date,
        start_time: schedule.startTime,
        end_time: schedule.endTime,
        purpose: schedule.purpose,
        status: schedule.status
      }])
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      classroomId: data.classroom_id,
      classroomName: data.classroom_name,
      facultyId: data.faculty_id,
      facultyName: data.faculty_name,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      purpose: data.purpose,
      status: data.status
    };
  },

  // Update schedule
  async update(id: string, updates: Partial<Schedule>): Promise<Schedule> {
    const dbUpdates: any = {};
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
    if (updates.endTime !== undefined) dbUpdates.end_time = updates.endTime;
    if (updates.purpose !== undefined) dbUpdates.purpose = updates.purpose;

    const { data, error } = await supabase
      .from('schedules')
      .update(dbUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      classroomId: data.classroom_id,
      classroomName: data.classroom_name,
      facultyId: data.faculty_id,
      facultyName: data.faculty_name,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      purpose: data.purpose,
      status: data.status
    };
  },

  // Delete schedule
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};
