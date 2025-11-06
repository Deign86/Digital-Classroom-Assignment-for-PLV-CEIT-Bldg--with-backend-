import React, { useState } from 'react';
import { classroomService } from '../lib/firebaseService';
import { executeWithNetworkHandling } from '../lib/networkErrorHandler';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Switch } from './ui/switch';
import { Plus, Edit, Trash2, Users, MapPin, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';
import type { Classroom } from '../App';
import { getIconForEquipment } from '../lib/equipmentIcons';

interface ClassroomManagementProps {
  classrooms: Classroom[];
  onClassroomUpdate: (classrooms: Classroom[]) => void;
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [classroomToDelete, setClassroomToDelete] = useState<Classroom | null>(null);
  const [loadingRows, setLoadingRows] = useState<Record<string, boolean>>({});

  const resetForm = () => {
    setFormData({
      name: '',
      capacity: '',
      equipment: [],
      building: '',
      floor: '1',
      isAvailable: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.capacity || !formData.building) {
      toast.error('Please fill in all required fields');
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

  const handleDeleteClick = (classroom: Classroom) => {
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

  const handleAvailabilityToggle = async (classroomId: string, isAvailable: boolean) => {
    // show per-row loader while updating
    setLoadingRows(prev => ({ ...prev, [classroomId]: true }));
    
    const result = await executeWithNetworkHandling(
      async () => {
        await classroomService.update(classroomId, { isAvailable });
        const updatedClassrooms = await classroomService.getAll();
        onClassroomUpdate(updatedClassrooms);
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
      toast.success(`Classroom ${result.data?.isAvailable ? 'enabled' : 'disabled'} successfully`);
    } else if (!result.success && !result.isNetworkError) {
      toast.error('Error updating availability');
    }
    
    setLoadingRows(prev => {
      const copy = { ...prev };
      delete copy[classroomId];
      return copy;
    });
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
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity *</Label>
                      <Input
                        id="capacity"
                        type="number"
                        placeholder="50"
                        min="1"
                        value={formData.capacity}
                        onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value }))}
                        required
                      />
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
                      onChange={(e) => setFormData(prev => ({ ...prev, building: e.target.value }))}
                      required
                    />
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
                    <Button type="submit">
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
    </div>
  );
}