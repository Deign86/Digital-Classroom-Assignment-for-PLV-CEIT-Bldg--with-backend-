import type { User, Classroom, BookingRequest, Schedule, SignupRequest } from '../App';

/**
 * Local Storage Service
 * Provides in-memory data storage with localStorage persistence
 * This is a simplified version for local development and testing
 * Developers should replace this with their own backend implementation
 */

// Initialize default data
const hasLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const STORAGE_KEYS = {
  USERS: 'classroom_users',
  CLASSROOMS: 'classroom_classrooms',
  BOOKING_REQUESTS: 'classroom_booking_requests',
  SCHEDULES: 'classroom_schedules',
  SIGNUP_REQUESTS: 'classroom_signup_requests',
  CURRENT_USER: 'classroom_current_user',
};

// Helper functions
const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    if (!hasLocalStorage) {
      return defaultValue;
    }

    const stored = window.localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, data: T): void => {
  try {
    if (!hasLocalStorage) {
      return;
    }

    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Error saving to localStorage (${key}):`, error);
  }
};

// Generate unique IDs
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getCurrentUserId = (): string | null => {
  if (!hasLocalStorage) {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
};

const setCurrentUserId = (userId: string | null) => {
  if (!hasLocalStorage) {
    return;
  }

  if (userId) {
    window.localStorage.setItem(STORAGE_KEYS.CURRENT_USER, userId);
  } else {
    window.localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};

const getCurrentUserSync = (): User | null => {
  const id = getCurrentUserId();
  if (!id) {
    return null;
  }

  const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
  return users.find(u => u.id === id) || null;
};

type AuthListener = (user: User | null) => void;
const authListeners = new Set<AuthListener>();

const notifyAuthListeners = (user: User | null) => {
  authListeners.forEach(listener => {
    try {
      listener(user);
    } catch (error) {
      console.error('Auth listener error:', error);
    }
  });
};

// Initialize default admin user and sample data
const initializeDefaultData = () => {
  if (!hasLocalStorage) {
    return;
  }

  const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
  
  // Create default admin if no users exist
  if (users.length === 0) {
    const defaultAdmin: User = {
      id: generateId(),
      email: 'admin@plv.edu.ph',
      name: 'Admin User',
      role: 'admin',
      department: 'Administration',
      password: 'admin123456',
    };
    
    const defaultFaculty: User = {
      id: generateId(),
      email: 'faculty@plv.edu.ph',
      name: 'Faculty User',
      role: 'faculty',
      department: 'Computer Science',
      password: 'faculty123',
    };
    
    saveToStorage(STORAGE_KEYS.USERS, [defaultAdmin, defaultFaculty]);
    console.log('✅ Default users created (admin@plv.edu.ph / faculty@plv.edu.ph)');
  }
  
  // Initialize sample classrooms if none exist
  const classrooms = getFromStorage<Classroom[]>(STORAGE_KEYS.CLASSROOMS, []);
  if (classrooms.length === 0) {
    const defaultClassrooms: Classroom[] = [
      {
        id: generateId(),
        name: 'Room 101',
        capacity: 40,
        equipment: ['Projector', 'Whiteboard', 'Computer'],
        building: 'CEIT Building',
        floor: 1,
        isAvailable: true,
      },
      {
        id: generateId(),
        name: 'Room 102',
        capacity: 35,
        equipment: ['Projector', 'Whiteboard'],
        building: 'CEIT Building',
        floor: 1,
        isAvailable: true,
      },
      {
        id: generateId(),
        name: 'Lab 201',
        capacity: 30,
        equipment: ['Projector', 'Computers', 'Whiteboard'],
        building: 'CEIT Building',
        floor: 2,
        isAvailable: true,
      },
    ];
    saveToStorage(STORAGE_KEYS.CLASSROOMS, defaultClassrooms);
    console.log('✅ Sample classrooms created');
  }
  
  // Initialize empty arrays for other data if they don't exist
  if (!window.localStorage.getItem(STORAGE_KEYS.BOOKING_REQUESTS)) {
    saveToStorage(STORAGE_KEYS.BOOKING_REQUESTS, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.SCHEDULES)) {
    saveToStorage(STORAGE_KEYS.SCHEDULES, []);
  }
  if (!window.localStorage.getItem(STORAGE_KEYS.SIGNUP_REQUESTS)) {
    saveToStorage(STORAGE_KEYS.SIGNUP_REQUESTS, []);
  }
};

// Initialize data on module load
initializeDefaultData();

if (hasLocalStorage) {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.CURRENT_USER) {
      notifyAuthListeners(getCurrentUserSync());
    }
  });
}

// ============================================
// AUTHENTICATION SERVICE
// ============================================

export const authService = {
  /**
   * Sign in with email (password is simplified for local development)
   * In production, implement proper authentication
   */
  async signIn(email: string, password: string): Promise<User | null> {
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      console.error('❌ User not found');
      return null;
    }

    if (!user.password) {
      console.warn('⚠️ User does not have a password set');
      return null;
    }

    if (user.password !== password) {
      console.error('❌ Invalid password');
      return null;
    }

    setCurrentUserId(user.id);
    notifyAuthListeners(user);
    
    console.log('✅ Login successful:', user.email);
    return user;
  },

  /**
   * Sign up (creates a signup request for admin approval)
   */
  async signUp(email: string, password: string, name: string, department: string): Promise<{ success: boolean; message: string }> {
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    const signupRequests = getFromStorage<SignupRequest[]>(STORAGE_KEYS.SIGNUP_REQUESTS, []);
    
    // Check if user already exists
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'User with this email already exists' };
    }
    
    // Check if signup request already exists
    if (signupRequests.some(r => r.email.toLowerCase() === email.toLowerCase() && r.status === 'pending')) {
      return { success: false, message: 'A signup request with this email is already pending' };
    }
    
    // Create signup request
    const newRequest: SignupRequest = {
      id: generateId(),
      email,
      name,
      department,
      password, // In production, this should be hashed
      requestDate: new Date().toISOString(),
      status: 'pending',
    };
    
    signupRequests.push(newRequest);
    saveToStorage(STORAGE_KEYS.SIGNUP_REQUESTS, signupRequests);
    
    console.log('✅ Signup request created:', email);
    return { success: true, message: 'Signup request submitted for admin approval' };
  },

  /**
   * Sign out (no-op for local storage)
   */
  async signOut(): Promise<void> {
    setCurrentUserId(null);
    notifyAuthListeners(null);
    console.log('✅ Signed out');
  },

  /**
   * Reset password (simplified for local development)
   */
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return { success: false, message: 'No account found with this email' };
    }
    
    // In production, send password reset email
    console.log('✅ Password reset requested for:', email);
    return { success: true, message: 'Password reset instructions would be sent to your email' };
  },

  /**
   * Update password (simplified for local development)
   */
  async updatePassword(newPassword: string): Promise<{ success: boolean; message: string }> {
    const currentUser = getCurrentUserSync();

    if (!currentUser) {
      return { success: false, message: 'No authenticated user found' };
    }

    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.id === currentUser.id);

    if (index === -1) {
      return { success: false, message: 'User not found' };
    }

    users[index] = { ...users[index], password: newPassword };
    saveToStorage(STORAGE_KEYS.USERS, users);
    notifyAuthListeners(users[index]);

    console.log('✅ Password updated');
    return { success: true, message: 'Password updated successfully' };
  },

  async getCurrentUser(): Promise<User | null> {
    return getCurrentUserSync();
  },

  async isAuthenticated(): Promise<boolean> {
    return !!getCurrentUserSync();
  },

  onAuthStateChange(
    callback: (user: User | null) => void,
    errorCallback?: (error: string) => void
  ) {
    let timer: ReturnType<typeof setTimeout> | null = null;

    try {
      authListeners.add(callback);
      // Emit current user immediately on next tick
      timer = setTimeout(() => {
        if (authListeners.has(callback)) {
          callback(getCurrentUserSync());
        }
      }, 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errorCallback?.(message);
    }

    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authListeners.delete(callback);
            if (timer) {
              clearTimeout(timer);
            }
          }
        }
      }
    };
  },
};

// ============================================
// USER SERVICE
// ============================================

export const userService = {
  async getAll(): Promise<User[]> {
    return getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
  },

  async getByEmail(email: string): Promise<User | null> {
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  },

  async getById(id: string): Promise<User | null> {
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    return users.find(u => u.id === id) || null;
  },

  async create(userData: Omit<User, 'id'>): Promise<User> {
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    const newUser: User = {
      ...userData,
      id: generateId(),
    };
    users.push(newUser);
    saveToStorage(STORAGE_KEYS.USERS, users);
    console.log('✅ User created:', newUser.email);
    return newUser;
  },

  async update(id: string, updates: Partial<User>): Promise<User> {
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    const index = users.findIndex(u => u.id === id);
    
    if (index === -1) {
      throw new Error('User not found');
    }
    
    users[index] = { ...users[index], ...updates };
    saveToStorage(STORAGE_KEYS.USERS, users);
    console.log('✅ User updated:', users[index].email);
    return users[index];
  },

  async delete(id: string): Promise<void> {
    const users = getFromStorage<User[]>(STORAGE_KEYS.USERS, []);
    const filtered = users.filter(u => u.id !== id);
    saveToStorage(STORAGE_KEYS.USERS, filtered);
    console.log('✅ User deleted:', id);
  },
};

// ============================================
// CLASSROOM SERVICE
// ============================================

export const classroomService = {
  async getAll(): Promise<Classroom[]> {
    return getFromStorage<Classroom[]>(STORAGE_KEYS.CLASSROOMS, []);
  },

  async getById(id: string): Promise<Classroom | null> {
    const classrooms = getFromStorage<Classroom[]>(STORAGE_KEYS.CLASSROOMS, []);
    return classrooms.find(c => c.id === id) || null;
  },

  async create(classroom: Omit<Classroom, 'id'>): Promise<Classroom> {
    const classrooms = getFromStorage<Classroom[]>(STORAGE_KEYS.CLASSROOMS, []);
    const newClassroom: Classroom = {
      ...classroom,
      id: generateId(),
    };
    classrooms.push(newClassroom);
    saveToStorage(STORAGE_KEYS.CLASSROOMS, classrooms);
    console.log('✅ Classroom created:', newClassroom.name);
    return newClassroom;
  },

  async update(id: string, updates: Partial<Classroom>): Promise<Classroom> {
    const classrooms = getFromStorage<Classroom[]>(STORAGE_KEYS.CLASSROOMS, []);
    const index = classrooms.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new Error('Classroom not found');
    }
    
    classrooms[index] = { ...classrooms[index], ...updates };
    saveToStorage(STORAGE_KEYS.CLASSROOMS, classrooms);
    console.log('✅ Classroom updated:', classrooms[index].name);
    return classrooms[index];
  },

  async delete(id: string): Promise<void> {
    const classrooms = getFromStorage<Classroom[]>(STORAGE_KEYS.CLASSROOMS, []);
    const filtered = classrooms.filter(c => c.id !== id);
    saveToStorage(STORAGE_KEYS.CLASSROOMS, filtered);
    console.log('✅ Classroom deleted:', id);
  },
};

// ============================================
// BOOKING REQUEST SERVICE
// ============================================

export const bookingRequestService = {
  async getAll(): Promise<BookingRequest[]> {
    return getFromStorage<BookingRequest[]>(STORAGE_KEYS.BOOKING_REQUESTS, []);
  },

  async getById(id: string): Promise<BookingRequest | null> {
    const requests = getFromStorage<BookingRequest[]>(STORAGE_KEYS.BOOKING_REQUESTS, []);
    return requests.find(r => r.id === id) || null;
  },

  async create(request: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>): Promise<BookingRequest> {
    const requests = getFromStorage<BookingRequest[]>(STORAGE_KEYS.BOOKING_REQUESTS, []);
    const newRequest: BookingRequest = {
      ...request,
      id: generateId(),
      requestDate: new Date().toISOString(),
      status: 'pending',
    };
    requests.push(newRequest);
    saveToStorage(STORAGE_KEYS.BOOKING_REQUESTS, requests);
    console.log('✅ Booking request created');
    return newRequest;
  },

  async update(id: string, updates: Partial<BookingRequest>): Promise<BookingRequest> {
    const requests = getFromStorage<BookingRequest[]>(STORAGE_KEYS.BOOKING_REQUESTS, []);
    const index = requests.findIndex(r => r.id === id);
    
    if (index === -1) {
      throw new Error('Booking request not found');
    }
    
    requests[index] = { ...requests[index], ...updates };
    saveToStorage(STORAGE_KEYS.BOOKING_REQUESTS, requests);
    console.log('✅ Booking request updated');
    return requests[index];
  },

  async delete(id: string): Promise<void> {
    const requests = getFromStorage<BookingRequest[]>(STORAGE_KEYS.BOOKING_REQUESTS, []);
    const filtered = requests.filter(r => r.id !== id);
    saveToStorage(STORAGE_KEYS.BOOKING_REQUESTS, filtered);
    console.log('✅ Booking request deleted:', id);
  },

  async checkConflicts(
    classroomId: string,
    date: string,
    startTime: string,
    endTime: string,
    excludeRequestId?: string
  ): Promise<boolean> {
    const requests = getFromStorage<BookingRequest[]>(STORAGE_KEYS.BOOKING_REQUESTS, []);
    const schedules = getFromStorage<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
    
    // Check conflicts with approved/pending booking requests
    const hasRequestConflict = requests.some(r => {
      if (r.id === excludeRequestId) return false;
      if (r.classroomId !== classroomId) return false;
      if (r.date !== date) return false;
      if (r.status === 'rejected') return false;
      
      // Check time overlap
      return (
        (startTime >= r.startTime && startTime < r.endTime) ||
        (endTime > r.startTime && endTime <= r.endTime) ||
        (startTime <= r.startTime && endTime >= r.endTime)
      );
    });
    
    // Check conflicts with confirmed schedules
    const hasScheduleConflict = schedules.some(s => {
      if (s.classroomId !== classroomId) return false;
      if (s.date !== date) return false;
      if (s.status === 'cancelled') return false;
      
      // Check time overlap
      return (
        (startTime >= s.startTime && startTime < s.endTime) ||
        (endTime > s.startTime && endTime <= s.endTime) ||
        (startTime <= s.startTime && endTime >= s.endTime)
      );
    });
    
    return hasRequestConflict || hasScheduleConflict;
  },
};

// ============================================
// SCHEDULE SERVICE
// ============================================

export const scheduleService = {
  async getAll(): Promise<Schedule[]> {
    return getFromStorage<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
  },

  async getById(id: string): Promise<Schedule | null> {
    const schedules = getFromStorage<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
    return schedules.find(s => s.id === id) || null;
  },

  async create(schedule: Omit<Schedule, 'id'>): Promise<Schedule> {
    const schedules = getFromStorage<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
    const newSchedule: Schedule = {
      ...schedule,
      id: generateId(),
    };
    schedules.push(newSchedule);
    saveToStorage(STORAGE_KEYS.SCHEDULES, schedules);
    console.log('✅ Schedule created');
    return newSchedule;
  },

  async update(id: string, updates: Partial<Schedule>): Promise<Schedule> {
    const schedules = getFromStorage<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
    const index = schedules.findIndex(s => s.id === id);
    
    if (index === -1) {
      throw new Error('Schedule not found');
    }
    
    schedules[index] = { ...schedules[index], ...updates };
    saveToStorage(STORAGE_KEYS.SCHEDULES, schedules);
    console.log('✅ Schedule updated');
    return schedules[index];
  },

  async delete(id: string): Promise<void> {
    const schedules = getFromStorage<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
    const filtered = schedules.filter(s => s.id !== id);
    saveToStorage(STORAGE_KEYS.SCHEDULES, filtered);
    console.log('✅ Schedule deleted:', id);
  },

  async checkConflict(classroomId: string, date: string, startTime: string, endTime: string, excludeId?: string): Promise<boolean> {
    const schedules = getFromStorage<Schedule[]>(STORAGE_KEYS.SCHEDULES, []);
    
    return schedules.some(s => {
      if (s.id === excludeId) return false;
      if (s.classroomId !== classroomId) return false;
      if (s.date !== date) return false;
      if (s.status === 'cancelled') return false;
      
      // Check time overlap
      const existingStart = s.startTime;
      const existingEnd = s.endTime;
      
      return (
        (startTime >= existingStart && startTime < existingEnd) ||
        (endTime > existingStart && endTime <= existingEnd) ||
        (startTime <= existingStart && endTime >= existingEnd)
      );
    });
  },
};

// ============================================
// SIGNUP REQUEST SERVICE
// ============================================

export const signupRequestService = {
  async getAll(): Promise<SignupRequest[]> {
    return getFromStorage<SignupRequest[]>(STORAGE_KEYS.SIGNUP_REQUESTS, []);
  },

  async getById(id: string): Promise<SignupRequest | null> {
    const requests = getFromStorage<SignupRequest[]>(STORAGE_KEYS.SIGNUP_REQUESTS, []);
    return requests.find(r => r.id === id) || null;
  },

  async getByEmail(email: string): Promise<SignupRequest | null> {
    const requests = getFromStorage<SignupRequest[]>(STORAGE_KEYS.SIGNUP_REQUESTS, []);
    return requests.find(r => r.email.toLowerCase() === email.toLowerCase() && r.status === 'pending') || null;
  },

  async create(request: Omit<SignupRequest, 'id' | 'requestDate' | 'status'>): Promise<SignupRequest> {
    const requests = getFromStorage<SignupRequest[]>(STORAGE_KEYS.SIGNUP_REQUESTS, []);
    const newRequest: SignupRequest = {
      ...request,
      id: generateId(),
      requestDate: new Date().toISOString(),
      status: 'pending',
    };
    requests.push(newRequest);
    saveToStorage(STORAGE_KEYS.SIGNUP_REQUESTS, requests);
    console.log('✅ Signup request created');
    return newRequest;
  },

  async update(id: string, updates: Partial<SignupRequest>): Promise<SignupRequest> {
    const requests = getFromStorage<SignupRequest[]>(STORAGE_KEYS.SIGNUP_REQUESTS, []);
    const index = requests.findIndex(r => r.id === id);
    
    if (index === -1) {
      throw new Error('Signup request not found');
    }
    
    requests[index] = { ...requests[index], ...updates };
    saveToStorage(STORAGE_KEYS.SIGNUP_REQUESTS, requests);
    console.log('✅ Signup request updated');
    return requests[index];
  },

  async delete(id: string): Promise<void> {
    const requests = getFromStorage<SignupRequest[]>(STORAGE_KEYS.SIGNUP_REQUESTS, []);
    const filtered = requests.filter(r => r.id !== id);
    saveToStorage(STORAGE_KEYS.SIGNUP_REQUESTS, filtered);
    console.log('✅ Signup request deleted:', id);
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Clear all data from localStorage (useful for testing)
 */
export const clearAllData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('✅ All data cleared');
  initializeDefaultData();
};

/**
 * Export all data (for backup or migration)
 */
export const exportAllData = () => {
  return {
    users: getFromStorage<User[]>(STORAGE_KEYS.USERS, []),
    classrooms: getFromStorage<Classroom[]>(STORAGE_KEYS.CLASSROOMS, []),
    bookingRequests: getFromStorage<BookingRequest[]>(STORAGE_KEYS.BOOKING_REQUESTS, []),
    schedules: getFromStorage<Schedule[]>(STORAGE_KEYS.SCHEDULES, []),
    signupRequests: getFromStorage<SignupRequest[]>(STORAGE_KEYS.SIGNUP_REQUESTS, []),
  };
};

/**
 * Import all data (for restore or migration)
 */
export const importAllData = (data: ReturnType<typeof exportAllData>): void => {
  saveToStorage(STORAGE_KEYS.USERS, data.users);
  saveToStorage(STORAGE_KEYS.CLASSROOMS, data.classrooms);
  saveToStorage(STORAGE_KEYS.BOOKING_REQUESTS, data.bookingRequests);
  saveToStorage(STORAGE_KEYS.SCHEDULES, data.schedules);
  saveToStorage(STORAGE_KEYS.SIGNUP_REQUESTS, data.signupRequests);
  console.log('✅ All data imported');
};
