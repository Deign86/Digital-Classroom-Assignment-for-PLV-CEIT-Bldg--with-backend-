import { createMockUser, createMockNotification, createMockRequest, createMockClassroom, createMockSchedule } from './factories';

export const userFixture = createMockUser();
export const notificationFixture = createMockNotification();
export const requestFixture = createMockRequest();
export const classroomFixture = createMockClassroom();
export const scheduleFixture = createMockSchedule();

export const multipleNotifications = [
  createMockNotification({ id: 'notif_1' }),
  createMockNotification({ id: 'notif_2' }),
  createMockNotification({ id: 'notif_3' }),
];
