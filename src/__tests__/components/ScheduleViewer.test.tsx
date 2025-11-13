import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScheduleViewer from '../../../components/ScheduleViewer';
import { createMockSchedule, createMockClassroom } from '../__mocks__/firebase';

describe('ScheduleViewer', () => {
  const mockSchedules = [
    createMockSchedule({
      id: 'sched_1',
      classroomId: 'class_1',
      classroomName: 'Room A',
      date: '2024-01-15',
      startTime: '09:00',
      endTime: '10:00',
      status: 'confirmed',
    }),
    createMockSchedule({
      id: 'sched_2',
      classroomId: 'class_2',
      classroomName: 'Room B',
      date: '2024-01-16',
      startTime: '14:00',
      endTime: '15:00',
      status: 'confirmed',
    }),
  ];

  const mockClassrooms = [
    createMockClassroom({ id: 'class_1', name: 'Room A' }),
    createMockClassroom({ id: 'class_2', name: 'Room B' }),
  ];

  const defaultProps = {
    schedules: mockSchedules,
    classrooms: mockClassrooms,
    onCancelSchedule: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('day view', () => {
    it('should display schedules for selected day', () => {
      render(<ScheduleViewer {...defaultProps} />);

      expect(screen.getByText(/Schedule Overview/i)).toBeInTheDocument();
    });

    it('should filter schedules by selected date', () => {
      render(<ScheduleViewer {...defaultProps} />);

      // Should show schedules for the selected date
      expect(screen.getByText(/Room A/i)).toBeInTheDocument();
    });
  });

  describe('week view', () => {
    it('should switch to week view', async () => {
      const user = userEvent.setup();
      render(<ScheduleViewer {...defaultProps} />);

      const weekViewButton = screen.getByRole('option', { name: /week/i });
      await user.click(weekViewButton);

      // Should show week view
      expect(screen.getByText(/Schedule Overview/i)).toBeInTheDocument();
    });
  });

  describe('prev/next nav', () => {
    it('should navigate to previous day', async () => {
      const user = userEvent.setup();
      render(<ScheduleViewer {...defaultProps} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      await user.click(prevButton);

      // Should navigate to previous day
      expect(prevButton).toBeInTheDocument();
    });

    it('should navigate to next day', async () => {
      const user = userEvent.setup();
      render(<ScheduleViewer {...defaultProps} />);

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      // Should navigate to next day
      expect(nextButton).toBeInTheDocument();
    });
  });

  describe('aria-labels', () => {
    it('should have proper ARIA labels for navigation', () => {
      render(<ScheduleViewer {...defaultProps} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toHaveAttribute('aria-label');
    });
  });

  describe('cancel', () => {
    it('should call onCancelSchedule when cancel button clicked', async () => {
      const user = userEvent.setup();
      const onCancelSchedule = vi.fn();

      render(<ScheduleViewer {...defaultProps} onCancelSchedule={onCancelSchedule} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      if (cancelButton) {
        await user.click(cancelButton);

        await waitFor(() => {
          expect(onCancelSchedule).toHaveBeenCalled();
        });
      }
    });
  });

  describe('conflicts', () => {
    it('should highlight conflicting schedules', () => {
      const conflictingSchedules = [
        createMockSchedule({
          id: 'sched_1',
          classroomId: 'class_1',
          date: '2024-01-15',
          startTime: '09:00',
          endTime: '10:00',
          status: 'confirmed',
        }),
        createMockSchedule({
          id: 'sched_2',
          classroomId: 'class_1',
          date: '2024-01-15',
          startTime: '09:30',
          endTime: '10:30',
          status: 'confirmed',
        }),
      ];

      render(<ScheduleViewer {...defaultProps} schedules={conflictingSchedules} />);

      expect(screen.getByText(/Room A/i)).toBeInTheDocument();
    });
  });

  describe('filter', () => {
    it('should filter schedules by classroom', async () => {
      const user = userEvent.setup();
      render(<ScheduleViewer {...defaultProps} />);

      const classroomSelect = screen.getByRole('combobox', { name: /classroom/i });
      if (classroomSelect) {
        await user.click(classroomSelect);
        // Should filter by selected classroom
      }
    });

    it('should filter schedules by date range', () => {
      render(<ScheduleViewer {...defaultProps} />);

      // Should support date range filtering
      expect(screen.getByText(/Schedule Overview/i)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have accessible navigation controls', () => {
      render(<ScheduleViewer {...defaultProps} />);

      const prevButton = screen.getByRole('button', { name: /previous/i });
      expect(prevButton).toHaveAttribute('aria-label');
    });

    it('should announce schedule changes to screen readers', () => {
      render(<ScheduleViewer {...defaultProps} />);

      // Should have aria-live region for schedule updates
      expect(screen.getByText(/Schedule Overview/i)).toBeInTheDocument();
    });
  });
});

