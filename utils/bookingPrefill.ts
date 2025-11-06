import { convertTo12Hour } from './timeUtils';
import type { BookingRequest, Schedule } from '../App';

export interface BookingInitialData {
  classroomId: string;
  date: string; // ISO YYYY-MM-DD
  startTime: string; // 12-hour format e.g. "7:00 AM"
  endTime: string;   // 12-hour format
  purpose?: string;
}

export function bookingRequestToInitial(request: BookingRequest): BookingInitialData {
  return {
    classroomId: request.classroomId,
    date: request.date,
    startTime: convertTo12Hour(request.startTime),
    endTime: convertTo12Hour(request.endTime),
    purpose: request.purpose || ''
  };
}

export function scheduleToInitial(schedule: Schedule): BookingInitialData {
  return {
    classroomId: schedule.classroomId,
    date: schedule.date,
    startTime: convertTo12Hour(schedule.startTime),
    endTime: convertTo12Hour(schedule.endTime),
    purpose: schedule.purpose || ''
  };
}

export default bookingRequestToInitial;
