import React, { useState } from 'react';
import { useAnnouncer } from './Announcer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from './ui/alert-dialog';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { Label } from './ui/label';
import { Calendar, Clock, MapPin, User, ChevronLeft, ChevronRight, X, Loader2 } from 'lucide-react';
import { convertTo12Hour, formatTimeRange, generateTimeSlots } from '../utils/timeUtils';
import type { Schedule, Classroom } from '../App';

interface ScheduleViewerProps {
  schedules: Schedule[];
  classrooms: Classroom[];
  onCancelSchedule?: (scheduleId: string, reason: string) => void;
}

const isScheduleLapsed = (schedule: Schedule): boolean => {
  const now = new Date();
  const scheduleEndDateTime = new Date(`${schedule.date}T${schedule.endTime}`);
  return now > scheduleEndDateTime;
}

export default function ScheduleViewer({ schedules, classrooms, onCancelSchedule }: ScheduleViewerProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('');
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const { announce } = useAnnouncer();
  const [cancelReasons, setCancelReasons] = useState<Record<string, string>>({});
  const [cancelErrors, setCancelErrors] = useState<Record<string, string | null>>({});

  const filteredSchedules = schedules.filter(schedule => {
    if (selectedClassroom && schedule.classroomId !== selectedClassroom) return false;
    if (viewMode === 'day') return schedule.date === selectedDate && schedule.status === 'confirmed';
    const selected = new Date(selectedDate);
    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - selected.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    const scheduleDate = new Date(schedule.date);
    return scheduleDate >= startOfWeek && scheduleDate <= endOfWeek && schedule.status === 'confirmed';
  });

  const timeSlots = generateTimeSlots();

  const getWeekDates = (date: string) => {
    const selected = new Date(date);
    const startOfWeek = new Date(selected);
    startOfWeek.setDate(selected.getDate() - selected.getDay());
    const weekDates: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDates.push(d.toISOString().split('T')[0]);
    }
    return weekDates;
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    if (viewMode === 'day') current.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    else current.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    const next = current.toISOString().split('T')[0];
    setSelectedDate(next);
    try { announce?.(`View changed to ${viewMode === 'day' ? 'date' : 'week'} ${next}`, 'polite'); } catch (e) {}
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
            <div>
              <CardTitle>Schedule Overview</CardTitle>
              <CardDescription>View classroom schedules and reservations</CardDescription>
            </div>
            <div className="flex items-center space-x-4">
              <Select value={viewMode} onValueChange={(value: 'day' | 'week') => setViewMode(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                </SelectContent>
              </Select>

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
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
                // ARIA: explicit accessible name for icon-only controls on small viewports
                aria-label={`Previous ${viewMode === 'day' ? 'day' : 'week'}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center">
              <h3 className="font-semibold">
                {viewMode === 'day' ? formatDate(selectedDate) : `Week of ${formatDateShort(getWeekDates(selectedDate)[0])}`}
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
              // ARIA: explicit accessible name for icon-only controls on small viewports
              aria-label={`Next ${viewMode === 'day' ? 'day' : 'week'}`}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {viewMode === 'day' ? (
            <DayView
              schedules={filteredSchedules}
              classrooms={classrooms}
              timeSlots={timeSlots}
              selectedDate={selectedDate}
              onCancelSchedule={onCancelSchedule}
              announce={announce}
              cancelReasons={cancelReasons}
              setCancelReasons={setCancelReasons}
              cancelErrors={cancelErrors}
              setCancelErrors={setCancelErrors}
            />
          ) : (
            <WeekView
              schedules={filteredSchedules}
              classrooms={classrooms}
              weekDates={getWeekDates(selectedDate)}
              onCancelSchedule={onCancelSchedule}
              announce={announce}
              cancelReasons={cancelReasons}
              setCancelReasons={setCancelReasons}
              cancelErrors={cancelErrors}
              setCancelErrors={setCancelErrors}
              
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function DayView({ schedules, classrooms, timeSlots, selectedDate, onCancelSchedule, announce, cancelReasons, setCancelReasons, cancelErrors, setCancelErrors }: { schedules: Schedule[]; classrooms: Classroom[]; timeSlots: string[]; selectedDate: string; onCancelSchedule?: (scheduleId: string, reason: string) => void; announce?: (message: string, mode?: 'polite' | 'assertive') => void; cancelReasons: Record<string, string>; setCancelReasons: React.Dispatch<React.SetStateAction<Record<string, string>>>; cancelErrors: Record<string, string | null>; setCancelErrors: React.Dispatch<React.SetStateAction<Record<string, string | null>>>; }) {
  const [isCanceling, setIsCanceling] = useState<Record<string, boolean>>({});
  const [openDialogMap, setOpenDialogMap] = useState<Record<string, boolean>>({});
  if (schedules.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Scheduled</h3>
        <p className="text-gray-600">There are no confirmed classes for this day.</p>
      </div>
    );
  }

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
                    {classroom && <span className="text-sm text-gray-500">({classroom.building}, Floor {classroom.floor})</span>}
                  </div>

                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{schedule.facultyName}</span>
                  </div>

                  <p className="text-gray-700">{schedule.purpose}</p>
                </div>

                {onCancelSchedule && !isLapsed && (
                    <AlertDialog open={!!openDialogMap[schedule.id]} onOpenChange={(v) => { if (isCanceling[schedule.id]) return; setOpenDialogMap((prev: Record<string, boolean>) => ({ ...prev, [schedule.id]: v })); }}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-4 min-w-[80px] transition-all duration-200"
                        onClick={() => setOpenDialogMap((prev: Record<string, boolean>) => ({ ...prev, [schedule.id]: true }))}
                        aria-label={`Cancel reservation for ${schedule.facultyName} at ${formatTimeRange(convertTo12Hour(schedule.startTime), convertTo12Hour(schedule.endTime))}`}>
                        <X className="h-4 w-4 mr-1" />
                        <span className="hidden sm:inline">Cancel</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Classroom Reservation</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to cancel this reservation? This action cannot be undone. The faculty member will need to submit a new request if they need this classroom again.</AlertDialogDescription>
                      </AlertDialogHeader>

                      <div className="space-y-4 mt-6">
                        <Label className="mb-2 block">Reason (required)</Label>
                        <Textarea
                          id={`schedule-cancel-reason-${schedule.id}`}
                          aria-label="Cancellation reason"
                          placeholder="Explain why this reservation is being cancelled (this will be sent to the faculty member)"
                          value={cancelReasons[schedule.id] || ''}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCancelReasons(prev => ({ ...prev, [schedule.id]: v }));
                            setCancelErrors(prev => ({ ...prev, [schedule.id]: v.length > 500 ? 'Reason must be 500 characters or less.' : null }));
                          }}
                          maxLength={500}
                          rows={4}
                          className="w-full"
                        />
                        <div className="flex items-center justify-end mt-2">
                          <p className="text-xs text-gray-500">{(cancelReasons[schedule.id] || '').length}/500</p>
                        </div>
                        {cancelErrors[schedule.id] && <p role="alert" className="text-sm text-destructive mt-1">{cancelErrors[schedule.id]}</p>}
                      </div>

                      <AlertDialogFooter className="mt-6">
                        <AlertDialogCancel>Keep Reservation</AlertDialogCancel>
                        {((cancelReasons[schedule.id] || '').trim().length === 0) ? (
                          <Button disabled>Cancel Reservation</Button>
                        ) : (
                          <AlertDialogAction
                            variant="destructive"
                            onClick={async () => {
                              const reason = (cancelReasons[schedule.id] || '').trim();
                              if (!reason) { try { announce?.('Please provide a reason for the cancellation.', 'assertive'); } catch(e){}; const el = document.getElementById(`schedule-cancel-reason-${schedule.id}`) as HTMLTextAreaElement | null; (el as HTMLTextAreaElement | null)?.focus(); setCancelErrors(prev => ({ ...prev, [schedule.id]: 'Reason is required.' })); return; }
                              if (cancelErrors[schedule.id]) { const el = document.getElementById(`schedule-cancel-reason-${schedule.id}`) as HTMLTextAreaElement | null; (el as HTMLTextAreaElement | null)?.focus(); return; }
                              try { announce?.('Cancelling reservation', 'polite'); } catch(e){}
                              setIsCanceling(prev => ({ ...prev, [schedule.id]: true }));
                              try {
                                let res: any = undefined;
                                if (onCancelSchedule) res = await onCancelSchedule(schedule.id, reason as string);
                                // If caller returned a server message, surface it here. Otherwise, parent likely already showed a toast.
                                if (res && res.message) {
                                  toast.success(res.message);
                                }
                              } finally {
                                setIsCanceling(prev => ({ ...prev, [schedule.id]: false }));
                                // close the dialog after processing completes
                                setOpenDialogMap((prev: Record<string, boolean>) => ({ ...prev, [schedule.id]: false }));
                              }
                            }}
                            className="transition-colors duration-200"
                            disabled={!!isCanceling[schedule.id]}
                          >
                              {isCanceling[schedule.id] ? (
                                <span className="inline-flex items-center">
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Cancelling…
                                </span>
                              ) : 'Cancel Reservation'}
                          </AlertDialogAction>
                        )}
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

function WeekView({ schedules, classrooms, weekDates, onCancelSchedule, announce, cancelReasons, setCancelReasons, cancelErrors, setCancelErrors }: { schedules: Schedule[]; classrooms: Classroom[]; weekDates: string[]; onCancelSchedule?: (scheduleId: string, reason: string) => void; announce?: (message: string, mode?: 'polite' | 'assertive') => void; cancelReasons: Record<string, string>; setCancelReasons: React.Dispatch<React.SetStateAction<Record<string, string>>>; cancelErrors: Record<string, string | null>; setCancelErrors: React.Dispatch<React.SetStateAction<Record<string, string | null>>>; }) {
  const [isCanceling, setIsCanceling] = useState<Record<string, boolean>>({});
  const [openDialogMap, setOpenDialogMap] = useState<Record<string, boolean>>({});
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
      {weekDates.map((date, index) => {
        const daySchedules = schedules.filter(s => s.date === date);

        return (
          <div key={date} className="space-y-2">
            <div className="text-center">
              <h4 className="font-medium">{dayNames[index]}</h4>
              <p className="text-sm text-gray-500">{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
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
                            <AlertDialog open={!!openDialogMap[schedule.id]} onOpenChange={(v) => { if (isCanceling[schedule.id]) return; setOpenDialogMap((prev: Record<string, boolean>) => ({ ...prev, [schedule.id]: v })); }}>
                                <AlertDialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1 h-6 w-6 p-0 text-gray-600 transition-all duration-200"
                                  onClick={() => setOpenDialogMap((prev: Record<string, boolean>) => ({ ...prev, [schedule.id]: true }))}
                                  aria-label={`Cancel reservation for ${schedule.facultyName} at ${formatTimeRange(convertTo12Hour(schedule.startTime), convertTo12Hour(schedule.endTime))}`}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancel Classroom Reservation</AlertDialogTitle>
                                    <AlertDialogDescription>Are you sure you want to cancel this reservation? This action cannot be undone.</AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="space-y-4 px-6 mt-6">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Reason (required)</label>
                                    <textarea
                                      id={`schedule-week-cancel-reason-${schedule.id}`}
                                      aria-label="Cancellation reason"
                                      className="w-full border rounded-md p-2 text-sm h-20"
                                      placeholder="Explain why this reservation is being cancelled (this will be sent to the faculty member)"
                                      value={cancelReasons[schedule.id] || ''}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setCancelReasons(prev => ({ ...prev, [schedule.id]: v }));
                                        setCancelErrors(prev => ({ ...prev, [schedule.id]: v.length > 500 ? 'Reason must be 500 characters or less.' : null }));
                                      }}
                                      maxLength={500}
                                    />
                                    <div className="flex items-center justify-end mt-2">
                                      <p className="text-xs text-gray-500">{(cancelReasons[schedule.id] || '').length}/500</p>
                                    </div>
                                    {cancelErrors[schedule.id] && <p className="text-sm text-destructive mt-1">{cancelErrors[schedule.id]}</p>}
                                  </div>
                                  <AlertDialogFooter className="mt-6">
                                    <AlertDialogCancel disabled={!!isCanceling[schedule.id]}>Keep Reservation</AlertDialogCancel>
                                    <AlertDialogAction
                                      variant="destructive"
                                      onClick={async () => {
                                        const reason = (cancelReasons[schedule.id] || '').trim();
                                        if (!reason) { try { announce?.('Please provide a reason for the cancellation.', 'assertive'); } catch(e){}; const el = document.getElementById(`schedule-week-cancel-reason-${schedule.id}`) as HTMLTextAreaElement | null; (el as HTMLTextAreaElement | null)?.focus(); setCancelErrors(prev => ({ ...prev, [schedule.id]: 'Reason is required.' })); return; }
                                        if (cancelErrors[schedule.id]) { const el = document.getElementById(`schedule-week-cancel-reason-${schedule.id}`) as HTMLTextAreaElement | null; (el as HTMLTextAreaElement | null)?.focus(); return; }
                                        try { announce?.('Cancelling reservation', 'polite'); } catch(e){}
                                        setIsCanceling(prev => ({ ...prev, [schedule.id]: true }));
                                        try {
                                          let res: any = undefined;
                                          if (onCancelSchedule) res = await onCancelSchedule(schedule.id, reason as string);
                                          if (res && res.message) {
                                            toast.success(res.message);
                                          }
                                        } finally {
                                          setIsCanceling(prev => ({ ...prev, [schedule.id]: false }));
                                          setOpenDialogMap((prev: Record<string, boolean>) => ({ ...prev, [schedule.id]: false }));
                                        }
                                      }}
                                      disabled={!!isCanceling[schedule.id]}
                                    >
                                        {isCanceling[schedule.id] ? (
                                          <span className="inline-flex items-center">
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Cancelling…
                                          </span>
                                        ) : 'Cancel Reservation'}
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