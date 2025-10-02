import { supabase } from './supabaseClient';
import type { User } from '../App';

/**
 * Authentication Service using Supabase Edge Functions
 * Provides secure authentication with server-side validation
 */
export const authService = {
  /**
   * Sign in with email and password using Edge Function
   * @param email - User's email address
   * @param password - User's password (will be securely verified server-side)
   * @returns User object if successful, null otherwise
   */
  async signIn(email: string, password: string): Promise<User | null> {
    try {
      console.log('🔐 Attempting direct sign in...');
      
      // Try direct sign in first (simpler approach)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        console.error('❌ Login failed:', authError?.message);
        return null;
      }

      console.log('✅ Direct login successful, fetching profile...');

      // Fetch user profile from profiles table
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (profileError || !profile) {
        console.error('❌ Profile fetch error:', profileError);
        return null;
      }

      console.log('✅ Profile loaded:', profile.email);

      return {
        id: profile.id,
        email: profile.email,
        name: profile.name,
        role: profile.role,
        department: profile.department,
      };
    } catch (err) {
      console.error('❌ Unexpected login error:', err);
      return null;
    }
  },

  /**
   * Approve signup request and create user account (admin only)
   * Uses Edge Function for secure server-side user creation
   * @param signupRequestId - ID of the signup request to approve
   * @param password - Temporary password set by admin
   * @param adminFeedback - Optional feedback from admin
   * @returns Object with user and error (if any)
   */
  async approveSignupRequest(
    signupRequestId: string,
    password: string,
    adminFeedback?: string
  ): Promise<{ user: User | null; error: string | null }> {
    try {
      // Get current session token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { 
          user: null, 
          error: 'You must be logged in to perform this action' 
        };
      }

      // Call the approve-signup edge function
      const { data, error } = await supabase.functions.invoke('approve-signup', {
        body: { 
          signupRequestId,
          password,
          adminFeedback
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Signup approval error:', error);
        return { user: null, error: error.message };
      }

      if (!data?.success) {
        console.error('Signup approval failed:', data?.error);
        return { user: null, error: data?.error || 'Signup approval failed' };
      }

      console.log('✅ User created successfully from signup request:', signupRequestId);

      return {
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          department: data.user.department,
        } : null,
        error: null,
      };
    } catch (err) {
      console.error('Unexpected error in approveSignupRequest:', err);
      return { user: null, error: 'Failed to approve signup request. Check console for details.' };
    }
  },

  /**
   * Create user account as admin (legacy method - use approveSignupRequest instead)
   * Uses Edge Function for secure server-side user creation
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
      // Get current session token for authorization
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { 
          user: null, 
          error: 'You must be logged in to perform this action' 
        };
      }

      // For direct user creation (not from signup request),
      // we need a different edge function or handle it via admin client
      // For now, return error and suggest using signup approval flow
      return {
        user: null,
        error: 'Direct user creation is deprecated. Please use the signup approval flow instead.'
      };
    } catch (err) {
      console.error('Unexpected error in createUserAsAdmin:', err);
      return { user: null, error: 'Failed to create user account. Check console for details.' };
    }
  },

  /**
   * Send password reset email using Edge Function
   * @param email - User's email address
   */
  async sendPasswordResetEmail(email: string): Promise<{ error: string | null }> {
    try {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { email }
      });

      if (error) {
        return { error: error.message };
      }

      if (!data?.success) {
        return { error: data?.error || 'Failed to send reset email' };
      }

      return { error: null };
    } catch (err) {
      console.error('Password reset error:', err);
      return { error: 'Failed to send reset email' };
    }
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
    try {
      console.log('🔍 Getting current user...');
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        console.log('❌ No session found');
        return null;
      }

      console.log('✅ Session found for user:', session.user.id, session.user.email);

      // Try to fetch profile with a reasonable timeout
      try {
        console.log('📡 Fetching profile from database...');
        
        const fetchPromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        // 2 second timeout for profile fetch
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Profile fetch timeout')), 2000);
        });

        const { data: profile, error } = await Promise.race([
          fetchPromise,
          timeoutPromise
        ]) as any;

        if (error) {
          console.error('❌ Profile fetch error:', error.code, error.message);
          
          // If profile doesn't exist (PGRST116), session is invalid
          if (error.code === 'PGRST116') {
            console.warn('⚠️ Profile not found - clearing invalid session');
            await supabase.auth.signOut({ scope: 'local' });
            return null;
          }
          
          // For other errors, fallback to session data
          throw error;
        }

        if (profile) {
          console.log('✅ Profile loaded successfully:', profile.email, profile.role);
          return {
            id: profile.id,
            email: profile.email,
            name: profile.name,
            role: profile.role,
            department: profile.department,
          };
        }
      } catch (profileError: any) {
        console.warn('⚠️ Could not fetch profile, using session data as fallback:', profileError.message);
        
        // Fallback: Create minimal user from session data
        // This allows the app to continue even if profile fetch is slow/failing
        return {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email || 'User',
          role: session.user.user_metadata?.role || 'faculty',
          department: session.user.user_metadata?.department,
        };
      }

      return null;
    } catch (err) {
      console.error('❌ Error getting current user:', err);
      return null;
    }
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
    try {
      console.log('🔐 Updating password...');
      
      // Check if we have an active session first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('❌ No active session for password update');
        return { error: 'No active session. Please request a new password reset link.' };
      }
      
      console.log('✅ Active session found, proceeding with password update');
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('❌ Password update error:', error);
        return { error: error.message };
      }

      console.log('✅ Password updated successfully');
      return { error: null };
    } catch (err) {
      console.error('❌ Unexpected error updating password:', err);
      return { error: 'An unexpected error occurred. Please try again.' };
    }
  },
};
