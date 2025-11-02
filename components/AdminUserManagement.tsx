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
import { MoreHorizontal, Trash2, User, UserMinus, UserPlus, Lock, Unlock, Loader2 } from 'lucide-react';
import type { User as AppUser } from '../App';

interface AdminUserManagementProps {
  users?: AppUser[];
  processingUserId?: string | null;
  onDisableUser?: (userId: string) => Promise<void>;
  onEnableUser?: (userId: string) => Promise<void>;
  onDeleteUser?: (userId: string, hard?: boolean) => Promise<any>;
  onChangeRole?: (userId: string, role: AppUser['role']) => Promise<void>;
  onUnlockAccount?: (userId: string) => Promise<void>;
  onNotifyUser?: (targetUserId: string, payload: any) => Promise<void>;
}

export default function AdminUserManagement({ users = [], processingUserId, onDisableUser, onEnableUser, onDeleteUser, onChangeRole, onUnlockAccount, onNotifyUser }: AdminUserManagementProps) {       
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | AppUser['role']>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | string>('all');
  const [filterLocked, setFilterLocked] = useState<'all' | 'locked' | 'unlocked'>('all');
  const [sortBy, setSortBy] = useState<'first' | 'last'>('first');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<AppUser | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isHardDelete, setIsHardDelete] = useState(false);
  // Track processing state per-user and per-action so we can show a loader
  // only on the specific button that was pressed, while disabling other
  // actions for that user.
  const [processingActions, setProcessingActions] = useState<Record<string, string | null>>({});

  const setProcessingFor = (id: string, action: string | null) => setProcessingActions(prev => ({ ...prev, [id]: action }));

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter(u => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (filterStatus !== 'all' && ((u.status || '').toString().toLowerCase() !== (filterStatus || '').toString().toLowerCase())) return false;
      if (filterLocked === 'locked' && !u.accountLocked) return false;
      if (filterLocked === 'unlocked' && u.accountLocked) return false;
      if (!term) return true;
      return [u.name, u.email, u.department].filter(Boolean).some(v => v!.toLowerCase().includes(term));
    });
  }, [users, search, filterRole, filterStatus, filterLocked]);

  // Apply sorting after filtering
  const sorted = useMemo(() => {
    const copy = [...filtered];
    const cmp = (a: AppUser, b: AppUser) => {
      const aName = (a.name || '').trim();
      const bName = (b.name || '').trim();
      const aParts = aName.split(/\s+/);
      const bParts = bName.split(/\s+/);
      const aFirst = aParts[0] || '';
      const bFirst = bParts[0] || '';
      const aLast = aParts[aParts.length - 1] || '';
      const bLast = bParts[bParts.length - 1] || '';
      const left = sortBy === 'first' ? aFirst : aLast;
      const right = sortBy === 'first' ? bFirst : bLast;
      return left.localeCompare(right, undefined, { sensitivity: 'base' });
    };
    copy.sort((a, b) => (sortOrder === 'asc' ? cmp(a, b) : -cmp(a, b)));
    return copy;
  }, [filtered, sortBy, sortOrder]);

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
      // mark delete in-flight for this user
      setProcessingFor(selectedUserToDelete.id, 'delete');
      if (onDeleteUser) {
        const res = await onDeleteUser(selectedUserToDelete.id, isHardDelete);
        // If server returned a message, show it. Otherwise, show a clearer success message.
        if (res && res.message) {
          toast.success(res.message);
        } else if (res && res.success === true) {
          toast.success('User deleted');
        } else {
          toast.success('Deletion request completed');
        }
      } else {
        toast.error('Delete handler not available');
      }
      setSelectedUserToDelete(null);
    } catch (err: any) {
      console.error('Delete user error', err);
      const msg = err?.message || (err?.code ? `${err.code}` : null) || 'Failed to delete user';
      toast.error(msg);
    } finally {
      if (selectedUserToDelete) setProcessingFor(selectedUserToDelete.id, null);
    }
  };

  // Helper wrappers to show per-user processing state
  const handleChangeRole = async (userId: string, role: AppUser['role']) => {
    if (!onChangeRole) return;
    setProcessingFor(userId, `changeRole:${role}`);
    try {
      await onChangeRole(userId, role);
      toast.success('Role updated');
    } catch (err: any) {
      const msg = err?.message || 'Failed to update role';
      toast.error(msg);
    } finally {
      setProcessingFor(userId, null);
    }
  };

  const handleDisableUser = async (userId: string) => {
    if (!onDisableUser) return;
    setProcessingFor(userId, 'disable');
    try {
      await onDisableUser(userId);
      toast.success('User disabled');
    } catch (err: any) {
      const msg = err?.message || 'Failed to disable user';
      toast.error(msg);
    } finally {
      setProcessingFor(userId, null);
    }
  };

  const handleUnlockAccount = async (userId: string) => {
    if (!onUnlockAccount) return;
    setProcessingFor(userId, 'unlock');
    try {
      await onUnlockAccount(userId);
      toast.success('Account unlocked');
    } catch (err: any) {
      const msg = err?.message || 'Failed to unlock account';
      toast.error(msg);
    } finally {
      setProcessingFor(userId, null);
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
            <Input aria-label="Search users" className="w-full rounded-full" placeholder="Search by name, email or dept" value={search} onChange={(e) => setSearch(e.target.value)} />                                                                                                                                                                    </div>

          {/* Filters on their own row, aligned to the right */}
          <div className="flex flex-col sm:flex-row sm:items-center items-end gap-2 justify-end w-full">
            <label htmlFor="roleFilter" className="sr-only">Filter by role</label>
            <Select value={filterRole} onValueChange={(value) => setFilterRole(value as any)}>
              <SelectTrigger id="roleFilter" className="w-full sm:w-36 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="faculty">Faculty</SelectItem>
              </SelectContent>
            </Select>

            <label htmlFor="statusFilter" className="sr-only">Filter by status</label>
            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
              <SelectTrigger id="statusFilter" className="w-full sm:w-44 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="all">All statuses</SelectItem>
                {/* Ensure 'pending' is always available as a filter option */}
                <SelectItem value="pending">pending</SelectItem>
                {/* Dynamically render known statuses (exclude 'pending' because we already show it) */}
                {Array.from(new Set(users.map(u => u.status).filter(Boolean))).filter(s => s !== 'pending').map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <label htmlFor="lockedFilter" className="sr-only">Filter by lock state</label>
            <Select value={filterLocked} onValueChange={(v) => setFilterLocked(v as any)}>
              <SelectTrigger id="lockedFilter" className="w-full sm:w-32 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="all">All accounts</SelectItem>
                <SelectItem value="locked">Locked</SelectItem>
                <SelectItem value="unlocked">Unlocked</SelectItem>
              </SelectContent>
            </Select>

            <label htmlFor="sortBy" className="sr-only">Sort by name</label>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger id="sortBy" className="w-full sm:w-56 rounded-full" title={sortBy === 'first' ? 'Order by first name' : 'Order by last name'}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="first" title="Order by first name">First name</SelectItem>
                <SelectItem value="last" title="Order by last name">Last name</SelectItem>
              </SelectContent>
            </Select>

            <label htmlFor="sortOrder" className="sr-only">Sort order</label>
            <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as any)}>
              <SelectTrigger id="sortOrder" className="w-full sm:w-28 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg">
                <SelectItem value="asc">A → Z</SelectItem>
                <SelectItem value="desc">Z → A</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="rounded-full w-full sm:w-auto" onClick={() => { setSearch(''); setFilterRole('all'); setFilterStatus('all'); setFilterLocked('all'); setSortBy('first'); setSortOrder('asc'); }}>Reset</Button>
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
            {sorted.map(u => {
              const name = (u.name || '').trim();
              const parts = name.split(/\s+/);
              const first = parts[0] || '';
              const last = parts[parts.length - 1] || '';
              const displayName = sortBy === 'last' ? `${last}${first ? ', ' + first : ''}` : name;
              const currentAction = processingActions[u.id] || null;
              return (
                <TableRow key={u.id}>
                  <TableCell className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {displayName}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{u.role}</span>
                    {/* Role change quick actions */}
                    {onChangeRole && (
                      <div className="ml-2">
                          {u.role !== 'admin' ? (
                                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => handleChangeRole(u.id, 'admin')} disabled={!!currentAction}>
                                  {currentAction === 'changeRole:admin' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null} Make admin
                                </Button>
                              ) : (
                                <Button size="sm" variant="ghost" className="rounded-full" onClick={() => handleChangeRole(u.id, 'faculty')} disabled={!!currentAction}>
                                  {currentAction === 'changeRole:faculty' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null} Make faculty
                                </Button>
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
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleUnlockAccount(u.id)} disabled={!!currentAction}>
                        {currentAction === 'unlock' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Unlock className="h-4 w-4 mr-2" />} Unlock
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleDisableUser(u.id)} disabled={!!currentAction}>
                        {currentAction === 'disable' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <UserMinus className="h-4 w-4 mr-2" />} Disable
                      </Button>
                    )}

                    <Button size="sm" variant="destructive" className="rounded-full" onClick={() => startDelete(u)} disabled={!!currentAction}>
                      {currentAction === 'delete' ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
            })}
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
