import { BookingRequest, Schedule, Classroom, User, SignupRequest } from '../../../App'

export const mockClassroom: Classroom = {
  id: 'classroom-1',
  name: 'Room 101',
  building: 'CEIT Building',
  floor: 1,
  capacity: 40,
  equipment: ['Projector', 'Whiteboard', 'Air Conditioning'],
  isAvailable: true,
}

export const mockClassroom2: Classroom = {
  id: 'classroom-2',
  name: 'Room 102',
  building: 'CEIT Building',
  floor: 1,
  capacity: 35,
  equipment: ['Projector', 'Whiteboard'],
  isAvailable: true,
}

export const mockFacultyUser: User = {
  id: 'faculty-user-id',
  email: 'faculty@plv.edu.ph',
  name: 'John Doe',
  role: 'faculty',
  department: 'Computer Science',
  status: 'approved',
  pushEnabled: false,
}

export const mockAdminUser: User = {
  id: 'admin-user-id',
  email: 'admin@plv.edu.ph',
  name: 'Admin User',
  role: 'admin',
  department: 'Administration',
  status: 'approved',
  pushEnabled: false,
}

export const mockPendingBooking: BookingRequest = {
  id: 'booking-1',
  classroomId: 'classroom-1',
  classroomName: 'Room 101',
  facultyId: 'faculty-user-id',
  facultyName: 'John Doe',
  date: '2025-11-15',
  startTime: '09:00',
  endTime: '10:30',
  purpose: 'Regular class lecture',
  status: 'pending',
  requestDate: new Date().toISOString(),
}

export const mockApprovedBooking: BookingRequest = {
  ...mockPendingBooking,
  id: 'booking-2',
  status: 'approved',
}

export const mockRejectedBooking: BookingRequest = {
  ...mockPendingBooking,
  id: 'booking-3',
  status: 'rejected',
  adminFeedback: 'Room not available',
}

export const mockSchedule: Schedule = {
  id: 'schedule-1',
  classroomId: 'classroom-1',
  classroomName: 'Room 101',
  facultyId: 'faculty-user-id',
  facultyName: 'John Doe',
  date: '2025-11-15',
  startTime: '09:00',
  endTime: '10:30',
  purpose: 'Regular class lecture',
  status: 'confirmed',
}

// Helper to create date strings
export const createDateString = (daysFromNow: number): string => {
  const date = new Date()
  date.setDate(date.getDate() + daysFromNow)
  return date.toISOString().split('T')[0]
}

// Helper to create booking with custom data
export const createMockBooking = (overrides: Partial<BookingRequest> = {}): BookingRequest => ({
  ...mockPendingBooking,
  id: `booking-${Math.random().toString(36).substr(2, 9)}`,
  ...overrides,
})

// Helper to create classroom with custom data
export const createMockClassroom = (overrides: Partial<Classroom> = {}): Classroom => ({
  ...mockClassroom,
  id: `classroom-${Math.random().toString(36).substr(2, 9)}`,
  ...overrides,
})

// Helper to create schedule with custom data
export const createMockSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
  ...mockSchedule,
  id: `schedule-${Math.random().toString(36).substr(2, 9)}`,
  ...overrides,
})

// Helper to create user with custom data
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  ...mockFacultyUser,
  id: `user-${Math.random().toString(36).substr(2, 9)}`,
  ...overrides,
})

// Mock arrays for dashboard testing
export const mockClassrooms: Classroom[] = [
  mockClassroom,
  mockClassroom2,
  createMockClassroom({ id: 'classroom-3', name: 'Room 103', isAvailable: false })
]

export const mockUsers: User[] = [
  mockAdminUser,
  mockFacultyUser,
  createMockUser({ id: 'user-3', name: 'Jane Smith', email: 'jane@plv.edu.ph' })
]

export const mockBookingRequests: BookingRequest[] = [
  mockPendingBooking,
  mockApprovedBooking,
  mockRejectedBooking,
  createMockBooking({ id: 'booking-4', status: 'pending', facultyName: 'Jane Smith', classroomName: 'Room 102' })
]

export const mockSignupRequests: SignupRequest[] = [
  {
    id: 'signup-1',
    userId: 'pending-user-1',
    email: 'newuser@plv.edu.ph',
    name: 'New User',
    department: 'Computer Science',
    status: 'pending',
    requestDate: new Date().toISOString()
  },
  {
    id: 'signup-2',
    userId: 'pending-user-2',
    email: 'another@plv.edu.ph',
    name: 'Another User',
    department: 'Information Technology',
    status: 'pending',
    requestDate: new Date().toISOString()
  }
]

export const mockSchedules: Schedule[] = [
  mockSchedule,
  createMockSchedule({ id: 'schedule-2', date: '2025-11-16', classroomName: 'Room 102' })
]
