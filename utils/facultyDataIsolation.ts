// Faculty Data Isolation - Prevents IDOR and unauthorized access between faculty users
// Implements strict access controls for faculty-specific resources

import { AccessControl } from './accessControl';
import { ErrorType, SecureError } from './errorHandling';

// Faculty resource types
export enum FacultyResourceType {
  PROFILE = 'profile',
  SCHEDULE = 'schedule',  
  BOOKING = 'booking',
  COURSE = 'course',
  ATTENDANCE = 'attendance',
  GRADES = 'grades',
  REPORTS = 'reports',
  DOCUMENTS = 'documents',
}

// Faculty data ownership interface
export interface FacultyResourceOwnership {
  resourceId: string;
  resourceType: FacultyResourceType;
  ownerId: string;
  ownerRole: string;
  department?: string;
  college?: string;
  permissions: FacultyResourcePermission[];
}

// Faculty resource permissions
export enum FacultyResourcePermission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  SHARE = 'share',
  ADMIN = 'admin',
}

// Faculty access context
export interface FacultyAccessContext {
  userId: string;
  userRole: string;
  department?: string;
  college?: string;
  permissions: string[];
  sessionId?: string;
  ipAddress?: string;
  timestamp: number;
}

// Resource access rules for faculty
export const FACULTY_ACCESS_RULES = {
  // What faculty can access in their own resources
  OWN_RESOURCES: {
    [FacultyResourceType.PROFILE]: [FacultyResourcePermission.READ, FacultyResourcePermission.WRITE],
    [FacultyResourceType.SCHEDULE]: [FacultyResourcePermission.READ, FacultyResourcePermission.WRITE],
    [FacultyResourceType.BOOKING]: [FacultyResourcePermission.READ, FacultyResourcePermission.WRITE, FacultyResourcePermission.DELETE],
    [FacultyResourceType.COURSE]: [FacultyResourcePermission.READ, FacultyResourcePermission.WRITE],
    [FacultyResourceType.ATTENDANCE]: [FacultyResourcePermission.READ, FacultyResourcePermission.WRITE],
    [FacultyResourceType.GRADES]: [FacultyResourcePermission.READ, FacultyResourcePermission.WRITE],
    [FacultyResourceType.REPORTS]: [FacultyResourcePermission.READ],
    [FacultyResourceType.DOCUMENTS]: [FacultyResourcePermission.READ, FacultyResourcePermission.WRITE, FacultyResourcePermission.DELETE],
  },

  // What faculty can access in department resources (limited)
  DEPARTMENT_RESOURCES: {
    [FacultyResourceType.PROFILE]: [], // No access to others' profiles
    [FacultyResourceType.SCHEDULE]: [FacultyResourcePermission.READ], // View department schedules
    [FacultyResourceType.BOOKING]: [], // No access to others' bookings
    [FacultyResourceType.COURSE]: [FacultyResourcePermission.READ], // View department courses
    [FacultyResourceType.ATTENDANCE]: [], // No access to others' attendance
    [FacultyResourceType.GRADES]: [], // No access to others' grades
    [FacultyResourceType.REPORTS]: [], // No access to others' reports
    [FacultyResourceType.DOCUMENTS]: [], // No access to others' documents
  },

  // What admins can access
  ADMIN_RESOURCES: {
    [FacultyResourceType.PROFILE]: [FacultyResourcePermission.READ, FacultyResourcePermission.WRITE, FacultyResourcePermission.ADMIN],
    [FacultyResourceType.SCHEDULE]: [FacultyResourcePermission.READ, FacultyResourcePermission.WRITE, FacultyResourcePermission.ADMIN],
    [FacultyResourceType.BOOKING]: [FacultyResourcePermission.READ, FacultyResourcePermission.WRITE, FacultyResourcePermission.DELETE, FacultyResourcePermission.ADMIN],
    [FacultyResourceType.COURSE]: [FacultyResourcePermission.READ, FacultyResourcePermission.WRITE, FacultyResourcePermission.ADMIN],
    [FacultyResourceType.ATTENDANCE]: [FacultyResourcePermission.READ, FacultyResourcePermission.ADMIN],
    [FacultyResourceType.GRADES]: [FacultyResourcePermission.READ, FacultyResourcePermission.ADMIN],
    [FacultyResourceType.REPORTS]: [FacultyResourcePermission.READ, FacultyResourcePermission.WRITE, FacultyResourcePermission.ADMIN],
    [FacultyResourceType.DOCUMENTS]: [FacultyResourcePermission.READ, FacultyResourcePermission.ADMIN],
  },
} as const;

// Audit log entry for access attempts
export interface FacultyAccessAuditLog {
  timestamp: number;
  userId: string;
  userRole: string;
  action: string;
  resourceType: FacultyResourceType;
  resourceId: string;
  resourceOwnerId?: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  department?: string;
  reason?: string;
}

export class FacultyDataIsolation {
  private static auditLogs: FacultyAccessAuditLog[] = [];
  private static readonly MAX_AUDIT_LOGS = 10000;

  /**
   * Check if user can access a specific faculty resource
   */
  static canAccessResource(
    accessContext: FacultyAccessContext,
    resource: FacultyResourceOwnership,
    requestedPermission: FacultyResourcePermission
  ): { allowed: boolean; reason?: string } {
    try {
      // Log the access attempt
      this.logAccessAttempt({
        timestamp: Date.now(),
        userId: accessContext.userId,
        userRole: accessContext.userRole,
        action: `access_${requestedPermission}`,
        resourceType: resource.resourceType,
        resourceId: resource.resourceId,
        resourceOwnerId: resource.ownerId,
        success: false, // Will be updated below
        ipAddress: accessContext.ipAddress,
        department: accessContext.department,
      });

      // Admin has full access to everything
      if (accessContext.userRole === 'admin') {
        const adminPermissions = FACULTY_ACCESS_RULES.ADMIN_RESOURCES[resource.resourceType] || [];
        const hasPermission = (adminPermissions as readonly FacultyResourcePermission[]).includes(requestedPermission);
        
        this.updateLastAuditLog({ success: hasPermission, reason: hasPermission ? 'admin_access_granted' : 'admin_permission_denied' });
        return { allowed: hasPermission, reason: hasPermission ? undefined : 'Insufficient admin permissions' };
      }

      // Faculty can only access their own resources or limited department resources
      if (accessContext.userRole === 'faculty') {
        // Check if accessing own resource
        if (resource.ownerId === accessContext.userId) {
          const ownPermissions = FACULTY_ACCESS_RULES.OWN_RESOURCES[resource.resourceType] || [];
          const hasPermission = (ownPermissions as readonly FacultyResourcePermission[]).includes(requestedPermission);
          
          this.updateLastAuditLog({ success: hasPermission, reason: hasPermission ? 'own_resource_access' : 'own_resource_permission_denied' });
          return { allowed: hasPermission, reason: hasPermission ? undefined : 'Permission denied for this action' };
        }

        // Check department access (very limited)
        if (accessContext.department && 
            resource.department === accessContext.department &&
            FACULTY_ACCESS_RULES.DEPARTMENT_RESOURCES[resource.resourceType]) {
          
          const deptPermissions = FACULTY_ACCESS_RULES.DEPARTMENT_RESOURCES[resource.resourceType] || [];
          const hasPermission = (deptPermissions as readonly FacultyResourcePermission[]).includes(requestedPermission);
          
          this.updateLastAuditLog({ 
            success: hasPermission, 
            reason: hasPermission ? 'department_access_granted' : 'department_access_denied' 
          });
          
          return { 
            allowed: hasPermission, 
            reason: hasPermission ? undefined : 'Cannot access resources from other faculty members' 
          };
        }

        // No access to other faculty's resources
        this.updateLastAuditLog({ success: false, reason: 'cross_faculty_access_denied' });
        return { 
          allowed: false, 
          reason: 'You can only access your own resources' 
        };
      }

      // Unknown role - deny access
      this.updateLastAuditLog({ success: false, reason: 'unknown_role' });
      return { allowed: false, reason: 'Invalid user role' };

    } catch (error) {
      console.error('Access check failed:', error);
      this.updateLastAuditLog({ success: false, reason: 'system_error' });
      return { allowed: false, reason: 'Access check failed' };
    }
  }

  /**
   * Validate resource ownership before allowing access
   */
  static validateResourceOwnership(
    accessContext: FacultyAccessContext,
    resourceType: FacultyResourceType,
    resourceData: any
  ): { isValid: boolean; sanitizedData?: any; errors?: string[] } {
    try {
      const errors: string[] = [];
      
      // Ensure resource has proper ownership fields
      if (!resourceData.ownerId && !resourceData.createdBy && !resourceData.facultyId) {
        errors.push('Resource ownership information is missing');
      }

      // For faculty users, ensure they can only create/modify their own resources
      if (accessContext.userRole === 'faculty') {
        const resourceOwnerId = resourceData.ownerId || resourceData.createdBy || resourceData.facultyId;
        
        if (resourceOwnerId && resourceOwnerId !== accessContext.userId) {
          errors.push('Cannot modify resources owned by other faculty members');
        }

        // Sanitize the data to ensure ownership
        const sanitizedData = {
          ...resourceData,
          ownerId: accessContext.userId,
          createdBy: accessContext.userId,
          facultyId: accessContext.userId,
          department: accessContext.department,
          lastModified: Date.now(),
          lastModifiedBy: accessContext.userId,
        };

        // Remove any attempts to set admin fields
        delete sanitizedData.isAdmin;
        delete sanitizedData.adminApproved;
        delete sanitizedData.systemGenerated;

        return {
          isValid: errors.length === 0,
          sanitizedData: errors.length === 0 ? sanitizedData : undefined,
          errors: errors.length > 0 ? errors : undefined,
        };
      }

      // Admin can modify ownership but we still track it
      if (accessContext.userRole === 'admin') {
        const sanitizedData = {
          ...resourceData,
          lastModified: Date.now(),
          lastModifiedBy: accessContext.userId,
          adminModified: true,
        };

        return {
          isValid: errors.length === 0,
          sanitizedData,
          errors: errors.length > 0 ? errors : undefined,
        };
      }

      return {
        isValid: false,
        errors: ['Invalid user role'],
      };

    } catch (error) {
      console.error('Resource ownership validation failed:', error);
      return {
        isValid: false,
        errors: ['Ownership validation failed'],
      };
    }
  }

  /**
   * Filter query results to only include resources user can access
   */
  static filterUserAccessibleResources<T extends { ownerId?: string; facultyId?: string; createdBy?: string; department?: string }>(
    accessContext: FacultyAccessContext,
    resources: T[],
    resourceType: FacultyResourceType
  ): T[] {
    try {
      return resources.filter(resource => {
        const resourceOwnerId = resource.ownerId || resource.facultyId || resource.createdBy;
        
        // Admin can see everything
        if (accessContext.userRole === 'admin') {
          return true;
        }

        // Faculty can see their own resources
        if (accessContext.userRole === 'faculty') {
          if (resourceOwnerId === accessContext.userId) {
            return true;
          }

          // Limited department access for certain resources
          if (accessContext.department && 
              resource.department === accessContext.department) {
            const deptPermissions = FACULTY_ACCESS_RULES.DEPARTMENT_RESOURCES[resourceType] || [];
            if ((deptPermissions as readonly FacultyResourcePermission[]).includes(FacultyResourcePermission.READ)) {
              return true;
            }
          }
        }

        return false;
      });
    } catch (error) {
      console.error('Resource filtering failed:', error);
      return [];
    }
  }

  /**
   * Create secure query filters for database operations
   */
  static createSecureQueryFilters(
    accessContext: FacultyAccessContext,
    resourceType: FacultyResourceType
  ): { where: any[]; orderBy?: any } {
    const filters: any[] = [];

    if (accessContext.userRole === 'faculty') {
      // Faculty can only query their own resources or limited department resources
      const ownershipFilters = [
        { ownerId: accessContext.userId },
        { facultyId: accessContext.userId },
        { createdBy: accessContext.userId }
      ];

      // Add department filter for resources with limited department access
      if (accessContext.department) {
        const deptPermissions = FACULTY_ACCESS_RULES.DEPARTMENT_RESOURCES[resourceType] || [];
        if ((deptPermissions as readonly FacultyResourcePermission[]).includes(FacultyResourcePermission.READ)) {
          ownershipFilters.push({ department: accessContext.department } as any);
        }
      }

      filters.push({ $or: ownershipFilters });
    }

    // Admin doesn't need filters (can access everything)
    
    return {
      where: filters,
      orderBy: { lastModified: -1 }
    };
  }

  /**
   * Validate API request parameters to prevent IDOR
   */
  static validateApiRequest(
    accessContext: FacultyAccessContext,
    requestParams: any
  ): { isValid: boolean; errors?: string[]; sanitizedParams?: any } {
    try {
      const errors: string[] = [];
      const sanitizedParams = { ...requestParams };

      // Remove any attempts to access other users' data
      if (accessContext.userRole === 'faculty') {
        // Ensure faculty can only request their own data
        if (requestParams.userId && requestParams.userId !== accessContext.userId) {
          errors.push('Cannot access other users\' data');
        }
        
        if (requestParams.facultyId && requestParams.facultyId !== accessContext.userId) {
          errors.push('Cannot access other faculty\'s data');
        }

        // Force parameters to user's own ID
        sanitizedParams.userId = accessContext.userId;
        sanitizedParams.facultyId = accessContext.userId;
        sanitizedParams.ownerId = accessContext.userId;

        // Remove admin-only parameters
        delete sanitizedParams.allUsers;
        delete sanitizedParams.adminView;
        delete sanitizedParams.systemData;
      }

      return {
        isValid: errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        sanitizedParams: errors.length === 0 ? sanitizedParams : undefined,
      };
    } catch (error) {
      console.error('API request validation failed:', error);
      return {
        isValid: false,
        errors: ['Request validation failed'],
      };
    }
  }

  /**
   * Log access attempts for security monitoring
   */
  private static logAccessAttempt(logEntry: FacultyAccessAuditLog): void {
    try {
      this.auditLogs.push(logEntry);
      
      // Keep only recent logs to prevent memory issues
      if (this.auditLogs.length > this.MAX_AUDIT_LOGS) {
        this.auditLogs = this.auditLogs.slice(-this.MAX_AUDIT_LOGS + 1000);
      }

      // Log suspicious activities
      if (!logEntry.success && logEntry.userId && logEntry.resourceOwnerId && 
          logEntry.userId !== logEntry.resourceOwnerId) {
        console.warn('Potential IDOR attempt:', {
          userId: logEntry.userId,
          targetResource: logEntry.resourceId,
          resourceOwner: logEntry.resourceOwnerId,
          timestamp: new Date(logEntry.timestamp).toISOString()
        });
      }
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }

  /**
   * Update the success status of the most recent audit log
   */
  private static updateLastAuditLog(updates: Partial<FacultyAccessAuditLog>): void {
    try {
      if (this.auditLogs.length > 0) {
        const lastLog = this.auditLogs[this.auditLogs.length - 1];
        Object.assign(lastLog, updates);
      }
    } catch (error) {
      console.error('Audit log update failed:', error);
    }
  }

  /**
   * Get audit logs for security monitoring (admin only)
   */
  static getAuditLogs(
    accessContext: FacultyAccessContext,
    filters?: { userId?: string; resourceType?: FacultyResourceType; timeRange?: { start: number; end: number } }
  ): FacultyAccessAuditLog[] {
    // Only admins can view audit logs
    if (accessContext.userRole !== 'admin') {
      throw new SecureError(
        ErrorType.AUTHORIZATION,
        'Access denied to audit logs'
      );
    }

    try {
      let logs = this.auditLogs;

      if (filters) {
        logs = logs.filter(log => {
          if (filters.userId && log.userId !== filters.userId) return false;
          if (filters.resourceType && log.resourceType !== filters.resourceType) return false;
          if (filters.timeRange) {
            if (log.timestamp < filters.timeRange.start || log.timestamp > filters.timeRange.end) {
              return false;
            }
          }
          return true;
        });
      }

      return logs.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Audit log retrieval failed:', error);
      return [];
    }
  }

  /**
   * Check for suspicious access patterns
   */
  static detectSuspiciousActivity(
    userId: string,
    timeWindowMinutes: number = 60
  ): { isSuspicious: boolean; alerts: string[] } {
    try {
      const alerts: string[] = [];
      const now = Date.now();
      const timeWindow = timeWindowMinutes * 60 * 1000;
      const recentLogs = this.auditLogs.filter(
        log => log.userId === userId && log.timestamp > (now - timeWindow)
      );

      // Check for excessive failed access attempts
      const failedAttempts = recentLogs.filter(log => !log.success);
      if (failedAttempts.length > 20) {
        alerts.push('Excessive failed access attempts detected');
      }

      // Check for attempts to access many different users' resources
      const targetedUsers = new Set(
        recentLogs
          .filter(log => log.resourceOwnerId && log.resourceOwnerId !== userId)
          .map(log => log.resourceOwnerId)
      );
      if (targetedUsers.size > 5) {
        alerts.push('Attempts to access multiple users\' resources detected');
      }

      // Check for rapid-fire requests (potential automated attack)
      const rapidRequests = recentLogs.filter((log, index) => {
        if (index === 0) return false;
        const previousLog = recentLogs[index - 1];
        return (log.timestamp - previousLog.timestamp) < 1000; // Less than 1 second apart
      });
      if (rapidRequests.length > 10) {
        alerts.push('Rapid-fire access attempts detected');
      }

      return {
        isSuspicious: alerts.length > 0,
        alerts,
      };
    } catch (error) {
      console.error('Suspicious activity detection failed:', error);
      return {
        isSuspicious: false,
        alerts: [],
      };
    }
  }
}

// React hook for faculty data isolation
export function useFacultyDataIsolation(userContext: FacultyAccessContext) {
  const canAccessResource = (
    resource: FacultyResourceOwnership,
    permission: FacultyResourcePermission
  ) => FacultyDataIsolation.canAccessResource(userContext, resource, permission);

  const validateOwnership = (resourceType: FacultyResourceType, resourceData: any) =>
    FacultyDataIsolation.validateResourceOwnership(userContext, resourceType, resourceData);

  const filterResources = <T extends { ownerId?: string; facultyId?: string; createdBy?: string; department?: string }>(
    resources: T[],
    resourceType: FacultyResourceType
  ) => FacultyDataIsolation.filterUserAccessibleResources(userContext, resources, resourceType);

  const createQueryFilters = (resourceType: FacultyResourceType) =>
    FacultyDataIsolation.createSecureQueryFilters(userContext, resourceType);

  const validateApiRequest = (requestParams: any) =>
    FacultyDataIsolation.validateApiRequest(userContext, requestParams);

  return {
    canAccessResource,
    validateOwnership,
    filterResources,
    createQueryFilters,
    validateApiRequest,
    FacultyResourceType,
    FacultyResourcePermission,
  };
}