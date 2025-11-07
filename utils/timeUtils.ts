/**
 * Time utility functions for converting between 24-hour and 12-hour formats.
 * 
 * These utilities help manage school hours, validate booking times,
 * and provide consistent time formatting throughout the application.
 */

/**
 * Converts 24-hour time format to 12-hour format with AM/PM.
 * 
 * @param time24 - Time in 24-hour format (HH:MM)
 * @returns Time in 12-hour format with AM/PM (e.g., "2:30 PM")
 * 
 * @example
 * ```typescript
 * convertTo12Hour("14:30") // Returns "2:30 PM"
 * convertTo12Hour("09:00") // Returns "9:00 AM"
 * ```
 */
export function convertTo12Hour(time24: string): string {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Converts 12-hour time format with AM/PM to 24-hour format.
 * 
 * @param time12 - Time in 12-hour format with AM/PM (e.g., "2:30 PM")
 * @returns Time in 24-hour format (HH:MM)
 * 
 * @example
 * ```typescript
 * convertTo24Hour("2:30 PM")  // Returns "14:30"
 * convertTo24Hour("12:00 AM") // Returns "00:00"
 * ```
 */
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

/**
 * Generates all available time slots for classroom booking.
 * 
 * Creates slots from 7:00 AM to 7:00 PM in 30-minute intervals,
 * representing school operating hours. The last available start time is 7:00 PM
 * since the latest classes run from 7:00 PM to 8:00 PM.
 * 
 * @returns Array of time slots in 12-hour format
 * 
 * @example
 * ```typescript
 * const slots = generateTimeSlots();
 * // ["7:00 AM", "7:30 AM", "8:00 AM", ..., "7:00 PM"]
 * ```
 */
export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  
  // Start from 7:00 AM (07:00) to 7:00 PM (19:00)
  // Latest classes run from 7:00 PM to 8:00 PM
  for (let hour = 7; hour <= 19; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      // Skip 7:30 PM - latest start time is 7:00 PM
      if (hour === 19 && minute === 30) {
        continue;
      }
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(convertTo12Hour(time24));
    }
  }
  
  return slots;
}

/**
 * Validates if a time falls within school operating hours.
 * 
 * School hours are defined as 7:00 AM to 8:00 PM (for end times).
 * Start times are limited to 7:00 PM max.
 * 
 * @param time12 - Time in 12-hour format
 * @returns true if time is within school hours
 * 
 * @example
 * ```typescript
 * isValidSchoolTime("8:00 AM")  // true
 * isValidSchoolTime("10:00 PM") // false
 * ```
 */
export function isValidSchoolTime(time12: string): boolean {
  const time24 = convertTo24Hour(time12);
  const [hours] = time24.split(':').map(Number);
  
  return hours >= 7 && hours <= 20;
}

/**
 * Compares two times in 12-hour format.
 * 
 * @param time1 - First time in 12-hour format
 * @param time2 - Second time in 12-hour format
 * @returns Negative if time1 < time2, 0 if equal, positive if time1 > time2
 * 
 * @example
 * ```typescript
 * compareTime12Hour("9:00 AM", "10:00 AM")  // Returns negative
 * compareTime12Hour("2:00 PM", "2:00 PM")   // Returns 0
 * ```
 */
export function compareTime12Hour(time1: string, time2: string): number {
  const time1_24 = convertTo24Hour(time1);
  const time2_24 = convertTo24Hour(time2);
  
  return time1_24.localeCompare(time2_24);
}

/**
 * Validates that end time is after start time (for same-day bookings).
 * 
 * @param startTime - Booking start time in 12-hour format
 * @param endTime - Booking end time in 12-hour format
 * @returns true if end time is after start time
 * 
 * @example
 * ```typescript
 * isValidTimeRange("9:00 AM", "11:00 AM")  // true
 * isValidTimeRange("3:00 PM", "1:00 PM")   // false
 * ```
 */
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

/**
 * Checks if booking duration is within reasonable limits.
 * 
 * Enforces minimum duration of 30 minutes and maximum of 8 hours.
 * 
 * @param startTime - Booking start time in 12-hour format
 * @param endTime - Booking end time in 12-hour format
 * @returns true if duration is between 30 minutes and 8 hours
 * 
 * @example
 * ```typescript
 * isReasonableBookingDuration("9:00 AM", "5:00 PM")   // true (8 hours)
 * isReasonableBookingDuration("9:00 AM", "9:15 AM")   // false (too short)
 * isReasonableBookingDuration("9:00 AM", "10:00 PM")  // false (too long)
 * ```
 */
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

/**
 * Gets valid end times based on a given start time.
 * 
 * Filters time slots to only show times that are:
 * - After the start time
 * - Within reasonable booking duration (up to 8 hours)
 * - Within school hours (up to 8:00 PM)
 * 
 * @param startTime - Selected start time in 12-hour format
 * @param allTimeSlots - Array of all available time slots
 * @returns Filtered array of valid end times
 * 
 * @example
 * ```typescript
 * const validEnds = getValidEndTimes("9:00 AM", generateTimeSlots());
 * // Returns slots from 9:30 AM onwards, up to 8 hours later
 * ```
 */
export function getValidEndTimes(startTime: string, allTimeSlots: string[]): string[] {
  if (!startTime) return allTimeSlots;
  
  const start24 = convertTo24Hour(startTime);
  const [startHour, startMinute] = start24.split(':').map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  
  const validTimes = allTimeSlots.filter(timeSlot => {
    const end24 = convertTo24Hour(timeSlot);
    const [endHour, endMinute] = end24.split(':').map(Number);
    const endTotalMinutes = endHour * 60 + endMinute;
    
    const durationMinutes = endTotalMinutes - startTotalMinutes;
    const durationHours = durationMinutes / 60;
    
    // Must be after start time, max 8 hours, end by 8:00 PM (20:00)
    return endTotalMinutes > startTotalMinutes && 
           durationHours <= 8 && 
           (endHour < 20 || (endHour === 20 && endMinute === 0));
  });
  
  // Add 8:00 PM as a valid end time if it's not already included and it's valid
  const eightPM = '8:00 PM';
  const eightPM24 = convertTo24Hour(eightPM);
  const [eightHour, eightMinute] = eightPM24.split(':').map(Number);
  const eightTotalMinutes = eightHour * 60 + eightMinute;
  const durationToEight = (eightTotalMinutes - startTotalMinutes) / 60;
  
  if (!validTimes.includes(eightPM) && 
      eightTotalMinutes > startTotalMinutes && 
      durationToEight <= 8) {
    validTimes.push(eightPM);
  }
  
  return validTimes;
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

/**
 * Abbreviates department names to their initials.
 * 
 * @param departments - Array of department names or single department string
 * @param separator - Separator to use between abbreviations (default: ', ')
 * @returns Abbreviated department string(s) joined with separator
 * 
 * @example
 * ```typescript
 * abbreviateDepartments(['Civil Engineering', 'Information Technology'])
 * // Returns "CE, IT"
 * 
 * abbreviateDepartments('Electrical Engineering')
 * // Returns "EE"
 * ```
 */
export function abbreviateDepartments(departments: string[] | string | undefined, separator: string = ', '): string {
  if (!departments) return '';
  
  const deptArray = Array.isArray(departments) ? departments : [departments];
  
  return deptArray
    .map(dept => {
      // Split by spaces and take first letter of each word
      return dept
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('');
    })
    .join(separator);
}