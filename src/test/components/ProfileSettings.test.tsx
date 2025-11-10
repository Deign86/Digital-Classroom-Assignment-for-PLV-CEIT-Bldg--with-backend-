/*
 * ProfileSettings.test.tsx
 * 
 * Tests for user profile settings component.
 * Covers:
 * - Profile information display
 * - Profile editing (name, departments)
 * - Password change functionality
 * - Password validation
 * - Push notification toggle
 * - Push notification support detection
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileSettings from '../../../components/ProfileSettings';
import { authService, userService } from '../../../lib/firebaseService';
import { pushService } from '../../../lib/pushService';
import { toast } from 'sonner';
import { logger } from '../../../lib/logger';
import type { User } from '../../../App';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('../../../lib/firebaseService', () => ({
  authService: {
    updatePassword: vi.fn(),
  },
  userService: {
    update: vi.fn(),
  },
}));

vi.mock('../../../lib/pushService', () => ({
  pushService: {
    isPushSupported: vi.fn(() => true),
    enablePush: vi.fn(),
    disablePush: vi.fn(),
  },
}));

describe('ProfileSettings', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@plv.edu.ph',
    name: 'Test User',
    role: 'faculty',
    department: 'Information Technology',
    departments: ['Information Technology'],
    status: 'approved',
  };

  const mockOnTogglePush = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile Information Display', () => {
    it('should display user name', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(mockUser.name)).toBeInTheDocument();
    });

    it('should display user email', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(mockUser.email)).toBeInTheDocument();
    });

    it('should display user role badge', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(/faculty/i)).toBeInTheDocument();
    });

    it('should display user department', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(/Information Technology/i)).toBeInTheDocument();
    });

    it('should display profile section title', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(/profile settings|personal information/i)).toBeInTheDocument();
    });

    it('should display password section', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByText(/change password|password/i)).toBeInTheDocument();
    });
  });

  describe('Profile Editing', () => {
    it('should have edit button', () => {
      render(<ProfileSettings user={mockUser} />);

      expect(screen.getByRole('button', { name: /edit|edit profile/i })).toBeInTheDocument();
    });

    it('should show editable fields when edit clicked', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    });

    it('should populate fields with current values', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
      expect(nameInput.value).toBe(mockUser.name);
    });

    it('should show save and cancel buttons in edit mode', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      expect(screen.getByRole('button', { name: /save|save changes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should validate name is required', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);

      const saveButton = screen.getByRole('button', { name: /save|save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });
    });

    it('should validate name minimum length', async () => {
      const user = userEvent.setup();
      render(<ProfileSettings user={mockUser} />);

      const editButton = screen.getByRole('button', { name: /edit|edit profile/i });
      await user.click(editButton);

      const nameInput = screen.getByLabelText(/name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'A');

      const saveButton = screen.getByRole('button', { name: /save|save changes/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
      });
    });

(remaining lines preserved)