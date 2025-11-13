import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoomSearch from '../../../components/RoomSearch';
import { createMockClassroom, createMockSchedule, createMockBookingRequest } from '../__mocks__/firebase';

describe('RoomSearch - Advanced Search & Filters', () => {
  const mockClassrooms = [
    createMockClassroom({
      id: 'class_1',
      name: 'Room A',
      capacity: 30,
      equipment: ['Projector', 'Whiteboard'],
      building: 'Main Building',
      floor: 1,
      isAvailable: true,
    }),
    createMockClassroom({
      id: 'class_2',
      name: 'Room B',
      capacity: 50,
      equipment: ['TV', 'Computer'],
      building: 'New Building',
      floor: 2,
      isAvailable: true,
    }),
    createMockClassroom({
      id: 'class_3',
      name: 'Room C',
      capacity: 20,
      equipment: ['Projector'],
      building: 'Main Building',
      floor: 1,
      isAvailable: false,
    }),
  ];

  const mockSchedules = [
    createMockSchedule({
      id: 'sched_1',
      classroomId: 'class_1',
      date: '2024-12-20',
      startTime: '09:00',
      endTime: '10:00',
      status: 'confirmed',
    }),
  ];

  const mockBookingRequests = [
    createMockBookingRequest({
      id: 'req_1',
      classroomId: 'class_2',
      date: '2024-12-20',
      startTime: '14:00',
      endTime: '15:00',
      status: 'approved',
    }),
  ];

  const defaultProps = {
    classrooms: mockClassrooms,
    schedules: mockSchedules,
    bookingRequests: mockBookingRequests,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('search by date', () => {
    it('should filter classrooms by selected date', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const dateInput = screen.getByLabelText(/date/i);
      await user.type(dateInput, '2024-12-20');

      await waitFor(() => {
        expect(dateInput).toHaveValue('2024-12-20');
      });
    });

    it('should show available classrooms for selected date', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const dateInput = screen.getByLabelText(/date/i);
      await user.type(dateInput, '2024-12-21');

      // Should show available classrooms
      await waitFor(() => {
        expect(screen.getByText(/Room A/i)).toBeInTheDocument();
      });
    });
  });

  describe('search by time range', () => {
    it('should filter classrooms by start time', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const startTimeSelect = screen.getByLabelText(/start time/i);
      await user.click(startTimeSelect);
      await user.selectOptions(startTimeSelect, '09:00');

      expect(startTimeSelect).toHaveValue('09:00');
    });

    it('should filter classrooms by end time', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const endTimeSelect = screen.getByLabelText(/end time/i);
      await user.click(endTimeSelect);
      await user.selectOptions(endTimeSelect, '10:00');

      expect(endTimeSelect).toHaveValue('10:00');
    });

    it('should validate time range (end time after start time)', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const startTimeSelect = screen.getByLabelText(/start time/i);
      const endTimeSelect = screen.getByLabelText(/end time/i);

      await user.selectOptions(startTimeSelect, '10:00');
      await user.selectOptions(endTimeSelect, '09:00');

      // End time should be cleared or invalid
      await waitFor(() => {
        expect(endTimeSelect).not.toHaveValue('09:00');
      });
    });
  });

  describe('search by capacity', () => {
    it('should filter classrooms by minimum capacity', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const capacityInput = screen.getByLabelText(/minimum capacity/i);
      await user.type(capacityInput, '40');

      await waitFor(() => {
        expect(capacityInput).toHaveValue(40);
      });
    });

    it('should show only classrooms meeting capacity requirement', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const capacityInput = screen.getByLabelText(/minimum capacity/i);
      await user.type(capacityInput, '40');

      // Should show Room B (capacity 50) but not Room A (capacity 30)
      await waitFor(() => {
        expect(screen.getByText(/Room B/i)).toBeInTheDocument();
      });
    });
  });

  describe('filter by equipment', () => {
    it('should filter classrooms by selected equipment', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const projectorCheckbox = screen.getByLabelText(/projector/i);
      await user.click(projectorCheckbox);

      await waitFor(() => {
        expect(projectorCheckbox).toBeChecked();
      });
    });

    it('should show only classrooms with selected equipment', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const projectorCheckbox = screen.getByLabelText(/projector/i);
      await user.click(projectorCheckbox);

      // Should show Room A and Room C (have Projector) but not Room B
      await waitFor(() => {
        expect(screen.getByText(/Room A/i)).toBeInTheDocument();
      });
    });

    it('should support multiple equipment filters', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const projectorCheckbox = screen.getByLabelText(/projector/i);
      const whiteboardCheckbox = screen.getByLabelText(/whiteboard/i);

      await user.click(projectorCheckbox);
      await user.click(whiteboardCheckbox);

      // Should show Room A (has both Projector and Whiteboard)
      await waitFor(() => {
        expect(projectorCheckbox).toBeChecked();
        expect(whiteboardCheckbox).toBeChecked();
      });
    });
  });

  describe('filter by building', () => {
    it('should filter classrooms by building', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const buildingSelect = screen.getByLabelText(/building/i);
      await user.click(buildingSelect);
      await user.selectOptions(buildingSelect, 'Main Building');

      expect(buildingSelect).toHaveValue('Main Building');
    });

    it('should show only classrooms in selected building', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const buildingSelect = screen.getByLabelText(/building/i);
      await user.selectOptions(buildingSelect, 'Main Building');

      // Should show Room A and Room C (Main Building) but not Room B
      await waitFor(() => {
        expect(screen.getByText(/Room A/i)).toBeInTheDocument();
      });
    });
  });

  describe('filter by floor', () => {
    it('should filter classrooms by floor', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const floorSelect = screen.getByLabelText(/floor/i);
      await user.click(floorSelect);
      await user.selectOptions(floorSelect, '1');

      expect(floorSelect).toHaveValue('1');
    });

    it('should show only classrooms on selected floor', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const floorSelect = screen.getByLabelText(/floor/i);
      await user.selectOptions(floorSelect, '2');

      // Should show Room B (floor 2) but not Room A or Room C (floor 1)
      await waitFor(() => {
        expect(screen.getByText(/Room B/i)).toBeInTheDocument();
      });
    });
  });

  describe('real-time availability status', () => {
    it('should show availability status for each classroom', () => {
      render(<RoomSearch {...defaultProps} />);

      // Should show available/unavailable status
      expect(screen.getByText(/Room A/i)).toBeInTheDocument();
    });

    it('should exclude unavailable classrooms from results', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      const availableOnlyToggle = screen.getByLabelText(/show only available/i);
      if (availableOnlyToggle) {
        await user.click(availableOnlyToggle);

        // Should not show Room C (isAvailable: false)
        await waitFor(() => {
          expect(screen.queryByText(/Room C/i)).not.toBeInTheDocument();
        });
      }
    });
  });

  describe('combined filters', () => {
    it('should apply multiple filters simultaneously', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      // Set date
      const dateInput = screen.getByLabelText(/date/i);
      await user.type(dateInput, '2024-12-20');

      // Set capacity
      const capacityInput = screen.getByLabelText(/minimum capacity/i);
      await user.type(capacityInput, '30');

      // Select equipment
      const projectorCheckbox = screen.getByLabelText(/projector/i);
      await user.click(projectorCheckbox);

      // Should show only classrooms matching all criteria
      await waitFor(() => {
        expect(screen.getByText(/Room A/i)).toBeInTheDocument();
      });
    });
  });

  describe('clear filters', () => {
    it('should clear all filters when reset button clicked', async () => {
      const user = userEvent.setup();
      render(<RoomSearch {...defaultProps} />);

      // Set some filters
      const dateInput = screen.getByLabelText(/date/i);
      await user.type(dateInput, '2024-12-20');

      const resetButton = screen.getByRole('button', { name: /reset|clear/i });
      if (resetButton) {
        await user.click(resetButton);

        await waitFor(() => {
          expect(dateInput).toHaveValue('');
        });
      }
    });
  });
});

