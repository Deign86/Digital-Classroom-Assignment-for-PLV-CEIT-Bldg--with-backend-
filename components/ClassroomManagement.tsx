import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, MapPin, Users, AlertCircle, X, AlertTriangle } from 'lucide-react';
import { Classroom, classroomService } from '../lib/firebaseService';
import { sanitizeText } from '../utils/inputValidation';
import { getIconForEquipment } from '../lib/equipmentIcons';
import { executeWithNetworkHandling } from '../lib/networkErrorHandler';

const EQUIPMENT_OPTIONS = [
  'Projector',
  'Whiteboard',
  'Smart TV',
  'Audio System',
  'Computer',
  'Air Conditioning',
  'Microphone'
];

const LIMITS = {
  ROOM_NAME: 50,
  CAPACITY_MIN: 1,
  CAPACITY_MAX: 200,
};

const DEFAULT_BUILDING = 'CEIT Building';

// Validation error messages
interface ValidationErrors {
  name?: string;
  capacity?: string;
}

export default function ClassroomManagement() {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
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
  // Delete-warning dialog state (shows when classroom has pending/approved reservations)
  const [deleteWarningOpen, setDeleteWarningOpen] = useState(false);
  const [deleteWarningData, setDeleteWarningData] = useState<{
    classroom: Classroom;
    reservationCount: number;
  } | null>(null);

  useEffect(() => {
    loadClassrooms();
  }, []);

  const loadClassrooms = async () => {
    try {
      const data = await executeWithNetworkHandling(
        async () => await classroomService.getAll(),
        'Loading classrooms'
      );
      if (data) {
        setClassrooms(data);
      }
    } catch (error) {
      console.error('Error loading classrooms:', error);
      toast.error('Failed to load classrooms');
    } finally {
      setLoading(false);
    }
  };

  // Validation function for room name
  const validateRoomName = (name: string): string | undefined => {
    const sanitized = sanitizeText(name, LIMITS.ROOM_NAME);
    if (!sanitized.trim()) {
      return 'Classroom name is required';
    }
    if (sanitized.length > LIMITS.ROOM_NAME) {
      return `Name must be ${LIMITS.ROOM_NAME} characters or less`;
    }
    return undefined;
  };

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
    
    const result = await executeWithNetworkHandling(
      async () => {
        if (editingClassroom) {
          await classroomService.update(editingClassroom.id, {
            ...formData,
            capacity: parseInt(formData.capacity),
            floor: parseInt(formData.floor)
          });
        } else {
          await classroomService.create({
            ...formData,
            capacity: parseInt(formData.capacity),
            floor: parseInt(formData.floor)
          });
        }
      },
      editingClassroom ? 'Updating classroom' : 'Creating classroom'
    );

    if (result.success) {
      toast.success(editingClassroom ? 'Classroom updated successfully' : 'Classroom added successfully');
      closeDialog();
      loadClassrooms();
    }
  };

  const handleEdit = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setFormData({
      name: classroom.name,
      capacity: classroom.capacity.toString(),
      equipment: classroom.equipment,
      building: DEFAULT_BUILDING,
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

  /**
   * Main delete handler.
   * 1. Check if classroom has pending/approved reservations via checkClassroomUsage.
   * 2. If has reservations: show warning dialog (allows disabling classroom).
   * 3. If no reservations: show confirmation dialog for permanent deletion.
   */
  const handleDelete = async (classroom: Classroom) => {
    const usageInfo = await executeWithNetworkHandling(
      async () => await classroomService.checkClassroomUsage(classroom.id),
      'Checking classroom usage'
    );

    if (!usageInfo) {
      // Network error occurred, executeWithNetworkHandling already showed toast
      return;
    }

    if (usageInfo.hasPendingOrApprovedReservations) {
      // Show warning dialog: classroom has reservations
      setDeleteWarningData({
        classroom,
        reservationCount: usageInfo.pendingApprovedCount
      });
      setDeleteWarningOpen(true);
    } else {
      // No reservations: proceed with normal confirmation dialog
      setClassroomToDelete(classroom);
      setDeleteDialogOpen(true);
    }
  };

  /**
   * Handler for final "Delete" in the confirmation dialog (no reservations present).
   */
  const confirmDelete = async () => {
    if (!classroomToDelete) return;

    const result = await executeWithNetworkHandling(
      async () => await classroomService.delete(classroomToDelete.id),
      'Deleting classroom'
    );

    if (result.success) {
      toast.success('Classroom deleted successfully');
      setDeleteDialogOpen(false);
      setClassroomToDelete(null);
      loadClassrooms();
    }
  };

  /**
   * Handler for "Disable Classroom" button in the warning dialog.
   * This just sets isAvailable to false instead of deleting.
   */
  const handleDisableClassroom = async () => {
    if (!deleteWarningData) return;

    const result = await executeWithNetworkHandling(
      async () => await classroomService.update(deleteWarningData.classroom.id, {
        isAvailable: false
      }),
      'Disabling classroom'
    );

    if (result.success) {
      toast.success('Classroom disabled successfully');
      setDeleteWarningOpen(false);
      setDeleteWarningData(null);
      loadClassrooms();
    }
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setEditingClassroom(null);
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

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">Loading classrooms...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Classroom Management</CardTitle>
              <CardDescription>Add, edit, and manage classroom information</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              if (!open) closeDialog();
              setIsAddDialogOpen(open);
            }}>
              <Button onClick={() => setIsAddDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Classroom
              </Button>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingClassroom ? 'Edit Classroom' : 'Add New Classroom'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Classroom Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Room 101"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, name: e.target.value }));
                        if (validationErrors.name) {
                          setValidationErrors(prev => ({ ...prev, name: undefined }));
                        }
                      }}
                      onBlur={(e) => {
                        const sanitized = sanitizeText(e.target.value, LIMITS.ROOM_NAME);
                        setFormData(prev => ({ ...prev, name: sanitized }));
                        setValidationErrors(prev => ({ ...prev, name: validateRoomName(sanitized) }));
                      }}
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
                        placeholder="e.g., 40"
                        value={formData.capacity}
                        min={LIMITS.CAPACITY_MIN}
                        max={LIMITS.CAPACITY_MAX}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, capacity: e.target.value }));
                          if (validationErrors.capacity) {
                            setValidationErrors(prev => ({ ...prev, capacity: undefined }));
                          }
                        }}
                        onBlur={(e) => {
                          setValidationErrors(prev => ({ ...prev, capacity: validateCapacity(e.target.value) }));
                        }}
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
                        Range: {LIMITS.CAPACITY_MIN}–{LIMITS.CAPACITY_MAX}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="floor">Floor</Label>
                      <Select value={formData.floor} onValueChange={(value) => setFormData(prev => ({ ...prev, floor: value }))}>
                        <SelectTrigger id="floor">
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
                    {formData.equipment.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {formData.equipment.map((eq) => (
                          <div
                            key={eq}
                            className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-sm"
                          >
                            {getIconForEquipment(eq)}
                            <span>{eq}</span>
                            <button
                              type="button"
                              onClick={() => toggleEquipment(eq)}
                              className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="available"
                      checked={formData.isAvailable}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
                    />
                    <Label htmlFor="available">Classroom is available for booking</Label>
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
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classrooms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No classrooms available. Add one to get started.
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
                            <span className="text-sm text-muted-foreground">None</span>
                          ) : (
                            classroom.equipment.map((eq) => (
                              <span
                                key={eq}
                                className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs"
                              >
                                {getIconForEquipment(eq)}
                                {eq}
                              </span>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            classroom.isAvailable
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {classroom.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(classroom)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(classroom)}
                            className="text-red-600 hover:text-red-700"
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
        </CardContent>
      </Card>

      {/* Standard confirmation dialog (no reservations) */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the classroom "{classroomToDelete?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning dialog (classroom has pending/approved reservations) */}
      <AlertDialog open={deleteWarningOpen} onOpenChange={setDeleteWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <AlertDialogTitle>Cannot Delete Classroom</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-2">
              <p>
                The classroom "{deleteWarningData?.classroom.name}" has{' '}
                <span className="font-semibold">
                  {deleteWarningData?.reservationCount} pending or approved reservation(s)
                </span>.
              </p>
              <p>
                You cannot permanently delete this classroom until all reservations are completed or rejected.
              </p>
              <p className="pt-2 font-medium">
                Would you like to <span className="underline">disable</span> this classroom instead?
                This will prevent new bookings while preserving existing reservations.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteWarningOpen(false);
              setDeleteWarningData(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDisableClassroom} className="bg-yellow-600 hover:bg-yellow-700">
              Disable Classroom
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}