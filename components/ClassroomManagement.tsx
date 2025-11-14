import React, { useState, useEffect, useMemo } from 'react';
import { classroomService, bookingRequestService, scheduleService } from '../lib/firebaseService';
import { executeWithNetworkHandling } from '../lib/networkErrorHandler';
import { notificationService } from '../lib/notificationService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from './ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Textarea } from './ui/textarea';
import { Plus, Edit, Trash2, Users, MapPin, Loader2, X, AlertCircle, AlertTriangle, Calendar, Clock } from 'lucide-react';
import ProcessingFieldset from './ui/ProcessingFieldset';
import { toast } from 'sonner';
import type { Classroom, BookingRequest, Schedule } from '../App';
import { getIconForEquipment } from '../lib/equipmentIcons';
import { sanitizeText } from '../utils/inputValidation';
import { getAuth } from 'firebase/auth';
import BulkOperationLoader from './BulkOperationLoader';
import useBulkRunner, { BulkTask } from '../hooks/useBulkRunner';
import { useRef } from 'react';
import ScrollableBulkList from './ui/ScrollableBulkList';

interface ClassroomManagementProps {
  classrooms: Classroom[];
  onClassroomUpdate: (classrooms: Classroom[]) => void;
}

// Validation limits
const LIMITS = {
  ROOM_NAME: 50,
  CAPACITY_MIN: 1,
  CAPACITY_MAX: 200,
};

// Default building name - system is limited to CEIT Building at PLV
const DEFAULT_BUILDING = 'CEIT Building';

// Validation error messages
interface ValidationErrors {
  name?: string;
  capacity?: string;
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
    building: DEFAULT_BUILDING,
    floor: '1',
    isAvailable: true
  });
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null);
  const [deletingSimple, setDeletingSimple] = useState(false);
  // Delete-warning dialog state (shows when classroom has pending/approved reservations)
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
  const [classroomToDeleteWarning, setClassroomToDeleteWarning] = useState<Classroom | null>(null);
  const [affectedBookingsForDelete, setAffectedBookingsForDelete] = useState<BookingRequest[]>([]);
  const [affectedSchedulesForDelete, setAffectedSchedulesForDelete] = useState<Schedule[]>([]);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [loadingRows, setLoadingRows] = useState<Record<string, boolean>>({});
  // Selection & bulk-edit state
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const selectedCount = Object.values(selectedIds).filter(Boolean).length;
  const selectedClassrooms = useMemo(() => Object.keys(selectedIds).filter(id => selectedIds[id]).map(id => classrooms.find(c => c.id === id)).filter(Boolean) as Classroom[], [selectedIds, classrooms]);
  const isAllSelectedEnabled = selectedClassrooms.length > 0 && selectedClassrooms.every(c => c.isAvailable);
  const isAllSelectedDisabled = selectedClassrooms.length > 0 && selectedClassrooms.every(c => !c.isAvailable);
  const canEnableSelected = selectedClassrooms.length > 0 && !isAllSelectedEnabled;
  const canDisableSelected = selectedClassrooms.length > 0 && !isAllSelectedDisabled;
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ processed: number; total: number }>({ processed: 0, total: 0 });
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkActionType, setBulkActionType] = useState<'disable' | 'enable' | 'delete' | null>(null);
  const [bulkReason, setBulkReason] = useState('');
  // Bulk-warning state when selected classrooms have active reservations
  const [bulkWarningOpen, setBulkWarningOpen] = useState(false);
  const [bulkWarningAffectedBookings, setBulkWarningAffectedBookings] = useState<BookingRequest[]>([]);
  const [bulkWarningAffectedSchedules, setBulkWarningAffectedSchedules] = useState<Schedule[]>([]);
  const [bulkWarningReason, setBulkWarningReason] = useState('');
  const [bulkConfirming, setBulkConfirming] = useState(false);
  const pendingBulkIdsRef = useRef<string[] | null>(null);
  // Bulk runner and progress dialog state
  const bulkRunner = useBulkRunner();
  const lastDeleteTasksRef = useRef<BulkTask[] | null>(null);
  const [lastDeleteItems, setLastDeleteItems] = useState<{ id: string; label?: string }[]>([]);
  const [showBulkProgress, setShowBulkProgress] = useState(false);

  // Advanced search filters
  const [filters, setFilters] = useState({
    query: '',
    minCapacity: '',
    equipment: [] as string[],
    floor: '__all__',
    onlyAvailable: false,
  });
  
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
      building: DEFAULT_BUILDING,
      floor: '1',
      isAvailable: true
    });
    setValidationErrors({});
  };

  // Compute filtered classrooms using simple advanced filters similar to RoomSearch
  const filteredClassrooms = useMemo(() => {
    let filtered = classrooms.slice();
    const q = filters.query.trim().toLowerCase();
    if (q) filtered = filtered.filter(c => c.name.toLowerCase().includes(q) || (c.building || '').toLowerCase().includes(q));
    if (filters.minCapacity) {
      const min = parseInt(filters.minCapacity);
      if (!isNaN(min)) filtered = filtered.filter(c => c.capacity >= min);
    }
    if (filters.equipment.length > 0) {
      filtered = filtered.filter(c => filters.equipment.every(eq => c.equipment.includes(eq)));
    }
    if (filters.floor && filters.floor !== '__all__') {
      const floorNum = parseInt(filters.floor, 10);
      if (!isNaN(floorNum)) filtered = filtered.filter(c => c.floor === floorNum);
    }
    if (filters.onlyAvailable) filtered = filtered.filter(c => c.isAvailable);
    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [classrooms, filters]);

  // Toggle selection helpers
  const toggleSelect = (id: string, checked: boolean) => setSelectedIds(prev => ({ ...prev, [id]: checked }));
  const clearSelection = () => setSelectedIds({});

  const runWithConcurrency = async <T,>(
    tasks: Array<() => Promise<T>>,
    concurrency: number,
    onProgress?: (processed: number, total: number) => void
  ): Promise<Array<{ status: 'fulfilled' | 'rejected'; value?: T; reason?: any }>> => {
    const results: Array<any> = [];
    let index = 0;
    let processed = 0;
    const total = tasks.length;

    const workers: Promise<void>[] = new Array(Math.min(concurrency, tasks.length)).fill(Promise.resolve()).map(async () => {
      while (true) {
        const i = index++;
        if (i >= tasks.length) return;
        try {
          const value = await tasks[i]();
          results[i] = { status: 'fulfilled', value };
        } catch (err) {
          results[i] = { status: 'rejected', reason: err };
        } finally {
          processed += 1;
          if (onProgress) onProgress(processed, total);
        }
      }
    });

    await Promise.all(workers);
    return results;
  };

  // Validate room name
  const validateRoomName = (name: string): string | undefined => {
    const trimmed = name.trim();
    if (!trimmed) {
      return 'Room name is required';
    }
    if (name.length > LIMITS.ROOM_NAME) {
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

  // Validate entire form
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {
      name: validateRoomName(formData.name),
      capacity: validateCapacity(formData.capacity),
    };

    setValidationErrors(errors);
    return !errors.name && !errors.capacity;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validateForm()) {
      toast.error('Please fix the errors before submitting');
      return;
    }
    
    // Sanitize name for submission (trim and collapse multiple spaces)
    const sanitizedName = sanitizeText(formData.name, LIMITS.ROOM_NAME);
    
    const result = await executeWithNetworkHandling(
      async () => {
        if (editingClassroom) {
          await classroomService.update(editingClassroom.id, {
            name: sanitizedName,
            capacity: parseInt(formData.capacity),
            equipment: formData.equipment,
            building: formData.building,
            floor: parseInt(formData.floor),
            isAvailable: formData.isAvailable
          });
        } else {
          await classroomService.create({
            name: sanitizedName,
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
      building: classroom.building || DEFAULT_BUILDING,
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
    
    setDeletingSimple(true);
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

    setDeletingSimple(false);

    if (result.success) {
      toast.success('Classroom deleted successfully');
      setDeleteDialogOpen(false);
      setClassroomToDelete(null);
    } else if (!result.success && !result.isNetworkError) {
      toast.error('Error deleting classroom');
    }
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

  const confirmBulkAction = async () => {
    if (!bulkActionType) return;
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    if (ids.length === 0) {
      setIsBulkDialogOpen(false);
      return;
    }

    setIsProcessingBulk(true);
    setBulkProgress({ processed: 0, total: ids.length });

    try {
      // For disable/delete actions, first check if any selected classrooms have affected bookings/schedules
      if ((bulkActionType === 'disable' || bulkActionType === 'delete')) {
        try {
          const allBookings = await bookingRequestService.getAll();
          const allSchedules = await scheduleService.getAll();

          const today = new Date();
          today.setHours(0,0,0,0);

          const affectedBookings: BookingRequest[] = [];
          const affectedSchedules: Schedule[] = [];

          for (const cid of ids) {
            const b = allBookings.filter(bk => bk.classroomId === cid && (bk.status === 'approved' || bk.status === 'pending') && new Date(bk.date) >= today);
            const s = allSchedules.filter(sc => sc.classroomId === cid && sc.status === 'confirmed' && new Date(sc.date) >= today);
            if (b.length > 0) affectedBookings.push(...b);
            if (s.length > 0) affectedSchedules.push(...s);
          }

          if (affectedBookings.length > 0 || affectedSchedules.length > 0) {
            // show bulk warning dialog and store pending ids
            pendingBulkIdsRef.current = ids;
            setBulkWarningAffectedBookings(affectedBookings);
            setBulkWarningAffectedSchedules(affectedSchedules);
            setBulkWarningReason('');
            setIsBulkDialogOpen(false);
            setBulkWarningOpen(true);
            return; // wait for explicit confirmation with reason
          }
        } catch (err) {
          // if the check fails, continue with the bulk action to avoid blocking admin
          console.error('Failed to check affected bookings for bulk action:', err);
        }
      }
      if (bulkActionType === 'enable' || bulkActionType === 'disable') {
        const isAvailable = bulkActionType === 'enable';
        // perform batch update
        const updates = ids.map(id => ({ id, data: { isAvailable } }));
        const result = await executeWithNetworkHandling(
          async () => {
            await classroomService.bulkUpdate(updates);
            const updated = await classroomService.getAll();
            onClassroomUpdate(updated);

            // If we disabled rooms, notify affected faculty for each classroom
            if (!isAvailable) {
              try {
                const allBookings = await bookingRequestService.getAll();
                const allSchedules = await scheduleService.getAll();
                const auth = getAuth();
                const currentUserId = auth.currentUser?.uid;

                for (const cid of ids) {
                  const classroom = classrooms.find(c => c.id === cid);
                  const classroomName = classroom?.name || 'Classroom';

                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const affectedB = allBookings.filter(b => b.classroomId === cid && (b.status === 'approved' || b.status === 'pending') && new Date(b.date) >= today);
                  const affectedS = allSchedules.filter(s => s.classroomId === cid && s.status === 'confirmed' && new Date(s.date) >= today);

                  const facultyIds = new Set<string>();
                  affectedB.forEach(b => facultyIds.add(b.facultyId));
                  affectedS.forEach(s => facultyIds.add(s.facultyId));

                  for (const fid of facultyIds) {
                    try {
                      const message = bulkReason
                        ? `The classroom "${classroomName}" has been disabled. Reason: ${bulkReason}. Please contact admin regarding your affected reservations.`
                        : `The classroom "${classroomName}" has been disabled. Please contact admin regarding your affected reservations.`;
                      await notificationService.createNotification(fid, 'classroom_disabled', message, { actorId: currentUserId || undefined });
                    } catch (err) {
                      console.error('Failed to notify faculty during bulk disable:', err);
                    }
                  }
                }
              } catch (err) {
                console.error('Error while post-processing bulk disable notifications:', err);
              }
            }
            return true;
          },
          {
            operationName: bulkActionType === 'enable' ? 'enable classrooms' : 'disable classrooms',
            showLoadingToast: true,
            maxAttempts: 3,
          }
        );

        if (result.success) {
          toast.success(bulkActionType === 'enable' ? `Enabled ${ids.length} classroom(s)` : `Disabled ${ids.length} classroom(s)`);
        } else if (!result.success && !result.isNetworkError) {
          toast.error('Bulk update failed');
        }
      }

  if (bulkActionType === 'delete') {
        // Build tasks (prefer callable cascade, fallback to client delete)
        const tasks = ids.map(id => async () => {
          try {
            await classroomService.deleteCascade(id);
            return { id, ok: true };
          } catch (err) {
            // fallback to client delete
            await classroomService.delete(id);
            return { id, ok: true };
          }
        });

        // Use the new bulk runner hook for cancellable, per-item progress
        const itemsForDialog = ids.map(id => ({ id, label: (classrooms.find(c => c.id === id)?.name ?? id) }));
        setIsBulkDialogOpen(false); // reuse the bulk reason dialog only for confirmation; open progress dialog
        setBulkProgress({ processed: 0, total: ids.length });

        // remember tasks/items for retry
  lastDeleteTasksRef.current = tasks as BulkTask[];
  setLastDeleteItems(itemsForDialog);
  // open progress dialog before starting long-running tasks
  setShowBulkProgress(true);

  // start runner
  const results = await bulkRunner.start(tasks as BulkTask[], 4, (p: number, t: number) => setBulkProgress({ processed: p, total: t }));

        // Refresh classrooms after run
        const updated = await classroomService.getAll();
        onClassroomUpdate(updated);

        const succeeded = results.filter((r: any) => r.status === 'fulfilled').length;
        const failed = results.filter((r: any) => r.status === 'rejected').length;
        if (succeeded > 0) toast.success(`Deleted ${succeeded} classroom(s)`);
        if (failed > 0) toast.error(`${failed} delete(s) failed`);

        // show results dialog via BulkProgressDialog (it reads from bulkRunner.results)
        setShowBulkProgress(true);
      }
    } catch (err) {
      console.error('Bulk action error:', err);
      toast.error('Bulk action failed');
    } finally {
      setIsProcessingBulk(false);
      setIsBulkDialogOpen(false);
      setBulkReason('');
      clearSelection();
      setBulkProgress({ processed: 0, total: 0 });
    }
  };

  // Initiate bulk action: run pre-checks and either show bulk warning immediately or proceed
  const initiateBulkAction = async (action: 'disable' | 'enable' | 'delete') => {
    setBulkActionType(action);
    const ids = Object.keys(selectedIds).filter(id => selectedIds[id]);
    if (ids.length === 0) return;

    // Prevent no-op bulk actions: don't open dialogs if there's nothing to change
    if (action === 'enable' && !canEnableSelected) {
      toast('All selected classrooms are already enabled.');
      return;
    }
    if (action === 'disable' && !canDisableSelected) {
      toast('All selected classrooms are already disabled.');
      return;
    }

    // For disable/delete, run affected bookings/schedules check and show warning if any
    if (action === 'disable' || action === 'delete') {
      try {
        const allBookings = await bookingRequestService.getAll();
        const allSchedules = await scheduleService.getAll();
        const today = new Date();
        today.setHours(0,0,0,0);

        const affectedBookings: BookingRequest[] = [];
        const affectedSchedules: Schedule[] = [];

        for (const cid of ids) {
          const b = allBookings.filter(bk => bk.classroomId === cid && (bk.status === 'approved' || bk.status === 'pending') && new Date(bk.date) >= today);
          const s = allSchedules.filter(sc => sc.classroomId === cid && sc.status === 'confirmed' && new Date(sc.date) >= today);
          if (b.length > 0) affectedBookings.push(...b);
          if (s.length > 0) affectedSchedules.push(...s);
        }

        if (affectedBookings.length > 0 || affectedSchedules.length > 0) {
          pendingBulkIdsRef.current = ids;
          setBulkWarningAffectedBookings(affectedBookings);
          setBulkWarningAffectedSchedules(affectedSchedules);
          setBulkWarningReason('');
          setBulkWarningOpen(true);
          return; // show warning as first dialog
        }
      } catch (err) {
        console.error('Failed to check affected bookings for bulk action:', err);
        // proceed if check fails
      }
    }

    // No affected bookings (or action is enable) — open the regular bulk confirmation dialog
    // so admin can optionally supply a reason or confirm the action.
    setBulkReason('');
    setIsBulkDialogOpen(true);
  };

  // Execute the pending bulk action that was confirmed via the warning dialog
  const executePendingBulkAction = async (reason?: string) => {
    const ids = pendingBulkIdsRef.current ?? [];
    if (ids.length === 0 || !bulkActionType) return;

    setBulkConfirming(true);
    try {
      // Reuse confirmBulkAction logic by applying the chosen action to pending ids
      if (bulkActionType === 'disable' || bulkActionType === 'enable') {
        const isAvailable = bulkActionType === 'enable';
        const updates = ids.map(id => ({ id, data: { isAvailable } }));
        await classroomService.bulkUpdate(updates);
        const updated = await classroomService.getAll();
        onClassroomUpdate(updated);

        if (!isAvailable) {
          // notify affected faculty
          const allBookings = await bookingRequestService.getAll();
          const allSchedules = await scheduleService.getAll();
          const auth = getAuth();
          const currentUserId = auth.currentUser?.uid;

          for (const cid of ids) {
            const classroom = classrooms.find(c => c.id === cid);
            const classroomName = classroom?.name || 'Classroom';
            const today = new Date();
            today.setHours(0,0,0,0);
            const affectedB = allBookings.filter(b => b.classroomId === cid && (b.status === 'approved' || b.status === 'pending') && new Date(b.date) >= today);
            const affectedS = allSchedules.filter(s => s.classroomId === cid && s.status === 'confirmed' && new Date(s.date) >= today);
            const facultyIds = new Set<string>();
            affectedB.forEach(b => facultyIds.add(b.facultyId));
            affectedS.forEach(s => facultyIds.add(s.facultyId));

            for (const fid of facultyIds) {
              try {
                const message = reason
                  ? `The classroom "${classroomName}" has been disabled. Reason: ${reason}. Please contact admin regarding your affected reservations.`
                  : `The classroom "${classroomName}" has been disabled. Please contact admin regarding your affected reservations.`;
                await notificationService.createNotification(fid, 'classroom_disabled', message, { actorId: currentUserId || undefined });
              } catch (err) {
                console.error('Failed to notify faculty during bulk disable:', err);
              }
            }
          }
        }
      }

      if (bulkActionType === 'delete') {
        // perform bulk delete with bulkRunner like confirmBulkAction
        const tasks = ids.map(id => async () => {
          try {
            await classroomService.deleteCascade(id);
            return { id, ok: true };
          } catch (err) {
            await classroomService.delete(id);
            return { id, ok: true };
          }
        });

        const itemsForDialog = ids.map(id => ({ id, label: (classrooms.find(c => c.id === id)?.name ?? id) }));
        lastDeleteTasksRef.current = tasks as BulkTask[];
        setLastDeleteItems(itemsForDialog);
        setShowBulkProgress(true);
        const results = await bulkRunner.start(tasks as BulkTask[], 4, (p: number, t: number) => setBulkProgress({ processed: p, total: t }));
        const updated = await classroomService.getAll();
        onClassroomUpdate(updated);
        const succeeded = results.filter((r: any) => r.status === 'fulfilled').length;
        const failed = results.filter((r: any) => r.status === 'rejected').length;
        if (succeeded > 0) toast.success(`Deleted ${succeeded} classroom(s)`);
        if (failed > 0) toast.error(`${failed} delete(s) failed`);
        setShowBulkProgress(true);
      }
    } catch (err) {
      console.error('executePendingBulkAction failed:', err);
      toast.error('Bulk action failed');
    } finally {
      setBulkConfirming(false);
      pendingBulkIdsRef.current = null;
      setBulkWarningOpen(false);
      setBulkReason('');
      clearSelection();
      setBulkProgress({ processed: 0, total: 0 });
    }
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
              <DialogContent className="sm:max-w-[425px] p-6">
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
                        // Allow spaces during typing - only enforce length limit
                        const value = e.target.value.slice(0, LIMITS.ROOM_NAME);
                        setFormData(prev => ({ ...prev, name: value }));
                        setValidationErrors(prev => ({ ...prev, name: validateRoomName(value) }));
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
                        !!validationErrors.name || 
                        !!validationErrors.capacity
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

        {/* Advanced filters + bulk action toolbar */}
        <div className="px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <Input
              placeholder="Search by room name or building..."
              value={filters.query}
              onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
            />
            <Input
              placeholder="Min capacity"
              type="number"
              value={filters.minCapacity}
              onChange={(e) => setFilters(prev => ({ ...prev, minCapacity: e.target.value }))}
            />
            <Select value={filters.floor} onValueChange={(v: string) => setFilters(prev => ({ ...prev, floor: v }))}>
              <SelectTrigger>
                  <SelectValue>
                    {filters.floor === '__all__' ? 'Filter by floor' : (
                      filters.floor === '1' ? '1st Floor' :
                      filters.floor === '2' ? '2nd Floor' :
                      filters.floor === '3' ? '3rd Floor' :
                      filters.floor === '4' ? '4th Floor' :
                      filters.floor === '5' ? '5th Floor' :
                      filters.floor === '6' ? '6th Floor' : filters.floor
                    )}
                  </SelectValue>
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Floors</SelectItem>
                <SelectItem value="1">1st Floor</SelectItem>
                <SelectItem value="2">2nd Floor</SelectItem>
                <SelectItem value="3">3rd Floor</SelectItem>
                <SelectItem value="4">4th Floor</SelectItem>
                <SelectItem value="5">5th Floor</SelectItem>
                <SelectItem value="6">6th Floor</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Switch id="only-available" checked={filters.onlyAvailable} onCheckedChange={(v: boolean) => setFilters(prev => ({ ...prev, onlyAvailable: v }))} />
              <Label htmlFor="only-available">Only available</Label>
            </div>
          </div>

          {selectedCount > 0 && (
            <ProcessingFieldset isProcessing={isProcessingBulk} className="mb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="text-sm font-medium">Selected: {selectedCount}</div>
                <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={() => initiateBulkAction('enable')} disabled={isProcessingBulk || !canEnableSelected} className="w-full md:w-auto text-xs md:text-sm">
                        Enable Selected ({selectedCount})
                      </Button>
                    </TooltipTrigger>
                    {!canEnableSelected && (
                      <TooltipContent>
                        {selectedCount === 0 ? 'Select one or more classrooms to enable' : 'All selected classrooms are already enabled'}
                      </TooltipContent>
                    )}
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="destructive" onClick={() => initiateBulkAction('disable')} disabled={isProcessingBulk || !canDisableSelected} className="w-full md:w-auto text-xs md:text-sm">
                        Disable Selected ({selectedCount})
                      </Button>
                    </TooltipTrigger>
                    {!canDisableSelected && (
                      <TooltipContent>
                        {selectedCount === 0 ? 'Select one or more classrooms to disable' : 'All selected classrooms are already disabled'}
                      </TooltipContent>
                    )}
                  </Tooltip>

                  <Button variant="destructive" onClick={() => initiateBulkAction('delete')} disabled={isProcessingBulk} className="w-full md:w-auto text-xs md:text-sm">
                    Delete Selected ({selectedCount})
                  </Button>
                  <Button variant="outline" onClick={clearSelection} disabled={isProcessingBulk} className="w-full md:w-auto text-xs md:text-sm">Clear</Button>
                </div>
              </div>
            </ProcessingFieldset>
          )}
        </div>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input
                      type="checkbox"
                      aria-label="Select all classrooms"
                      onChange={(e) => {
                        const checked = e.target.checked;
                        const newMap: Record<string, boolean> = {};
                        filteredClassrooms.forEach(c => { newMap[c.id] = checked; });
                        setSelectedIds(newMap);
                      }}
                      checked={filteredClassrooms.length > 0 && filteredClassrooms.every(c => selectedIds[c.id])}
                      className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>Room Name</TableHead>
                  <TableHead>Building & Floor</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClassrooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                      No classrooms match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClassrooms.map((classroom) => (
                    <TableRow key={classroom.id}>
                      <TableCell>
                        <input type="checkbox" aria-label={`Select classroom ${classroom.id}`} checked={!!selectedIds[classroom.id]} onChange={(e) => toggleSelect(classroom.id, e.target.checked)} className="h-4 w-4 text-indigo-600 rounded border-gray-300" />
                      </TableCell>
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
        {/* Bulk Action Dialog */}
      <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
        <DialogContent className="max-h-[95vh] sm:max-h-[85vh] flex flex-col p-3 sm:p-6 w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] sm:max-w-[600px] gap-2 sm:gap-4">
          <DialogHeader>
            <DialogTitle>{bulkActionType === 'delete' ? 'Delete Selected Classrooms' : bulkActionType === 'disable' ? 'Disable Selected Classrooms' : 'Enable Selected Classrooms'}</DialogTitle>
            <DialogDescription>
              {`You are about to ${bulkActionType} ${Object.values(selectedIds).filter(Boolean).length} classroom(s).`}
              {bulkActionType === 'disable' && (
                <span> Provide an optional reason to include in notifications to affected faculty.</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-6">
            {(bulkActionType === 'disable' || bulkActionType === 'delete') && (
              <div className="space-y-4">
                <Label htmlFor="bulk-reason" className="mb-2 block">Reason (optional)</Label>
                <Textarea id="bulk-reason" value={bulkReason} onChange={(e) => setBulkReason(e.target.value)} rows={3} maxLength={300} />
                <p className="text-xs text-gray-500 mt-2">{bulkReason.length}/300</p>
              </div>
            )}
          </div>
          <DialogFooter className="pt-6">
            <Button variant="outline" onClick={() => setIsBulkDialogOpen(false)} disabled={isProcessingBulk}>Cancel</Button>
            <Button variant={bulkActionType === 'delete' || bulkActionType === 'disable' ? 'destructive' : undefined} onClick={confirmBulkAction} disabled={isProcessingBulk}>
              {isProcessingBulk ? (
                <span className="inline-flex items-center"><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Processing…</span>
              ) : (
                bulkActionType === 'delete' ? 'Delete' : bulkActionType === 'disable' ? 'Disable' : 'Enable'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px] p-6">
          <DialogHeader>
            <DialogTitle>Delete Classroom</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <b>{classroomToDelete?.name}</b>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button 
              variant="outline" 
              onClick={() => { setDeleteDialogOpen(false); setClassroomToDelete(null); }}
              disabled={deletingSimple}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteConfirm}
              disabled={deletingSimple}
            >
              {deletingSimple ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Delete Warning Dialog (shown when classroom has pending/approved reservations) */}
        <Dialog open={deleteWarningOpen} onOpenChange={setDeleteWarningOpen}>
    <DialogContent className="max-h-[95vh] sm:max-h-[85vh] flex flex-col p-3 sm:p-6 w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] sm:max-w-[600px] gap-2 sm:gap-4">
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
                  <ScrollableBulkList
                    items={affectedBookingsForDelete}
                    visibleCount={5}
                    maxScrollHeight="16rem"
                    renderItem={(booking) => (
                      <div className="p-3 border rounded-lg bg-gray-50 text-xs">
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
                            <p className="text-gray-500 text-xs truncate" title={booking.purpose}>{booking.purpose}</p>
                          </div>
                          <Badge variant={booking.status === 'approved' ? 'default' : 'secondary'}>
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    )}
                  />
                </div>
              )}

              {/* Affected Schedules */}
              {affectedSchedulesForDelete.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Confirmed Schedules ({affectedSchedulesForDelete.length})
                  </h4>
                  <ScrollableBulkList
                    items={affectedSchedulesForDelete}
                    visibleCount={5}
                    maxScrollHeight="16rem"
                    renderItem={(schedule) => (
                      <div className="p-3 border rounded-lg bg-gray-50 text-xs">
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
                            <p className="text-gray-500 text-xs truncate" title={schedule.purpose}>{schedule.purpose}</p>
                          </div>
                          <Badge variant="default">
                            {schedule.status}
                          </Badge>
                        </div>
                      </div>
                    )}
                  />
                </div>
              )}

              {/* Required Reason Field */}
              <div className="space-y-4 pt-6 border-t mt-6">
                <Label htmlFor="delete-reason" className="mb-2 block">
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
                  <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
                    <AlertCircle className="h-4 w-4" />
                    Reason is required to notify affected faculty
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {deleteReason.length}/200 characters
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mt-4">
                <p className="font-medium mb-1">What happens next?</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>All affected faculty members will receive an in-app notification</li>
                  <li>If push notifications are enabled, they'll also receive a push notification</li>
                  <li>They will be informed to contact admin about their reservations</li>
                  <li>The classroom will be removed from the inventory</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="mt-6">
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

        {/* Bulk Warning Dialog for selected classrooms */}
        <Dialog open={bulkWarningOpen} onOpenChange={setBulkWarningOpen}>
          <DialogContent className="max-h-[95vh] sm:max-h-[85vh] flex flex-col p-3 sm:p-6 w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] sm:max-w-[700px] gap-2 sm:gap-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Warning: Affected Reservations Found
              </DialogTitle>
              <DialogDescription>
                The selected classrooms have <b>{bulkWarningAffectedBookings.length + bulkWarningAffectedSchedules.length}</b> active or upcoming reservation(s). You must provide a reason which will be included in notifications to affected faculty.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {bulkWarningAffectedBookings.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4" />
                    Pending/Approved Booking Requests ({bulkWarningAffectedBookings.length})
                  </h4>
                  <ScrollableBulkList
                    items={bulkWarningAffectedBookings}
                    visibleCount={5}
                    maxScrollHeight="16rem"
                    ariaLabel="Affected booking requests"
                    renderItem={(booking: BookingRequest) => (
                      <div className="p-3 border rounded-lg bg-gray-50 text-sm">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{booking.facultyName}</p>
                            <p className="text-gray-600 text-xs">{new Date(booking.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            <p className="text-gray-600 flex items-center gap-1 text-xs"><Clock className="h-3 w-3" />{booking.startTime} - {booking.endTime}</p>
                            <p className="text-gray-500 text-xs truncate" title={booking.purpose}>{booking.purpose}</p>
                          </div>
                          <Badge variant={booking.status === 'approved' ? 'default' : 'secondary'}>{booking.status}</Badge>
                        </div>
                      </div>
                    )}
                  />
                </div>
              )}

              {bulkWarningAffectedSchedules.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-2"><Calendar className="h-4 w-4" />Confirmed Schedules ({bulkWarningAffectedSchedules.length})</h4>
                  <ScrollableBulkList
                    items={bulkWarningAffectedSchedules}
                    visibleCount={5}
                    maxScrollHeight="16rem"
                    ariaLabel="Affected schedules"
                    renderItem={(schedule: Schedule) => (
                      <div className="p-3 border rounded-lg bg-gray-50 text-sm">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{schedule.facultyName}</p>
                            <p className="text-gray-600 text-xs">{new Date(schedule.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            <p className="text-gray-600 flex items-center gap-1 text-xs"><Clock className="h-3 w-3" />{schedule.startTime} - {schedule.endTime}</p>
                            <p className="text-gray-500 text-xs truncate" title={schedule.purpose}>{schedule.purpose}</p>
                          </div>
                          <Badge variant="default">{schedule.status}</Badge>
                        </div>
                      </div>
                    )}
                  />
                </div>
              )}

              <div className="space-y-4 pt-6 border-t mt-6">
                <Label htmlFor="bulk-warning-reason" className="mb-2 block">Reason *</Label>
                <Textarea id="bulk-warning-reason" placeholder="Provide a clear reason that will be included in notifications to affected faculty" value={bulkWarningReason} onChange={(e) => setBulkWarningReason(e.target.value)} rows={3} maxLength={300} />
                {!bulkWarningReason.trim() && <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
                  <AlertCircle className="h-4 w-4" />
                  A reason is required to notify affected faculty
                </p>}
                <p className="text-xs text-gray-500 mt-2">{bulkWarningReason.length}/300</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mt-4">
                <p className="font-medium mb-1">What happens next?</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>All affected faculty members will receive an in-app notification</li>
                  <li>If push notifications are enabled, they'll also receive a push notification</li>
                  <li>They will be informed to contact admin about their reservations</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => { setBulkWarningOpen(false); pendingBulkIdsRef.current = null; }} disabled={bulkConfirming}>Cancel</Button>
              <Button variant="destructive" onClick={() => executePendingBulkAction(bulkWarningReason)} disabled={!bulkWarningReason.trim() || bulkConfirming}>{bulkConfirming ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Processing...</>) : (bulkActionType === 'delete' ? 'Delete & Notify' : 'Disable & Notify')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      {/* Disable Classroom Warning Dialog */}
      <Dialog open={disableWarningOpen} onOpenChange={setDisableWarningOpen}>
  <DialogContent className="max-h-[95vh] sm:max-h-[85vh] flex flex-col p-3 sm:p-6 w-[calc(100vw-20px)] max-w-[calc(100vw-20px)] sm:max-w-[600px] gap-2 sm:gap-4">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-amber-600 text-xs sm:text-base">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              Warning: Active Reservations
            </DialogTitle>
            <DialogDescription>
              This classroom has <b>{affectedBookings.length + affectedSchedules.length}</b> active or upcoming reservation(s). 
              Disabling it will affect the following:
            </DialogDescription>
          </DialogHeader>
          
            <div className="space-y-4">
            {/* Affected Bookings */}
            {affectedBookings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Pending/Approved Booking Requests ({affectedBookings.length})
                </h4>
                <ScrollableBulkList
                  items={affectedBookings}
                  visibleCount={5}
                  maxScrollHeight="16rem"
                  ariaLabel="Affected booking requests for single classroom"
                  renderItem={(booking: BookingRequest) => (
                    <div className="p-3 border rounded-lg bg-gray-50 text-sm">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{booking.facultyName}</p>
                          <p className="text-gray-600 text-xs">
                            {new Date(booking.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-gray-600 flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            {booking.startTime} - {booking.endTime}
                          </p>
                          <p className="text-gray-500 text-xs truncate" title={booking.purpose}>{booking.purpose}</p>
                        </div>
                        <Badge variant={booking.status === 'approved' ? 'default' : 'secondary'}>
                          {booking.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                />
              </div>
            )}

            {/* Affected Schedules */}
            {affectedSchedules.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Confirmed Schedules ({affectedSchedules.length})
                </h4>
                <ScrollableBulkList
                  items={affectedSchedules}
                  visibleCount={5}
                  maxScrollHeight="16rem"
                  ariaLabel="Affected schedules for single classroom"
                  renderItem={(schedule: Schedule) => (
                    <div className="p-3 border rounded-lg bg-gray-50 text-sm">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{schedule.facultyName}</p>
                          <p className="text-gray-600 text-xs">
                            {new Date(schedule.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-gray-600 flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3" />
                            {schedule.startTime} - {schedule.endTime}
                          </p>
                          <p className="text-gray-500 text-xs truncate" title={schedule.purpose}>{schedule.purpose}</p>
                        </div>
                        <Badge variant="default">
                          {schedule.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                />
              </div>
            )}

            {/* Required Reason Field */}
            <div className="space-y-4 pt-6 border-t mt-6">
              <Label htmlFor="disable-reason" className="mb-2 block">
                Reason for disabling *
                <span className="text-sm text-gray-500 font-normal ml-2">
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
                <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
                  <AlertCircle className="h-4 w-4" />
                  Reason is required to notify affected faculty
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                {disableReason.length}/200 characters
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 mt-4">
              <p className="font-medium mb-1">What happens next?</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>All affected faculty members will receive an in-app notification</li>
                <li>If push notifications are enabled, they'll also receive a push notification</li>
                <li>They will be informed to contact admin about their reservations</li>
                <li>The classroom will be marked as unavailable for new bookings</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="mt-6">
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
      {/* Bulk progress dialog for long-running delete operations */}
      <BulkOperationLoader
        open={showBulkProgress}
        onOpenChange={setShowBulkProgress}
        items={lastDeleteItems}
        processed={bulkRunner.processed}
        total={bulkRunner.total}
        results={bulkRunner.results}
        running={bulkRunner.running}
        title="Bulk Classroom Deletion"
        operationType="Deleting"
        successMessage="{count} classroom(s) deleted successfully"
        failureMessage="{count} classroom(s) failed to delete"
        showErrorDetails={true}
        preventCloseWhileRunning={true}
        onCancel={() => {
          bulkRunner.cancel();
          toast('Bulk delete cancelled.');
          setShowBulkProgress(false);
        }}
        onRetry={async () => {
          // Build retry tasks from failed indices
          const currentResults = bulkRunner.results || [];
          const failedIndices = currentResults.map((r, i) => (r?.status === 'rejected' ? i : -1)).filter(i => i >= 0);
          if (failedIndices.length === 0) return;
          const failedIds = failedIndices.map(i => lastDeleteItems[i].id);
          const retryTasks: BulkTask[] = failedIds.map(id => async () => {
            try {
              await classroomService.deleteCascade(id);
              return { id, ok: true };
            } catch (err) {
              await classroomService.delete(id);
              return { id, ok: true };
            }
          });

          bulkRunner.retry();
          setShowBulkProgress(true);
          const results = await bulkRunner.start(retryTasks, 4, (p: number, t: number) => setBulkProgress({ processed: p, total: t }));
          const updated = await classroomService.getAll();
          onClassroomUpdate(updated);
          const succeeded = results.filter((r: any) => r.status === 'fulfilled').length;
          const failed = results.filter((r: any) => r.status === 'rejected').length;
          if (succeeded > 0) toast.success(`Deleted ${succeeded} classroom(s)`);
          if (failed > 0) toast.error(`${failed} delete(s) failed`);
        }}
      />
    </div>
  );
}