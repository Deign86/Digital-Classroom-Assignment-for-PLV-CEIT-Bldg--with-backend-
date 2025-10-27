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
  onDisableUser?: (userId: string) => Promise<void>;
  onEnableUser?: (userId: string) => Promise<void>;
  onDeleteUser?: (userId: string, hard?: boolean) => Promise<any>;
  onChangeRole?: (userId: string, role: AppUser['role']) => Promise<void>;
  onUnlockAccount?: (userId: string) => Promise<void>;
  // Optional: send a notification (in-app/email) to a user (e.g., ask them to re-login)
  onNotifyUser?: (userId: string, payload?: { title?: string; body?: string }) => Promise<void>;
  // Optional externally-managed processing indicator (parent can pass this to show
  // inline loaders when it performs the network action).
  processingUserId?: string | null;
}

export default function AdminUserManagement({ users = [], onDisableUser, onEnableUser, onDeleteUser, onChangeRole, onUnlockAccount, processingUserId: externalProcessingUserId, onNotifyUser }: AdminUserManagementProps) {
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | AppUser['role']>('all');
  const [selectedUserToDelete, setSelectedUserToDelete] = useState<AppUser | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isHardDelete, setIsHardDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pendingPromotionUser, setPendingPromotionUser] = useState<AppUser | null>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [pendingDemotionUser, setPendingDemotionUser] = useState<AppUser | null>(null);
  const [isDemoting, setIsDemoting] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [notifyTargetUser, setNotifyTargetUser] = useState<AppUser | null>(null);
  const [isNotifying, setIsNotifying] = useState(false);
  // If a parent supplies an externalProcessingUserId, prefer it for rendering
  // inline loaders and disabling buttons. Otherwise use local state.
  const effectiveProcessingUserId = externalProcessingUserId ?? processingUserId;

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
    setIsDeleting(true);
    try {
      if (onDeleteUser) {
        // Delegate to parent; parent will surface any user-visible messages/toasts.
        await onDeleteUser(selectedUserToDelete.id, isHardDelete);
      } else {
        toast.error('Delete handler not available');
      }
      setSelectedUserToDelete(null);
    } catch (err: any) {
      console.error('Delete user error', err);
      const msg = err?.message || (err?.code ? `${err.code}` : null) || 'Failed to delete user';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Per-row action handlers: await parent handlers and surface messages; disable the single row while running
  const handleDisable = async (user: AppUser) => {
  setProcessingUserId(user.id);
    try {
      if (onDisableUser) {
        // Delegate to parent; parent will handle any toasts/messages.
        await onDisableUser(user.id);
      } else {
        toast.error('Disable handler not available');
      }
    } catch (err: any) {
      console.error('Disable error', err);
      toast.error(err?.message || 'Failed to disable user');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleEnable = async (user: AppUser) => {
  setProcessingUserId(user.id);
    try {
      if (onEnableUser) {
        // Delegate to parent; parent will handle any toasts/messages.
        await onEnableUser(user.id);
      } else {
        toast.error('Enable handler not available');
      }
    } catch (err: any) {
      console.error('Enable error', err);
      toast.error(err?.message || 'Failed to enable user');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleUnlock = async (user: AppUser) => {
  setProcessingUserId(user.id);
    try {
      if (onUnlockAccount) {
        // Delegate to parent; parent will handle any toasts/messages.
        await onUnlockAccount(user.id);
      } else {
        toast.error('Unlock handler not available');
      }
    } catch (err: any) {
      console.error('Unlock error', err);
      toast.error(err?.message || 'Failed to unlock user');
    } finally {
      setProcessingUserId(null);
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
                              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setPendingPromotionUser(u)}>Make admin</Button>
                            ) : (
                              <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setPendingDemotionUser(u)}>Make faculty</Button>
                            )}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span>{u.status}</span>
                        {u.accountLocked ? <Lock className="h-4 w-4 text-red-500" /> : null}
                      </div>
                      {u.accountLocked && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {u.lockedByAdmin ? (
                            <span className="text-orange-600">Disabled by administrator</span>
                          ) : u.lockedUntil ? (
                            (() => {
                              const lockedUntil = new Date(u.lockedUntil);
                              const now = new Date();
                              const mins = Math.max(0, Math.ceil((lockedUntil.getTime() - now.getTime()) / 60000));
                              return mins > 0 ? (
                                <span className="text-red-600">Auto-unlock in {mins} minute{mins !== 1 ? 's' : ''}</span>
                              ) : (
                                <span className="text-orange-600">Lockout period expired - will unlock on next login attempt</span>
                              );
                            })()
                          ) : (
                            <span className="text-orange-600">Disabled by administrator</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                      {u.accountLocked ? (
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleUnlock(u)} disabled={processingUserId === u.id}>
                        {effectiveProcessingUserId === u.id ? (
                          <span className="inline-flex items-center">
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                            <span className="sr-only">Unlocking {u.name}</span>
                          </span>
                        ) : (
                          <Unlock className="h-4 w-4 mr-2" />
                        )}
                        Unlock
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="rounded-full" onClick={() => handleDisable(u)} disabled={effectiveProcessingUserId === u.id}>
                        {effectiveProcessingUserId === u.id ? (
                          <span className="inline-flex items-center">
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                            <span className="sr-only">Disabling {u.name}</span>
                          </span>
                        ) : (
                          <UserMinus className="h-4 w-4 mr-2" />
                        )}
                        Disable
                      </Button>
                    )}

                      <Button size="sm" variant="destructive" className="rounded-full" onClick={() => startDelete(u)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        <span className="sr-only">Delete {u.name}</span>
                        Delete
                      </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Confirm delete dialog (simple inline dialog) */}
  <Dialog open={!!selectedUserToDelete} onOpenChange={(open) => { if (isDeleting) return; if (!open) setSelectedUserToDelete(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm user deletion</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm">Type the user's email to confirm deletion:</p>
              <p className="text-xs text-muted-foreground my-2">{selectedUserToDelete?.email}</p>
              <Input className="rounded-md" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="Type email to confirm" />
              <div className="flex items-center gap-3 mt-3">
                <Checkbox checked={isHardDelete} onCheckedChange={(checked) => setIsHardDelete(!!checked)} className="rounded-sm" />
                <div>
                  <Label className="text-sm flex items-center gap-2">
                    <span className="font-medium">Hard delete</span>
                    <span className="text-xs text-muted-foreground">(irreversible)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">This will permanently remove the user and associated data. Use with caution.</p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="rounded-full" onClick={() => { if (!isDeleting) setSelectedUserToDelete(null); }} disabled={isDeleting}>Cancel</Button>
              <Button variant="destructive" className="rounded-full" onClick={doDelete} disabled={isDeleting}>
                {isDeleting ? (
                  <span className="inline-flex items-center">
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    <span className="sr-only">Deleting user</span>
                  </span>
                ) : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
          {/* Notify user dialog - appears after role change when backend indicates the user may be logged in */}
          <Dialog open={!!notifyTargetUser} onOpenChange={(open) => { if (isNotifying) return; if (!open) setNotifyTargetUser(null); }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Notify user to re-login</DialogTitle>
              </DialogHeader>
              <div className="py-2">
                <p className="text-sm">You changed the role for <strong>{notifyTargetUser?.name}</strong>.</p>
                <p className="text-sm mt-2">If this user is currently logged in, they need to re-login to apply the new role and permissions. You can send them a quick notice to prompt a re-login.</p>
              </div>
              <DialogFooter>
                <Button variant="ghost" className="rounded-full" onClick={() => { if (!isNotifying) setNotifyTargetUser(null); }} disabled={isNotifying}>Close</Button>
                <Button variant="secondary" className="rounded-full" onClick={async () => {
                  if (!notifyTargetUser) return;
                  if (!onNotifyUser) {
                    // Fallback: simply show guidance if notification mechanism isn't available
                    toast.info('Notification handler not configured. Please ask the user to re-login or send an external message.');
                    setNotifyTargetUser(null);
                    return;
                  }
                  setIsNotifying(true);
                  try {
                    await onNotifyUser(notifyTargetUser.id, { title: 'Account role changed', body: 'Your account role was changed by an administrator. Please sign out and sign in again to apply the new changes.' });
                    toast.success('User has been notified to re-login.');
                  } catch (err: any) {
                    console.error('Notify user error', err);
                    toast.error(err?.message || 'Failed to notify user');
                  } finally {
                    setIsNotifying(false);
                    setNotifyTargetUser(null);
                  }
                }} disabled={isNotifying}>
                  {isNotifying ? (
                    <span className="inline-flex items-center">
                      <Loader2 className="animate-spin mr-2 h-4 w-4" />
                      <span className="sr-only">Notifying user</span>
                    </span>
                  ) : null}
                  Notify user
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        {/* Promotion confirmation dialog */}
        <Dialog open={!!pendingPromotionUser} onOpenChange={(open) => { if (isPromoting) return; if (!open) setPendingPromotionUser(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Promote to Admin</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm">Are you sure you want to promote <strong>{pendingPromotionUser?.name}</strong> to Admin?</p>
              <p className="text-xs text-muted-foreground mt-2">Promoting a faculty to admin grants broad privileges. Their reservations will not be auto-deleted. Recommended alternatives: transfer reservation ownership or review and clean up sensitive reservations manually.</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="rounded-full" onClick={() => { if (!isPromoting) setPendingPromotionUser(null); }} disabled={isPromoting}>Cancel</Button>
              <Button variant="destructive" className="rounded-full" onClick={async () => {
                if (!pendingPromotionUser) return;
                setIsPromoting(true);
                try {
                  if (onChangeRole) {
                    // allow onChangeRole to optionally return a structured response { success, message, notifyCurrentlyLoggedIn }
                    const res: any = await (onChangeRole as any)(pendingPromotionUser.id, 'admin');
                    if (res && res.message) {
                      toast.success(res.message);
                    } else {
                      toast.success(`${pendingPromotionUser.name} is now an admin.`);
                    }
                    if (res && res.notifyCurrentlyLoggedIn) {
                      setNotifyTargetUser(pendingPromotionUser);
                    }
                  }
                } catch (err: any) {
                  console.error('Promotion error', err);
                  toast.error(err?.message || 'Failed to promote user');
                } finally {
                  setIsPromoting(false);
                  setPendingPromotionUser(null);
                }
              }} disabled={isPromoting}>
                {isPromoting ? (
                  <span className="inline-flex items-center">
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    <span className="sr-only">Promoting {pendingPromotionUser?.name}</span>
                  </span>
                ) : null}
                Promote
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {/* Demotion confirmation dialog (make admin -> faculty) */}
        <Dialog open={!!pendingDemotionUser} onOpenChange={(open) => { if (isDemoting) return; if (!open) setPendingDemotionUser(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Demote to Faculty</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="text-sm">Are you sure you want to demote <strong>{pendingDemotionUser?.name}</strong> to Faculty?</p>
              <p className="text-xs text-muted-foreground mt-2">Demoting an admin will remove broad privileges. Review any delegated responsibilities before proceeding.</p>
            </div>
            <DialogFooter>
              <Button variant="ghost" className="rounded-full" onClick={() => { if (!isDemoting) setPendingDemotionUser(null); }} disabled={isDemoting}>Cancel</Button>
              <Button variant="destructive" className="rounded-full" onClick={async () => {
                if (!pendingDemotionUser) return;
                setIsDemoting(true);
                try {
                  if (onChangeRole) {
                    const res: any = await (onChangeRole as any)(pendingDemotionUser.id, 'faculty');
                    if (res && res.message) {
                      toast.success(res.message);
                    } else {
                      toast.success(`${pendingDemotionUser.name} is now a faculty.`);
                    }
                    if (res && res.notifyCurrentlyLoggedIn) {
                      setNotifyTargetUser(pendingDemotionUser);
                    }
                  }
                } catch (err: any) {
                  console.error('Demotion error', err);
                  toast.error(err?.message || 'Failed to demote user');
                } finally {
                  setIsDemoting(false);
                  setPendingDemotionUser(null);
                }
              }} disabled={isDemoting}>
                {isDemoting ? (
                  <span className="inline-flex items-center">
                    <Loader2 className="animate-spin mr-2 h-4 w-4" />
                    <span className="sr-only">Demoting {pendingDemotionUser?.name}</span>
                  </span>
                ) : null}
                Demote
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
