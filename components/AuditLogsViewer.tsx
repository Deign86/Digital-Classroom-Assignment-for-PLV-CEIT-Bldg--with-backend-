import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Shield, 
  Search, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  User, 
  Clock,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { auditLogService, userService, type AuditLog } from '../lib/firebaseService';
import { refreshMyCustomClaims, forceTokenRefresh } from '../lib/customClaimsService';

interface AuditLogsViewerProps {
  /** Current admin user ID for context */
  adminUserId?: string;
  /** Optional: Pre-loaded users list from parent component */
  users?: Array<{ id: string; name: string; email: string }>;
}

const ACTION_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  // Login events
  'login.success': { label: 'Login Success', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  'login.locked': { label: 'Account Locked', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  'login.failure': { label: 'Login Failed', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  
  // Booking/Reservation events
  'booking.create': { label: 'Reservation Created', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  'booking.approve': { label: 'Reservation Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  'booking.reject': { label: 'Reservation Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  'booking.cancel': { label: 'Reservation Cancelled', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  'booking.expire': { label: 'Reservation Expired', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400' },
  'booking.update': { label: 'Reservation Updated', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  
  // Signup events
  'signup.approve': { label: 'Signup Approved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  'signup.reject': { label: 'Signup Rejected', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  
  // Account events
  'account.lock': { label: 'Account Locked', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  'account.unlock': { label: 'Account Unlocked', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  
  // Admin events
  'classroom.delete': { label: 'Classroom Deleted', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  'admin.deleteUser': { label: 'User Deleted', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  'admin.roleChange': { label: 'Role Changed', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  
  // Other events
  'push.register': { label: 'Push Registered', color: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400' },
  'profile.update': { label: 'Profile Updated', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-400' },
};

const STATUS_STYLES: Record<string, { icon: React.ReactNode; color: string }> = {
  success: { icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
  failure: { icon: <XCircle className="h-4 w-4" />, color: 'text-red-600' },
  throttled: { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-orange-600' },
  unknown: { icon: <Clock className="h-4 w-4" />, color: 'text-gray-500' },
};

const PAGE_SIZE = 25;

export default function AuditLogsViewer({ adminUserId, users: propUsers }: AuditLogsViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // User name lookup cache
  const [userNameCache, setUserNameCache] = useState<Record<string, string>>({});
  
  // Filters
  const [actionTypeFilter, setActionTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | 'all'>('24h');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  
  // Track if we've already tried to refresh claims to avoid infinite loop
  const [claimsRefreshed, setClaimsRefreshed] = useState(false);

  const fetchLogs = useCallback(async (showRefreshToast = false, retryAfterClaimsRefresh = false) => {
    try {
      if (showRefreshToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const fetchedLogs = await auditLogService.getRecentLogs(500);
      setLogs(fetchedLogs);
      
      if (showRefreshToast) {
        toast.success(`Loaded ${fetchedLogs.length} audit log entries`);
      }
    } catch (err: any) {
      console.error('Failed to fetch audit logs:', err);
      
      // Check if this is a permissions error and we haven't tried refreshing claims yet
      const isPermissionError = err?.code === 'permission-denied' || 
                               err?.message?.toLowerCase().includes('permission') ||
                               err?.message?.toLowerCase().includes('insufficient');
      
      if (isPermissionError && !claimsRefreshed && !retryAfterClaimsRefresh) {
        // Try to refresh custom claims and retry
        console.log('Permission denied - attempting to refresh custom claims...');
        setError('Syncing admin permissions...');
        
        try {
          await refreshMyCustomClaims();
          await forceTokenRefresh();
          setClaimsRefreshed(true);
          
          // Small delay to allow token propagation
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Retry the fetch
          toast.info('Refreshed admin permissions, retrying...');
          await fetchLogs(showRefreshToast, true);
          return;
        } catch (refreshErr) {
          console.error('Failed to refresh custom claims:', refreshErr);
          setError('Missing or insufficient permissions.');
          toast.error('Failed to load audit logs. Please sign out and sign in again.');
        }
      } else {
        setError(isPermissionError ? 'Missing or insufficient permissions.' : (err?.message || 'Failed to load audit logs'));
        toast.error('Failed to load audit logs');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [claimsRefreshed]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Build user name cache from propUsers or fetch missing users
  useEffect(() => {
    // If we have users from props, build cache from them
    if (propUsers && propUsers.length > 0) {
      const cache: Record<string, string> = {};
      propUsers.forEach(u => {
        cache[u.id] = u.name || u.email || u.id;
      });
      setUserNameCache(cache);
      return;
    }

    // Otherwise, collect unique user IDs from logs and fetch them
    if (logs.length === 0) return;

    const userIds = new Set<string>();
    logs.forEach(log => {
      if (log.userId) userIds.add(log.userId);
      if (log.actorId) userIds.add(log.actorId);
    });

    // Filter out IDs we already have cached
    const missingIds = Array.from(userIds).filter(id => !userNameCache[id]);
    if (missingIds.length === 0) return;

    // Fetch user data for missing IDs
    const fetchUserNames = async () => {
      try {
        const users = await userService.getAll();
        const cache: Record<string, string> = { ...userNameCache };
        users.forEach(u => {
          cache[u.id] = u.name || u.email || u.id;
        });
        setUserNameCache(cache);
      } catch (err) {
        console.error('Failed to fetch user names for audit logs:', err);
      }
    };

    fetchUserNames();
  }, [logs, propUsers]);

  // Helper to get display name for a user ID
  const getUserDisplayName = useCallback((userId: string | null): string | null => {
    if (!userId) return null;
    return userNameCache[userId] || userId.slice(0, 8) + '...';
  }, [userNameCache]);

  // Filter logs based on current filters
  const filteredLogs = useMemo(() => {
    let result = [...logs];
    
    // Time range filter
    if (timeRange !== 'all') {
      const now = Date.now();
      const ranges: Record<string, number> = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
      };
      const cutoff = now - ranges[timeRange];
      result = result.filter(log => {
        const logTime = log.createdAt?.toDate?.()?.getTime() || 0;
        return logTime >= cutoff;
      });
    }
    
    // Action type filter
    if (actionTypeFilter !== 'all') {
      result = result.filter(log => log.actionType === actionTypeFilter);
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(log => log.status === statusFilter);
    }
    
    // Search query (searches userId, actorId, user names, metadata)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(log => {
        const userName = log.userId ? (userNameCache[log.userId] || '') : '';
        const actorName = log.actorId ? (userNameCache[log.actorId] || '') : '';
        const searchFields = [
          log.userId || '',
          log.actorId || '',
          userName,
          actorName,
          log.requestId || '',
          JSON.stringify(log.metadata || {}),
        ].join(' ').toLowerCase();
        return searchFields.includes(query);
      });
    }
    
    return result;
  }, [logs, timeRange, actionTypeFilter, statusFilter, searchQuery, userNameCache]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / PAGE_SIZE);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [actionTypeFilter, statusFilter, searchQuery, timeRange]);

  // Get unique action types from logs for filter dropdown
  const availableActionTypes = useMemo(() => {
    const types = new Set(logs.map(log => log.actionType));
    return Array.from(types).sort();
  }, [logs]);

  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    const config = ACTION_TYPE_LABELS[actionType];
    if (config) {
      return <Badge className={`${config.color} font-medium`}>{config.label}</Badge>;
    }
    return <Badge variant="outline">{actionType}</Badge>;
  };

  const getStatusDisplay = (status: string) => {
    const config = STATUS_STYLES[status] || STATUS_STYLES.unknown;
    return (
      <span className={`flex items-center gap-1 ${config.color}`}>
        {config.icon}
        <span className="capitalize">{status}</span>
      </span>
    );
  };

  const renderMetadata = (metadata: Record<string, any> | undefined) => {
    if (!metadata || Object.keys(metadata).length === 0) {
      return <span className="text-gray-400 text-xs">—</span>;
    }
    
    // Priority fields to show (in order of importance)
    const priorityKeys = ['newStatus', 'oldStatus', 'newRole', 'oldRole', 'reason', 'adminFeedback', 'date', 'classroomName', 'roomName'];
    
    // Get priority entries first, then fill with others (excluding less useful fields)
    const excludeKeys = ['bookingRequestId', 'signupRequestId', 'requestId', 'userId', 'actorId'];
    const allEntries = Object.entries(metadata).filter(([key]) => !excludeKeys.includes(key));
    
    // Sort by priority
    const sortedEntries = allEntries.sort((a, b) => {
      const aIndex = priorityKeys.indexOf(a[0]);
      const bIndex = priorityKeys.indexOf(b[0]);
      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    
    // Show up to 4 most relevant fields
    const entries = sortedEntries.slice(0, 4);
    
    if (entries.length === 0) {
      return <span className="text-gray-400 text-xs">—</span>;
    }
    
    return (
      <div className="text-xs text-gray-600 space-y-0.5">
        {entries.map(([key, value]) => {
          // Skip null/undefined values
          if (value === null || value === undefined) return null;
          return (
            <div key={key} className="truncate max-w-[200px]">
              <span className="font-medium">{key}:</span>{' '}
              <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500" />
            <div>
              <h3 className="font-semibold text-lg text-gray-900">Failed to Load Audit Logs</h3>
              <p className="text-gray-600 mt-1">{error}</p>
            </div>
            <Button onClick={() => fetchLogs()} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <div>
                <CardTitle>Security Audit Logs</CardTitle>
                <CardDescription>
                  View security-sensitive actions and system events (auto-expires after 7 days)
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={() => fetchLogs(true)} 
              variant="outline" 
              size="sm"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>
            
            {/* Time Range */}
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last hour</SelectItem>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>

            {/* Action Type */}
            <Select value={actionTypeFilter} onValueChange={setActionTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Action type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                {availableActionTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {ACTION_TYPE_LABELS[type]?.label || type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failure">Failure</SelectItem>
                <SelectItem value="throttled">Throttled</SelectItem>
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by user ID, metadata..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          {/* Results summary */}
          <div className="mt-3 text-sm text-gray-500">
            Showing {paginatedLogs.length} of {filteredLogs.length} entries
            {filteredLogs.length !== logs.length && ` (${logs.length} total)`}
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {filteredLogs.length === 0 ? (
            <div className="p-8 text-center">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No audit logs found matching your filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-700">Timestamp</th>
                    <th className="text-left p-3 font-medium text-gray-700">Action</th>
                    <th className="text-left p-3 font-medium text-gray-700">Status</th>
                    <th className="text-left p-3 font-medium text-gray-700">User</th>
                    <th className="text-left p-3 font-medium text-gray-700">Actor</th>
                    <th className="text-left p-3 font-medium text-gray-700">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 whitespace-nowrap text-gray-600">
                        {formatTimestamp(log.createdAt)}
                      </td>
                      <td className="p-3">
                        {getActionTypeLabel(log.actionType)}
                      </td>
                      <td className="p-3">
                        {getStatusDisplay(log.status)}
                      </td>
                      <td className="p-3">
                        {log.userId ? (
                          <span className="flex items-center gap-1 text-gray-700" title={log.userId}>
                            <User className="h-3 w-3" />
                            <span className="text-xs truncate max-w-[150px]">
                              {getUserDisplayName(log.userId)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {log.actorId && log.actorId !== log.userId ? (
                          <span className="flex items-center gap-1 text-purple-700" title={log.actorId}>
                            <User className="h-3 w-3" />
                            <span className="text-xs truncate max-w-[150px]">
                              {getUserDisplayName(log.actorId)}
                            </span>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="p-3">
                        {renderMetadata(log.metadata)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
