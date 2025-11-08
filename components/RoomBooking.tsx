import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge'; 
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar as CalendarIcon, Clock, MapPin, Users, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { getIconForEquipment } from '../lib/equipmentIcons';
import { toast } from 'sonner';
import { useAnnouncer } from './Announcer';
import Calendar from './ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { generateTimeSlots, convertTo24Hour, convertTo12Hour, getValidEndTimes, isPastBookingTime, isValidSchoolTime, isReasonableBookingDuration } from '../utils/timeUtils';
import { executeWithNetworkHandling } from '../lib/networkErrorHandler';
import type { User, Classroom, BookingRequest, Schedule } from '../App';

interface RoomBookingProps {
  user: User;
  classrooms?: Classroom[];
  schedules?: Schedule[];
  bookingRequests?: BookingRequest[];
  onBookingRequest: (request: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>, suppressToast?: boolean) => void;
  // Optional initial data to pre-fill the booking form (used by "Book Similar")
  initialData?: {
    classroomId?: string;
    date?: string; // ISO YYYY-MM-DD
    startTime?: string; // 12-hour format (e.g. "7:00 AM") or 24-hour (will be converted)
    endTime?: string; // 12-hour format or 24-hour
    purpose?: string;
  };
  checkConflicts: (classroomId: string, date: string, startTime: string, endTime: string, checkPastTime?: boolean, excludeRequestId?: string) => boolean | Promise<boolean>;
}

const timeSlots = generateTimeSlots();

// Helper function to validate time range
const isValidTimeRange = (startTime: string, endTime: string): boolean => {
  if (!startTime || !endTime) return false;
  
  const start24 = convertTo24Hour(startTime);
  const end24 = convertTo24Hour(endTime);
  
  const [startHour, startMinute] = start24.split(':').map(Number);
  const [endHour, endMinute] = end24.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  return endMinutes > startMinutes;
};

export default function RoomBooking({ user, classrooms = [], schedules = [], bookingRequests = [], onBookingRequest, initialData, checkConflicts }: RoomBookingProps) {
  const { announce } = useAnnouncer();
  const [formData, setFormData] = useState({
    classroomId: '',
    date: '',
    startTime: '',
    endTime: '',
    purpose: ''
  });
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [errors, setErrors] = useState({
    classroomId: '',
    date: '',
    startTime: '',
    endTime: '',
    purpose: '',
  });
  const [pendingConflicts, setPendingConflicts] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const availableClassrooms = classrooms.filter(c => c.isAvailable);

  // Get minimum date (today) in local timezone to avoid offset issues
  const today = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  // Get maximum date (2 months from today)
  const maxDate = (() => {
    const now = new Date();
    const future = new Date(now);
    future.setMonth(future.getMonth() + 2);
    const year = future.getFullYear();
    const month = String(future.getMonth() + 1).padStart(2, '0');
    const day = String(future.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();

  // Helper to format internal ISO (YYYY-MM-DD) to MM/DD/YYYY for display
  const formatISOToMDY = (iso?: string) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts;
    return `${m}/${d}/${y}`;
  };

  // Validate ISO date (YYYY-MM-DD) exists (e.g., no Feb 30, Apr 31)
  const isValidISODate = (iso?: string) => {
    if (!iso) return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const [yStr, mStr, dStr] = iso.split('-');
    const y = Number(yStr); const m = Number(mStr); const d = Number(dStr);
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d;
  };

  // Detect small phones (between 320px and 425px) and fall back to native date input
  const [isSmallPhone, setIsSmallPhone] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 320px) and (max-width: 425px)');
    const update = () => setIsSmallPhone(mq.matches);
    update();
    if (mq.addEventListener) mq.addEventListener('change', update);
    else mq.addListener(update);
    return () => {
      if (mq.removeEventListener) mq.removeEventListener('change', update);
      else mq.removeListener(update);
    };
  }, []);

  // If a parent provides initialData (Book Similar), populate the form.
  // We accept startTime/endTime either as 12-hour strings (e.g. "7:00 AM") or 24-hour HH:mm and convert
  useEffect(() => {
    if (!initialData) return;

    const normalizeTime = (t?: string) => {
      if (!t) return '';
      // if string already contains AM/PM, assume 12-hour
      if (/(AM|PM)$/i.test(t.trim())) return t;
      // otherwise assume 24-hour HH:mm
      try {
        return convertTo12Hour(t);
      } catch (e) {
        return t;
      }
    };

    setFormData({
      classroomId: initialData.classroomId ?? '',
      date: initialData.date ?? '',
      startTime: normalizeTime(initialData.startTime),
      endTime: normalizeTime(initialData.endTime),
      purpose: initialData.purpose ?? ''
    });
  }, [initialData]);


  // Clear end time when start time changes to ensure valid selection
  React.useEffect(() => {
    if (formData.startTime && formData.endTime) {
      // Check if current end time is still valid for the new start time
      const validEndTimes = getValidEndTimes(formData.startTime, timeSlots);
      if (!validEndTimes.includes(formData.endTime)) {
        setFormData(prev => ({ ...prev, endTime: '' }));
      }
    }
  }, [formData.startTime]);

  // Check for conflicts when form data changes
  React.useEffect(() => {
    if (formData.classroomId && formData.date && formData.startTime && formData.endTime) {
      const startTime24 = convertTo24Hour(formData.startTime);
      const endTime24 = convertTo24Hour(formData.endTime);
      
      // Check confirmed conflicts
      const confirmedConflicts = schedules.filter(schedule => 
        schedule.classroomId === formData.classroomId &&
        schedule.date === formData.date &&
        schedule.status === 'confirmed' &&
        (
          (startTime24 >= schedule.startTime && startTime24 < schedule.endTime) ||
          (endTime24 > schedule.startTime && endTime24 <= schedule.endTime) ||
          (startTime24 <= schedule.startTime && endTime24 >= schedule.endTime)
        )
      );

      // Check pending conflicts
      const pendingConflictReqs = bookingRequests.filter(request => 
        request.classroomId === formData.classroomId &&
        request.date === formData.date &&
        request.status === 'pending' &&
        (
          (startTime24 >= request.startTime && startTime24 < request.endTime) ||
          (endTime24 > request.startTime && endTime24 <= request.endTime) ||
          (startTime24 <= request.startTime && endTime24 >= request.endTime)
        )
      );

      // Set conflicts
      setConflicts(confirmedConflicts.map(schedule => 
        `${schedule.facultyName} has reserved this room from ${convertTo12Hour(schedule.startTime)} to ${convertTo12Hour(schedule.endTime)}`
      ));

      setPendingConflicts(pendingConflictReqs.map(request => 
        `${request.facultyName} has a pending reservation request for this room from ${convertTo12Hour(request.startTime)} to ${convertTo12Hour(request.endTime)}`
      ));
    } else {
      setConflicts([]);
      setPendingConflicts([]);
    }
  }, [formData, schedules, bookingRequests]);

  const validate = () => {
    const newErrors = { classroomId: '', date: '', startTime: '', endTime: '', purpose: '' };
    let isValid = true;

    if (!formData.classroomId) {
      newErrors.classroomId = 'Please select a classroom.';
      isValid = false;
    }
    if (!formData.date) {
      newErrors.date = 'Please select a date.';
      isValid = false;
    } else if (formData.date < today) {
      newErrors.date = 'Date cannot be in the past.';
      isValid = false;
    } else if (formData.date > maxDate) {
      newErrors.date = 'Bookings can only be made up to 2 months in advance.';
      isValid = false;
    }
    if (!formData.startTime) {
      newErrors.startTime = 'Please select a start time.';
      isValid = false;
    }
    if (!formData.endTime) {
      newErrors.endTime = 'Please select an end time.';
      isValid = false;
    }
    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Purpose is required.';
      isValid = false;
    }

    if (formData.startTime && formData.endTime && !isValidTimeRange(formData.startTime, formData.endTime)) {
      newErrors.endTime = 'End time must be after start time.';
      isValid = false;
    }

    if (formData.startTime && !isValidSchoolTime(formData.startTime)) {
      newErrors.startTime = 'Time must be within school hours (7am-8pm).';
      isValid = false;
    }
    if (formData.endTime && !isValidSchoolTime(formData.endTime)) {
      newErrors.endTime = 'Time must be within school hours (7am-8pm).';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent multiple submissions

    if (!validate()) {
      toast.error('Please fill in all required fields correctly.');
      try { announce('Please fill in all required fields correctly.', 'assertive'); } catch (e) {}
      return;
    }

    // Show confirmation dialog before submitting
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);
    try {
      if (!isReasonableBookingDuration(formData.startTime, formData.endTime)) {
        toast.error('Reservation duration must be between 30 minutes and 8 hours');
        try { announce('Reservation duration must be between 30 minutes and eight hours.', 'assertive'); } catch (e) {}
        return;
      }

      if (isPastBookingTime(formData.date, formData.startTime)) {
        toast.error('Cannot reserve time slots that have already passed');
        try { announce('Cannot reserve time slots that have already passed.', 'assertive'); } catch (e) {}
        return;
      }

      // Re-check for conflicts right before submission
      const hasConflict = await checkConflicts(
        formData.classroomId,
        formData.date,
        convertTo24Hour(formData.startTime),
        convertTo24Hour(formData.endTime),
        true // Also check against past times as a final safeguard
      );

      if (hasConflict) {
        toast.error('A conflict was detected. The requested time slot is no longer available.');
        try { announce('A conflict was detected. The requested time slot is no longer available.', 'assertive'); } catch (e) {}
        // Optionally, you might want to refresh schedules/bookings here
        return;
      }

      const selectedClassroom = classrooms.find(c => c.id === formData.classroomId);
      if (!selectedClassroom) {
        toast.error('Selected classroom not found');
        return;
      }

      const request: Omit<BookingRequest, 'id' | 'requestDate' | 'status'> = {
        facultyId: user.id,
        facultyName: user.name,
        classroomId: formData.classroomId,
        classroomName: selectedClassroom.name,
        date: formData.date,
        startTime: convertTo24Hour(formData.startTime),
        endTime: convertTo24Hour(formData.endTime),
        purpose: formData.purpose
      };

      // Execute with network error handling
      const result = await executeWithNetworkHandling(
        async () => {
          await onBookingRequest(request); // Let App.tsx show the success toast with undo action
          return request;
        },
        {
          operationName: 'submit booking request',
          successMessage: undefined, // App.tsx handles the success message with undo action
          maxAttempts: 3,
        }
      );

      if (!result.success) {
        // Error already shown by network handler
        return;
      }

      // Reset form only on success
      setFormData({
        classroomId: '',
        date: '',
        startTime: '',
        endTime: '',
        purpose: ''
      });
  setErrors({ classroomId: '', date: '', startTime: '', endTime: '', purpose: '' });
  try { announce('Reservation request submitted. You will be notified when it is approved.', 'polite'); } catch (e) {}

    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedClassroom = classrooms.find(c => c.id === formData.classroomId);

  // Use shared equipment icon helpers

  // Use shared getIconForEquipment helper
  // (imported as getIconForEquipment from ../lib/equipmentIcons)

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24
      }
    }
  };

  return (
    <div className="max-w-full sm:max-w-2xl md:max-w-3xl lg:max-w-4xl mx-auto px-2 sm:px-0">
      <Card className="transition-shadow duration-200 hover:shadow-lg animate-in">
        <CardHeader className="!px-4 !pt-4 !pb-2 sm:!px-5 sm:!pt-5 sm:!pb-3 md:!px-6 md:!pt-6 md:!pb-4">
          <CardTitle className="text-lg sm:text-xl md:text-2xl">Request a Classroom</CardTitle>
          <CardDescription className="text-sm sm:text-base">Submit a new classroom reservation request</CardDescription>
        </CardHeader>
        <CardContent className="relative overflow-visible !px-4 !pt-0 !pb-4 sm:!px-5 sm:!pt-1 sm:!pb-5 md:!px-6 md:!pt-2 md:!pb-6">
          <form 
            onSubmit={handleSubmit} 
            className="space-y-2 sm:space-y-2.5 md:space-y-3"
            style={{ isolation: 'auto', transform: 'none' }}
          >
              {/* Classroom Selection */}
              <div className="space-y-1">
                <Label htmlFor="classroom" className="text-sm sm:text-base">Classroom *</Label>
                <Select value={formData.classroomId} onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, classroomId: value }));
                  if (errors.classroomId) setErrors(prev => ({ ...prev, classroomId: '' }));
                }}>
                  <SelectTrigger id="classroom" className={`transition-all duration-200 focus:scale-105 h-10 sm:h-11 md:h-12 text-sm sm:text-base ${errors.classroomId ? 'border-red-500' : ''}`}>
                    <SelectValue placeholder="Select a classroom" />
                  </SelectTrigger>
                <SelectContent>
                  {availableClassrooms.length === 0 ? (
                    <div className="p-2 text-xs sm:text-sm text-gray-500">No available classrooms</div>
                  ) : (
                    availableClassrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm sm:text-base">{classroom.name}</span>
                          <div className="flex items-center space-x-1 sm:space-x-2 text-xs text-gray-500 ml-2">
                            <Users className="h-3 w-3" />
                            <span>{classroom.capacity}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                  </SelectContent>
                </Select>
                {errors.classroomId && (
                  <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.classroomId}
                  </p>
                )}
              </div>

              {/* Classroom Details */}
              <AnimatePresence>
                {selectedClassroom && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.9 }}
                    animate={{ opacity: 1, height: "auto", scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.9 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <Card className="bg-blue-50 border-blue-200 transition-shadow duration-200 hover:shadow-md">
                      <CardContent className="p-3 sm:p-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-sm sm:text-base">{selectedClassroom.name}</h4>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                            >
                              <Badge variant="outline" className="text-xs sm:text-sm">{selectedClassroom.capacity} seats</Badge>
                            </motion.div>
                          </div>
                          <div className="flex items-center space-x-1 text-xs sm:text-sm text-gray-600">
                            <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                            <span>{selectedClassroom.building}, Floor {selectedClassroom.floor}</span>
                          </div>
                          {selectedClassroom.equipment.length > 0 && (
                            <motion.div 
                              className="flex flex-wrap gap-1"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.3, staggerChildren: 0.1 }}
                            >
                              {selectedClassroom.equipment.map((eq, index) => (
                                <motion.div
                                  key={index}
                                  initial={{ scale: 0, rotate: -180 }}
                                  animate={{ scale: 1, rotate: 0 }}
                                  transition={{ 
                                    delay: index * 0.1, 
                                    type: "spring", 
                                    stiffness: 300 
                                  }}
                                >
                                  <Badge variant="secondary" className="text-[10px] sm:text-xs inline-flex items-center">
                                    {getIconForEquipment(eq)}
                                    <span className="align-middle">{eq}</span>
                                  </Badge>
                                </motion.div>
                              ))}
                            </motion.div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Date Selection */}
              <div className="space-y-1">
                <Label htmlFor="date" className="text-sm sm:text-base">Date *</Label>
                {isSmallPhone ? (
                  <div>
                    <input
                      id="date"
                      type="date"
                      min={today}
                      max={maxDate}
                      value={formData.date}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) {
                          setFormData(prev => ({ ...prev, date: '' }));                          
                          setErrors(prev => ({ ...prev, date: 'Please select a date.' }));
                          return;
                        }
                        if (!isValidISODate(v)) {
                          setErrors(prev => ({ ...prev, date: 'Invalid date.' }));
                        } else if (v < today) {
                          setErrors(prev => ({ ...prev, date: 'Date must be today or later.' }));
                        } else if (v > maxDate) {
                          setErrors(prev => ({ ...prev, date: 'Bookings can only be made up to 2 months in advance.' }));
                        } else {
                          setErrors(prev => ({ ...prev, date: '' }));
                          setFormData(prev => ({ ...prev, date: v }));
                        }
                      }} 
                      className="w-full px-3 py-2 h-10 sm:h-11 md:h-12 text-sm sm:text-base bg-surface border rounded-md"
                    />
                    {errors.date && (
                      <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        {errors.date}
                      </p>
                    )}
                  </div>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 h-10 sm:h-11 md:h-12 text-sm sm:text-base bg-surface hover:bg-muted/50 border rounded-md flex items-center justify-between"
                      > 
                        <span className={`text-sm sm:text-base ${formData.date ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {formData.date ? formatISOToMDY(formData.date) : 'Select a date'}
                        </span>
                        <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 9l4 4 4-4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent>
                      <div className="-mt-2">
                        <Calendar
                          value={formData.date || undefined}
                          onSelect={(iso) => {
                            // calendar provides valid ISO or undefined
                            if (!iso) {
                              setFormData(prev => ({ ...prev, date: '' }));                              
                              setErrors(prev => ({ ...prev, date: 'Please select a date.' }));
                              return;
                            }
                            if (!isValidISODate(iso)) {
                              setErrors(prev => ({ ...prev, date: 'Invalid date.' }));
                            } else if (iso < today) {
                              setErrors(prev => ({ ...prev, date: 'Invalid or past date.' }));
                            } else if (iso > maxDate) {
                              setErrors(prev => ({ ...prev, date: 'Bookings can only be made up to 2 months in advance.' }));
                            } else {
                              setErrors(prev => ({ ...prev, date: '' }));
                              setFormData(prev => ({ ...prev, date: iso }));
                            }
                          }}
                          min={today}
                          max={maxDate}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              {errors.date && !isSmallPhone && (
                <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1 -mt-1">
                  <AlertTriangle className="h-3 w-3" />
                  {errors.date}
                </p>
              )}

              {/* Time Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="startTime" className="text-sm sm:text-base">Start Time *</Label>
                  <Select value={formData.startTime} onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, startTime: value }));
                    if (errors.startTime) setErrors(prev => ({ ...prev, startTime: '' }));
                  }}>
                    <SelectTrigger id="startTime" className={`transition-all duration-200 focus:scale-105 h-10 sm:h-11 md:h-12 text-sm sm:text-base ${errors.startTime ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => {
                      // Check if this start time falls within any existing booking or pending request
                      const getStartTimeConflictType = () => {
                        if (!formData.classroomId || !formData.date) return 'none';
                        
                        // Check if time is in the past
                        if (isPastBookingTime(formData.date, time)) {
                          return 'past';
                        }
                        
                        const hasConfirmedConflict = schedules.some(schedule => 
                          schedule.classroomId === formData.classroomId &&
                          schedule.date === formData.date &&
                          schedule.status === 'confirmed' &&
                          convertTo24Hour(time) >= schedule.startTime && 
                          convertTo24Hour(time) < schedule.endTime
                        );
                        
                        const hasPendingConflict = bookingRequests.some(request => 
                          request.classroomId === formData.classroomId &&
                          request.date === formData.date &&
                          request.status === 'pending' &&
                          convertTo24Hour(time) >= request.startTime && 
                          convertTo24Hour(time) < request.endTime
                        );
                        
                        if (hasConfirmedConflict && hasPendingConflict) return 'both';
                        if (hasConfirmedConflict) return 'confirmed';
                        if (hasPendingConflict) return 'pending';
                        return 'none';
                      };
                      
                      const startConflictType = getStartTimeConflictType();
                      const wouldConflictAsStart = startConflictType !== 'none';

                      return (
                        <SelectItem 
                          key={time} 
                          value={time}
                          disabled={wouldConflictAsStart}
                          className={wouldConflictAsStart ? "text-gray-400 opacity-50" : ""}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span>{time}</span>
                            {wouldConflictAsStart && (
                              <Badge 
                                variant={startConflictType === 'confirmed' ? 'destructive' : 'secondary'} 
                                className={`ml-2 text-xs ${
                                  startConflictType === 'pending' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                                  startConflictType === 'both' ? 'border-orange-300 text-orange-600 bg-orange-50' :
                                  startConflictType === 'past' ? 'border-gray-300 text-gray-600 bg-gray-50' : ''
                                }`}
                              >
                                {startConflictType === 'pending' ? 'Pending' : 
                                 startConflictType === 'both' ? 'Conflict' : 
                                 startConflictType === 'past' ? 'Past' : 'Reserved'}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {errors.startTime && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.startTime}
                  </p>
                )}
              </div>

                <div className="space-y-1">
                  <Label htmlFor="endTime" className="text-sm sm:text-base">End Time *</Label>
                  <Select 
                    value={formData.endTime} 
                    onValueChange={(value) => {
                      setFormData(prev => ({ ...prev, endTime: value }));
                      if (errors.endTime) setErrors(prev => ({ ...prev, endTime: '' }));
                    }}
                    disabled={!formData.startTime}
                  >
                    <SelectTrigger id="endTime" className={`transition-all duration-200 focus:scale-105 h-10 sm:h-11 md:h-12 text-sm sm:text-base disabled:opacity-50 ${errors.endTime ? 'border-red-500' : ''}`}>
                      <SelectValue placeholder={formData.startTime ? "Select end time" : "Select start time first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {getValidEndTimes(formData.startTime, timeSlots).map((time) => {
                        // Check if this end time would cause a conflict
                        const getEndTimeConflictType = () => {
                          if (!formData.classroomId || !formData.date || !formData.startTime) return 'none';
                          
                          // Check if start time is in the past (end time would also be invalid)
                          if (isPastBookingTime(formData.date, formData.startTime)) {
                            return 'past';
                          }
                          
                          const startTime24 = convertTo24Hour(formData.startTime);
                          const endTime24 = convertTo24Hour(time);
                          
                          const hasConfirmedConflict = schedules.some(schedule => 
                            schedule.classroomId === formData.classroomId &&
                            schedule.date === formData.date &&
                            schedule.status === 'confirmed' &&
                            (
                              (startTime24 >= schedule.startTime && startTime24 < schedule.endTime) ||
                              (endTime24 > schedule.startTime && endTime24 <= schedule.endTime) ||
                              (startTime24 <= schedule.startTime && endTime24 >= schedule.endTime)
                            )
                          );
                          
                          const hasPendingConflict = bookingRequests.some(request => 
                            request.classroomId === formData.classroomId &&
                            request.date === formData.date &&
                            request.status === 'pending' &&
                            (
                              (startTime24 >= request.startTime && startTime24 < request.endTime) ||
                              (endTime24 > request.startTime && endTime24 <= request.endTime) ||
                              (startTime24 <= request.startTime && endTime24 >= request.endTime)
                            )
                          );
                          
                          if (hasConfirmedConflict && hasPendingConflict) return 'both';
                          if (hasConfirmedConflict) return 'confirmed';
                          if (hasPendingConflict) return 'pending';
                          return 'none';
                        };
                        
                        const endConflictType = getEndTimeConflictType();
                        const wouldConflictAsEnd = endConflictType !== 'none';

                        return (
                          <SelectItem 
                            key={time} 
                            value={time}
                            disabled={wouldConflictAsEnd}
                            className={wouldConflictAsEnd ? "text-gray-400 opacity-50" : ""}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span>{time}</span>
                              {wouldConflictAsEnd && (
                                <Badge 
                                  variant={endConflictType === 'confirmed' ? 'destructive' : 'secondary'} 
                                  className={`ml-2 text-xs ${
                                    endConflictType === 'pending' ? 'border-yellow-300 text-yellow-700 bg-yellow-50' :
                                    endConflictType === 'both' ? 'border-orange-300 text-orange-600 bg-orange-50' :
                                    endConflictType === 'past' ? 'border-gray-300 text-gray-600 bg-gray-50' : ''
                                  }`}
                                >
                                  {endConflictType === 'pending' ? 'Pending' : 
                                     endConflictType === 'both' ? 'Conflict' : 
                                     endConflictType === 'past' ? 'Past' : 'Reserved'}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {errors.endTime && (
                    <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="h-3 w-3" />
                      {errors.endTime}
                    </p>
                  )}
                </div>
              </div>

              {/* Duration Display */}
              <AnimatePresence>
                {formData.startTime && formData.endTime && isValidTimeRange(formData.startTime, formData.endTime) && (
                  <motion.div 
                    className="flex items-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg"
                    initial={{ opacity: 0, scale: 0.9, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <Clock className="h-5 w-5 text-blue-600" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-medium text-blue-800">
                        Duration: {(() => {
                          const start24 = convertTo24Hour(formData.startTime);
                          const end24 = convertTo24Hour(formData.endTime);
                          const [startHour, startMinute] = start24.split(':').map(Number);
                          const [endHour, endMinute] = end24.split(':').map(Number);
                          const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
                          const hours = Math.floor(durationMinutes / 60);
                          const minutes = durationMinutes % 60;
                          
                          if (hours > 0 && minutes > 0) {
                            return `${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minutes`;
                          } else if (hours > 0) {
                            return `${hours} hour${hours !== 1 ? 's' : ''}`;
                          } else {
                            return `${minutes} minutes`;
                          }
                        })()}
                      </p>
                      <p className="text-sm text-blue-700">{formData.startTime} - {formData.endTime}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Conflict Warning */}
              <AnimatePresence>
                {conflicts.length > 0 && (
                  <motion.div 
                    className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg"
                    initial={{ opacity: 0, scale: 0.9, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
                    >
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-medium text-red-800">Reservation Conflict</p>
                      {conflicts.map((conflict, index) => (
                        <motion.p 
                          key={index} 
                          className="text-sm text-red-700"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          {conflict}
                        </motion.p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Pending Conflicts Warning */}
              <AnimatePresence>
                {pendingConflicts.length > 0 && (
                  <motion.div 
                    className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                    initial={{ opacity: 0, scale: 0.9, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      animate={{ rotate: [0, -5, 5, -5, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
                    >
                      <Clock className="h-5 w-5 text-yellow-600" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Other Pending Requests</p>
                      {pendingConflicts.map((conflict, index) => (
                        <motion.p 
                          key={index} 
                          className="text-sm text-yellow-700"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          {conflict}
                        </motion.p>
                      ))}
                      <p className="text-xs text-yellow-600 mt-1 italic">
                        Other users have pending requests for this time slot. These are awaiting admin approval and may affect availability.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Past Time Warning */}
              <AnimatePresence>
                {formData.date && formData.startTime && isPastBookingTime(formData.date, formData.startTime) && (
                  <motion.div 
                    className="flex items-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-lg"
                    initial={{ opacity: 0, scale: 0.9, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      animate={{ rotate: [0, -10, 10, -10, 0] }}
                      transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
                    >
                      <AlertTriangle className="h-5 w-5 text-gray-600" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">Invalid Time Selection</p>
                      <p className="text-sm text-gray-700">
                        The selected time has already passed. Please choose a future time slot.
                      </p>
                      <p className="text-xs text-gray-600 mt-1 italic">
                        You can only reserve time slots that are at least 5 minutes in the future.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Purpose */}
              <motion.div className="space-y-1" variants={itemVariants}>
                <Label htmlFor="purpose">Purpose *</Label>
                <Textarea
                  id="purpose"
                  placeholder="Describe the purpose of your classroom reservation (e.g., Lecture - Data Structures, Lab Session - Web Development)"
                  value={formData.purpose}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData(prev => ({ ...prev, purpose: v }));
                    if (errors.purpose) setErrors(prev => ({ ...prev, purpose: '' }));
                    // client-side validation length
                    if (v.length > 500) {
                      setErrors(prev => ({ ...prev, purpose: 'Purpose must be 500 characters or less.' }));
                    }
                  }}
                  rows={3}
                  className={`transition-all duration-200 focus:scale-105 ${errors.purpose ? 'border-red-500' : ''}`}
                  maxLength={500}
                />
                <div className="flex items-center justify-end mt-1">
                  <p className="text-xs text-gray-500">{formData.purpose.length}/500</p>
                </div>
                {errors.purpose && (
                  <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3" />
                    {errors.purpose}
                  </p>
                )}
              </motion.div>

              {/* Submission Summary */}
              <AnimatePresence>
                {formData.classroomId && formData.date && formData.startTime && formData.endTime && formData.purpose && conflicts.length === 0 && pendingConflicts.length === 0 && !isPastBookingTime(formData.date, formData.startTime) && (
                  <motion.div 
                    className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    >
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-medium text-green-800">Ready to Submit</p>
                      <p className="text-sm text-green-700">Your request will be sent to the admin for approval.</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <div className="flex justify-end">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || conflicts.length > 0 || !formData.classroomId || !formData.date || !formData.startTime || !formData.endTime || !formData.purpose.trim() || Object.values(errors).some(e => e)}
                    className="w-full sm:w-auto transition-all duration-200 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Clock className="h-4 w-4 mr-2" />
                        </motion.div>
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        Submit Reservation Request
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>
            </form>
          </CardContent>
        </Card>
      
      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
              Confirm Reservation Request
            </DialogTitle>
            <DialogDescription>
              Please review your reservation details before submitting. This will be sent to the admin for approval.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-blue-900">
                  {classrooms.find(c => c.id === formData.classroomId)?.name || 'Classroom'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <CalendarIcon className="h-4 w-4 text-blue-600" />
                <span>
                  {new Date(formData.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-blue-800">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>{formData.startTime} - {formData.endTime}</span>
              </div>
              
              <div className="pt-2 border-t border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-1">Purpose:</p>
                <p className="text-sm text-blue-800">{formData.purpose}</p>
              </div>
            </div>
            
            {pendingConflicts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Pending Requests Detected</p>
                    <p className="text-sm text-amber-800 mt-1">
                      There are {pendingConflicts.length} pending request(s) for this time slot. 
                      Your request will be processed based on submission order.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm & Submit
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}