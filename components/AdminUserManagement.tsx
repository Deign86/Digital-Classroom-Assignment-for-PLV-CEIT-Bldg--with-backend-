import React, { useMemo, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { MoreHorizontal, Trash2, User, UserMinus, UserPlus, Lock, Unlock } from 'lucide-react';
import type { User as AppUser } from '../App';

interface AdminUserManagementProps {
  users?: AppUser[];
  onDisableUser?: (userId: string) => Promise<void>;
  onEnableUser?: (userId: string) => Promise<void>;
  onDeleteUser?: (userId: string, hard?: boolean) => Promise<void>;
  onChangeRole?: (userId: string, role: AppUser['role']) => Promise<void>;
  onUnlockAccount?: (userId: string) => Promise<void>;
}

export default function AdminUserManagement({ users = [], onDisableUser, onEnableUser, onDeleteUser, onChangeRole, onUnlockAccount }: AdminUserManagementProps) {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | AppUser['role']>('all');
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<AppUser | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isHardDelete, setIsHardDelete] = useState(false);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(u => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (!term) return true;
      return [u.name, u.email, u.department].filter(Boolean).some(v => v!.toLowerCase().includes(term));
    });
  }, [users, search, filterRole]);

  const startDelete = (user: AppUser) => {
    setSelectedUserToDelete(user);
    setConfirmText('');
    setIsHardDelete(false);
  };

  const doDelete = async () => {
    if (!selectedUserToDelete) return;
    if (confirmText.trim() !== selectedUserToDelete.email) {
      toast.error('Please type the user email to confirm deletion');
      return;
    }
    try {
      if (onDeleteUser) await onDeleteUser(selectedUserToDelete.id, isHardDelete);
      toast.success('User deletion started');
      setSelectedUserToDelete(null);
    } catch (err) {
      console.error('Delete user error', err);
      toast.error('Failed to delete user');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage user accounts, roles, and account actions (lock, disable, delete).</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-3 mb-4">
          {/* Search row: full width */}
            <div className="w-full">
            <Input aria-label="Search users" className="w-full rounded-full" placeholder="Search by name, email or dept" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {/* Filters on their own row, aligned to the right */}
          <div className="flex items-center gap-2 justify-end w-full">
            <label htmlFor="roleFilter" className="sr-only">Filter by role</label>
            <Select value={filterRole} onValueChange={(value) => setFilterRole(value as any)}>
              <SelectTrigger id="roleFilter" className="w-36 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setSearch(''); setFilterRole('all'); }}>Reset</Button>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => (
              <TableRow key={u.id}>
                <TableCell className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{u.role}</span>
                    {/* Role change quick actions */}
                    {onChangeRole && (
                      <div className="ml-2">
                        {u.role !== 'admin' ? (
                              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => onChangeRole(u.id, 'admin')}>Make admin</Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => onChangeRole(u.id, 'faculty')}>Make faculty</Button>
                            )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{u.status}</span>
                    {u.accountLocked ? <Lock className="h-4 w-4 text-red-500" /> : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {u.accountLocked ? (
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => onUnlockAccount && onUnlockAccount(u.id)}>
                        <Unlock className="h-4 w-4 mr-2" /> Unlock
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => onDisableUser && onDisableUser(u.id)}>
                        <UserMinus className="h-4 w-4 mr-2" /> Disable
                      </Button>
                    )}

                    <Button size="sm" variant="destructive" className="rounded-full" onClick={() => startDelete(u)}>
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Confirm delete dialog (simple inline dialog) */}
        <Dialog open={!!selectedUserToDelete} onOpenChange={(open) => { if (!open) setSelectedUserToDelete(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm user deletion</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm">Type the user's email to confirm deletion:</p>
              <p className="text-xs text-muted-foreground my-2">{selectedUserToDelete?.email}</p>
              <Input className="rounded-md" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type email to confirm" />
              <div className="flex items-start gap-3 mt-3">
                <Checkbox checked={isHardDelete} onCheckedChange={(checked) => setIsHardDelete(!!checked)} className="rounded-sm" />
                <div>
                  <Label className="text-sm">
                    <span className="font-medium">Hard delete</span>
                    <span className="text-xs text-muted-foreground ml-2">(irreversible)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">This will permanently remove the user and associated data. Use with caution.</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="rounded-full" onClick={() => setSelectedUserToDelete(null)}>Cancel</Button>
              <Button variant="destructive" className="rounded-full" onClick={doDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
