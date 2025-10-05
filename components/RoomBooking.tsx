import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Calendar as CalendarIcon, Clock, MapPin, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { Input } from './ui/input';
import { toast } from 'sonner';
import Calendar from './ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { generateTimeSlots, convertTo24Hour, convertTo12Hour, getValidEndTimes, isPastBookingTime, isValidSchoolTime, isReasonableBookingDuration } from '../utils/timeUtils';
import type { User, Classroom, BookingRequest, Schedule } from '../App';

interface RoomBookingProps {
  user: User;
  classrooms?: Classroom[];
  schedules?: Schedule[];
  bookingRequests?: BookingRequest[];
  onBookingRequest: (request: Omit<BookingRequest, 'id' | 'requestDate' | 'status'>) => void;
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

export default function RoomBooking({ user, classrooms = [], schedules = [], bookingRequests = [], onBookingRequest, checkConflicts }: RoomBookingProps) {
  const [formData, setFormData] = useState({
    classroomId: '',
    date: '',
    startTime: '',
    endTime: '',
    purpose: ''
  });
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [pendingConflicts, setPendingConflicts] = useState<string[]>([]);

  const availableClassrooms = classrooms.filter(c => c.isAvailable);

  // Get minimum date (today) in local timezone to avoid offset issues
  const today = (() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
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

  const [dateError, setDateError] = React.useState<string | null>(null);

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
        `${schedule.facultyName} has booked this room from ${convertTo12Hour(schedule.startTime)} to ${convertTo12Hour(schedule.endTime)}`
      ));

      setPendingConflicts(pendingConflictReqs.map(request => 
        `${request.facultyName} has a pending request for this room from ${convertTo12Hour(request.startTime)} to ${convertTo12Hour(request.endTime)}`
      ));
    } else {
      setConflicts([]);
      setPendingConflicts([]);
    }
  }, [formData, schedules, bookingRequests]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.classroomId || !formData.date || !formData.startTime || !formData.endTime || !formData.purpose.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!isValidTimeRange(formData.startTime, formData.endTime)) {
      toast.error('End time must be after start time (same day booking only)');
      return;
    }

    if (!isValidSchoolTime(formData.startTime) || !isValidSchoolTime(formData.endTime)) {
      toast.error('Times must be within school hours (7:00 AM - 8:00 PM)');
      return;
    }

    if (!isReasonableBookingDuration(formData.startTime, formData.endTime)) {
      toast.error('Booking duration must be between 30 minutes and 8 hours');
      return;
    }

    // Check if booking time is in the past
    if (isPastBookingTime(formData.date, formData.startTime)) {
      toast.error('Cannot book time slots that have already passed');
      return;
    }

    if (conflicts.length > 0) {
      toast.error('Cannot submit request due to confirmed booking conflicts');
      return;
    }

    if (pendingConflicts.length > 0) {
      toast.error('Cannot submit request due to pending booking conflicts');
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

    onBookingRequest(request);

    // Reset form
    setFormData({
      classroomId: '',
      date: '',
      startTime: '',
      endTime: '',
      purpose: ''
    });
  };

  const selectedClassroom = classrooms.find(c => c.id === formData.classroomId);

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
    <div className="max-w-2xl mx-auto">
      <Card className="transition-shadow duration-200 hover:shadow-lg animate-in">
        <CardHeader>
          <CardTitle>Request a Classroom</CardTitle>
          <CardDescription>Submit a new classroom booking request</CardDescription>
        </CardHeader>
        <CardContent className="relative overflow-visible">
          <form 
            onSubmit={handleSubmit} 
            className="space-y-6"
            style={{ isolation: 'auto', transform: 'none' }}
          >
              {/* Classroom Selection */}
              <div className="space-y-2">
                <Label htmlFor="classroom">Classroom *</Label>
                <Select value={formData.classroomId} onValueChange={(value) => setFormData(prev => ({ ...prev, classroomId: value }))}>
                  <SelectTrigger id="classroom" className="transition-all duration-200 focus:scale-105">
                    <SelectValue placeholder="Select a classroom" />
                  </SelectTrigger>
                <SelectContent>
                  {availableClassrooms.length === 0 ? (
                    <div className="p-2 text-sm text-gray-500">No available classrooms</div>
                  ) : (
                    availableClassrooms.map((classroom) => (
                      <SelectItem key={classroom.id} value={classroom.id}>
                        <div className="flex items-center justify-between w-full">
                          <span>{classroom.name}</span>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 ml-2">
                            <Users className="h-3 w-3" />
                            <span>{classroom.capacity}</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                  </SelectContent>
                </Select>
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
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">{selectedClassroom.name}</h4>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                            >
                              <Badge variant="outline">{selectedClassroom.capacity} seats</Badge>
                            </motion.div>
                          </div>
                          <div className="flex items-center space-x-1 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
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
                                  <Badge variant="secondary" className="text-xs">
                                    {eq}
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
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                {isSmallPhone ? (
                  <div>
                    <input
                      id="date"
                      type="date"
                      min={today}
                      value={formData.date}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) {
                          setFormData(prev => ({ ...prev, date: '' }));
                          setDateError(null);
                          return;
                        }
                        if (!isValidISODate(v)) {
                          setDateError('Invalid date');
                        } else if (v < today) {
                          setDateError('Date must be today or later');
                        } else {
                          setDateError(null);
                          setFormData(prev => ({ ...prev, date: v }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-surface border rounded-md"
                    />
                    {dateError && <p className="text-xs text-red-600 mt-1">{dateError}</p>}
                  </div>
                ) : (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="w-full text-left px-3 py-2 bg-surface hover:bg-muted/50 border rounded-md flex items-center justify-between"
                      >
                        <span className={`text-sm ${formData.date ? 'text-foreground' : 'text-muted-foreground'}`}>
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
                              setDateError(null);
                              return;
                            }
                            if (!isValidISODate(iso) || iso < today) {
                              setDateError('Invalid or past date');
                            } else {
                              setDateError(null);
                              setFormData(prev => ({ ...prev, date: iso }));
                            }
                          }}
                          min={today}
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>

              {/* Time Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Select value={formData.startTime} onValueChange={(value) => setFormData(prev => ({ ...prev, startTime: value }))}>
                    <SelectTrigger id="startTime" className="transition-all duration-200 focus:scale-105">
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
                                 startConflictType === 'past' ? 'Past' : 'Booked'}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Select 
                    value={formData.endTime} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, endTime: value }))}
                    disabled={!formData.startTime}
                  >
                    <SelectTrigger id="endTime" className="transition-all duration-200 focus:scale-105 disabled:opacity-50">
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
                                   endConflictType === 'past' ? 'Past' : 'Booked'}
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
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
                      <p className="text-sm font-medium text-red-800">Booking Conflict</p>
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
                      <p className="text-sm font-medium text-yellow-800">Pending Request Conflicts</p>
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
                        These requests are awaiting admin approval and may affect availability.
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
                        You can only book time slots that are at least 5 minutes in the future.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Purpose */}
              <motion.div className="space-y-2" variants={itemVariants}>
                <Label htmlFor="purpose">Purpose *</Label>
                <Textarea
                  id="purpose"
                  placeholder="Describe the purpose of your classroom booking (e.g., Lecture - Data Structures, Lab Session - Web Development)"
                  value={formData.purpose}
                  onChange={(e) => setFormData(prev => ({ ...prev, purpose: e.target.value }))}
                  rows={3}
                  className="transition-all duration-200 focus:scale-105"
                  required
                />
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
                    disabled={conflicts.length > 0 || !formData.classroomId || !formData.date || !formData.startTime || !formData.endTime || !formData.purpose.trim()}
                    className="w-full sm:w-auto transition-all duration-200 disabled:opacity-50"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    Submit Booking Request
                  </Button>
                </motion.div>
              </div>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}