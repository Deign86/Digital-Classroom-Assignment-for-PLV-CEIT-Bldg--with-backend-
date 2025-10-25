import React, { useMemo, useState } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from './ui/dialog';
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
      <CardHeader>
        <CardTitle>User management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 w-full sm:w-1/2">
            <Input placeholder="Search by name, email or dept" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="flex items-center gap-2">
            <select className="input" value={filterRole} onChange={(e) => setFilterRole(e.target.value as any)}>
              <option value="all">All roles</option>
              <option value="admin">Admin</option>
              <option value="faculty">Faculty</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFilterRole('all'); }}>Reset</Button>
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
                          <Button size="sm" variant="ghost" onClick={() => onChangeRole(u.id, 'admin')}>Make admin</Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => onChangeRole(u.id, 'faculty')}>Make faculty</Button>
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
                      <Button size="sm" variant="outline" onClick={() => onUnlockAccount && onUnlockAccount(u.id)}>
                        <Unlock className="h-4 w-4 mr-2" /> Unlock
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => onDisableUser && onDisableUser(u.id)}>
                        <UserMinus className="h-4 w-4 mr-2" /> Disable
                      </Button>
                    )}

                    <Button size="sm" variant="destructive" onClick={() => startDelete(u)}>
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
              <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type email to confirm" />
              <div className="flex items-center gap-2 mt-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={isHardDelete} onChange={(e) => setIsHardDelete(e.target.checked)} /> Hard delete (irreversible)</label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectedUserToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={doDelete}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
