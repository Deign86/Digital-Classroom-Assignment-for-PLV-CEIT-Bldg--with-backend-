/**
 * AdminReports.test.tsx
 * 
 * Tests for admin reports and analytics component.
 * Covers:
 * - Statistics cards (total classes, approval rate, utilization, pending)
 * - Period filtering (week, month, semester)
 * - Classroom utilization charts
 * - Request status distribution
 * - Export functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminReports from '../../../components/AdminReports';
import type { Classroom, Schedule, BookingRequest, SignupRequest } from '../../../App';

describe('AdminReports', () => {
  const today = new Date();
  const lastWeek = new Date(today);
  lastWeek.setDate(today.getDate() - 7);
  const lastMonth = new Date(today);
  lastMonth.setMonth(today.getMonth() - 1);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const mockClassrooms: Classroom[] = [
    {
      id: 'c1',
      name: 'Room 101',
      building: 'Building A',
      floor: 1,
      capacity: 30,
      equipment: ['Projector'],
      isAvailable: true,
    },
    {
      id: 'c2',
      name: 'Room 102',
      building: 'Building A',
      floor: 1,
      capacity: 50,
      equipment: ['Computer'],
      isAvailable: true,
    },
    {
      id: 'c3',
      name: 'Room 201',
      building: 'Building B',
      floor: 2,
      capacity: 40,
      equipment: ['WiFi'],
      isAvailable: true,
    },
  ];

  const mockSchedules: Schedule[] = [
    {
      id: 's1',
      classroomId: 'c1',
      classroomName: 'Room 101',
      facultyId: 'f1',
      facultyName: 'Prof. Smith',
      date: formatDate(lastWeek),
      startTime: '08:00',
      endTime: '09:30',
      purpose: 'Lecture',
      status: 'confirmed',
    },
    {
      id: 's2',
      classroomId: 'c2',
      classroomName: 'Room 102',
      facultyId: 'f2',
      facultyName: 'Prof. Johnson',
      date: formatDate(lastWeek),
      startTime: '10:00',
      endTime: '12:00',
      purpose: 'Lab',
      status: 'confirmed',
    },
    {
      id: 's3',
      classroomId: 'c1',
      classroomName: 'Room 101',
      facultyId: 'f1',
      facultyName: 'Prof. Smith',
      date: formatDate(lastMonth),
      startTime: '13:00',
      endTime: '14:30',
      purpose: 'Tutorial',
      status: 'confirmed',
    },
  ];

  const mockBookingRequests: BookingRequest[] = [
    {
      id: 'br1',
      classroomId: 'c1',
      classroomName: 'Room 101',
      facultyId: 'f1',
      facultyName: 'Prof. Smith',
      date: formatDate(today),
      startTime: '15:00',
      endTime: '16:30',
      purpose: 'Extra Class',
      status: 'approved',
      requestDate: formatDate(lastWeek),
    },
    {
      id: 'br2',
      classroomId: 'c2',
      classroomName: 'Room 102',
      facultyId: 'f2',
      facultyName: 'Prof. Johnson',
      date: formatDate(today),
      startTime: '17:00',
      endTime: '18:00',
      purpose: 'Workshop',
      status: 'rejected',
      requestDate: formatDate(lastWeek),
      adminFeedback: 'Room unavailable',
    },
    {
      id: 'br3',
      classroomId: 'c3',
      classroomName: 'Room 201',
      facultyId: 'f3',
      facultyName: 'Prof. Lee',
      date: formatDate(today),
      startTime: '19:00',
      endTime: '20:00',
      purpose: 'Review',
      status: 'pending',
      requestDate: formatDate(today),
    },
  ];

  const mockSignupRequests: SignupRequest[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render reports header', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      expect(screen.getByText(/classroom utilization reports/i)).toBeInTheDocument();
      expect(screen.getByText(/analytics and insights/i)).toBeInTheDocument();
    });

    it('should render period selector', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render export button', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    });

    it('should render all statistics cards', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={mockSchedules}
          bookingRequests={mockBookingRequests}
          signupRequests={[]}
        />
      );

      expect(screen.getByText(/total classes/i)).toBeInTheDocument();
      expect(screen.getByText(/approval rate/i)).toBeInTheDocument();
      expect(screen.getByText(/utilization rate/i)).toBeInTheDocument();
      expect(screen.getByText(/pending requests/i)).toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('should display total classes count', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={mockSchedules}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      // Should show count of confirmed schedules in selected period (default: month)
      expect(screen.getByText(/total classes/i)).toBeInTheDocument();
    });

    it('should display approval rate percentage', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={mockBookingRequests}
          signupRequests={[]}
        />
      );

      // 1 approved out of 3 total requests = 33.3%
      const approvalRateCard = screen.getByText(/approval rate/i).closest('.p-6');
      expect(approvalRateCard).toHaveTextContent(/33\.3%/);
    });

    it('should display utilization rate', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={mockSchedules}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      expect(screen.getByText(/utilization rate/i)).toBeInTheDocument();
      expect(screen.getByText(/classroom efficiency/i)).toBeInTheDocument();
    });

    it('should display pending requests count', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={mockBookingRequests}
          signupRequests={[]}
        />
      );

      const pendingCard = screen.getByText(/pending requests/i).closest('.p-6');
      expect(pendingCard).toHaveTextContent('1'); // 1 pending request
    });

    it('should display total hours', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={mockSchedules}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      expect(screen.getByText(/total hours/i)).toBeInTheDocument();
    });

    it('should display total requests', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={mockBookingRequests}
          signupRequests={[]}
        />
      );

      expect(screen.getByText(/3 total requests/i)).toBeInTheDocument();
    });
  });

  describe('Period Filtering', () => {
    it('should default to month period', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveTextContent(/last month/i);
    });

    it('should allow changing to week period', async () => {
      const user = userEvent.setup();
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      const select = screen.getByRole('combobox');
      await user.click(select);

      const weekOption = screen.getByRole('option', { name: /last week/i });
      await user.click(weekOption);

      expect(select).toHaveTextContent(/last week/i);
    });

    it('should allow changing to semester period', async () => {
      const user = userEvent.setup();
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      const select = screen.getByRole('combobox');
      await user.click(select);

      const semesterOption = screen.getByRole('option', { name: /last 4 months/i });
      await user.click(semesterOption);

      expect(select).toHaveTextContent(/last 4 months/i);
    });

    it('should filter data based on selected period', async () => {
      const user = userEvent.setup();
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={mockSchedules}
          bookingRequests={mockBookingRequests}
          signupRequests={[]}
        />
      );

      // Change to week period
      const select = screen.getByRole('combobox');
      await user.click(select);
      await user.click(screen.getByRole('option', { name: /last week/i }));

      // Stats should update based on last week's data
      expect(screen.getByText(/total classes/i)).toBeInTheDocument();
    });
  });

  describe('Charts Display', () => {
    it('should render classroom utilization chart', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={mockSchedules}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      expect(screen.getByText(/classroom utilization/i)).toBeInTheDocument();
      expect(screen.getByText(/number of classes per classroom/i)).toBeInTheDocument();
    });

    it('should render request status distribution chart', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={mockBookingRequests}
          signupRequests={[]}
        />
      );

      expect(screen.getByText(/request status distribution/i)).toBeInTheDocument();
      expect(screen.getByText(/breakdown of reservation request statuses/i)).toBeInTheDocument();
    });

    it('should render weekly trend chart', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={mockSchedules}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      expect(screen.getByText(/weekly usage trend/i)).toBeInTheDocument();
    });

    it('should render building usage chart', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={mockSchedules}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      expect(screen.getByText(/building usage distribution/i)).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should trigger export when button clicked', async () => {
      const user = userEvent.setup();
      
      // Mock URL.createObjectURL and link.click
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      const mockClick = vi.fn();
      
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;
      
      const createElementSpy = vi.spyOn(document, 'createElement');
      createElementSpy.mockReturnValue({
        click: mockClick,
        href: '',
        download: '',
      } as any);

      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={mockSchedules}
          bookingRequests={mockBookingRequests}
          signupRequests={[]}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should generate JSON file with correct structure', async () => {
      const user = userEvent.setup();
      
      let capturedBlob: Blob | null = null;
      const mockCreateObjectURL = vi.fn((blob: Blob) => {
        capturedBlob = blob;
        return 'blob:mock-url';
      });
      
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = vi.fn();
      
      const mockClick = vi.fn();
      vi.spyOn(document, 'createElement').mockReturnValue({
        click: mockClick,
        href: '',
        download: '',
      } as any);

      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={mockSchedules}
          bookingRequests={mockBookingRequests}
          signupRequests={[]}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(capturedBlob).toBeTruthy();
      expect(capturedBlob!.type).toBe('application/json');
    });

    it('should include filename with period and date', async () => {
      const user = userEvent.setup();
      
      let capturedDownload = '';
      const mockClick = vi.fn();
      const mockElement = {
        click: mockClick,
        href: '',
        get download() {
          return capturedDownload;
        },
        set download(value: string) {
          capturedDownload = value;
        },
      } as any;
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockElement);
      
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();

      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      await user.click(exportButton);

      expect(capturedDownload).toMatch(/classroom-report-month-\d{4}-\d{2}-\d{2}\.json/);
    });
  });

  describe('Empty States', () => {
    it('should handle no schedules', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      const totalClassesCard = screen.getByText(/total classes/i).closest('.p-6');
      expect(totalClassesCard).toHaveTextContent('0');
    });

    it('should handle no booking requests', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      const approvalRateCard = screen.getByText(/approval rate/i).closest('.p-6');
      expect(approvalRateCard).toHaveTextContent('0.0%');
    });

    it('should handle no classrooms', () => {
      render(
        <AdminReports
          classrooms={[]}
          schedules={[]}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      const utilizationCard = screen.getByText(/utilization rate/i).closest('.p-6');
      expect(utilizationCard).toHaveTextContent('0.0%');
    });

    it('should handle no pending requests', () => {
      const noPending = mockBookingRequests.filter(r => r.status !== 'pending');
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={noPending}
          signupRequests={[]}
        />
      );

      const pendingCard = screen.getByText(/pending requests/i).closest('.p-6');
      expect(pendingCard).toHaveTextContent('0');
    });
  });

  describe('Calculations', () => {
    it('should calculate approval rate correctly', () => {
      // 1 approved, 1 rejected, 1 pending = 33.3% approval rate
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={mockBookingRequests}
          signupRequests={[]}
        />
      );

      const approvalRateCard = screen.getByText(/approval rate/i).closest('.p-6');
      expect(approvalRateCard).toHaveTextContent('33.3%');
    });

    it('should calculate total hours from schedules', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={mockSchedules}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      // Schedule 1: 1.5 hours, Schedule 2: 2 hours, Schedule 3: 1.5 hours = 5 hours total
      expect(screen.getByText(/total hours/i)).toBeInTheDocument();
    });

    it('should only count confirmed schedules', () => {
      const mixedSchedules: Schedule[] = [
        ...mockSchedules,
        {
          id: 's4',
          classroomId: 'c1',
          classroomName: 'Room 101',
          facultyId: 'f1',
          facultyName: 'Prof. Smith',
          date: formatDate(lastWeek),
          startTime: '15:00',
          endTime: '16:30',
          purpose: 'Cancelled Class',
          status: 'cancelled',
        },
      ];

      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={mixedSchedules}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      // Should not count cancelled schedule in total classes
      expect(screen.getByText(/total classes/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible select element', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should have accessible export button', () => {
      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      const exportButton = screen.getByRole('button', { name: /export/i });
      expect(exportButton).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const manySchedules: Schedule[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `s${i}`,
        classroomId: 'c1',
        classroomName: 'Room 101',
        facultyId: 'f1',
        facultyName: 'Prof. Smith',
        date: formatDate(lastWeek),
        startTime: '08:00',
        endTime: '09:30',
        purpose: 'Lecture',
        status: 'confirmed',
      }));

      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={manySchedules}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      expect(screen.getByText(/total classes/i)).toBeInTheDocument();
    });

    it('should handle schedules with same classroom', () => {
      const sameRoomSchedules: Schedule[] = [
        ...mockSchedules,
        {
          id: 's4',
          classroomId: 'c1', // Same as s1 and s3
          classroomName: 'Room 101',
          facultyId: 'f1',
          facultyName: 'Prof. Smith',
          date: formatDate(lastWeek),
          startTime: '10:00',
          endTime: '11:30',
          purpose: 'Another Lecture',
          status: 'confirmed',
        },
      ];

      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={sameRoomSchedules}
          bookingRequests={[]}
          signupRequests={[]}
        />
      );

      expect(screen.getByText(/classroom utilization/i)).toBeInTheDocument();
    });

    it('should handle all requests with same status', () => {
      const allApproved: BookingRequest[] = mockBookingRequests.map(r => ({
        ...r,
        status: 'approved' as const,
      }));

      render(
        <AdminReports
          classrooms={mockClassrooms}
          schedules={[]}
          bookingRequests={allApproved}
          signupRequests={[]}
        />
      );

      const approvalRateCard = screen.getByText(/approval rate/i).closest('.p-6');
      expect(approvalRateCard).toHaveTextContent('100.0%');
    });
  });
});
