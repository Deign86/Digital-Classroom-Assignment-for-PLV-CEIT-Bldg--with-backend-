import React from 'react';

type Props = {
  users?: any[];
  processingUserId?: string | null;
  onDisableUser: (id: string) => Promise<any>;
  onEnableUser: (id: string) => Promise<any>;
  onDeleteUser: (id: string, hard?: boolean) => Promise<any>;
  onChangeRole: (id: string, role: string) => Promise<any>;
  onNotifyUser: (targetUserId: string, payload: any) => Promise<void>;
  onUnlockAccount: (id: string) => Promise<any>;
};

export default function AdminUserManagement(_props: Props) {
  // Minimal stub for CI: render a simple placeholder
  return (
    <div className="p-4">
      <div className="text-sm text-muted-foreground">User management panel (stub)</div>
    </div>
  );
}
