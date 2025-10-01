import { supabase, supabaseAdmin, hasServiceRoleKey } from './supabaseClient';
import type { User } from '../App';

/**
 * Authentication Service using Supabase Auth
 * Provides secure authentication with hashed passwords
 */
export const authService = {
  /**
   * Sign in with email and password using Supabase Auth
   * @param email - User's email address
   * @param password - User's password (will be securely verified)
   * @returns User object if successful, null otherwise
   */
  async signIn(email: string, password: string): Promise<User | null> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error.message);
      return null;
    }

    if (!data.user) return null;

    // Fetch user profile from profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      department: profile.department,
    };
  },

  /**
   * Create user account as admin (used when admin approves signup requests)
   * Admin provides the temporary password, and Supabase sends a welcome email
   * @param email - User's email address
   * @param password - Temporary password set by admin
   * @param name - User's full name
   * @param role - User's role (admin or faculty)
   * @param department - User's department (optional)
   * @returns Object with user and error (if any)
   */
  async createUserAsAdmin(
    email: string,
    password: string,
    name: string,
    role: 'admin' | 'faculty',
    department?: string
  ): Promise<{ user: User | null; error: string | null }> {
    try {
      // Check if service role key is configured
      if (!hasServiceRoleKey) {
        return { 
          user: null, 
          error: 'Service role key not configured. Add VITE_SUPABASE_SERVICE_ROLE_KEY to your .env file.' 
        };
      }

      // Use admin API to create user with email auto-confirmed
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm so user can login immediately
        user_metadata: {
          name,
          role,
          department,
        },
      });

      if (error) {
        console.error('Admin user creation error:', error);
        return { user: null, error: error.message };
      }

      if (!data.user) {
        return { user: null, error: 'User creation failed' };
      }

      console.log('✅ User created successfully. Supabase will send welcome email to:', email);

      // Profile will be created automatically by the database trigger
      // Wait for trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Fetch the created profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        return { user: null, error: profileError.message };
      }

      // Important: Verify that the current admin session is still valid
      // Creating a user via admin API shouldn't affect the admin's session,
      // but we verify to prevent logout issues
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn('Admin session was lost during user creation. This should not happen.');
      }

      return {
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          department: profile.department,
        },
        error: null,
      };
    } catch (err) {
      console.error('Unexpected error in createUserAsAdmin:', err);
      return { user: null, error: 'Failed to create user account. Check console for details.' };
    }
  },

  /**
   * Send password reset email (admin can use this to let users set their own password)
   * @param email - User's email address
   */
  async sendPasswordResetEmail(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  /**
   * Get current authenticated user
   * @returns User object if authenticated, null otherwise
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) return null;

    // Fetch profile from profiles table
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error || !profile) return null;

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      role: profile.role,
      department: profile.department,
    };
  },

  /**
   * Check if user is authenticated
   * @returns true if authenticated, false otherwise
   */
  async isAuthenticated(): Promise<boolean> {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  },

  /**
   * Listen to authentication state changes
   * @param callback - Function to call when auth state changes
   * @param onAuthError - Optional callback for auth errors (expired links, etc.)
   * @returns Subscription object with unsubscribe method
   */
  onAuthStateChange(
    callback: (user: User | null) => void,
    onAuthError?: (error: string) => void
  ) {
    return supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'Session:', !!session);

      if (event === 'SIGNED_IN' && session?.user) {
        const user = await this.getCurrentUser();
        callback(user);
      } else if (event === 'SIGNED_OUT') {
        callback(null);
      } else if (event === 'TOKEN_REFRESHED') {
        const user = await this.getCurrentUser();
        callback(user);
      } else if (event === 'PASSWORD_RECOVERY') {
        // User clicked password reset link
        console.log('Password recovery event detected');
        // This is handled by the PASSWORD_RECOVERY event
        // Session should be valid if link is not expired
      }
      
      // Handle errors (expired links, invalid tokens, etc.)
      if (event === 'USER_UPDATED' && !session) {
        // This can happen when a password reset link has expired
        if (onAuthError) {
          onAuthError('Session expired. Please request a new password reset link.');
        }
      }
    });
  },

  /**
   * Check if an email exists in the system
   * @param email - User's email address
   * @returns Object with exists boolean and error if any
   */
  async checkEmailExists(email: string): Promise<{ exists: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (error) {
        console.error('Error checking email:', error);
        return { exists: false, error: error.message };
      }

      return { exists: !!data, error: null };
    } catch (err) {
      console.error('Email check error:', err);
      return { exists: false, error: 'Failed to check email' };
    }
  },

  /**
   * Request password reset email
   * @param email - User's email address
   */
  async requestPasswordReset(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  },

  /**
   * Update password
   * @param newPassword - New password
   */
  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  },
};
