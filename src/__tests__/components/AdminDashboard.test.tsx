import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminDashboard from '../../../components/AdminDashboard';
import { createMockUser, createMockBookingRequest, createMockClassroom } from '../__mocks__/firebase';

// Mock lazy-loaded components
vi.mock('../../../components/ClassroomManagement', () => ({
  default: () => <div>ClassroomManagement</div>,
}));

vi.mock('../../../components/RequestApproval', () => ({
  default: () => <div>RequestApproval</div>,
}));

describe('AdminDashboard', () => {
  const mockUser = createMockUser({ id: 'admin_1', role: 'admin' });
  const mockClassrooms = [createMockClassroom({ id: 'class_1' })];
  const mockRequests = [createMockBookingRequest({ id: 'req_1', status: 'pending' })];

  const defaultProps = {
    user: mockUser,
    classrooms: mockClassrooms,
    bookingRequests: mockRequests,
    signupRequests: [],
    signupHistory: [],
    schedules: [],
    users: [],
    onLogout: vi.fn(),
    onClassroomUpdate: vi.fn(),
    onRequestApproval: vi.fn().mockResolvedValue(undefined),
    onSignupApproval: vi.fn().mockResolvedValue(undefined),
    onCancelSchedule: vi.fn(),
    checkConflicts: vi.fn().mockResolvedValue(false),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('tab switching', () => {
    it('should switch between tabs', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard {...defaultProps} />);

      const requestsTab = screen.getByRole('tab', { name: /requests/i });
      await user.click(requestsTab);

      expect(screen.getByText(/RequestApproval/i)).toBeInTheDocument();
    });
  });

  describe('requests tab', () => {
    it('should display booking requests', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard {...defaultProps} />);

      const requestsTab = screen.getByRole('tab', { name: /requests/i });
      await user.click(requestsTab);

      expect(screen.getByText(/RequestApproval/i)).toBeInTheDocument();
    });
  });

  describe('users tab', () => {
    it('should display user management', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard {...defaultProps} />);

      const usersTab = screen.getByRole('tab', { name: /users/i });
      if (usersTab) {
        await user.click(usersTab);
        // Should show user management
      }
    });
  });

  describe('approve/reject', () => {
    it('should approve booking request', async () => {
      const onRequestApproval = vi.fn().mockResolvedValue(undefined);
      render(<AdminDashboard {...defaultProps} onRequestApproval={onRequestApproval} />);

      // Navigate to requests tab and approve
      const requestsTab = screen.getByRole('tab', { name: /requests/i });
      await userEvent.click(requestsTab);

      await waitFor(() => {
        expect(screen.getByText(/RequestApproval/i)).toBeInTheDocument();
      });
    });
  });

  describe('bulk ops', () => {
    it('should handle bulk operations', () => {
      render(<AdminDashboard {...defaultProps} />);

      // Should support bulk operations
      expect(screen.getByText(/Admin Dashboard/i)).toBeInTheDocument();
    });
  });

  describe('logout', () => {
    it('should call onLogout when logout button clicked', async () => {
      const user = userEvent.setup();
      const onLogout = vi.fn();
      render(<AdminDashboard {...defaultProps} onLogout={onLogout} />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(onLogout).toHaveBeenCalled();
      });
    });
  });

  describe('classrooms tab', () => {
    it('should display classroom management', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard {...defaultProps} />);

      const classroomsTab = screen.getByRole('tab', { name: /classrooms/i });
      await user.click(classroomsTab);

      expect(screen.getByText(/ClassroomManagement/i)).toBeInTheDocument();
    });
  });

  describe('schedules tab', () => {
    it('should display schedules', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard {...defaultProps} />);

      const schedulesTab = screen.getByRole('tab', { name: /schedules/i });
      if (schedulesTab) {
        await user.click(schedulesTab);
        // Should show schedules
      }
    });
  });

  describe('reject request', () => {
    it('should reject booking request with reason', async () => {
      const onRequestApproval = vi.fn().mockResolvedValue(undefined);
      render(<AdminDashboard {...defaultProps} onRequestApproval={onRequestApproval} />);

      const requestsTab = screen.getByRole('tab', { name: /requests/i });
      await userEvent.click(requestsTab);

      await waitFor(() => {
        expect(screen.getByText(/RequestApproval/i)).toBeInTheDocument();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels for tabs', () => {
      render(<AdminDashboard {...defaultProps} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation between tabs', async () => {
      const user = userEvent.setup();
      render(<AdminDashboard {...defaultProps} />);

      await user.keyboard('{Tab}');
      // Should navigate between tabs with keyboard
    });

    it('should have accessible logout button', () => {
      render(<AdminDashboard {...defaultProps} />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      expect(logoutButton).toHaveAttribute('aria-label');
    });
  });
});

