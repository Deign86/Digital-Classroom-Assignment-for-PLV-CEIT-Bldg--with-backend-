// Role-based access control (RBAC) utilities
// Prevents privilege escalation and enforces proper authorization

import type { User } from '../App';
import { ErrorHandler, ErrorType, SecureError } from './errorHandling';

// Define available permissions
export enum Permission {
  // User management
  VIEW_USERS = 'VIEW_USERS',
  CREATE_USERS = 'CREATE_USERS',
  UPDATE_USERS = 'UPDATE_USERS',
  DELETE_USERS = 'DELETE_USERS',
  APPROVE_SIGNUPS = 'APPROVE_SIGNUPS',
  
  // Classroom management
  VIEW_CLASSROOMS = 'VIEW_CLASSROOMS',
  CREATE_CLASSROOMS = 'CREATE_CLASSROOMS',
  UPDATE_CLASSROOMS = 'UPDATE_CLASSROOMS',
  DELETE_CLASSROOMS = 'DELETE_CLASSROOMS',
  
  // Booking management
  VIEW_ALL_BOOKINGS = 'VIEW_ALL_BOOKINGS',
  VIEW_OWN_BOOKINGS = 'VIEW_OWN_BOOKINGS',
  CREATE_BOOKINGS = 'CREATE_BOOKINGS',
  UPDATE_BOOKINGS = 'UPDATE_BOOKINGS',
  APPROVE_BOOKINGS = 'APPROVE_BOOKINGS',
  DELETE_BOOKINGS = 'DELETE_BOOKINGS',
  
  // Schedule management
  VIEW_ALL_SCHEDULES = 'VIEW_ALL_SCHEDULES',
  VIEW_OWN_SCHEDULES = 'VIEW_OWN_SCHEDULES',
  CREATE_SCHEDULES = 'CREATE_SCHEDULES',
  UPDATE_SCHEDULES = 'UPDATE_SCHEDULES',
  DELETE_SCHEDULES = 'DELETE_SCHEDULES',
  
  // Reports and analytics
  VIEW_REPORTS = 'VIEW_REPORTS',
  GENERATE_REPORTS = 'GENERATE_REPORTS',
  
  // System administration
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  VIEW_LOGS = 'VIEW_LOGS',
}

// Role definitions with their permissions
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: [
    // User management
    Permission.VIEW_USERS,
    Permission.CREATE_USERS,
    Permission.UPDATE_USERS,
    Permission.DELETE_USERS,
    Permission.APPROVE_SIGNUPS,
    
    // Classroom management
    Permission.VIEW_CLASSROOMS,
    Permission.CREATE_CLASSROOMS,
    Permission.UPDATE_CLASSROOMS,
    Permission.DELETE_CLASSROOMS,
    
    // Booking management
    Permission.VIEW_ALL_BOOKINGS,
    Permission.CREATE_BOOKINGS,
    Permission.UPDATE_BOOKINGS,
    Permission.APPROVE_BOOKINGS,
    Permission.DELETE_BOOKINGS,
    
    // Schedule management
    Permission.VIEW_ALL_SCHEDULES,
    Permission.CREATE_SCHEDULES,
    Permission.UPDATE_SCHEDULES,
    Permission.DELETE_SCHEDULES,
    
    // Reports and analytics
    Permission.VIEW_REPORTS,
    Permission.GENERATE_REPORTS,
    
    // System administration
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_LOGS,
  ],
  
  faculty: [
    // Limited classroom access
    Permission.VIEW_CLASSROOMS,
    
    // Limited booking access
    Permission.VIEW_OWN_BOOKINGS,
    Permission.CREATE_BOOKINGS,
    
    // Limited schedule access
    Permission.VIEW_ALL_SCHEDULES, // Faculty can see all schedules to avoid conflicts
    Permission.VIEW_OWN_SCHEDULES,
  ],
};

// Access control class
export class AccessControl {
  /**
   * Check if a user has a specific permission
   */
  static hasPermission(user: User | null, permission: Permission): boolean {
    if (!user) return false;
    
    // Check user status first
    if (user.status !== 'approved') {
      return false;
    }
    
    const rolePermissions = ROLE_PERMISSIONS[user.role];
    if (!rolePermissions) return false;
    
    return rolePermissions.includes(permission);
  }

  /**
   * Check if a user has any of the specified permissions
   */
  static hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(user, permission));
  }

  /**
   * Check if a user has all of the specified permissions
   */
  static hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(user, permission));
  }

  /**
   * Require a specific permission, throw error if not authorized
   */
  static requirePermission(user: User | null, permission: Permission): void {
    if (!this.hasPermission(user, permission)) {
      throw ErrorHandler.handleAuthorizationError(user?.status);
    }
  }

  /**
   * Require admin role
   */
  static requireAdmin(user: User | null): void {
    if (!user) {
      throw new SecureError(
        ErrorType.AUTHENTICATION,
        'Authentication required',
        undefined,
        401
      );
    }
    
    if (user.status !== 'approved') {
      throw ErrorHandler.handleAuthorizationError(user.status);
    }
    
    if (user.role !== 'admin') {
      throw new SecureError(
        ErrorType.AUTHORIZATION,
        'Administrative privileges required',
        undefined,
        403
      );
    }
  }

  /**
   * Require approved user status
   */
  static requireApprovedUser(user: User | null): void {
    if (!user) {
      throw new SecureError(
        ErrorType.AUTHENTICATION,
        'Authentication required',
        undefined,
        401
      );
    }
    
    if (user.status !== 'approved') {
      throw ErrorHandler.handleAuthorizationError(user.status);
    }
  }

  /**
   * Check if user can modify a resource they own
   */
  static canModifyOwnResource(user: User | null, resourceUserId: string): boolean {
    if (!user || user.status !== 'approved') return false;
    
    // Admins can modify any resource
    if (user.role === 'admin') return true;
    
    // Users can modify their own resources
    return user.id === resourceUserId;
  }

  /**
   * Require user to be able to modify a resource
   */
  static requireResourceAccess(user: User | null, resourceUserId: string): void {
    if (!this.canModifyOwnResource(user, resourceUserId)) {
      throw new SecureError(
        ErrorType.AUTHORIZATION,
        'Access denied. You can only modify your own resources.',
        undefined,
        403
      );
    }
  }

  /**
   * Get user permissions as an array
   */
  static getUserPermissions(user: User | null): Permission[] {
    if (!user || user.status !== 'approved') return [];
    
    return ROLE_PERMISSIONS[user.role] || [];
  }

  /**
   * Check if user can access admin features
   */
  static canAccessAdmin(user: User | null): boolean {
    return this.hasPermission(user, Permission.APPROVE_SIGNUPS);
  }

  /**
   * Check if user can access faculty features
   */
  static canAccessFaculty(user: User | null): boolean {
    return this.hasPermission(user, Permission.CREATE_BOOKINGS);
  }

  /**
   * Validate user can perform action on booking request
   */
  static validateBookingAccess(
    user: User | null, 
    action: 'create' | 'view' | 'update' | 'approve' | 'delete',
    facultyId?: string
  ): void {
    this.requireApprovedUser(user);

    switch (action) {
      case 'create':
        this.requirePermission(user, Permission.CREATE_BOOKINGS);
        break;
      
      case 'view':
        if (facultyId && facultyId !== user!.id) {
          this.requirePermission(user, Permission.VIEW_ALL_BOOKINGS);
        } else {
          this.requirePermission(user, Permission.VIEW_OWN_BOOKINGS);
        }
        break;
      
      case 'update':
        if (facultyId && facultyId !== user!.id) {
          this.requirePermission(user, Permission.UPDATE_BOOKINGS);
        }
        break;
      
      case 'approve':
        this.requirePermission(user, Permission.APPROVE_BOOKINGS);
        break;
      
      case 'delete':
        this.requirePermission(user, Permission.DELETE_BOOKINGS);
        break;
    }
  }

  /**
   * Validate user can perform action on classroom
   */
  static validateClassroomAccess(
    user: User | null, 
    action: 'create' | 'view' | 'update' | 'delete'
  ): void {
    this.requireApprovedUser(user);

    switch (action) {
      case 'create':
        this.requirePermission(user, Permission.CREATE_CLASSROOMS);
        break;
      
      case 'view':
        this.requirePermission(user, Permission.VIEW_CLASSROOMS);
        break;
      
      case 'update':
        this.requirePermission(user, Permission.UPDATE_CLASSROOMS);
        break;
      
      case 'delete':
        this.requirePermission(user, Permission.DELETE_CLASSROOMS);
        break;
    }
  }

  /**
   * Validate user can perform action on signup request
   */
  static validateSignupAccess(
    user: User | null, 
    action: 'view' | 'approve'
  ): void {
    this.requireApprovedUser(user);

    switch (action) {
      case 'view':
      case 'approve':
        this.requirePermission(user, Permission.APPROVE_SIGNUPS);
        break;
    }
  }

  /**
   * Validate user can access reports
   */
  static validateReportsAccess(user: User | null): void {
    this.requireApprovedUser(user);
    this.requirePermission(user, Permission.VIEW_REPORTS);
  }
}

// Decorator for protecting functions with permission checks
export function requirePermission(permission: Permission) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: any, ...args: any[]) {
      // Assume first argument is user or contains user
      const user = args[0]?.user || args[0];
      AccessControl.requirePermission(user, permission);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// Middleware helper for API routes
export const createAuthMiddleware = (requiredPermission?: Permission) => {
  return (user: User | null) => {
    if (requiredPermission) {
      AccessControl.requirePermission(user, requiredPermission);
    } else {
      AccessControl.requireApprovedUser(user);
    }
  };
};

// Security context for components
export interface SecurityContext {
  user: User | null;
  hasPermission: (permission: Permission) => boolean;
  canAccessAdmin: boolean;
  canAccessFaculty: boolean;
  permissions: Permission[];
}

export const createSecurityContext = (user: User | null): SecurityContext => {
  return {
    user,
    hasPermission: (permission: Permission) => AccessControl.hasPermission(user, permission),
    canAccessAdmin: AccessControl.canAccessAdmin(user),
    canAccessFaculty: AccessControl.canAccessFaculty(user),
    permissions: AccessControl.getUserPermissions(user),
  };
};

// Hook for React components (if using React hooks)
export const useSecurityContext = (user: User | null): SecurityContext => {
  return createSecurityContext(user);
};