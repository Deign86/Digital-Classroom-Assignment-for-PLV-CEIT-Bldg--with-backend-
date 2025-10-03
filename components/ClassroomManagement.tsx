import React, { useState } from 'react';
import { classroomService as secureClassroomService } from '../lib/secureFirebaseService';
import { validateForm, sanitizeInput } from '../utils/validation';
import { ErrorLogger, SecureError } from '../utils/errorHandling';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Plus, Edit, Trash2, Users, MapPin, Wifi, Projector, Monitor, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import type { Classroom, User } from '../App';

interface ClassroomManagementProps {
  classrooms: Classroom[];
  onClassroomUpdate: (classrooms: Classroom[]) => void;
  user: User | null;
}

const equipmentIcons: { [key: string]: React.ReactNode } = {
  'Projector': <Projector className="h-4 w-4" />,
  'Computer': <Monitor className="h-4 w-4" />,
  'Computers': <Monitor className="h-4 w-4" />,
  'WiFi': <Wifi className="h-4 w-4" />,
  'Whiteboard': <Edit className="h-4 w-4" />,
  'TV': <Monitor className="h-4 w-4" />,
};

export default function ClassroomManagement({ classrooms, onClassroomUpdate, user }: ClassroomManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    equipment: '',
    building: '',
    floor: '1',
    isAvailable: true
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      capacity: '',
      equipment: '',
      building: '',
      floor: '1',
      isAvailable: true
    });
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormErrors({});

    try {
      // Client-side validation
      const validation = validateForm.classroom({
        name: formData.name,
        capacity: formData.capacity,
        building: formData.building,
        floor: formData.floor,
        equipment: formData.equipment,
      });

      if (!validation.isValid) {
        setFormErrors(validation.errors);
        setIsSubmitting(false);
        return;
      }

      // Sanitize input
      const sanitizedData = {
        name: sanitizeInput.name(formData.name),
        capacity: parseInt(sanitizeInput.number(formData.capacity), 10),
        equipment: formData.equipment
          .split(',')
          .map(eq => sanitizeInput.equipment(eq.trim()))
          .filter(eq => eq.length > 0),
        building: sanitizeInput.name(formData.building),
        floor: parseInt(sanitizeInput.number(formData.floor), 10),
        isAvailable: Boolean(formData.isAvailable)
      };

      if (editingClassroom) {
        await secureClassroomService.update(user, editingClassroom.id, sanitizedData);
        toast.success('Classroom updated successfully', {
          description: `${sanitizedData.name} has been updated`
        });
      } else {
        await secureClassroomService.create(user, sanitizedData);
        toast.success('Classroom added successfully', {
          description: `${sanitizedData.name} is now available for booking`
        });
      }

      // Refresh classroom list
      const updatedClassrooms = await secureClassroomService.getAll(user);
      onClassroomUpdate(updatedClassrooms);
      resetForm();
      setIsAddDialogOpen(false);
      setEditingClassroom(null);
    } catch (error) {
      ErrorLogger.logError(error as Error, 'Classroom management');
      
      if (error instanceof SecureError) {
        toast.error('Validation Error', {
          description: error.userMessage
        });
      } else {
        toast.error('Operation Failed', {
          description: 'Unable to save classroom. Please try again.'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setFormData({
      name: classroom.name,
      capacity: classroom.capacity.toString(),
      equipment: classroom.equipment.join(', '),
      building: classroom.building,
      floor: classroom.floor.toString(),
      isAvailable: classroom.isAvailable
    });
    setIsAddDialogOpen(true);
  };

  const handleDeleteClick = (classroom: Classroom) => {
    setClassroomToDelete(classroom);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!classroomToDelete) return;
    
    try {
      await secureClassroomService.delete(user, classroomToDelete.id);
      const updatedClassrooms = await secureClassroomService.getAll(user);
      onClassroomUpdate(updatedClassrooms);
      toast.success('Classroom deleted successfully', {
        description: `${classroomToDelete.name} has been removed from the system`
      });
    } catch (error) {
      ErrorLogger.logError(error as Error, 'Delete classroom');
      
      if (error instanceof SecureError) {
        toast.error('Delete Failed', {
          description: error.userMessage
        });
      } else {
        toast.error('Operation Failed', {
          description: 'Unable to delete classroom. Please try again.'
        });
      }
    }
    
    setDeleteDialogOpen(false);
    setClassroomToDelete(null);
  };

  const handleAvailabilityToggle = async (classroomId: string, isAvailable: boolean) => {
    try {
      await secureClassroomService.update(user, classroomId, { isAvailable });
      const updatedClassrooms = await secureClassroomService.getAll(user);
      onClassroomUpdate(updatedClassrooms);
      toast.success(`Classroom ${isAvailable ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      ErrorLogger.logError(error as Error, 'Update classroom availability');
      
      if (error instanceof SecureError) {
        toast.error('Update Failed', {
          description: error.userMessage
        });
      } else {
        toast.error('Operation Failed', {
          description: 'Unable to update classroom availability.'
        });
      }
    }
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Classroom Management</CardTitle>
              <CardDescription>Manage CEIT classroom inventory and availability</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
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
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className={formErrors.name ? 'border-red-500' : ''}
                      required
                    />
                    {formErrors.name && (
                      <div className="flex items-center text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {formErrors.name}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity *</Label>
                      <Input
                        id="capacity"
                        type="number"
                        placeholder="50"
                        min="1"
                        max="9999"
                        value={formData.capacity}
                        onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                        className={formErrors.capacity ? 'border-red-500' : ''}
                        required
                      />
                      {formErrors.capacity && (
                        <div className="flex items-center text-red-600 text-sm">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {formErrors.capacity}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="floor">Floor *</Label>
                      <Select value={formData.floor} onValueChange={(value: string) => setFormData(prev => ({ ...prev, floor: value }))}>
                        <SelectTrigger className={formErrors.floor ? 'border-red-500' : ''}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1st Floor</SelectItem>
                          <SelectItem value="2">2nd Floor</SelectItem>
                          <SelectItem value="3">3rd Floor</SelectItem>
                          <SelectItem value="4">4th Floor</SelectItem>
                          <SelectItem value="5">5th Floor</SelectItem>
                        </SelectContent>
                      </Select>
                      {formErrors.floor && (
                        <div className="flex items-center text-red-600 text-sm">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {formErrors.floor}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="building">Building *</Label>
                    <Input
                      id="building"
                      placeholder="e.g., CEIT Building"
                      value={formData.building}
                      onChange={(e) => setFormData(prev => ({ ...prev, building: e.target.value }))}
                      className={formErrors.building ? 'border-red-500' : ''}
                      required
                    />
                    {formErrors.building && (
                      <div className="flex items-center text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {formErrors.building}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equipment">Equipment</Label>
                    <Textarea
                      id="equipment"
                      placeholder="e.g., Projector, Whiteboard, AC (separate with commas)"
                      value={formData.equipment}
                      onChange={(e) => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
                      className={formErrors.equipment ? 'border-red-500' : ''}
                      rows={3}
                    />
                    {formErrors.equipment && (
                      <div className="flex items-center text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4 mr-1" />
                        {formErrors.equipment}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="available"
                      checked={formData.isAvailable}
                      onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="available">Available for booking</Label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={closeDialog} disabled={isSubmitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting 
                        ? (editingClassroom ? 'Updating...' : 'Adding...') 
                        : (editingClassroom ? 'Update Classroom' : 'Add Classroom')
                      }
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
                                {equipmentIcons[eq] && <span>{equipmentIcons[eq]}</span>}
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
                            onCheckedChange={(checked: boolean) => handleAvailabilityToggle(classroom.id, checked)}
                          />
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
    </div>
  );
}