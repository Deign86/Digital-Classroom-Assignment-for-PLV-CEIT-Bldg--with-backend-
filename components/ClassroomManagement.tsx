import React, { useState } from 'react';
import { classroomService } from '../lib/firebaseService';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch'; // Assuming you have a Checkbox component
import { Checkbox } from './ui/checkbox';
import { Plus, Edit, Trash2, Users, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import equipmentIcons, { getIconForEquipment, getPhosphorIcon } from '../lib/equipmentIcons';
import { toast } from 'sonner';
import type { Classroom } from '../App';

interface ClassroomManagementProps {
  classrooms: Classroom[];
  onClassroomUpdate: (classrooms: Classroom[]) => void;
  onCreateClassroom?: (data: Omit<Classroom, 'id'>) => Promise<any> | void;
  onUpdateClassroom?: (id: string, data: Partial<Classroom>) => Promise<any> | void;
  onDeleteClassroom?: (id: string) => Promise<any> | void;
  onToggleAvailability?: (id: string, isAvailable: boolean) => Promise<any> | void;
}

// Use shared equipmentIcons and helpers from lib/equipmentIcons

const allEquipment = [
  // Equipment with icons first
  'Projector', 'WiFi', 'TV', 'Computers',
  // Other common equipment
  'Whiteboard', 'Air Conditioner', 'Podium', 'Speakers'
].sort((a, b) => {
  if (equipmentIcons[a] && !equipmentIcons[b]) return -1;
  if (!equipmentIcons[a] && equipmentIcons[b]) return 1;
  return a.localeCompare(b);
});
export default function ClassroomManagement({ classrooms, onClassroomUpdate, onCreateClassroom, onUpdateClassroom, onDeleteClassroom, onToggleAvailability }: ClassroomManagementProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    capacity: '',
    equipment: '',
    selectedEquipment: [] as string[],
    building: '',
    floor: '1',
    isAvailable: true
  });
  const [errors, setErrors] = useState({
    name: '',
    capacity: '',
    building: '',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [processingClassroomId, setProcessingClassroomId] = useState<string | null>(null);

  const resetForm = () => {
    setFormData({
      name: '',
      capacity: '',
      equipment: '',
      selectedEquipment: [],
      building: '',
      floor: '1',
      isAvailable: true
    });
    setErrors({ name: '', capacity: '', building: '' });
  };

  const validateForm = () => {
    const newErrors = { name: '', capacity: '', building: '' };
    let isValid = true;
    if (!formData.name.trim()) {
      newErrors.name = 'Room name is required.';
      isValid = false;
    }
    if (!formData.capacity.trim() || parseInt(formData.capacity) <= 0) {
      newErrors.capacity = 'A valid capacity is required.';
      isValid = false;
    }
    if (!formData.building.trim()) {
      newErrors.building = 'Building name is required.';
      isValid = false;
    }
    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Please correct the errors before submitting.');
      return;
    }
    setIsSaving(true);
    try {
      if (editingClassroom) {
        const updatePayload: Partial<Classroom> = {
          name: formData.name,
          capacity: parseInt(formData.capacity),
          equipment: formData.selectedEquipment,
          building: formData.building,
          floor: parseInt(formData.floor),
          isAvailable: formData.isAvailable
        };
        // Prefer parent handler when provided
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        if (typeof onUpdateClassroom === 'function') {
          const res: any = await onUpdateClassroom(editingClassroom.id, updatePayload);
          if (res && Array.isArray(res)) {
            onClassroomUpdate(res as Classroom[]);
          }
        } else {
          await classroomService.update(editingClassroom.id, updatePayload as any);
        }
        toast.success('Classroom updated successfully');
      } else {
        const newClassroom: Omit<Classroom, 'id'> = {
          name: formData.name,
          capacity: parseInt(formData.capacity),
          equipment: formData.selectedEquipment,
          building: formData.building,
          floor: parseInt(formData.floor),
          isAvailable: formData.isAvailable
        };
        if (typeof onCreateClassroom === 'function') {
          const res: any = await onCreateClassroom(newClassroom);
          if (res && Array.isArray(res)) {
            onClassroomUpdate(res as Classroom[]);
          }
        } else {
          await classroomService.create(newClassroom);
        }
        toast.success('Classroom added successfully');
      }
      // Refresh list if parent didn't provide updated list
      try {
        const updatedClassrooms = await classroomService.getAll();
        onClassroomUpdate(updatedClassrooms);
      } catch (e) {
        // If parent handler already provided update, this may be unnecessary; ignore errors here
      }
      resetForm();
      setIsAddDialogOpen(false);
      setEditingClassroom(null);
    } catch (err) {
      console.error('Error saving classroom', err);
      toast.error('Error saving classroom');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (classroom: Classroom) => {
    setEditingClassroom(classroom);
    setFormData({
      name: classroom.name,
      capacity: classroom.capacity.toString(),
      equipment: '', // This is now unused for input
      selectedEquipment: classroom.equipment,
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
    setIsDeleting(true);
    setProcessingClassroomId(classroomToDelete.id);
    try {
      if (typeof onDeleteClassroom === 'function') {
        const res: any = await onDeleteClassroom(classroomToDelete.id);
        if (res && Array.isArray(res)) {
          onClassroomUpdate(res as Classroom[]);
        }
      } else {
        const result = await classroomService.deleteCascade(classroomToDelete.id);
        const updatedClassrooms = await classroomService.getAll();
        onClassroomUpdate(updatedClassrooms);
        toast.success(`Classroom deleted. ${result.deletedRelated ?? 0} related future reservation(s)/schedules removed.`);
      }
      setDeleteDialogOpen(false);
      setClassroomToDelete(null);
    } catch (err) {
      console.error('Error deleting classroom (cascade):', err);
      toast.error('Error deleting classroom. See console for details.');
    } finally {
      setIsDeleting(false);
      setProcessingClassroomId(null);
    }
  };

  const handleAvailabilityToggle = async (classroomId: string, isAvailable: boolean) => {
    setProcessingClassroomId(classroomId);
    try {
      if (typeof onToggleAvailability === 'function') {
        const res: any = await onToggleAvailability(classroomId, isAvailable);
        if (res && Array.isArray(res)) {
          onClassroomUpdate(res as Classroom[]);
        }
      } else {
        await classroomService.update(classroomId, { isAvailable });
        const updatedClassrooms = await classroomService.getAll();
        onClassroomUpdate(updatedClassrooms);
      }
      toast.success(`Classroom ${isAvailable ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      console.error('Error updating availability', err);
      toast.error('Error updating availability');
    } finally {
      setProcessingClassroomId(null);
    }
  };

  const closeDialog = () => {
    if (isSaving) return;
    setIsAddDialogOpen(false);
    setEditingClassroom(null);
    resetForm();
  };

  return (
    <div className="space-y-6 pr-4 sm:pr-0">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Classroom Management</CardTitle>
              <CardDescription>Manage CEIT classroom inventory and availability</CardDescription>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={(v) => { if (isSaving) return; setIsAddDialogOpen(v); if (!v) { setEditingClassroom(null); resetForm(); } }}>
              <DialogTrigger asChild>
                <Button variant="solid">
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
                        setFormData(prev => ({ ...prev, name: e.target.value }));
                        if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                      }}
                      className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity *</Label>
                      <Input
                        id="capacity"
                        type="number"
                        placeholder="e.g., 45"
                        min="1"
                        value={formData.capacity}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, capacity: e.target.value }));
                          if (errors.capacity) setErrors(prev => ({ ...prev, capacity: '' }));
                        }}
                        className={errors.capacity ? 'border-red-500' : ''}
                      />
                      {errors.capacity && (
                        <p className="text-sm text-red-600 flex items-center gap-1 mt-1 whitespace-nowrap">
                          <AlertCircle className="h-3 w-3" />
                          {errors.capacity}
                        </p>
                      )}
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
                        setFormData(prev => ({ ...prev, building: e.target.value }));
                        if (errors.building) setErrors(prev => ({ ...prev, building: '' }));
                      }}
                      className={errors.building ? 'border-red-500' : ''}
                    />
                    {errors.building && (
                      <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.building}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="equipment">Equipment</Label>
                    <div className="grid grid-cols-2 gap-2 rounded-md border p-4">
                      {allEquipment.map(eq => (
                        <div key={eq} className="flex items-center space-x-2">
                          <Checkbox
                            id={`eq-${eq}`}
                            checked={formData.selectedEquipment.includes(eq)}
                            onCheckedChange={(checked) => {
                              setFormData(prev => ({
                                ...prev,
                                selectedEquipment: checked
                                  ? [...prev.selectedEquipment, eq]
                                  : prev.selectedEquipment.filter(item => item !== eq)
                              }));
                            }}
                          />
                          <label htmlFor={`eq-${eq}`} className="flex items-center space-x-2 cursor-pointer text-sm font-normal">
                            {getIconForEquipment(eq) && <span className="text-gray-600">{getIconForEquipment(eq)}</span>}
                            <span>{eq}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="available"
                      checked={formData.isAvailable}
                      onCheckedChange={(checked: boolean) => setFormData(prev => ({ ...prev, isAvailable: checked }))}
                    />
                    <Label htmlFor="available">Available for reservation</Label>
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={closeDialog} disabled={isSaving}>
                      {isSaving ? 'Processing…' : 'Cancel'}
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <span className="inline-flex items-center">
                          <Loader2 className="h-4 w-4 mr-2 text-gray-500 animate-spin" />
                          <span className="sr-only">Saving classroom</span>
                        </span>
                      ) : (editingClassroom ? 'Update Classroom' : 'Add Classroom')}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border pr-6 sm:pr-0">
            {/* Desktop/tablet: show table on sm+ */}
            <div className="hidden sm:block">
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
                                  {getIconForEquipment(eq) && <span>{getIconForEquipment(eq)}</span>}
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
                              disabled={processingClassroomId === classroom.id}
                            />
                            {processingClassroomId === classroom.id && (
                              <span className="inline-flex items-center">
                                <Loader2 className="h-4 w-4 ml-2 text-gray-500 animate-spin" />
                                <span className="sr-only">Updating availability for {classroom.name}</span>
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
                              disabled={processingClassroomId === classroom.id || isSaving || isDeleting}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(classroom)}
                              disabled={processingClassroomId === classroom.id || isSaving || isDeleting}
                            >
                              {processingClassroomId === classroom.id && isDeleting ? (
                                <span className="inline-flex items-center">
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  <span className="sr-only">Deleting {classroom.name}</span>
                                </span>
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile: stack as cards */}
            <div className="sm:hidden space-y-4 p-2 pr-6">
              {classrooms.length === 0 ? (
                <div className="text-center py-6 text-gray-500">No classrooms added yet</div>
              ) : (
                classrooms.map((classroom) => (
                  <Card key={classroom.id} className="border">
                    <CardContent>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="text-lg font-medium">{classroom.name}</div>
                            <Badge variant="secondary" className="text-xs">{classroom.isAvailable ? 'Available' : 'Disabled'}</Badge>
                          </div>
                          <div className="text-sm text-gray-500 mt-1">{classroom.building}, {classroom.floor}F • {classroom.capacity} seats</div>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {classroom.equipment.length === 0 ? (
                              <span className="text-gray-400 text-sm">None</span>
                            ) : (
                              classroom.equipment.map((eq, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {eq}
                                </Badge>
                              ))
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div>
                            <Switch checked={classroom.isAvailable} onCheckedChange={(v: boolean) => handleAvailabilityToggle(classroom.id, v)} disabled={processingClassroomId === classroom.id} />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleEdit(classroom)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteClick(classroom)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {classrooms.length > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              Total: {classrooms.length} classrooms • Available: {classrooms.filter(c => c.isAvailable).length}
            </div>
          )}
        </CardContent>
      </Card>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={(v) => { if (isDeleting) return; setDeleteDialogOpen(v); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Classroom</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <b>{classroomToDelete?.name}</b>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => { if (isDeleting) return; setDeleteDialogOpen(false); setClassroomToDelete(null); }} disabled={isDeleting}>
              {isDeleting ? 'Processing…' : 'Cancel'}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}