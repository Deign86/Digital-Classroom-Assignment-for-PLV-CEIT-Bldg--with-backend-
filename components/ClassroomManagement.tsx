import React, { useState } from 'react';
import { classroomService, bookingRequestService, scheduleService } from '../lib/firebaseService';
import { executeWithNetworkHandling } from '../lib/networkErrorHandler';
import { notificationService } from '../lib/notificationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Plus, Edit, Trash2, Users, MapPin, Loader2, X, AlertCircle, AlertTriangle, Calendar, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { Classroom, BookingRequest, Schedule } from '../App';
import { getIconForEquipment } from '../lib/equipmentIcons';
import { sanitizeText } from '../utils/inputValidation';
import { getAuth } from 'firebase/auth';

interface ClassroomManagementProps {
  classrooms: Classroom[];
  onClassroomUpdate: (classrooms: Classroom[]) => void;
}

// Validation limits
const LIMITS = {
  ROOM_NAME: 50,
  BUILDING: 100,
  CAPACITY_MIN: 1,
  CAPACITY_MAX: 200,
};

// Validation error messages
interface ValidationErrors {
  name?: string;
  capacity?: string;
  building?: string;
}

// Available equipment options with their icons
const EQUIPMENT_OPTIONS = [
  'Projector',
  'Computer',
  'WiFi',
  'Whiteboard',
  'TV',
  'Speakers',
  'Air Conditioner',
  'Podium',
  'Microphone',
  'Camera',
  'Printer',
  'Scanner'
];

export default function ClassroomManagement({ classrooms, onClassroomUpdate }: ClassroomManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    equipment: [] as string[],
    building: '',
    floor: '1',
    isAvailable: true
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null);
  // Delete-warning dialog state (shows when classroom has pending/approved reservations)
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
  const [classroomToDeleteWarning, setClassroomToDeleteWarning] = useState<Classroom | null>(null);
  const [affectedBookingsForDelete, setAffectedBookingsForDelete] = useState<BookingRequest[]>([]);
  const [affectedSchedulesForDelete, setAffectedSchedulesForDelete] = useState<Schedule[]>([]);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [loadingRows, setLoadingRows] = useState<Record<string, boolean>>({});
  
  // Disable warning dialog state
  const [disableWarningOpen, setDisableWarningOpen] = useState(false);
  const [classroomToDisable, setClassroomToDisable] = useState<Classroom | null>(null);
  const [affectedBookings, setAffectedBookings] = useState<BookingRequest[]>([]);
  const [affectedSchedules, setAffectedSchedules] = useState<Schedule[]>([]);
  const [disableReason, setDisableReason] = useState('');
  const [disabling, setDisabling] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
      capacity: '',
      equipment: [],
      building: '',
      floor: '1',
      isAvailable: true
    });
    setValidationErrors({});
  };

  // Validate room name
  const validateRoomName = (name: string): string | undefined => {
    const sanitized = sanitizeText(name, LIMITS.ROOM_NAME);
    if (!sanitized.trim()) {
      return 'Room name is required';
    }
    if (sanitized.length > LIMITS.ROOM_NAME) {
      return `Room name must be ${LIMITS.ROOM_NAME} characters or less`;
    }
    return undefined;
  };

  // Validate capacity
  const validateCapacity = (capacity: string): string | undefined => {
    if (!capacity.trim()) {
      return 'Capacity is required';
    }
    const num = parseInt(capacity);
    if (isNaN(num)) {
      return 'Capacity must be a number';
    }
    if (num < LIMITS.CAPACITY_MIN) {
      return `Capacity must be at least ${LIMITS.CAPACITY_MIN}`;
    }
    if (num > LIMITS.CAPACITY_MAX) {
      return `Capacity cannot exceed ${LIMITS.CAPACITY_MAX}`;
    }
    return undefined;
  };

  // Validate building
  const validateBuilding = (building: string): string | undefined => {
    const sanitized = sanitizeText(building, LIMITS.BUILDING);
    if (!sanitized.trim()) {
      return 'Building is required';
    }
    if (sanitized.length > LIMITS.BUILDING) {
      return `Building name must be ${LIMITS.BUILDING} characters or less`;
    }
    return undefined;
  };

  // Validate entire form
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {
      name: validateRoomName(formData.name),
      capacity: validateCapacity(formData.capacity),
      building: validateBuilding(formData.building),
    };

    setValidationErrors(errors);
    return !errors.name && !errors.capacity && !errors.building;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    const result = await executeWithNetworkHandling(
      async () => {
        if (editingClassroom) {
          await classroomService.update(editingClassroom.id, {
            name: formData.name,
            capacity: parseInt(formData.capacity),
            equipment: formData.equipment,
            building: formData.building,
            floor: parseInt(formData.floor),
            isAvailable: formData.isAvailable
          });
        } else {
          await classroomService.create({
            name: formData.name,
            capacity: parseInt(formData.capacity),
            equipment: formData.equipment,
            building: formData.building,
            floor: parseInt(formData.floor),
            isAvailable: formData.isAvailable
          });
        }
        const updatedClassrooms = await classroomService.getAll();
        onClassroomUpdate(updatedClassrooms);
        return { isEdit: !!editingClassroom };
      },
      {
        operationName: editingClassroom ? 'update classroom' : 'create classroom',
        successMessage: undefined, // Let toast below handle it
        maxAttempts: 3,
        showLoadingToast: true,
      }
    );

    if (result.success) {
      toast.success(result.data?.isEdit ? 'Classroom updated successfully' : 'Classroom added successfully');
      resetForm();
      setIsAddDialogOpen(false);
      setEditingClassroom(null);
    } else if (!result.success && !result.isNetworkError) {
      toast.error('Error saving classroom');
    }
  };

  const handleEdit = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setFormData({
      name: classroom.name,
      capacity: classroom.capacity.toString(),
      equipment: classroom.equipment,
      building: classroom.building,
      floor: classroom.floor.toString(),
      isAvailable: classroom.isAvailable
    });
    setIsAddDialogOpen(true);
  };

  const toggleEquipment = (equipment: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.includes(equipment)
        ? prev.equipment.filter(eq => eq !== equipment)
        : [...prev.equipment, equipment]
    }));
  };

  const removeEquipment = (equipment: string) => {
    setFormData(prev => ({
      ...prev,
      equipment: prev.equipment.filter(eq => eq !== equipment)
    }));
  };

  const handleDeleteClick = async (classroom: Classroom) => {
    // Before showing simple delete confirmation, check for pending/approved bookings or confirmed schedules
    try {
      const result = await executeWithNetworkHandling(
        async () => {
          const allBookings = await bookingRequestService.getAll();
          const allSchedules = await scheduleService.getAll();

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const affected = allBookings.filter(booking => {
            const bookingDate = new Date(booking.date);
            return (
              booking.classroomId === classroom.id &&
              (booking.status === 'approved' || booking.status === 'pending') &&
              bookingDate >= today
            );
          });

          const affectedScheds = allSchedules.filter(schedule => {
            const schedDate = new Date(schedule.date);
            return (
              schedule.classroomId === classroom.id &&
              schedule.status === 'confirmed' &&
              schedDate >= today
            );
          });

          return { bookings: affected, schedules: affectedScheds };
        },
        {
          operationName: 'check affected bookings for delete',
          successMessage: undefined,
          maxAttempts: 3,
          showLoadingToast: true,
        }
      );

      if (result.success && result.data) {
        const { bookings, schedules } = result.data;
        if (bookings.length > 0 || schedules.length > 0) {
          setClassroomToDeleteWarning(classroom);
          setAffectedBookingsForDelete(bookings);
          setAffectedSchedulesForDelete(schedules);
          setDeleteWarningOpen(true);
          return; // show warning modal instead of direct delete
        }
      }
    } catch (err) {
      // If check fails, fall back to normal delete dialog to avoid blocking admin actions
      console.error('Failed to check affected bookings before delete:', err);
    }

    // No affected reservations, proceed with normal delete confirmation
    setClassroomToDelete(classroom);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!classroomToDelete) return;
    
    const result = await executeWithNetworkHandling(
      async () => {
        await classroomService.delete(classroomToDelete.id);
        const updatedClassrooms = await classroomService.getAll();
        onClassroomUpdate(updatedClassrooms);
        return true;
      },
      {
        operationName: 'delete classroom',
        successMessage: undefined,
        maxAttempts: 3,
        showLoadingToast: true,
      }
    );

    if (result.success) {
      toast.success('Classroom deleted successfully');
    } else if (!result.success && !result.isNetworkError) {
      toast.error('Error deleting classroom');
    }
    
    setDeleteDialogOpen(false);
    setClassroomToDelete(null);
  };

  const performDeleteWithNotifications = async (classroomId: string, reason?: string) => {
    setDeleting(true);
    const result = await executeWithNetworkHandling(
      async () => {
        // delete classroom
        await classroomService.delete(classroomId);
        const updatedClassrooms = await classroomService.getAll();
        onClassroomUpdate(updatedClassrooms);

        // notify affected faculty
        const facultyIds = new Set<string>();
        affectedBookingsForDelete.forEach(b => facultyIds.add(b.facultyId));
        affectedSchedulesForDelete.forEach(s => facultyIds.add(s.facultyId));

        const auth = getAuth();
        const currentUserId = auth.currentUser?.uid;

        const classroom = classrooms.find(c => c.id === classroomId);
        const classroomName = classroom?.name || 'Classroom';

        for (const facultyId of facultyIds) {
          try {
            const message = reason
              ? `The classroom "${classroomName}" has been deleted. Reason: ${reason}. Please contact admin regarding your affected reservations.`
              : `The classroom "${classroomName}" has been deleted. Please contact admin regarding your affected reservations.`;

            await notificationService.createNotification(
              facultyId,
              'classroom_disabled',
              message,
              { actorId: currentUserId || undefined }
            );
          } catch (error) {
            console.error(`Failed to notify faculty ${facultyId}:`, error);
          }
        }

        return true;
      },
      {
        operationName: 'delete classroom with notifications',
        successMessage: undefined,
        maxAttempts: 3,
        showLoadingToast: true,
      }
    );

    setDeleting(false);

    if (result.success) {
      toast.success('Classroom deleted and affected faculty notified');
    } else if (!result.success && !result.isNetworkError) {
      toast.error('Error deleting classroom');
    }
  };

  const handleDeleteConfirmWithWarning = async () => {
    if (!classroomToDeleteWarning) return;

    if (!deleteReason.trim()) {
      toast.error('Please provide a reason for deleting the classroom to notify affected faculty');
      return;
    }

    await performDeleteWithNotifications(classroomToDeleteWarning.id, deleteReason);

    // reset state
    setDeleteWarningOpen(false);
    setClassroomToDeleteWarning(null);
    setAffectedBookingsForDelete([]);
    setAffectedSchedulesForDelete([]);
    setDeleteReason('');
  };

  const handleDeleteWarningCancel = () => {
    setDeleteWarningOpen(false);
    setClassroomToDeleteWarning(null);
    setAffectedBookingsForDelete([]);
    setAffectedSchedulesForDelete([]);
    setDeleteReason('');
  };

  const handleAvailabilityToggle = async (classroomId: string, isAvailable: boolean) => {
    // If disabling, check for affected bookings first
    if (!isAvailable) {
      const classroom = classrooms.find(c => c.id === classroomId);
      if (!classroom) return;
      
      // Check for affected bookings and schedules
      const result = await executeWithNetworkHandling(
        async () => {
          const allBookings = await bookingRequestService.getAll();
          const allSchedules = await scheduleService.getAll();
          
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Find approved/pending bookings for this classroom from today onwards
          const affected = allBookings.filter(booking => {
            const bookingDate = new Date(booking.date);
            return (
              booking.classroomId === classroomId &&
              (booking.status === 'approved' || booking.status === 'pending') &&
              bookingDate >= today
            );
          });
          
          // Find confirmed schedules for this classroom from today onwards
          const affectedScheds = allSchedules.filter(schedule => {
            const schedDate = new Date(schedule.date);
            return (
              schedule.classroomId === classroomId &&
              schedule.status === 'confirmed' &&
              schedDate >= today
            );
          });
          
          return { bookings: affected, schedules: affectedScheds };
        },
        {
          operationName: 'check affected bookings',
          successMessage: undefined,
          maxAttempts: 3,
          showLoadingToast: true,
        }
      );
      
      if (result.success && result.data) {
        const { bookings, schedules } = result.data;
        
        // If there are affected bookings, show warning dialog
        if (bookings.length > 0 || schedules.length > 0) {
          setClassroomToDisable(classroom);
          setAffectedBookings(bookings);
          setAffectedSchedules(schedules);
          setDisableWarningOpen(true);
          return; // Don't proceed with toggle yet
        }
      }
    }
    
    // If enabling or no affected bookings, proceed normally
    await performAvailabilityToggle(classroomId, isAvailable);
  };

  const performAvailabilityToggle = async (classroomId: string, isAvailable: boolean, reason?: string) => {
    // show per-row loader while updating
    setLoadingRows(prev => ({ ...prev, [classroomId]: true }));
    
    const result = await executeWithNetworkHandling(
      async () => {
        await classroomService.update(classroomId, { isAvailable });
        const updatedClassrooms = await classroomService.getAll();
        onClassroomUpdate(updatedClassrooms);
        
        // If disabling with affected bookings, send notifications
        if (!isAvailable && (affectedBookings.length > 0 || affectedSchedules.length > 0)) {
          const auth = getAuth();
          const currentUserId = auth.currentUser?.uid;
          
          // Get unique faculty IDs from both bookings and schedules
          const facultyIds = new Set<string>();
          affectedBookings.forEach(b => facultyIds.add(b.facultyId));
          affectedSchedules.forEach(s => facultyIds.add(s.facultyId));
          
          // Send notification to each affected faculty
          const classroom = classrooms.find(c => c.id === classroomId);
          const classroomName = classroom?.name || 'Classroom';
          
          for (const facultyId of facultyIds) {
            try {
              const message = reason 
                ? `The classroom "${classroomName}" has been disabled. Reason: ${reason}. Please contact admin regarding your affected reservations.`
                : `The classroom "${classroomName}" has been disabled. Please contact admin regarding your affected reservations.`;
              
              await notificationService.createNotification(
                facultyId,
                'classroom_disabled',
                message,
                {
                  actorId: currentUserId || undefined,
                }
              );
            } catch (error) {
              console.error(`Failed to notify faculty ${facultyId}:`, error);
            }
          }
        }
        
        return { isAvailable };
      },
      {
        operationName: isAvailable ? 'enable classroom' : 'disable classroom',
        successMessage: undefined,
        maxAttempts: 3,
        showLoadingToast: false, // We have per-row loader
      }
    );

    if (result.success) {
      const affectedCount = affectedBookings.length + affectedSchedules.length;
      const message = !isAvailable && affectedCount > 0
        ? `Classroom disabled successfully. ${affectedCount} affected reservation(s) notified.`
        : `Classroom ${result.data?.isAvailable ? 'enabled' : 'disabled'} successfully`;
      toast.success(message);
    } else if (!result.success && !result.isNetworkError) {
      toast.error('Error updating availability');
    }
    
    setLoadingRows(prev => {
      const copy = { ...prev };
      delete copy[classroomId];
      return copy;
    });
  };

  const handleDisableConfirm = async () => {
    if (!classroomToDisable) return;
    
    // Validate reason is provided
    if (!disableReason.trim()) {
      toast.error('Please provide a reason for disabling the classroom');
      return;
    }
    
    setDisabling(true);
    await performAvailabilityToggle(classroomToDisable.id, false, disableReason);
    setDisabling(false);
    
    // Reset state
    setDisableWarningOpen(false);
    setClassroomToDisable(null);
    setAffectedBookings([]);
    setAffectedSchedules([]);
    setDisableReason('');
  };

  const handleDisableCancel = () => {
    setDisableWarningOpen(false);
    setClassroomToDisable(null);
    setAffectedBookings([]);
    setAffectedSchedules([]);
    setDisableReason('');
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingClassroom(null);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="classroom-management-header flex items-center justify-between">
            <div>
              <CardTitle>Classroom Management</CardTitle>
              <CardDescription>Manage CEIT classroom inventory and availability</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="add-classroom-btn">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Classroom
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>
                    {editingClassroom ? 'Edit Classroom' : 'Add New Classroom'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingClassroom 
                      ? 'Update the classroom information below.' 
                      : 'Enter the details for the new classroom.'
                    }
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Room Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., CEIT-101"
                      value={formData.name}
                      onChange={(e) => {
                        const sanitized = sanitizeText(e.target.value, LIMITS.ROOM_NAME);
                        setFormData(prev => ({ ...prev, name: sanitized }));
                        setValidationErrors(prev => ({ ...prev, name: validateRoomName(sanitized) }));
                      }}
                      onBlur={() => setValidationErrors(prev => ({ ...prev, name: validateRoomName(formData.name) }))}
                      maxLength={LIMITS.ROOM_NAME}
                      className={validationErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      required
                    />
                    {validationErrors.name && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formData.name.length}/{LIMITS.ROOM_NAME} characters
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity *</Label>
                      <Input
                        id="capacity"
                        type="number"
                        placeholder="50"
                        min={LIMITS.CAPACITY_MIN}
                        max={LIMITS.CAPACITY_MAX}
                        value={formData.capacity}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, capacity: e.target.value }));
                          setValidationErrors(prev => ({ ...prev, capacity: validateCapacity(e.target.value) }));
                        }}
                        onBlur={() => setValidationErrors(prev => ({ ...prev, capacity: validateCapacity(formData.capacity) }))}
                        className={validationErrors.capacity ? 'border-red-500 focus-visible:ring-red-500' : ''}
                        required
                      />
                      {validationErrors.capacity && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          {validationErrors.capacity}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Range: {LIMITS.CAPACITY_MIN}-{LIMITS.CAPACITY_MAX}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="floor">Floor *</Label>
                      <Select value={formData.floor} onValueChange={(value: string) => setFormData(prev => ({ ...prev, floor: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1st Floor</SelectItem>
                          <SelectItem value="2">2nd Floor</SelectItem>
                          <SelectItem value="3">3rd Floor</SelectItem>
                          <SelectItem value="4">4th Floor</SelectItem>
                          <SelectItem value="5">5th Floor</SelectItem>
                          <SelectItem value="6">6th Floor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="building">Building *</Label>
                    <Input
                      id="building"
                      placeholder="e.g., CEIT Building"
                      value={formData.building}
                      onChange={(e) => {
                        const sanitized = sanitizeText(e.target.value, LIMITS.BUILDING);
                        setFormData(prev => ({ ...prev, building: sanitized }));
                        setValidationErrors(prev => ({ ...prev, building: validateBuilding(sanitized) }));
                      }}
                      onBlur={() => setValidationErrors(prev => ({ ...prev, building: validateBuilding(formData.building) }))}
                      maxLength={LIMITS.BUILDING}
                      className={validationErrors.building ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      required
                    />
                    {validationErrors.building && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {validationErrors.building}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">
                      {formData.building.length}/{LIMITS.BUILDING} characters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equipment">Equipment</Label>
                    <Select value="" onValueChange={toggleEquipment}>
                      <SelectTrigger id="equipment">
                        <SelectValue placeholder="Select equipment to add..." />
                      </SelectTrigger>
                      <SelectContent>
                        {EQUIPMENT_OPTIONS.map((equipment) => (
                          <SelectItem 
                            key={equipment} 
                            value={equipment}
                            disabled={formData.equipment.includes(equipment)}
                          >
                            <div className="flex items-center space-x-2">
                              {getIconForEquipment(equipment)}
                              <span>{equipment}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {/* Selected Equipment Tags */}
                    {formData.equipment.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2 p-2 border rounded-md bg-gray-50">
                        {formData.equipment.map((eq) => (
                          <Badge 
                            key={eq} 
                            variant="secondary" 
                            className="text-xs flex items-center space-x-1 pr-1"
                          >
                            {getIconForEquipment(eq)}
                            <span>{eq}</span>
                            <button
                              type="button"
                              onClick={() => removeEquipment(eq)}
                              className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="available"
                      checked={formData.isAvailable}
                      onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
                    />
                    <Label htmlFor="available">Available for booking</Label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={closeDialog}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit"
                      disabled={
                        !formData.name.trim() || 
                        !formData.capacity.trim() || 
                        !formData.building.trim() ||
                        !!validationErrors.name || 
                        !!validationErrors.capacity || 
                        !!validationErrors.building
                      }
                    >
                      {editingClassroom ? 'Update Classroom' : 'Add Classroom'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room Name</TableHead>
                  <TableHead>Building & Floor</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classrooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No classrooms added yet
                    </TableCell>
                  </TableRow>
                ) : (
                  classrooms.map((classroom) => (
                    <TableRow key={classroom.id}>
                      <TableCell className="font-medium">{classroom.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{classroom.building}, {classroom.floor}F</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          <span>{classroom.capacity}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {classroom.equipment.length === 0 ? (
                            <span className="text-gray-400 text-sm">None</span>
                          ) : (
                            classroom.equipment.slice(0, 3).map((eq, index) => (
                              <Badge key={index} variant="secondary" className="text-xs flex items-center space-x-1">
                                {getIconForEquipment(eq)}
                                <span>{eq}</span>
                              </Badge>
                            ))
                          )}
                          {classroom.equipment.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{classroom.equipment.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={classroom.isAvailable}
                            disabled={!!loadingRows[classroom.id]}
                            onCheckedChange={(checked: boolean) => handleAvailabilityToggle(classroom.id, checked)}
                          />
                          {loadingRows[classroom.id] && (
                            <span className="inline-flex items-center">
                              <Loader2 className="animate-spin mr-2 h-4 w-4 text-gray-500" />
                              <span className="sr-only">Updating availability</span>
                            </span>
                          )}
                          <Badge variant={classroom.isAvailable ? 'default' : 'secondary'}>
                            {classroom.isAvailable ? 'Available' : 'Disabled'}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(classroom)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(classroom)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {classrooms.length > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              Total: {classrooms.length} classrooms • Available: {classrooms.filter(c => c.isAvailable).length}
            </div>
          )}
        </CardContent>
      </Card>
        {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Classroom</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <b>{classroomToDelete?.name}</b>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setClassroomToDelete(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

        {/* Delete Warning Dialog (shown when classroom has pending/approved reservations) */}
        <Dialog open={deleteWarningOpen} onOpenChange={setDeleteWarningOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Warning: Active Reservations Found
              </DialogTitle>
              <DialogDescription>
                The classroom <b>{classroomToDeleteWarning?.name}</b> has <b>{affectedBookingsForDelete.length + affectedSchedulesForDelete.length}</b> active or upcoming reservation(s). Deleting it will affect the following reservations. You must provide a reason which will be included in notifications to affected faculty.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Affected Bookings */}
              {affectedBookingsForDelete.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Pending/Approved Booking Requests ({affectedBookingsForDelete.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {affectedBookingsForDelete.map((booking) => (
                      <div 
                        key={booking.id} 
                        className="p-3 border rounded-lg bg-gray-50 text-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{booking.facultyName}</p>
                            <p className="text-gray-600">
                              {new Date(booking.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-gray-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {booking.startTime} - {booking.endTime}
                            </p>
                            <p className="text-gray-500 text-xs">{booking.purpose}</p>
                          </div>
                          <Badge variant={booking.status === 'approved' ? 'default' : 'secondary'}>
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Affected Schedules */}
              {affectedSchedulesForDelete.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Confirmed Schedules ({affectedSchedulesForDelete.length})
                  </h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {affectedSchedulesForDelete.map((schedule) => (
                      <div 
                        key={schedule.id} 
                        className="p-3 border rounded-lg bg-gray-50 text-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{schedule.facultyName}</p>
                            <p className="text-gray-600">
                              {new Date(schedule.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="text-gray-600 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {schedule.startTime} - {schedule.endTime}
                            </p>
                            <p className="text-gray-500 text-xs">{schedule.purpose}</p>
                          </div>
                          <Badge variant="default">
                            {schedule.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Required Reason Field */}
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="delete-reason">
                  Reason for deleting *
                  <span className="text-sm text-gray-500 font-normal ml-2">
                    This will be included in the notification to affected faculty
                  </span>
                </Label>
                <Textarea
                  id="delete-reason"
                  placeholder="e.g., Room permanently decommissioned, major renovation, etc."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  maxLength={200}
                  rows={3}
                  required
                  className={!deleteReason.trim() && deleteReason.length > 0 ? 'border-red-500' : ''}
                />
                {!deleteReason.trim() && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Reason is required to notify affected faculty
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {deleteReason.length}/200 characters
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-medium mb-1">What happens next?</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>All affected faculty members will receive an in-app notification</li>
                  <li>If push notifications are enabled, they'll also receive a push notification</li>
                  <li>They will be informed to contact admin about their reservations</li>
                  <li>The classroom will be removed from the inventory</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={handleDeleteWarningCancel}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDeleteConfirmWithWarning}
                disabled={!deleteReason.trim() || deleting}
                className="bg-amber-600 hover:bg-amber-700"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Classroom & Notify'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Disable Classroom Warning Dialog */}
      <Dialog open={disableWarningOpen} onOpenChange={setDisableWarningOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Warning: Active Reservations Found
            </DialogTitle>
            <DialogDescription>
              This classroom has <b>{affectedBookings.length + affectedSchedules.length}</b> active or upcoming reservation(s). 
              Disabling it will affect the following:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Affected Bookings */}
            {affectedBookings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Pending/Approved Booking Requests ({affectedBookings.length})
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {affectedBookings.map((booking) => (
                    <div 
                      key={booking.id} 
                      className="p-3 border rounded-lg bg-gray-50 text-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{booking.facultyName}</p>
                          <p className="text-gray-600">
                            {new Date(booking.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-gray-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {booking.startTime} - {booking.endTime}
                          </p>
                          <p className="text-gray-500 text-xs">{booking.purpose}</p>
                        </div>
                        <Badge variant={booking.status === 'approved' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Affected Schedules */}
            {affectedSchedules.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Confirmed Schedules ({affectedSchedules.length})
                </h4>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {affectedSchedules.map((schedule) => (
                    <div 
                      key={schedule.id} 
                      className="p-3 border rounded-lg bg-gray-50 text-sm"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{schedule.facultyName}</p>
                          <p className="text-gray-600">
                            {new Date(schedule.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-gray-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {schedule.startTime} - {schedule.endTime}
                          </p>
                          <p className="text-gray-500 text-xs">{schedule.purpose}</p>
                        </div>
                        <Badge variant="default">
                          {schedule.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Reason Field */}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="disable-reason">
                Reason for disabling *
                <span className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-2">
                  This will be included in the notification
                </span>
              </Label>
              <Textarea
                id="disable-reason"
                placeholder="e.g., Maintenance work scheduled, Equipment malfunction, etc."
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                maxLength={200}
                rows={3}
                required
                className={!disableReason.trim() && disableReason.length > 0 ? 'border-red-500' : ''}
              />
              {!disableReason.trim() && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Reason is required to notify affected faculty
                </p>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {disableReason.length}/200 characters
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">What happens next?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>All affected faculty members will receive an in-app notification</li>
                <li>If push notifications are enabled, they'll also receive a push notification</li>
                <li>They will be informed to contact admin about their reservations</li>
                <li>The classroom will be marked as unavailable for new bookings</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={handleDisableCancel}
              disabled={disabling}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDisableConfirm}
              className="bg-amber-600 hover:bg-amber-700"
              disabled={!disableReason.trim() || disabling}
            >
              {disabling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Disabling...
                </>
              ) : (
                'Disable Classroom & Notify'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}