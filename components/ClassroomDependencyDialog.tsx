import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, Calendar, Clock, User, BookOpen, AlertCircle } from 'lucide-react';

interface DependencyDetails {
  bookings: Array<{
    facultyName: string;
    startTime: string;
    endTime: string;
    date: string;
    purpose: string;
  }>;
  schedules: Array<{
    facultyName: string;
    startTime: string;
    endTime: string;
    date: string;
    purpose: string;
  }>;
}

interface ClassroomDependencyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  classroomName: string;
  dependencies: DependencyDetails | null;
  onForceDelete: () => void;
}

export default function ClassroomDependencyDialog({
  isOpen,
  onClose,
  classroomName,
  dependencies,
  onForceDelete,
}: ClassroomDependencyDialogProps) {
  if (!dependencies) {
    return null;
  }

  const formatTime = (time: string) => {
    // Convert 24-hour to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const totalDependencies = dependencies.bookings.length + dependencies.schedules.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <span>Cannot Delete Classroom</span>
          </DialogTitle>
          <DialogDescription>
            <strong>{classroomName}</strong> cannot be deleted because it has{' '}
            <span className="font-medium text-red-600">{totalDependencies} active dependency(ies)</span>.
            You must resolve these conflicts first.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Summary */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <span>Dependency Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Pending Booking Requests:</span>
                  <Badge variant="destructive">{dependencies.bookings.length}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Confirmed Schedules:</span>
                  <Badge variant="destructive">{dependencies.schedules.length}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pending Bookings */}
          {dependencies.bookings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="h-4 w-4 text-orange-600" />
                  <span>Pending Booking Requests ({dependencies.bookings.length})</span>
                </CardTitle>
                <CardDescription>
                  These booking requests are awaiting admin approval and must be processed first.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dependencies.bookings.map((booking, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-orange-50 border-orange-200">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{booking.facultyName}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(booking.date)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(booking.startTime)} - {formatTime(booking.endTime)}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{booking.purpose}</p>
                        </div>
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                          Pending
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Confirmed Schedules */}
          {dependencies.schedules.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span>Confirmed Schedules ({dependencies.schedules.length})</span>
                </CardTitle>
                <CardDescription>
                  These are confirmed classroom bookings that are currently active.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dependencies.schedules.map((schedule, index) => (
                    <div key={index} className="p-3 border rounded-lg bg-blue-50 border-blue-200">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-500" />
                            <span className="font-medium">{schedule.facultyName}</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <div className="flex items-center space-x-1">
                              <Calendar className="h-3 w-3" />
                              <span>{formatDate(schedule.date)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatTime(schedule.startTime)} - {formatTime(schedule.endTime)}</span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{schedule.purpose}</p>
                        </div>
                        <Badge variant="default" className="bg-blue-100 text-blue-800">
                          Confirmed
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resolution Actions */}
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-lg">Next Steps</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-gray-700">
                <p className="mb-2">To delete this classroom, you must first:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {dependencies.bookings.length > 0 && (
                    <li>
                      <strong>Process pending requests:</strong> Approve or reject the {dependencies.bookings.length} pending booking request(s)
                    </li>
                  )}
                  {dependencies.schedules.length > 0 && (
                    <li>
                      <strong>Cancel confirmed schedules:</strong> Contact faculty members to reschedule or cancel the {dependencies.schedules.length} confirmed booking(s)
                    </li>
                  )}
                  <li>
                    <strong>Alternative:</strong> Use force delete to remove the classroom and all associated data (not recommended)
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <div className="space-x-2">
            <Button
              variant="destructive"
              onClick={onForceDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Force Delete All
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}