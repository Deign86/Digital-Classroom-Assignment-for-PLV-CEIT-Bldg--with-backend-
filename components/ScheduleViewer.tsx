import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Calendar, Clock, MapPin, User, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';
import { convertTo12Hour, formatTimeRange, generateTimeSlots } from '../utils/timeUtils';
import type { Schedule, Classroom } from '../App';

interface ScheduleViewerProps {
  schedules: Schedule[];
  classrooms: Classroom[];
  onCancelSchedule?: (scheduleId: string) => void;
}

// Helper to check if a schedule has already passed
const isScheduleLapsed = (schedule: Schedule): boolean => {
  const now = new Date();
  // The schedule end time is parsed as a date object on the given schedule date
  const scheduleEndDateTime = new Date(`${schedule.date}T${schedule.endTime}`);
  
  // The schedule is considered lapsed if the current time is past the schedule's end time
  return now > scheduleEndDateTime;
}

export default function ScheduleViewer({ schedules, classrooms, onCancelSchedule }: ScheduleViewerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // Filter schedules based on selections
  const filteredSchedules = schedules.filter(schedule => {
    if (selectedClassroom && schedule.classroomId !== selectedClassroom) {
      return false;
    }

    if (viewMode === 'day') {
      return schedule.date === selectedDate && schedule.status === 'confirmed';
    } else {
      // Week view - get schedules for the week containing selectedDate
      const selected = new Date(selectedDate);
      const startOfWeek = new Date(selected);
      startOfWeek.setDate(selected.getDate() - selected.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const scheduleDate = new Date(schedule.date);
      return scheduleDate >= startOfWeek && scheduleDate <= endOfWeek && schedule.status === 'confirmed';
    }
  });

  // Generate time slots for the day view in 12-hour format
  const timeSlots = generateTimeSlots();

  // Generate dates for week view
  const getWeekDates = (date: string) => {
    const selected = new Date(date);
    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - selected.getDay());
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDates.push(date.toISOString().split('T')[0]);
    }
    return weekDates;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    if (viewMode === 'day') {
      current.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    } else {
      current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    }
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <CardTitle>Schedule Overview</CardTitle>
              <CardDescription>View classroom schedules and bookings</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <Select value={viewMode} onValueChange={(value: 'day' | 'week') => setViewMode(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                </SelectContent>
              </Select>

              {/* Classroom Filter */}
              <Select value={selectedClassroom || 'all'} onValueChange={(value: string) => setSelectedClassroom(value === 'all' ? '' : value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Rooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Rooms</SelectItem>
                  {classrooms.map((classroom) => (
                    <SelectItem key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Date Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="font-semibold">
                {viewMode === 'day' 
                  ? formatDate(selectedDate)
                  : `Week of ${formatDateShort(getWeekDates(selectedDate)[0])}`
                }
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Schedule Display */}
          {viewMode === 'day' ? (
            <DayView
              schedules={filteredSchedules}
              classrooms={classrooms}
              timeSlots={timeSlots}
              selectedDate={selectedDate}
              onCancelSchedule={onCancelSchedule}
            />
          ) : (
            <WeekView
              schedules={filteredSchedules}
              classrooms={classrooms}
              weekDates={getWeekDates(selectedDate)}
              onCancelSchedule={onCancelSchedule}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Day View Component
function DayView({ 
  schedules, 
  classrooms, 
  timeSlots, 
  selectedDate,
  onCancelSchedule
}: { 
  schedules: Schedule[];
  classrooms: Classroom[];
  timeSlots: string[];
  selectedDate: string;
  onCancelSchedule?: (scheduleId: string) => void;
}) {
  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Scheduled</h3>
        <p className="text-gray-600">There are no confirmed classes for this day.</p>
      </div>
    );
  }

  // Sort schedules by start time
  const sortedSchedules = [...schedules].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-4">
      {sortedSchedules.map((schedule) => {
        const isLapsed = isScheduleLapsed(schedule);
        const classroom = classrooms.find(c => c.id === schedule.classroomId);
        return (
          <Card key={schedule.id} className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{formatTimeRange(convertTo12Hour(schedule.startTime), convertTo12Hour(schedule.endTime))}</span>
                    <Badge variant="default">Confirmed</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span>{schedule.classroomName}</span>
                    {classroom && (
                      <span className="text-sm text-gray-500">
                        ({classroom.building}, Floor {classroom.floor})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{schedule.facultyName}</span>
                  </div>

                  <p className="text-gray-700">{schedule.purpose}</p>
                </div>
                
                {onCancelSchedule && !isLapsed && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline"
                        size="sm" 
                        className="ml-4 text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 min-w-[80px] transition-all duration-200"
                      >
                        <X className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Cancel</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Classroom Booking</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to cancel this booking? This action cannot be undone.
                          The faculty member will need to submit a new request if they need this classroom again.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onCancelSchedule(schedule.id)} className="bg-gray-900 hover:bg-red-600 transition-colors duration-200">
                          Cancel Booking
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Week View Component
function WeekView({ 
  schedules, 
  classrooms, 
  weekDates,
  onCancelSchedule
}: { 
  schedules: Schedule[];
  classrooms: Classroom[];
  weekDates: string[];
  onCancelSchedule?: (scheduleId: string) => void;
}) {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {weekDates.map((date, index) => {
        const daySchedules = schedules.filter(s => s.date === date);

        return (
          <div key={date} className="space-y-2">
            <div className="text-center">
              <h4 className="font-medium">{dayNames[index]}</h4>
              <p className="text-sm text-gray-500">
                {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
            </div>
            
            <div className="space-y-2 min-h-[200px]">
              {daySchedules.length === 0 ? (
                <div className="text-center py-8 h-full flex items-center justify-center">
                  <p className="text-xs text-gray-400">No classes</p>
                </div>
              ) : (
                daySchedules
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((schedule) => {
                    const isLapsed = isScheduleLapsed(schedule);
                    return (
                      <Card key={schedule.id} className="p-2 border-l-2 border-l-blue-500 relative group">
                        <div className="space-y-1">
                          <p className="text-xs font-medium">{formatTimeRange(convertTo12Hour(schedule.startTime), convertTo12Hour(schedule.endTime))}</p>
                          <p className="text-xs text-gray-600">{schedule.classroomName}</p>
                          <p className="text-xs text-gray-600">{schedule.facultyName}</p>
                          <p className="text-xs text-gray-500 truncate">{schedule.purpose}</p>
                          
                          {onCancelSchedule && !isLapsed && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                className="absolute top-1 right-1 h-6 w-6 p-0 text-gray-400 hover:text-red-600 hover:bg-gray-50 opacity-60 hover:opacity-100 transition-all duration-200"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Cancel Classroom Booking</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to cancel this booking? This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Keep Booking</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => onCancelSchedule(schedule.id)} className="bg-gray-900 hover:bg-red-600 transition-colors duration-200">
                                    Cancel Booking
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </Card>
                    );
                  })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}