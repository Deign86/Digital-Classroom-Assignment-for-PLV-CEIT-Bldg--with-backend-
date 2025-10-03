// Route Protection Component
import React from 'react';
import { User } from '../App';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Shield, ArrowLeft } from 'lucide-react';

interface RouteProtectionProps {
  user: User | null;
  requiredRole?: 'admin' | 'faculty';
  requiredPermissions?: string[];
  children: React.ReactNode;
  fallbackComponent?: React.ReactNode;
}

export default function RouteProtection({
  user,
  requiredRole,
  requiredPermissions = [],
  children,
  fallbackComponent
}: RouteProtectionProps) {
  // Check if user is authenticated
  if (!user) {
    return fallbackComponent || <UnauthenticatedFallback />;
  }

  // Check if user is approved
  if (user.status !== 'approved') {
    return fallbackComponent || <UnapprovedUserFallback user={user} />;
  }

  // Check role-based access
  if (requiredRole && user.role !== requiredRole) {
    return fallbackComponent || <UnauthorizedFallback user={user} requiredRole={requiredRole} />;
  }

  // All checks passed, render protected content
  return <>{children}</>;
}

function UnauthenticatedFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-600">Authentication Required</CardTitle>
          <CardDescription>
            You must be logged in to access this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button 
            onClick={() => window.location.href = '/'}
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function UnapprovedUserFallback({ user }: { user: User }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-yellow-600" />
          </div>
          <CardTitle className="text-xl text-yellow-600">Account Pending Approval</CardTitle>
          <CardDescription>
            Hello {user.name}, your account is awaiting administrator approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Account Status:</strong> {user.status}
            </p>
            <p className="text-sm text-yellow-800 mt-1">
              <strong>Department:</strong> {user.department}
            </p>
          </div>
          <p className="text-sm text-gray-600">
            Please contact your administrator to approve your account access.
          </p>
          <Button 
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function UnauthorizedFallback({ user, requiredRole }: { user: User; requiredRole: string }) {
  const getCurrentPageName = () => {
    const path = window.location.pathname;
    if (path.includes('admin')) return 'Administrator Dashboard';
    if (path.includes('reports')) return 'Reports';
    if (path.includes('users')) return 'User Management';
    return 'this page';
  };

  const getRequiredRoleDescription = () => {
    switch (requiredRole) {
      case 'admin':
        return 'Administrator privileges';
      case 'faculty':
        return 'Faculty privileges';
      default:
        return `${requiredRole} privileges`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-600">Access Denied</CardTitle>
          <CardDescription>
            You don't have permission to access {getCurrentPageName()}.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-sm text-red-800">
              <strong>Your Role:</strong> {user.role}
            </p>
            <p className="text-sm text-red-800 mt-1">
              <strong>Required:</strong> {getRequiredRoleDescription()}
            </p>
          </div>
          <p className="text-sm text-gray-600">
            This area is restricted to users with {getRequiredRoleDescription()}.
            If you believe this is an error, please contact your administrator.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => window.history.back()}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            <Button 
              onClick={() => window.location.href = '/'}
              variant="outline"
              className="w-full"
            >
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Higher-order component for route protection
export function withRouteProtection<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  protectionConfig: {
    requiredRole?: 'admin' | 'faculty';
    requiredPermissions?: string[];
  }
) {
  return function ProtectedComponent(props: T & { user: User | null }) {
    const { user, ...restProps } = props;
    
    return (
      <RouteProtection
        user={user}
        requiredRole={protectionConfig.requiredRole}
        requiredPermissions={protectionConfig.requiredPermissions}
      >
        <WrappedComponent {...(restProps as T)} />
      </RouteProtection>
    );
  };
}

// Route protection utility functions
export const RouteProtectionUtils = {
  /**
   * Check if user can access admin routes
   */
  canAccessAdminRoutes(user: User | null): boolean {
    return !!(user && user.status === 'approved' && user.role === 'admin');
  },

  /**
   * Check if user can access faculty routes
   */
  canAccessFacultyRoutes(user: User | null): boolean {
    return !!(user && user.status === 'approved' && (user.role === 'faculty' || user.role === 'admin'));
  },

  /**
   * Get appropriate redirect path based on user role
   */
  getDefaultRoute(user: User | null): string {
    if (!user || user.status !== 'approved') {
      return '/';
    }
    
    return user.role === 'admin' ? '/admin' : '/faculty';
  },

  /**
   * Validate route access and return appropriate action
   */
  validateRouteAccess(user: User | null, route: string): {
    hasAccess: boolean;
    redirectTo?: string;
    reason?: string;
  } {
    if (!user) {
      return {
        hasAccess: false,
        redirectTo: '/',
        reason: 'Authentication required'
      };
    }

    if (user.status !== 'approved') {
      return {
        hasAccess: false,
        redirectTo: '/',
        reason: 'Account pending approval'
      };
    }

    // Admin routes
    if (route.startsWith('/admin') && user.role !== 'admin') {
      return {
        hasAccess: false,
        redirectTo: '/faculty',
        reason: 'Administrator privileges required'
      };
    }

    return { hasAccess: true };
  }
};