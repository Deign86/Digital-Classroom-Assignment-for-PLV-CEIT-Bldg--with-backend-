// Time utility functions for converting between 24-hour and 12-hour formats

export function convertTo12Hour(time24: string): string {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function convertTo24Hour(time12: string): string {
  if (!time12) return '';
  
  const [time, period] = time12.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  
  let hours24 = hours;
  if (period === 'AM' && hours === 12) {
    hours24 = 0;
  } else if (period === 'PM' && hours !== 12) {
    hours24 = hours + 12;
  }
  
  return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

// Generate time slots from 7:00 AM to 8:00 PM in 30-minute intervals
export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  
  // Start from 7:00 AM (07:00) to 8:00 PM (20:00)
  for (let hour = 7; hour <= 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(convertTo12Hour(time24));
    }
  }
  
  return slots;
}

// Validate if time is within school hours (7 AM to 8 PM)
export function isValidSchoolTime(time12: string): boolean {
  const time24 = convertTo24Hour(time12);
  const [hours] = time24.split(':').map(Number);
  
  return hours >= 7 && hours <= 20;
}

// Compare two 12-hour times
export function compareTime12Hour(time1: string, time2: string): number {
  const time1_24 = convertTo24Hour(time1);
  const time2_24 = convertTo24Hour(time2);
  
  return time1_24.localeCompare(time2_24);
}

// Check if end time is after start time (same day booking)
export function isValidTimeRange(startTime: string, endTime: string): boolean {
  const start24 = convertTo24Hour(startTime);
  const end24 = convertTo24Hour(endTime);
  
  const [startHour, startMinute] = start24.split(':').map(Number);
  const [endHour, endMinute] = end24.split(':').map(Number);
  
  // Convert to total minutes for easier comparison
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  // End time must be after start time (same day)
  return endTotalMinutes > startTotalMinutes;
}

// Check if booking duration is reasonable (max 8 hours)
export function isReasonableBookingDuration(startTime: string, endTime: string): boolean {
  const start24 = convertTo24Hour(startTime);
  const end24 = convertTo24Hour(endTime);
  
  const [startHour, startMinute] = start24.split(':').map(Number);
  const [endHour, endMinute] = end24.split(':').map(Number);
  
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  
  const durationMinutes = endTotalMinutes - startTotalMinutes;
  const durationHours = durationMinutes / 60;
  
  // Max 8 hours, min 30 minutes
  return durationHours >= 0.5 && durationHours <= 8;
}

// Get valid end times based on start time
export function getValidEndTimes(startTime: string, allTimeSlots: string[]): string[] {
  if (!startTime) return allTimeSlots;
  
  const start24 = convertTo24Hour(startTime);
  const [startHour, startMinute] = start24.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  
  return allTimeSlots.filter(timeSlot => {
    const end24 = convertTo24Hour(timeSlot);
    const [endHour, endMinute] = end24.split(':').map(Number);
    const endTotalMinutes = endHour * 60 + endMinute;
    
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    const durationHours = durationMinutes / 60;
    
    // Must be after start time, max 8 hours, within school hours
    return endTotalMinutes > startTotalMinutes && 
           durationHours <= 8 && 
           endHour <= 20; // End by 8 PM
  });
}

// Format time range for display
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

// Check if a booking time is in the past
export function isPastBookingTime(date: string, time: string): boolean {
  if (!date || !time) return false;
  
  const now = new Date();
  
  // Parse the date string and create a date object in local timezone
  // This prevents timezone offset issues when comparing dates
  const [year, month, day] = date.split('-').map(Number);
  const time24 = convertTo24Hour(time);
  const [hours, minutes] = time24.split(':').map(Number);
  
  // Create booking datetime in local timezone
  const bookingDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
  
  // Add a small buffer (5 minutes) to account for processing time
  // This prevents booking requests for times that are about to pass
  const currentTimeWithBuffer = new Date(now.getTime() + 5 * 60 * 1000);
  
  return bookingDateTime <= currentTimeWithBuffer;
}

// Check if a specific time slot is available (not in past and not during existing bookings)
export function isTimeSlotAvailable(date: string, time: string, currentTime?: Date): boolean {
  const now = currentTime || new Date();
  
  // Check if it's in the past
  if (isPastBookingTime(date, time)) {
    return false;
  }
  
  // Check if it's within school hours
  if (!isValidSchoolTime(time)) {
    return false;
  }
  
  return true;
}

// Get current time in 12-hour format for comparison
export function getCurrentTime12Hour(): string {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// Add days to a YYYY-MM-DD date string and return YYYY-MM-DD (local timezone)
export function addDaysToDateString(dateString: string, days: number): string {
  if (!dateString) return dateString;
  const parts = dateString.split('-').map(Number);
  if (parts.length < 3) return dateString;
  const [year, month, day] = parts;
  const dt = new Date(year, month - 1, day);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = (dt.getMonth() + 1).toString().padStart(2, '0');
  const d = dt.getDate().toString().padStart(2, '0');
  return `${y}-${m}-${d}`;
}