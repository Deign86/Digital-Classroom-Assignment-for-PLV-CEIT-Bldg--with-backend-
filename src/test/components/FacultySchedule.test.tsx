/**
 * FacultySchedule.test.tsx
 * 
 * Tests for faculty schedule viewing component.
 * Covers:
 * - Tab navigation (upcoming, requests, approved, rejected, cancelled, history)
 * - Schedule display with confirmed/cancelled status
 * - Booking request status views
 * - Date/time formatting
 * - Empty states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FacultySchedule from '../../../components/FacultySchedule';
import type { Schedule, BookingRequest } from '../../../App';

// Helper to scope queries to the primary (desktop) tablist to avoid duplicate mobile+desktop nodes
const getPrimaryWithin = () => within(screen.getAllByRole('tablist')[0]);

// Mock dependencies
vi.mock('../../../lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../lib/firebaseService', () => ({
  bookingRequestService: {
    cancel: vi.fn(),
  },
  scheduleService: {
    cancel: vi.fn(),
  },
}));

vi.mock('../../../components/Announcer', () => ({
  useAnnouncer: () => ({
    announce: vi.fn(),
  }),
}));

describe('FacultySchedule', () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const mockSchedules: Schedule[] = [
    {
      id: 's1',
      classroomId: 'c1',
      classroomName: 'Room 101',
      facultyId: 'faculty-1',
      facultyName: 'Prof. Smith',
      date: formatDate(tomorrow),
      startTime: '08:00',
      endTime: '09:30',
      purpose: 'Lecture on Data Structures',
      status: 'confirmed',
    },
    {
      id: 's2',
      classroomId: 'c2',
      classroomName: 'Room 102',
      facultyId: 'faculty-1',
      facultyName: 'Prof. Smith',
      date: formatDate(yesterday),
      startTime: '10:00',
      endTime: '11:30',
      purpose: 'Database Tutorial',
      status: 'confirmed',
    },
    {
      id: 's3',
      classroomId: 'c3',
      classroomName: 'Room 201',
      facultyId: 'faculty-1',
      facultyName: 'Prof. Smith',
      date: formatDate(tomorrow),
      startTime: '13:00',
      endTime: '14:30',
      purpose: 'Cancelled Lecture',
      status: 'cancelled',
    },
  ];

  const mockBookingRequests: BookingRequest[] = [
    {
      id: 'br1',
      classroomId: 'c1',
      classroomName: 'Room 101',
      facultyId: 'faculty-1',
      facultyName: 'Prof. Smith',
      date: formatDate(tomorrow),
      startTime: '15:00',
      endTime: '16:30',
      purpose: 'Extra Class',
      status: 'pending',
      requestDate: new Date().toISOString(),
    },
    {
      id: 'br2',
      classroomId: 'c2',
      classroomName: 'Room 102',
      facultyId: 'faculty-1',
      facultyName: 'Prof. Smith',
      date: formatDate(tomorrow),
      startTime: '17:00',
      endTime: '18:30',
      purpose: 'Workshop',
      status: 'approved',
      requestDate: new Date().toISOString(),
    },
    {
      id: 'br3',
      classroomId: 'c3',
      classroomName: 'Room 201',
      facultyId: 'faculty-1',
      facultyName: 'Prof. Smith',
      date: formatDate(tomorrow),
      startTime: '19:00',
      endTime: '20:00',
      purpose: 'Review Session',
      status: 'rejected',
      requestDate: new Date().toISOString(),
      adminFeedback: 'Room unavailable',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render schedule header', () => {
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={[]}
        />
      );

      expect(screen.getByText(/my schedule & requests/i)).toBeInTheDocument();
      expect(screen.getByText(/view your confirmed classes and reservation requests/i)).toBeInTheDocument();
    });

    it('should render all tabs', () => {
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={[]}
        />
      );

  const withinTab = getPrimaryWithin();
  expect(withinTab.getByRole('tab', { name: /upcoming/i })).toBeInTheDocument();
  expect(withinTab.getByRole('tab', { name: /requests/i })).toBeInTheDocument();
  expect(withinTab.getByRole('tab', { name: /approved/i })).toBeInTheDocument();
  expect(withinTab.getByRole('tab', { name: /rejected/i })).toBeInTheDocument();
  expect(withinTab.getByRole('tab', { name: /cancelled/i })).toBeInTheDocument();
  expect(withinTab.getByRole('tab', { name: /history/i })).toBeInTheDocument();
    });

    it('should show upcoming tab by default', () => {
      render(
        <FacultySchedule
          schedules={mockSchedules}
          bookingRequests={[]}
        />
      );

  const upcomingTab = getPrimaryWithin().getByRole('tab', { name: /upcoming/i });
      expect(upcomingTab).toHaveAttribute('data-state', 'active');
    });

    it('should respect initialTab prop', () => {
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={mockBookingRequests}
          initialTab="approved"
        />
      );

  const approvedTab = getPrimaryWithin().getByRole('tab', { name: /approved/i });
      expect(approvedTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Tab Navigation', () => {
    it('should switch to requests tab when clicked', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={mockBookingRequests}
        />
      );

  const requestsTab = getPrimaryWithin().getByRole('tab', { name: /requests/i });
      await user.click(requestsTab);

      expect(requestsTab).toHaveAttribute('data-state', 'active');
    });

    it('should switch to approved tab when clicked', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={mockBookingRequests}
        />
      );

  const approvedTab = getPrimaryWithin().getByRole('tab', { name: /approved/i });
      await user.click(approvedTab);

      expect(approvedTab).toHaveAttribute('data-state', 'active');
    });

    it('should switch to history tab when clicked', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={mockSchedules}
          bookingRequests={[]}
        />
      );

  const historyTab = getPrimaryWithin().getByRole('tab', { name: /history/i });
      await user.click(historyTab);

      expect(historyTab).toHaveAttribute('data-state', 'active');
    });
  });

  describe('Pending Requests Badge', () => {
    it('should show badge with count when pending requests exist', () => {
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={mockBookingRequests}
        />
      );

  // Pending count badge - scope to primary tablist to avoid duplicate mobile/desktop nodes
  expect(getPrimaryWithin().getByText('1')).toBeInTheDocument(); // 1 pending request
    });

    it('should not show badge when no pending requests', () => {
      const noPendingRequests = mockBookingRequests.filter(r => r.status !== 'pending');
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={noPendingRequests}
        />
      );

  const requestsTab = getPrimaryWithin().getByRole('tab', { name: /requests/i });
      const badge = requestsTab.querySelector('.bg-red-500');
      expect(badge).not.toBeInTheDocument();
    });
  });

  describe('Upcoming Schedules Display', () => {
    it('should display upcoming confirmed schedules', () => {
      render(
        <FacultySchedule
          schedules={mockSchedules}
          bookingRequests={[]}
        />
      );

      expect(screen.getByText(/lecture on data structures/i)).toBeInTheDocument();
      expect(screen.getByText(/room 101/i)).toBeInTheDocument();
    });

    it('should display cancelled schedules in cancelled tab', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={mockSchedules}
          bookingRequests={[]}
        />
      );

      const cancelledTab = getPrimaryWithin().getByRole('tab', { name: /cancelled/i });
      await user.click(cancelledTab);

  expect(screen.getByText(/cancelled lecture/i)).toBeInTheDocument();
  // check for the reservation-cancelled message which is unique in the UI
  expect(screen.getByText(/this reservation has been cancelled/i)).toBeInTheDocument();
    });

    it('should not display past schedules in upcoming tab', () => {
      render(
        <FacultySchedule
          schedules={mockSchedules}
          bookingRequests={[]}
        />
      );

      // "Database Tutorial" is yesterday, should not appear in Upcoming
      expect(screen.queryByText(/database tutorial/i)).not.toBeInTheDocument();
    });

    it('should show empty state when no upcoming schedules', () => {
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={[]}
        />
      );

      expect(screen.getByText(/no upcoming classes/i)).toBeInTheDocument();
    });

    it('should display date as "Tomorrow" for tomorrow\'s schedules', () => {
      render(
        <FacultySchedule
          schedules={mockSchedules}
          bookingRequests={[]}
        />
      );

      expect(screen.getAllByText(/tomorrow/i).length).toBeGreaterThan(0);
    });

    it('should display time range for schedules', () => {
      render(
        <FacultySchedule
          schedules={mockSchedules}
          bookingRequests={[]}
        />
      );

      // Should convert 24h to 12h format and show range
      expect(screen.getByText(/8:00 AM - 9:30 AM/i)).toBeInTheDocument();
    });
  });

  describe('History Tab Display', () => {
    it('should display past schedules in history tab', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={mockSchedules}
          bookingRequests={[]}
        />
      );

  const historyTab = getPrimaryWithin().getByRole('tab', { name: /history/i });
      await user.click(historyTab);

      expect(screen.getByText(/database tutorial/i)).toBeInTheDocument();
    });

    it('should show empty state when no history', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={mockSchedules.filter(s => new Date(s.date) >= today)}
          bookingRequests={[]}
        />
      );

  const historyTab = getPrimaryWithin().getByRole('tab', { name: /history/i });
      await user.click(historyTab);

      expect(screen.getByText(/no past classes/i)).toBeInTheDocument();
    });
  });

  describe('Pending Requests Display', () => {
    it('should display pending requests in requests tab', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={mockBookingRequests}
        />
      );

  const requestsTab = getPrimaryWithin().getByRole('tab', { name: /requests/i });
      await user.click(requestsTab);

      expect(screen.getByText(/extra class/i)).toBeInTheDocument();
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    it('should show empty state when no pending requests', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={mockBookingRequests.filter(r => r.status !== 'pending')}
        />
      );

  const requestsTab = getPrimaryWithin().getByRole('tab', { name: /requests/i });
      await user.click(requestsTab);

      expect(screen.getByText(/no pending requests/i)).toBeInTheDocument();
    });
  });

  describe('Approved Requests Display', () => {
    it('should display approved requests in approved tab', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={mockBookingRequests}
        />
      );

  const approvedTab = getPrimaryWithin().getByRole('tab', { name: /approved/i });
      await user.click(approvedTab);

      expect(screen.getByText(/workshop/i)).toBeInTheDocument();
    });

    it('should show empty state when no approved requests', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={mockBookingRequests.filter(r => r.status !== 'approved')}
        />
      );

  const approvedTab = getPrimaryWithin().getByRole('tab', { name: /approved/i });
  await user.click(approvedTab);

  expect(screen.getByText(/no approved requests/i)).toBeInTheDocument();
    });
  });

  describe('Rejected Requests Display', () => {
    it('should display rejected requests in rejected tab', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={mockBookingRequests}
        />
      );

  const rejectedTab = getPrimaryWithin().getByRole('tab', { name: /rejected/i });
      await user.click(rejectedTab);

      expect(screen.getByText(/review session/i)).toBeInTheDocument();
    });

    it('should display admin feedback for rejected requests', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={mockBookingRequests}
        />
      );

  const rejectedTab = getPrimaryWithin().getByRole('tab', { name: /rejected/i });
      await user.click(rejectedTab);

      expect(screen.getByText(/room unavailable/i)).toBeInTheDocument();
    });

    it('should show empty state when no rejected requests', async () => {
      const user = userEvent.setup();
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={mockBookingRequests.filter(r => r.status !== 'rejected')}
        />
      );

  const rejectedTab = getPrimaryWithin().getByRole('tab', { name: /rejected/i });
      await user.click(rejectedTab);

      expect(screen.getByText(/no rejected requests/i)).toBeInTheDocument();
    });
  });

  describe('Cancelled Tab Display', () => {
    it('should show empty state when no cancelled schedules', async () => {
      const user = userEvent.setup();
      const noCancel = mockSchedules.filter(s => s.status !== 'cancelled');
      render(
        <FacultySchedule
          schedules={noCancel}
          bookingRequests={[]}
        />
      );

  const cancelledTab = getPrimaryWithin().getByRole('tab', { name: /cancelled/i });
    await user.click(cancelledTab);

    expect(screen.getByText(/no cancelled reservations/i)).toBeInTheDocument();
    });
  });

  describe('Badge Display', () => {
    it('should display confirmed badge for confirmed schedules', () => {
      render(
        <FacultySchedule
          schedules={mockSchedules}
          bookingRequests={[]}
        />
      );

      expect(screen.getAllByText(/confirmed/i).length).toBeGreaterThan(0);
    });

    it('should display cancelled badge with destructive variant', () => {
      render(
        <FacultySchedule
          schedules={mockSchedules}
          bookingRequests={[]}
        />
      );

      const cancelledBadge = screen.getAllByText(/cancelled/i)[0];
      expect(cancelledBadge).toBeInTheDocument();
    });
  });

  describe('Duplicate Request Filtering', () => {
    it('should filter out duplicate booking request IDs', async () => {
      const duplicateRequests: BookingRequest[] = [
        mockBookingRequests[0],
        mockBookingRequests[0], // Duplicate
        mockBookingRequests[1],
      ];
      const user = userEvent.setup();

      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={duplicateRequests}
        />
      );

      // open requests tab to show booking requests
      const requestsTab = getPrimaryWithin().getByRole('tab', { name: /requests/i });
      await user.click(requestsTab);

      // Should only show once despite duplicate
      const items = screen.getAllByText(/extra class/i);
      expect(items.length).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty schedules and requests', () => {
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={[]}
        />
      );

      expect(screen.getByText(/no upcoming classes/i)).toBeInTheDocument();
    });

    it('should handle schedules without purpose', () => {
      const noPurposeSchedule: Schedule[] = [
        {
          ...mockSchedules[0],
          purpose: '',
        },
      ];

      render(
        <FacultySchedule
          schedules={noPurposeSchedule}
          bookingRequests={[]}
        />
      );

      expect(screen.getByText(/room 101/i)).toBeInTheDocument();
    });

    it('should handle very long purpose text', () => {
      const longPurposeSchedule: Schedule[] = [
        {
          ...mockSchedules[0],
          purpose: 'A'.repeat(500),
        },
      ];

      render(
        <FacultySchedule
          schedules={longPurposeSchedule}
          bookingRequests={[]}
        />
      );

      expect(screen.getByText(/A{100,}/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible tab structure', () => {
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={[]}
        />
      );

      const tabList = screen.getAllByRole('tablist');
      expect(tabList.length).toBeGreaterThan(0);
    });

    it('should have accessible tabs', () => {
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={[]}
        />
      );

  const tabs = getPrimaryWithin().getAllByRole('tab');
  expect(tabs.length).toBe(6);
    });

    it('should mark active tab with data-state', () => {
      render(
        <FacultySchedule
          schedules={[]}
          bookingRequests={[]}
          initialTab="upcoming"
        />
      );

  const upcomingTab = getPrimaryWithin().getByRole('tab', { name: /upcoming/i });
  expect(upcomingTab).toHaveAttribute('data-state', 'active');
    });
  });
});
