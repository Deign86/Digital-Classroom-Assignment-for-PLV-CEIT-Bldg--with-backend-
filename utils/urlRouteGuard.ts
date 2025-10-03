// URL Route Protection Utility
// Prevents unauthorized access to protected routes via direct URL manipulation

import { User } from '../App';
import { RouteProtectionUtils } from '../components/RouteProtection';
import { toast } from 'sonner';

export class URLRouteGuard {
  private static currentUser: User | null = null;
  private static isInitialized = false;

  /**
   * Initialize the URL route guard
   */
  static initialize(user: User | null): void {
    this.currentUser = user;

    if (!this.isInitialized) {
      // Monitor for URL changes via browser navigation
      window.addEventListener('popstate', this.handleURLChange.bind(this));
      
      // Monitor for programmatic navigation attempts
      this.interceptHashChanges();
      
      this.isInitialized = true;
      console.log('🛡️ URL Route Guard initialized');
    }

    // Check current URL on initialization
    this.validateCurrentURL();
  }

  /**
   * Update the current user context
   */
  static updateUser(user: User | null): void {
    this.currentUser = user;
    this.validateCurrentURL();
  }

  /**
   * Validate the current URL against user permissions
   */
  private static validateCurrentURL(): void {
    const currentPath = window.location.pathname + window.location.hash;
    const validation = this.validateRouteAccess(currentPath);

    if (!validation.hasAccess) {
      console.warn(`🚫 Unauthorized access attempt to: ${currentPath}`);
      console.warn(`Reason: ${validation.reason}`);
      
      // Show access denied message
      toast.error('Access Denied', {
        description: validation.reason || 'You do not have permission to access this area.',
        duration: 5000,
      });

      // Redirect to appropriate route
      if (validation.redirectTo) {
        this.safeRedirect(validation.redirectTo);
      }
    }
  }

  /**
   * Handle URL changes (back/forward buttons)
   */
  private static handleURLChange(): void {
    console.log('🔄 URL changed via navigation');
    this.validateCurrentURL();
  }

  /**
   * Intercept hash changes for client-side routing
   */
  private static interceptHashChanges(): void {
    window.addEventListener('hashchange', () => {
      console.log('🔄 Hash changed');
      this.validateCurrentURL();
    });
  }

  /**
   * Validate if user can access a specific route
   */
  private static validateRouteAccess(route: string): {
    hasAccess: boolean;
    redirectTo?: string;
    reason?: string;
  } {
    // Extract the meaningful part of the route
    const normalizedRoute = this.normalizeRoute(route);

    // Check authentication first
    if (!this.currentUser) {
      return {
        hasAccess: false,
        redirectTo: '/',
        reason: 'Authentication required'
      };
    }

    // Check if user is approved
    if (this.currentUser.status !== 'approved') {
      return {
        hasAccess: false,
        redirectTo: '/',
        reason: 'Account pending approval'
      };
    }

    // Check admin routes
    if (this.isAdminRoute(normalizedRoute)) {
      if (this.currentUser.role !== 'admin') {
        return {
          hasAccess: false,
          redirectTo: '/faculty',
          reason: 'Administrator privileges required'
        };
      }
    }

    // Check faculty routes
    if (this.isFacultyRoute(normalizedRoute)) {
      if (this.currentUser.role !== 'faculty' && this.currentUser.role !== 'admin') {
        return {
          hasAccess: false,
          redirectTo: '/',
          reason: 'Faculty privileges required'
        };
      }
    }

    return { hasAccess: true };
  }

  /**
   * Normalize route for comparison
   */
  private static normalizeRoute(route: string): string {
    // Remove query parameters and fragments
    const cleanRoute = route.split('?')[0].split('#')[0];
    
    // Ensure it starts with /
    return cleanRoute.startsWith('/') ? cleanRoute : `/${cleanRoute}`;
  }

  /**
   * Check if route is an admin route
   */
  private static isAdminRoute(route: string): boolean {
    const adminRoutes = [
      '/admin',
      '/admin/',
      '/admin/dashboard',
      '/admin/classrooms',
      '/admin/requests',
      '/admin/reports',
      '/admin/users',
      '/admin/settings',
      '/classroom-management',
      '/signup-approval',
      '/admin-reports',
      '/admin-dashboard'
    ];

    return adminRoutes.some(adminRoute => 
      route === adminRoute || route.startsWith(adminRoute + '/')
    );
  }

  /**
   * Check if route is a faculty route
   */
  private static isFacultyRoute(route: string): boolean {
    const facultyRoutes = [
      '/faculty',
      '/faculty/',
      '/faculty/dashboard',
      '/faculty/booking',
      '/faculty/schedule',
      '/room-booking',
      '/faculty-schedule',
      '/faculty-dashboard'
    ];

    return facultyRoutes.some(facultyRoute => 
      route === facultyRoute || route.startsWith(facultyRoute + '/')
    );
  }

  /**
   * Safely redirect to a route
   */
  private static safeRedirect(path: string): void {
    console.log(`🔀 Redirecting to: ${path}`);
    
    try {
      // Simple redirect without refresh to avoid loops
      window.location.href = path;
    } catch (error) {
      console.error('Failed to redirect:', error);
      // Fallback - just prevent the action, don't redirect
      console.warn('Redirect failed, access blocked');
    }
  }

  /**
   * Check if a URL is trying to access admin areas
   */
  static isAttemptingAdminAccess(): boolean {
    const currentRoute = this.normalizeRoute(window.location.pathname + window.location.hash);
    return this.isAdminRoute(currentRoute) && this.currentUser?.role !== 'admin';
  }

  /**
   * Check if a URL is trying to access faculty areas
   */
  static isAttemptingFacultyAccess(): boolean {
    const currentRoute = this.normalizeRoute(window.location.pathname + window.location.hash);
    return this.isFacultyRoute(currentRoute) && 
           this.currentUser?.role !== 'faculty' && 
           this.currentUser?.role !== 'admin';
  }

  /**
   * Get the appropriate default route for a user
   */
  static getDefaultRouteForUser(user: User | null): string {
    if (!user || user.status !== 'approved') {
      return '/';
    }

    return user.role === 'admin' ? '/admin' : '/faculty';
  }

  /**
   * Manual route validation (for programmatic navigation)
   */
  static canAccessRoute(route: string, user: User | null = this.currentUser): boolean {
    const tempUser = this.currentUser;
    this.currentUser = user;
    
    const validation = this.validateRouteAccess(route);
    
    this.currentUser = tempUser;
    
    return validation.hasAccess;
  }

  /**
   * Block navigation to unauthorized routes
   */
  static blockUnauthorizedNavigation(): void {
    // Intercept clicks on links
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (link && link.href) {
        const url = new URL(link.href, window.location.origin);
        const route = url.pathname + url.hash;
        
        if (!this.canAccessRoute(route)) {
          event.preventDefault();
          console.warn(`🚫 Blocked navigation to unauthorized route: ${route}`);
          
          toast.error('Access Denied', {
            description: 'You do not have permission to access this area.',
            duration: 3000,
          });
        }
      }
    });
  }

  /**
   * Cleanup event listeners
   */
  static cleanup(): void {
    if (this.isInitialized) {
      window.removeEventListener('popstate', this.handleURLChange);
      window.removeEventListener('hashchange', this.handleURLChange);
      this.isInitialized = false;
      console.log('🛡️ URL Route Guard cleaned up');
    }
  }
}

/**
 * React hook for URL route protection
 */
export function useURLRouteProtection(user: User | null): void {
  React.useEffect(() => {
    URLRouteGuard.initialize(user);
    URLRouteGuard.blockUnauthorizedNavigation();
    
    return () => {
      URLRouteGuard.cleanup();
    };
  }, [user]);

  React.useEffect(() => {
    URLRouteGuard.updateUser(user);
  }, [user]);
}

// Import React for the hook
import React from 'react';