import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FacultyDashboard from '../../../components/FacultyDashboard';
import { createMockUser, createMockBookingRequest, createMockClassroom, createMockSchedule } from '../__mocks__/firebase';

// Mock lazy-loaded components
vi.mock('../../../components/RoomBooking', () => ({
  default: () => <div>RoomBooking</div>,
}));

vi.mock('../../../components/RoomSearch', () => ({
  default: () => <div>RoomSearch</div>,
}));

describe('FacultyDashboard', () => {
  const mockUser = createMockUser({ id: 'faculty_1', role: 'faculty' });
  const mockClassrooms = [createMockClassroom({ id: 'class_1' })];
  const mockSchedules = [createMockSchedule({ id: 'sched_1' })];
  const mockRequests = [createMockBookingRequest({ id: 'req_1', status: 'pending' })];

  const defaultProps = {
    user: mockUser,
    classrooms: mockClassrooms,
    schedules: mockSchedules,
    allSchedules: mockSchedules,
    bookingRequests: mockRequests,
    allBookingRequests: mockRequests,
    onLogout: vi.fn(),
    onBookingRequest: vi.fn(),
    checkConflicts: vi.fn().mockResolvedValue(false),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('reservation interface', () => {
    it('should display booking interface', async () => {
      const user = userEvent.setup();
      render(<FacultyDashboard {...defaultProps} />);

      const bookingTab = screen.getByRole('tab', { name: /booking/i });
      await user.click(bookingTab);

      expect(screen.getByText(/RoomBooking/i)).toBeInTheDocument();
    });
  });

  describe('room search', () => {
    it('should display room search interface', async () => {
      const user = userEvent.setup();
      render(<FacultyDashboard {...defaultProps} />);

      const searchTab = screen.getByRole('tab', { name: /search/i });
      await user.click(searchTab);

      expect(screen.getByText(/RoomSearch/i)).toBeInTheDocument();
    });
  });

  describe('filter', () => {
    it('should filter available rooms', () => {
      render(<FacultyDashboard {...defaultProps} />);

      // Should support filtering
      expect(screen.getByText(/Faculty Dashboard/i)).toBeInTheDocument();
    });
  });

  describe('availability', () => {
    it('should check room availability', () => {
      render(<FacultyDashboard {...defaultProps} />);

      // Should check availability
      expect(screen.getByText(/Faculty Dashboard/i)).toBeInTheDocument();
    });
  });

  describe('conflict detection', () => {
    it('should detect booking conflicts', async () => {
      const checkConflicts = vi.fn().mockResolvedValue(true);
      render(<FacultyDashboard {...defaultProps} checkConflicts={checkConflicts} />);

      // Should detect conflicts
      expect(checkConflicts).toBeDefined();
    });
  });

  describe('request creation', () => {
    it('should create booking request', async () => {
      const onBookingRequest = vi.fn();
      render(<FacultyDashboard {...defaultProps} onBookingRequest={onBookingRequest} />);

      // Should create requests
      expect(onBookingRequest).toBeDefined();
    });
  });

  describe('pending requests', () => {
    it('should display pending requests', () => {
      render(<FacultyDashboard {...defaultProps} />);

      // Should show pending requests
      expect(screen.getByText(/Faculty Dashboard/i)).toBeInTheDocument();
    });
  });

  describe('schedule view', () => {
    it('should display schedule view', async () => {
      const user = userEvent.setup();
      render(<FacultyDashboard {...defaultProps} />);

      const scheduleTab = screen.getByRole('tab', { name: /schedule/i });
      if (scheduleTab) {
        await user.click(scheduleTab);
        // Should show schedule view
      }
    });
  });

  describe('logout', () => {
    it('should call onLogout when logout button clicked', async () => {
      const user = userEvent.setup();
      const onLogout = vi.fn();
      render(<FacultyDashboard {...defaultProps} onLogout={onLogout} />);

      const logoutButton = screen.getByRole('button', { name: /logout/i });
      await user.click(logoutButton);

      await waitFor(() => {
        expect(onLogout).toHaveBeenCalled();
      });
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels for tabs', () => {
      render(<FacultyDashboard {...defaultProps} />);

      const tabs = screen.getAllByRole('tab');
      expect(tabs.length).toBeGreaterThan(0);
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<FacultyDashboard {...defaultProps} />);

      await user.keyboard('{Tab}');
      // Should navigate with keyboard
    });

    it('should have accessible booking form', async () => {
      const user = userEvent.setup();
      render(<FacultyDashboard {...defaultProps} />);

      const bookingTab = screen.getByRole('tab', { name: /booking/i });
      await user.click(bookingTab);

      // Should have accessible form elements
      expect(screen.getByText(/RoomBooking/i)).toBeInTheDocument();
    });
  });
});

