import React, { useEffect, useState } from 'react';
import { logger } from '../lib/logger';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Button } from './ui/button';
import { RefreshCw, LogOut } from 'lucide-react';
import { customClaimsService } from '../lib/customClaimsService';
import { authService } from '../lib/firebaseService';
import { toast } from 'sonner';

interface TokenRefreshNotificationProps {
  userRole: 'admin' | 'faculty';
  onRoleChanged?: () => void;
}

/**
 * Component that checks if custom claims are in sync with Firestore role
 * and prompts the user to refresh if needed.
 */
export const TokenRefreshNotification: React.FC<TokenRefreshNotificationProps> = ({ 
  userRole, 
  onRoleChanged 
}) => {
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    inSync: boolean;
    tokenRole?: string;
    tokenAdmin?: boolean;
    firestoreRole: string;
  } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const checkSync = async () => {
      try {
        const status = await customClaimsService.checkClaimsSyncStatus(userRole);
        setSyncStatus(status);
        setNeedsRefresh(!status.inSync);
      } catch (err) {
        logger.error('Error checking claims sync status:', err);
      }
    };

    checkSync();
    
    // Recheck every 30 seconds
    const interval = setInterval(checkSync, 30000);
    
    return () => clearInterval(interval);
  }, [userRole]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await customClaimsService.refreshMyCustomClaims();
      toast.success('Permissions refreshed! Please sign out and sign in again to apply changes.');
      setNeedsRefresh(false);
      onRoleChanged?.();
    } catch (err) {
      logger.error('Error refreshing claims:', err);
      toast.error('Failed to refresh permissions. Please try signing out and signing in again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      toast.success('Signed out successfully');
    } catch (err) {
      logger.error('Error signing out:', err);
      toast.error('Failed to sign out');
    }
  };

  if (!needsRefresh) {
    return null;
  }

  return (
    <Alert variant="default" className="mb-4 border-orange-500 bg-orange-50">
      <RefreshCw className="h-4 w-4" />
      <AlertTitle>Permissions Update Required</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          Your role has been updated to <strong>{userRole}</strong>, but your current session 
          has outdated permissions. Please sign out and sign in again to apply the changes.
        </p>
        {syncStatus && (
          <p className="text-xs text-muted-foreground mb-3">
            Current token: {syncStatus.tokenRole || 'unknown'} 
            {syncStatus.tokenAdmin ? ' (admin)' : ''} → 
            New role: {syncStatus.firestoreRole}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="default"
            onClick={handleSignOut}
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out & Sign In Again
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2"
          >
            {refreshing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Try Refresh
              </>
            )}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default TokenRefreshNotification;
