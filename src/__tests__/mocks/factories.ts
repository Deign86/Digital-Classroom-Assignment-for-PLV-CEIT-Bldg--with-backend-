export const createMockUser = (overrides: any = {}) => ({
  id: overrides.id ?? 'user_1',
  uid: overrides.uid ?? 'uid_user_1',
  email: overrides.email ?? 'test@plv.edu.ph',
  name: overrides.name ?? 'Test User',
  role: overrides.role ?? 'faculty',
  status: overrides.status ?? 'approved',
  pushEnabled: overrides.pushEnabled ?? true,
  ...overrides,
});

export const createMockNotification = (overrides: any = {}) => ({
  id: overrides.id ?? 'notif_1',
  userId: overrides.userId ?? 'uid_user_1',
  type: overrides.type ?? 'info',
  message: overrides.message ?? 'This is a test notification',
  bookingRequestId: overrides.bookingRequestId ?? null,
  adminFeedback: overrides.adminFeedback ?? null,
  acknowledgedBy: overrides.acknowledgedBy ?? null,
  acknowledgedAt: overrides.acknowledgedAt ?? null,
  createdAt: overrides.createdAt ?? new Date().toISOString(),
  updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  ...overrides,
});

export const createMockRequest = (overrides: any = {}) => ({
  id: overrides.id ?? 'req_1',
  facultyId: overrides.facultyId ?? 'uid_user_1',
  classroomId: overrides.classroomId ?? 'class_1',
  classroomName: overrides.classroomName ?? 'Room A',
  date: overrides.date ?? new Date().toISOString().split('T')[0],
  startTime: overrides.startTime ?? '09:00',
  endTime: overrides.endTime ?? '10:00',
  purpose: overrides.purpose ?? 'Lecture',
  status: overrides.status ?? 'pending',
  requestDate: overrides.requestDate ?? new Date().toISOString(),
  ...overrides,
});

export const createMockClassroom = (overrides: any = {}) => ({
  id: overrides.id ?? 'class_1',
  name: overrides.name ?? 'Room A',
  capacity: overrides.capacity ?? 30,
  equipment: overrides.equipment ?? [],
  building: overrides.building ?? 'Main',
  floor: overrides.floor ?? 1,
  isAvailable: overrides.isAvailable ?? true,
  ...overrides,
});

export const createMockSchedule = (overrides: any = {}) => ({
  id: overrides.id ?? 'sched_1',
  classroomId: overrides.classroomId ?? 'class_1',
  facultyId: overrides.facultyId ?? 'uid_user_1',
  date: overrides.date ?? new Date().toISOString().split('T')[0],
  startTime: overrides.startTime ?? '09:00',
  endTime: overrides.endTime ?? '10:00',
  purpose: overrides.purpose ?? 'Class',
  status: overrides.status ?? 'confirmed',
  ...overrides,
});
