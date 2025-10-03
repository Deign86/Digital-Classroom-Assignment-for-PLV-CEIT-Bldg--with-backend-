// Faculty Authorization Middleware - Validates permissions for accessing resources
// Implements comprehensive authorization layer for faculty-specific operations

import { FacultyDataIsolation, FacultyResourceType, FacultyResourcePermission, FacultyAccessContext } from './facultyDataIsolation';
import { ErrorHandler, ErrorType, SecureError } from './errorHandling';
import { FacultyXSSProtection } from './facultyXSSProtection';

// Authorization result interface
export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
  sanitizedParams?: any;
  requiredRole?: string;
  redirectTo?: string;
}

// Resource access patterns
export interface ResourceAccessPattern {
  resourceType: FacultyResourceType;
  operation: 'create' | 'read' | 'update' | 'delete' | 'list';
  ownershipRequired: boolean;
  minimumRole: 'faculty' | 'admin' | 'super_admin';
  departmentRestricted: boolean;
}

// Faculty authorization middleware configuration
export const FACULTY_AUTHORIZATION_RULES: Record<string, ResourceAccessPattern> = {
  // Profile operations
  'faculty_profile_read': {
    resourceType: FacultyResourceType.PROFILE,
    operation: 'read',
    ownershipRequired: true,
    minimumRole: 'faculty',
    departmentRestricted: false
  },
  'faculty_profile_update': {
    resourceType: FacultyResourceType.PROFILE,
    operation: 'update',
    ownershipRequired: true,
    minimumRole: 'faculty',
    departmentRestricted: false
  },
  
  // Schedule operations
  'faculty_schedule_read': {
    resourceType: FacultyResourceType.SCHEDULE,
    operation: 'read',
    ownershipRequired: true,
    minimumRole: 'faculty',
    departmentRestricted: false
  },
  'faculty_schedule_create': {
    resourceType: FacultyResourceType.SCHEDULE,
    operation: 'create',
    ownershipRequired: true,
    minimumRole: 'faculty',
    departmentRestricted: false
  },
  'faculty_schedule_update': {
    resourceType: FacultyResourceType.SCHEDULE,
    operation: 'update',
    ownershipRequired: true,
    minimumRole: 'faculty',
    departmentRestricted: false
  },
  'faculty_schedule_list_department': {
    resourceType: FacultyResourceType.SCHEDULE,
    operation: 'list',
    ownershipRequired: false,
    minimumRole: 'faculty',
    departmentRestricted: true
  },
  
  // Booking operations
  'faculty_booking_read': {
    resourceType: FacultyResourceType.BOOKING,
    operation: 'read',
    ownershipRequired: true,
    minimumRole: 'faculty',
    departmentRestricted: false
  },
  'faculty_booking_create': {
    resourceType: FacultyResourceType.BOOKING,
    operation: 'create',
    ownershipRequired: true,
    minimumRole: 'faculty',
    departmentRestricted: false
  },
  'faculty_booking_update': {
    resourceType: FacultyResourceType.BOOKING,
    operation: 'update',
    ownershipRequired: true,
    minimumRole: 'faculty',
    departmentRestricted: false
  },
  'faculty_booking_delete': {
    resourceType: FacultyResourceType.BOOKING,
    operation: 'delete',
    ownershipRequired: true,
    minimumRole: 'faculty',
    departmentRestricted: false
  },
  
  // Course operations
  'faculty_course_read': {
    resourceType: FacultyResourceType.COURSE,
    operation: 'read',
    ownershipRequired: true,
    minimumRole: 'faculty',
    departmentRestricted: false
  },
  'faculty_course_create': {
    resourceType: FacultyResourceType.COURSE,
    operation: 'create',
    ownershipRequired: true,
    minimumRole: 'faculty',
    departmentRestricted: false
  },
  'faculty_course_list_department': {
    resourceType: FacultyResourceType.COURSE,
    operation: 'list',
    ownershipRequired: false,
    minimumRole: 'faculty',
    departmentRestricted: true
  },
  
  // Room access (for viewing available rooms)
  'room_list_available': {
    resourceType: FacultyResourceType.BOOKING,
    operation: 'list',
    ownershipRequired: false,
    minimumRole: 'faculty',
    departmentRestricted: false
  },
  
  // Admin operations
  'admin_all_profiles': {
    resourceType: FacultyResourceType.PROFILE,
    operation: 'list',
    ownershipRequired: false,
    minimumRole: 'admin',
    departmentRestricted: false
  },
  'admin_all_bookings': {
    resourceType: FacultyResourceType.BOOKING,
    operation: 'list',
    ownershipRequired: false,
    minimumRole: 'admin',
    departmentRestricted: false
  },
  'admin_faculty_reports': {
    resourceType: FacultyResourceType.REPORTS,
    operation: 'read',
    ownershipRequired: false,
    minimumRole: 'admin',
    departmentRestricted: false
  }
} as const;

export class FacultyAuthorizationMiddleware {
  /**
   * Main authorization check for faculty operations
   */
  static async authorize(
    operation: string,
    accessContext: FacultyAccessContext,
    resourceData?: any,
    requestParams?: any
  ): Promise<AuthorizationResult> {
    try {
      // Get authorization rule for this operation
      const rule = FACULTY_AUTHORIZATION_RULES[operation];
      if (!rule) {
        console.warn(`No authorization rule found for operation: ${operation}`);
        return {
          authorized: false,
          reason: 'Operation not recognized',
          requiredRole: 'admin'
        };
      }

      // Check if user session is valid
      if (!this.validateUserSession(accessContext)) {
        return {
          authorized: false,
          reason: 'Invalid or expired session',
          redirectTo: '/login'
        };
      }

      // Check minimum role requirement
      if (!this.hasRequiredRole(accessContext.userRole, rule.minimumRole)) {
        return {
          authorized: false,
          reason: `${rule.minimumRole} role required`,
          requiredRole: rule.minimumRole
        };
      }

      // Sanitize request parameters
      const sanitizationResult = await this.sanitizeRequestParams(requestParams, rule);
      if (!sanitizationResult.isValid) {
        return {
          authorized: false,
          reason: 'Invalid request parameters'
        };
      }

      // Check ownership if required
      if (rule.ownershipRequired && resourceData) {
        const ownershipResult = await this.validateResourceOwnership(
          accessContext,
          resourceData,
          rule.resourceType
        );
        
        if (!ownershipResult.authorized) {
          return ownershipResult;
        }
      }

      // Check department restrictions
      if (rule.departmentRestricted) {
        const departmentResult = await this.validateDepartmentAccess(
          accessContext,
          resourceData,
          sanitizationResult.sanitizedParams
        );
        
        if (!departmentResult.authorized) {
          return departmentResult;
        }
      }

      // Check specific resource permissions
      const permissionResult = await this.validateResourcePermission(
        accessContext,
        rule,
        resourceData
      );

      return {
        authorized: permissionResult.authorized,
        reason: permissionResult.reason,
        sanitizedParams: sanitizationResult.sanitizedParams
      };

    } catch (error) {
      console.error('Authorization check failed:', error);
      return {
        authorized: false,
        reason: 'Authorization check failed'
      };
    }
  }

  /**
   * Validate user session
   */
  private static validateUserSession(accessContext: FacultyAccessContext): boolean {
    try {
      // Check basic session requirements
      if (!accessContext.userId || !accessContext.userRole) {
        return false;
      }

      // Check session age (should be less than 8 hours for faculty)
      const currentTime = Date.now();
      const sessionAge = currentTime - accessContext.timestamp;
      const maxSessionAge = accessContext.userRole === 'admin' ? 
        12 * 60 * 60 * 1000 : // 12 hours for admin
        8 * 60 * 60 * 1000;   // 8 hours for faculty

      if (sessionAge > maxSessionAge) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Session validation failed:', error);
      return false;
    }
  }

  /**
   * Check if user has required role
   */
  private static hasRequiredRole(userRole: string, requiredRole: string): boolean {
    const roleHierarchy = {
      'faculty': 0,
      'admin': 1,
      'super_admin': 2
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? -1;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] ?? 999;

    return userLevel >= requiredLevel;
  }

  /**
   * Sanitize and validate request parameters
   */
  private static async sanitizeRequestParams(
    requestParams: any,
    rule: ResourceAccessPattern
  ): Promise<{ isValid: boolean; sanitizedParams?: any; errors?: string[] }> {
    try {
      if (!requestParams) {
        return { isValid: true, sanitizedParams: {} };
      }

      // Sanitize based on resource type
      let formType: 'profile' | 'schedule' | 'booking' | 'search' = 'search';
      
      switch (rule.resourceType) {
        case FacultyResourceType.PROFILE:
          formType = 'profile';
          break;
        case FacultyResourceType.SCHEDULE:
          formType = 'schedule';
          break;
        case FacultyResourceType.BOOKING:
          formType = 'booking';
          break;
        default:
          formType = 'search';
      }

      const sanitizationResult = FacultyXSSProtection.sanitizeFacultyForm(requestParams, formType);

      return {
        isValid: sanitizationResult.errors.length === 0,
        sanitizedParams: sanitizationResult.sanitized,
        errors: sanitizationResult.errors
      };

    } catch (error) {
      console.error('Request parameter sanitization failed:', error);
      return {
        isValid: false,
        errors: ['Parameter validation failed']
      };
    }
  }

  /**
   * Validate resource ownership
   */
  private static async validateResourceOwnership(
    accessContext: FacultyAccessContext,
    resourceData: any,
    resourceType: FacultyResourceType
  ): Promise<AuthorizationResult> {
    try {
      // Admin can access all resources
      if (accessContext.userRole === 'admin') {
        return { authorized: true };
      }

      // Get resource owner ID
      const resourceOwnerId = resourceData.ownerId || 
                             resourceData.facultyId || 
                             resourceData.createdBy ||
                             resourceData.userId;

      // Check if resource belongs to the requesting user
      if (!resourceOwnerId) {
        return {
          authorized: false,
          reason: 'Resource ownership information not found'
        };
      }

      if (resourceOwnerId !== accessContext.userId) {
        // Log potential IDOR attempt
        console.warn('Potential IDOR attempt:', {
          userId: accessContext.userId,
          requestedResourceOwner: resourceOwnerId,
          resourceType,
          timestamp: new Date().toISOString()
        });

        return {
          authorized: false,
          reason: 'You can only access your own resources'
        };
      }

      return { authorized: true };

    } catch (error) {
      console.error('Resource ownership validation failed:', error);
      return {
        authorized: false,
        reason: 'Ownership validation failed'
      };
    }
  }

  /**
   * Validate department access
   */
  private static async validateDepartmentAccess(
    accessContext: FacultyAccessContext,
    resourceData: any,
    requestParams: any
  ): Promise<AuthorizationResult> {
    try {
      // Admin can access all departments
      if (accessContext.userRole === 'admin') {
        return { authorized: true };
      }

      // Faculty can only access their own department
      const userDepartment = accessContext.department;
      if (!userDepartment) {
        return {
          authorized: false,
          reason: 'User department information not available'
        };
      }

      // Check resource department
      const resourceDepartment = resourceData?.department || requestParams?.department;
      
      if (resourceDepartment && resourceDepartment !== userDepartment) {
        return {
          authorized: false,
          reason: 'You can only access resources from your department'
        };
      }

      return { authorized: true };

    } catch (error) {
      console.error('Department access validation failed:', error);
      return {
        authorized: false,
        reason: 'Department validation failed'
      };
    }
  }

  /**
   * Validate specific resource permissions using data isolation
   */
  private static async validateResourcePermission(
    accessContext: FacultyAccessContext,
    rule: ResourceAccessPattern,
    resourceData: any
  ): Promise<AuthorizationResult> {
    try {
      // Create resource ownership object
      const resourceOwnership = {
        resourceId: resourceData?.id || 'unknown',
        resourceType: rule.resourceType,
        ownerId: resourceData?.ownerId || resourceData?.facultyId || resourceData?.createdBy || 'unknown',
        ownerRole: resourceData?.ownerRole || 'faculty',
        department: resourceData?.department,
        permissions: [] // Will be determined by the access control system
      };

      // Map operation to permission
      let requiredPermission: FacultyResourcePermission;
      switch (rule.operation) {
        case 'read':
        case 'list':
          requiredPermission = FacultyResourcePermission.READ;
          break;
        case 'create':
        case 'update':
          requiredPermission = FacultyResourcePermission.WRITE;
          break;
        case 'delete':
          requiredPermission = FacultyResourcePermission.DELETE;
          break;
        default:
          requiredPermission = FacultyResourcePermission.READ;
      }

      // Check access using data isolation system
      const accessResult = FacultyDataIsolation.canAccessResource(
        accessContext,
        resourceOwnership,
        requiredPermission
      );

      return {
        authorized: accessResult.allowed,
        reason: accessResult.reason
      };

    } catch (error) {
      console.error('Resource permission validation failed:', error);
      return {
        authorized: false,
        reason: 'Permission check failed'
      };
    }
  }

  /**
   * Quick authorization check for common operations
   */
  static async canAccessFacultyResource(
    userId: string,
    userRole: string,
    department: string,
    operation: keyof typeof FACULTY_AUTHORIZATION_RULES,
    resourceOwnerId?: string
  ): Promise<boolean> {
    try {
      const accessContext: FacultyAccessContext = {
        userId,
        userRole,
        department,
        permissions: [],
        timestamp: Date.now()
      };

      const resourceData = resourceOwnerId ? { ownerId: resourceOwnerId } : {};
      
      const result = await this.authorize(operation, accessContext, resourceData);
      return result.authorized;

    } catch (error) {
      console.error('Quick access check failed:', error);
      return false;
    }
  }

  /**
   * Generate secure query filters for faculty resources
   */
  static generateSecureFilters(
    accessContext: FacultyAccessContext,
    resourceType: FacultyResourceType,
    additionalFilters?: Record<string, any>
  ): Record<string, any> {
    try {
      const baseFilters = FacultyDataIsolation.createSecureQueryFilters(
        accessContext,
        resourceType
      );

      // Combine with additional filters
      const combinedFilters = {
        ...baseFilters.where,
        ...(additionalFilters || {})
      };

      // Sanitize additional filters
      const sanitizedFilters: Record<string, any> = {};
      for (const [key, value] of Object.entries(combinedFilters)) {
        if (typeof value === 'string') {
          sanitizedFilters[key] = FacultyXSSProtection.sanitizeFacultyInput(key, value, 'api');
        } else {
          sanitizedFilters[key] = value;
        }
      }

      return sanitizedFilters;

    } catch (error) {
      console.error('Filter generation failed:', error);
      return { userId: accessContext.userId }; // Fallback to user filter
    }
  }

  /**
   * Middleware function for Express-like frameworks
   */
  static createMiddleware(operation: keyof typeof FACULTY_AUTHORIZATION_RULES) {
    return async (req: any, res: any, next: any) => {
      try {
        // Extract access context from request
        const accessContext: FacultyAccessContext = {
          userId: req.user?.uid || req.user?.id,
          userRole: req.user?.role || 'faculty',
          department: req.user?.department,
          permissions: req.user?.permissions || [],
          sessionId: req.sessionID,
          ipAddress: req.ip,
          timestamp: Date.now()
        };

        // Authorize the operation
        const result = await this.authorize(
          operation,
          accessContext,
          req.body,
          { ...req.query, ...req.params }
        );

        if (!result.authorized) {
          // Handle unauthorized access
          const statusCode = result.requiredRole ? 403 : 401;
          const response = {
            error: 'Access denied',
            reason: result.reason,
            requiredRole: result.requiredRole,
            timestamp: new Date().toISOString()
          };

          if (result.redirectTo) {
            return res.redirect(result.redirectTo);
          }

          return res.status(statusCode).json(response);
        }

        // Add sanitized parameters to request
        if (result.sanitizedParams) {
          req.sanitizedParams = result.sanitizedParams;
        }

        next();

      } catch (error) {
        console.error('Authorization middleware failed:', error);
        res.status(500).json({
          error: 'Authorization check failed',
          timestamp: new Date().toISOString()
        });
      }
    };
  }
}

// React hook for faculty authorization
export function useFacultyAuthorization(accessContext: FacultyAccessContext) {
  const canAccess = async (
    operation: keyof typeof FACULTY_AUTHORIZATION_RULES,
    resourceData?: any,
    requestParams?: any
  ) => {
    const result = await FacultyAuthorizationMiddleware.authorize(
      operation,
      accessContext,
      resourceData,
      requestParams
    );
    return result.authorized;
  };

  const quickCheck = (
    operation: keyof typeof FACULTY_AUTHORIZATION_RULES,
    resourceOwnerId?: string
  ) => {
    return FacultyAuthorizationMiddleware.canAccessFacultyResource(
      accessContext.userId,
      accessContext.userRole,
      accessContext.department || '',
      operation,
      resourceOwnerId
    );
  };

  const createFilters = (
    resourceType: FacultyResourceType,
    additionalFilters?: Record<string, any>
  ) => {
    return FacultyAuthorizationMiddleware.generateSecureFilters(
      accessContext,
      resourceType,
      additionalFilters
    );
  };

  return {
    canAccess,
    quickCheck,
    createFilters,
    authRules: FACULTY_AUTHORIZATION_RULES,
    FacultyResourceType,
    FacultyResourcePermission
  };
}