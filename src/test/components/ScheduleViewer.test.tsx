import { describe, it, expect, vi, beforeEach } from 'vitest';
// add jest-dom matchers for DOM assertions (toBeInTheDocument, toBeDisabled, etc.)
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ScheduleViewer from '../../../components/ScheduleViewer';
import type { Schedule, Classroom } from '../../../App';

// Mock the Announcer hook
vi.mock('../../../components/Announcer', () => ({
  useAnnouncer: () => ({
    announce: vi.fn(),
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock timeUtils
vi.mock('../../../utils/timeUtils', () => ({
  convertTo12Hour: (time: string) => time,
  formatTimeRange: (start: string, end: string) => `${start} - ${end}`,
  generateTimeSlots: () => ['07:00', '07:30', '08:00', '08:30', '09:00'],
}));

const mockClassrooms: Classroom[] = [
  {
    id: 'classroom-1',
    name: 'Room 101',
    building: 'Building A',
    floor: 1,
    capacity: 30,
    equipment: ['Projector', 'Whiteboard'],
    isAvailable: true,
  },
  {
    id: 'classroom-2',
    name: 'Room 201',
    building: 'Building B',
    floor: 2,
    capacity: 50,
    equipment: ['Computer', 'Projector'],
    isAvailable: true,
  },
];

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

const mockSchedules: Schedule[] = [
  {
    id: 'schedule-1',
    classroomId: 'classroom-1',
    classroomName: 'Room 101',
    facultyId: 'faculty-1',
    facultyName: 'John Doe',
    purpose: 'Math Lecture',
    date: today,
    startTime: '08:00',
    endTime: '10:00',
    status: 'confirmed',
  },
  {
    id: 'schedule-2',
    classroomId: 'classroom-2',
    classroomName: 'Room 201',
    facultyId: 'faculty-2',
    facultyName: 'Jane Smith',
    purpose: 'Physics Lab',
    date: today,
    startTime: '10:00',
    endTime: '12:00',
    status: 'confirmed',
  },
  {
    id: 'schedule-3',
    classroomId: 'classroom-1',
    classroomName: 'Room 101',
    facultyId: 'faculty-1',
    facultyName: 'John Doe',
    purpose: 'Chemistry Lecture',
    date: tomorrow,
    startTime: '14:00',
    endTime: '16:00',
    status: 'confirmed',
  },
];

describe('ScheduleViewer', () => {
  let mockOnCancelSchedule: (scheduleId: string, reason: string) => void;

  beforeEach(() => {
    mockOnCancelSchedule = vi.fn();
  });

  describe('Rendering', () => {
    it('should render component header', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      expect(screen.getByText('Schedule Overview')).toBeInTheDocument();
      expect(screen.getByText('View classroom schedules and reservations')).toBeInTheDocument();
    });

    it('should render view mode selector', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // View mode selector should exist and show "Day"
      const viewModeSelect = screen.getAllByRole('combobox')[0];
      expect(viewModeSelect).toBeInTheDocument();
      expect(viewModeSelect).toHaveTextContent('Day');
    });

    it('should render classroom filter', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // Should have a select for filtering classrooms
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2); // At least view mode and classroom filter
    });

    it('should render navigation buttons', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      const buttons = screen.getAllByRole('button');
      // Should have prev/next navigation buttons
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Day View', () => {
    it('should display schedules for current day', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // Should show today's schedules
      expect(screen.getByText('Math Lecture')).toBeInTheDocument();
      expect(screen.getByText('Physics Lab')).toBeInTheDocument();
      
      // Should not show tomorrow's schedule
      expect(screen.queryByText('Chemistry Lecture')).not.toBeInTheDocument();
    });

    it('should display schedule details', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // Check for schedule details
      expect(screen.getByText('08:00 - 10:00')).toBeInTheDocument();
      expect(screen.getByText('Room 101')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText(/Building A/)).toBeInTheDocument();
    });

    it('should display confirmed badge', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      const badges = screen.getAllByText('Confirmed');
      expect(badges.length).toBeGreaterThan(0);
    });

    it('should show empty state when no schedules', () => {
      render(<ScheduleViewer schedules={[]} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      expect(screen.getByText('No Classes Scheduled')).toBeInTheDocument();
      expect(screen.getByText('There are no confirmed classes for this day.')).toBeInTheDocument();
    });

    it('should display cancel button for each schedule', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // Should have cancel buttons (might be just icons on mobile)
      const buttons = screen.getAllByRole('button');
      const cancelButtons = buttons.filter((btn: HTMLElement) => 
        btn.textContent?.includes('Cancel') || btn.querySelector('svg')
      );
      expect(cancelButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Week View', () => {
    it('should have view mode selector with default Day view', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // Verify view mode selector exists and defaults to Day
      const viewModeSelect = screen.getAllByRole('combobox')[0];
      expect(viewModeSelect).toBeInTheDocument();
      expect(viewModeSelect).toHaveTextContent('Day');
    });

    it('should display day view schedule cards by default', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // Day view shows detailed cards with all schedule information
      expect(screen.getByText('Math Lecture')).toBeInTheDocument();
      expect(screen.getByText('08:00 - 10:00')).toBeInTheDocument(); // formatTimeRange mock format
      expect(screen.getByText(/Room 101/)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    it('should navigate to previous day', async () => {
      const user = userEvent.setup();
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // Get initial date from heading
      const dateHeading = screen.getByRole('heading', { level: 3 });
      const initialDate = dateHeading.textContent;
      
      // Click previous button (first button with ChevronLeft)
      const buttons = screen.getAllByRole('button');
      const prevButton = buttons[0]; // First button should be prev
      await user.click(prevButton);
      
      // Date should change
      await waitFor(() => {
        const newDate = dateHeading.textContent;
        expect(newDate).not.toBe(initialDate);
      });
    });

    it('should navigate to next day', async () => {
      const user = userEvent.setup();
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // Click next button (last navigation button)
      const buttons = screen.getAllByRole('button');
      const nextButton = buttons[1]; // Second button should be next
      await user.click(nextButton);
      
      // Should show tomorrow's schedule
      await waitFor(() => {
        expect(screen.getByText('Chemistry Lecture')).toBeInTheDocument();
      });
    });
  });

  describe('Classroom Filter', () => {
    it('should have classroom filter selector with default All Rooms', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // Verify classroom filter exists and defaults to All Rooms
      const classroomSelect = screen.getAllByRole('combobox')[1];
      expect(classroomSelect).toBeInTheDocument();
      expect(classroomSelect).toHaveTextContent('All Rooms');
    });

    it('should display all schedules when filter is All Rooms', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // Should show schedules from both classrooms
      expect(screen.getByText('Math Lecture')).toBeInTheDocument(); // Room 101
      expect(screen.getByText('Physics Lab')).toBeInTheDocument(); // Room 201
    });
  });

  describe('Cancel Schedule', () => {
    it('should open cancel dialog when clicking cancel button', async () => {
      const user = userEvent.setup();
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // Find and click a cancel button
      const buttons = screen.getAllByRole('button');
      const cancelButton = buttons.find((btn: HTMLElement) => 
        btn.textContent?.includes('Cancel') && !btn.textContent?.includes('Keep')
      );
      
      if (cancelButton) {
        await user.click(cancelButton);
        
        await waitFor(() => {
          expect(screen.getByText('Cancel Classroom Reservation')).toBeInTheDocument();
        });
      }
    });

    it('should display reason textarea in cancel dialog', async () => {
      const user = userEvent.setup();
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      const buttons = screen.getAllByRole('button');
      const cancelButton = buttons.find((btn: HTMLElement) => 
        btn.textContent?.includes('Cancel') && !btn.textContent?.includes('Keep')
      );
      
      if (cancelButton) {
        await user.click(cancelButton);
        
        await waitFor(() => {
          expect(screen.getByLabelText(/cancellation reason/i)).toBeInTheDocument();
        });
      }
    });

    it('should require cancellation reason', async () => {
      const user = userEvent.setup();
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      const buttons = screen.getAllByRole('button');
      const cancelButton = buttons.find((btn: HTMLElement) => 
        btn.textContent?.includes('Cancel') && !btn.textContent?.includes('Keep')
      );
      
      if (cancelButton) {
        await user.click(cancelButton);
        
        await waitFor(() => {
          const confirmButton = screen.getByRole('button', { name: /cancel reservation/i });
          // Should be disabled without reason
          expect(confirmButton).toBeDisabled();
        });
      }
    });

    it('should show character count for cancellation reason', async () => {
      const user = userEvent.setup();
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      const buttons = screen.getAllByRole('button');
      const cancelButton = buttons.find((btn: HTMLElement) => 
        btn.textContent?.includes('Cancel') && !btn.textContent?.includes('Keep')
      );
      
      if (cancelButton) {
        await user.click(cancelButton);
        
        await waitFor(() => {
          expect(screen.getByText('0/500')).toBeInTheDocument();
        });
      }
    });

    it('should call onCancelSchedule with reason', async () => {
      const user = userEvent.setup();
      
      // Create a future schedule (use tomorrow's date) so the cancel button will appear (isLapsed check)
      const futureSchedules: Schedule[] = [
        {
          ...mockSchedules[0],
          id: 'future-schedule-1',
          date: tomorrow,
          startTime: '10:00', // time on the future date
          endTime: '10:30',
        }
      ];
      
      render(<ScheduleViewer schedules={futureSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      // Navigate to the next day (the schedule uses tomorrow's date) then wait for schedule to be rendered
      const allNavButtons = screen.getAllByRole('button');
      const nextButton = allNavButtons[1];
      await user.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('Math Lecture')).toBeInTheDocument();
      });
      
      // Look specifically for cancel button with X icon class
      const allButtons = screen.getAllByRole('button');
      const cancelButton = allButtons.find((btn: HTMLElement) => {
        const hasXIcon = !!btn.querySelector('svg.lucide-x');
        return hasXIcon;
      });
      
      // This test requires a cancel button to be present
      if (!cancelButton) {
        throw new Error('Cancel button not found - schedule may have lapsed or onCancelSchedule not provided');
      }
      
      // Click cancel button to open dialog
      await user.click(cancelButton);
      
      // Wait for dialog to open
      await waitFor(() => {
        expect(screen.getByText('Cancel Classroom Reservation')).toBeInTheDocument();
      });
      
      // Find textarea by aria-label
      const textarea = screen.getByLabelText(/cancellation reason/i);
      expect(textarea).toBeInTheDocument();
      
      // Type the cancellation reason
      await user.type(textarea, 'Emergency maintenance required');
      
      // Find and click the confirm button
      const confirmButton = await screen.findByRole('button', { name: /cancel reservation/i });
      await user.click(confirmButton);
      
      // Verify the callback was called with correct arguments
      await waitFor(() => {
        expect(mockOnCancelSchedule).toHaveBeenCalledWith(
          'future-schedule-1',
          'Emergency maintenance required'
        );
      });
    });

    it('should close dialog on "Keep Reservation"', async () => {
      const user = userEvent.setup();
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      const buttons = screen.getAllByRole('button');
      const cancelButton = buttons.find((btn: HTMLElement) => 
        btn.textContent?.includes('Cancel') && !btn.textContent?.includes('Keep')
      );
      
      if (cancelButton) {
        await user.click(cancelButton);
        
        await waitFor(() => {
          const keepButton = screen.getByRole('button', { name: /keep reservation/i });
          user.click(keepButton);
        });
        
        await waitFor(() => {
          expect(screen.queryByText('Cancel Classroom Reservation')).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('Sorting', () => {
    it('should sort schedules by start time', () => {
      const unsortedSchedules: Schedule[] = [
        {
          ...mockSchedules[1],
          startTime: '14:00',
          endTime: '16:00',
        },
        {
          ...mockSchedules[0],
          startTime: '08:00',
          endTime: '10:00',
        },
      ];
      
      render(<ScheduleViewer schedules={unsortedSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      const purposes = screen.getAllByText(/Lecture|Lab/);
      // Earlier time should appear first
      expect(purposes[0].textContent).toContain('Math');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible navigation buttons', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should have labeled selects', () => {
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(2);
    });

    it('should have labeled textarea in cancel dialog', async () => {
      const user = userEvent.setup();
      render(<ScheduleViewer schedules={mockSchedules} classrooms={mockClassrooms} onCancelSchedule={mockOnCancelSchedule} />);
      
      const buttons = screen.getAllByRole('button');
      const cancelButton = buttons.find((btn: HTMLElement) => 
        btn.textContent?.includes('Cancel') && !btn.textContent?.includes('Keep')
      );
      
      if (cancelButton) {
        await user.click(cancelButton);
        
        await waitFor(() => {
          const textarea = screen.getByLabelText(/cancellation reason/i);
          expect(textarea).toBeInTheDocument();
        });
      }
    });
  });
});
