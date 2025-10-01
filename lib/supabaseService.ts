import { supabase } from './supabaseClient';
import type { User, Classroom, BookingRequest, Schedule, SignupRequest } from '../App';

// ============================================
// USER OPERATIONS
// ============================================

export const userService = {
  // Get all users
  async getAll(): Promise<User[]> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get user by email
  async getByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    return data;
  },

  // Get user by ID
  async getById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Create new user
  async create(user: Omit<User, 'id'>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update user
  async update(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete user
  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Login (verify credentials)
  async login(email: string, password: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }
};

// ============================================
// CLASSROOM OPERATIONS
// ============================================

export const classroomService = {
  // Get all classrooms
  async getAll(): Promise<Classroom[]> {
    const { data, error } = await supabase
      .from('classrooms')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    
    // Transform data to match Classroom interface
    return (data || []).map((room: any) => ({
      id: room.id,
      name: room.name,
      capacity: room.capacity,
      equipment: room.equipment,
      building: room.building,
      floor: room.floor,
      isAvailable: room.is_available
    }));
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
    const { data, error } = await supabase
      .from('signup_requests')
      .select('*')
      .order('request_date', { ascending: false });

    if (error) throw error;

    return (data || []).map((req: any) => ({
      id: req.id,
      email: req.email,
      name: req.name,
      department: req.department,
      password: req.password,
      requestDate: req.request_date,
      status: req.status as 'pending' | 'approved' | 'rejected',
      adminFeedback: req.admin_feedback
    }));
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
    const { data, error } = await supabase
      .from('booking_requests')
      .select('*')
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
      status: req.status as 'pending' | 'approved' | 'rejected',
      requestDate: req.request_date,
      adminFeedback: req.admin_feedback
    }));
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

    // Check approved requests (not pending ones, as we want to allow multiple pending requests for the same time)
    let requestQuery = supabase
      .from('booking_requests')
      .select('*')
      .eq('classroom_id', classroomId)
      .eq('date', date)
      .eq('status', 'approved');

    if (excludeRequestId) {
      requestQuery = requestQuery.neq('id', excludeRequestId);
    }

    const { data: requests, error: reqError } = await requestQuery;
    if (reqError) throw reqError;

    // Check for time overlaps
    // Two time ranges overlap if one starts before the other ends
    const hasTimeConflict = (bookingStartTime: string, bookingEndTime: string) => {
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
    const { data, error } = await supabase
      .from('schedules')
      .select('*')
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
      status: schedule.status as 'confirmed' | 'cancelled'
    }));
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
