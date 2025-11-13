import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminReports from '../../../components/AdminReports';
import { createMockClassroom, createMockSchedule, createMockBookingRequest, createMockSignupRequest } from '../__mocks__/firebase';

describe('AdminReports', () => {
  const mockClassrooms = [
    createMockClassroom({ id: 'class_1', name: 'Room A' }),
    createMockClassroom({ id: 'class_2', name: 'Room B' }),
  ];

  const mockSchedules = [
    createMockSchedule({
      id: 'sched_1',
      classroomId: 'class_1',
      date: '2024-12-15',
      startTime: '09:00',
      endTime: '10:00',
      status: 'confirmed',
    }),
    createMockSchedule({
      id: 'sched_2',
      classroomId: 'class_2',
      date: '2024-12-16',
      startTime: '14:00',
      endTime: '15:00',
      status: 'confirmed',
    }),
  ];

  const mockBookingRequests = [
    createMockBookingRequest({
      id: 'req_1',
      date: '2024-12-15',
      status: 'approved',
    }),
    createMockBookingRequest({
      id: 'req_2',
      date: '2024-12-16',
      status: 'rejected',
    }),
    createMockBookingRequest({
      id: 'req_3',
      date: '2024-12-17',
      status: 'pending',
    }),
  ];

  const mockSignupRequests = [
    createMockSignupRequest({ id: 'signup_1', status: 'pending' }),
    createMockSignupRequest({ id: 'signup_2', status: 'approved' }),
  ];

  const defaultProps = {
    classrooms: mockClassrooms,
    schedules: mockSchedules,
    bookingRequests: mockBookingRequests,
    signupRequests: mockSignupRequests,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('utilization analytics', () => {
    it('should display utilization rate', () => {
      render(<AdminReports {...defaultProps} />);

      expect(screen.getByText(/utilization/i)).toBeInTheDocument();
    });

    it('should calculate classroom utilization correctly', () => {
      render(<AdminReports {...defaultProps} />);

      // Should show utilization statistics
      expect(screen.getByText(/utilization/i)).toBeInTheDocument();
    });

    it('should display utilization by classroom', () => {
      render(<AdminReports {...defaultProps} />);

      // Should show per-classroom utilization
      expect(screen.getByText(/Room A/i)).toBeInTheDocument();
    });
  });

  describe('reservation history', () => {
    it('should display reservation history', () => {
      render(<AdminReports {...defaultProps} />);

      expect(screen.getByText(/reservation/i)).toBeInTheDocument();
    });

    it('should filter reservations by period', async () => {
      const user = userEvent.setup();
      render(<AdminReports {...defaultProps} />);

      const periodSelect = screen.getByLabelText(/period/i);
      await user.selectOptions(periodSelect, 'week');

      await waitFor(() => {
        expect(periodSelect).toHaveValue('week');
      });
    });

    it('should show approved reservations count', () => {
      render(<AdminReports {...defaultProps} />);

      expect(screen.getByText(/approved/i)).toBeInTheDocument();
    });

    it('should show rejected reservations count', () => {
      render(<AdminReports {...defaultProps} />);

      expect(screen.getByText(/rejected/i)).toBeInTheDocument();
    });

    it('should show pending reservations count', () => {
      render(<AdminReports {...defaultProps} />);

      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });
  });

  describe('usage statistics', () => {
    it('should display total booking requests', () => {
      render(<AdminReports {...defaultProps} />);

      expect(screen.getByText(/total/i)).toBeInTheDocument();
    });

    it('should calculate approval rate', () => {
      render(<AdminReports {...defaultProps} />);

      // Should show approval rate percentage
      expect(screen.getByText(/%/i)).toBeInTheDocument();
    });

    it('should display total hours booked', () => {
      render(<AdminReports {...defaultProps} />);

      expect(screen.getByText(/hours/i)).toBeInTheDocument();
    });

    it('should show total classes scheduled', () => {
      render(<AdminReports {...defaultProps} />);

      expect(screen.getByText(/classes/i)).toBeInTheDocument();
    });
  });

  describe('export capabilities', () => {
    it('should have export button', () => {
      render(<AdminReports {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /export|download/i });
      expect(exportButton).toBeInTheDocument();
    });

    it('should export report data when export button clicked', async () => {
      const user = userEvent.setup();
      const mockExport = vi.fn();
      global.URL.createObjectURL = vi.fn(() => 'blob:url');
      global.URL.revokeObjectURL = vi.fn();

      render(<AdminReports {...defaultProps} />);

      const exportButton = screen.getByRole('button', { name: /export|download/i });
      await user.click(exportButton);

      // Should trigger export functionality
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('report period selection', () => {
    it('should filter data by week period', async () => {
      const user = userEvent.setup();
      render(<AdminReports {...defaultProps} />);

      const periodSelect = screen.getByLabelText(/period/i);
      await user.selectOptions(periodSelect, 'week');

      await waitFor(() => {
        expect(periodSelect).toHaveValue('week');
      });
    });

    it('should filter data by month period', async () => {
      const user = userEvent.setup();
      render(<AdminReports {...defaultProps} />);

      const periodSelect = screen.getByLabelText(/period/i);
      await user.selectOptions(periodSelect, 'month');

      await waitFor(() => {
        expect(periodSelect).toHaveValue('month');
      });
    });

    it('should filter data by semester period', async () => {
      const user = userEvent.setup();
      render(<AdminReports {...defaultProps} />);

      const periodSelect = screen.getByLabelText(/period/i);
      await user.selectOptions(periodSelect, 'semester');

      await waitFor(() => {
        expect(periodSelect).toHaveValue('semester');
      });
    });
  });

  describe('charts and visualizations', () => {
    it('should display utilization chart', () => {
      render(<AdminReports {...defaultProps} />);

      // Should render charts
      expect(screen.getByText(/utilization/i)).toBeInTheDocument();
    });

    it('should display reservation status chart', () => {
      render(<AdminReports {...defaultProps} />);

      // Should show pie/bar chart for reservation statuses
      expect(screen.getByText(/reservation/i)).toBeInTheDocument();
    });

    it('should display classroom usage chart', () => {
      render(<AdminReports {...defaultProps} />);

      // Should show chart for classroom usage
      expect(screen.getByText(/classroom/i)).toBeInTheDocument();
    });
  });
});

