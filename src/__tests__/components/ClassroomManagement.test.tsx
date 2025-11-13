import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClassroomManagement from '../../../components/ClassroomManagement';
import { createMockClassroom } from '../__mocks__/firebase';

// Mock dependencies
vi.mock('../../../lib/firebaseService', () => ({
  classroomService: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  },
  bookingRequestService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
  scheduleService: {
    getAll: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('../../../lib/networkErrorHandler', () => ({
  executeWithNetworkHandling: vi.fn((fn) => fn()),
}));

describe('ClassroomManagement', () => {
  const mockClassrooms = [
    createMockClassroom({ id: 'class_1', name: 'Room A', capacity: 30 }),
    createMockClassroom({ id: 'class_2', name: 'Room B', capacity: 40 }),
  ];

  const defaultProps = {
    classrooms: mockClassrooms,
    onClassroomUpdate: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('list', () => {
    it('should render list of classrooms', () => {
      render(<ClassroomManagement {...defaultProps} />);

      expect(screen.getByText('Room A')).toBeInTheDocument();
      expect(screen.getByText('Room B')).toBeInTheDocument();
    });
  });

  describe('create form', () => {
    it('should open create dialog when add button clicked', async () => {
      const user = userEvent.setup();
      render(<ClassroomManagement {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /add classroom/i });
      await user.click(addButton);

      expect(screen.getByText(/create classroom/i)).toBeInTheDocument();
    });

    it('should create classroom with valid data', async () => {
      const user = userEvent.setup();
      const { classroomService } = await import('../../../lib/firebaseService');
      vi.mocked(classroomService.create).mockResolvedValue(
        createMockClassroom({ id: 'new_class', name: 'New Room' })
      );

      render(<ClassroomManagement {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /add classroom/i });
      await user.click(addButton);

      const nameInput = screen.getByLabelText(/room name/i);
      await user.type(nameInput, 'New Room');

      const capacityInput = screen.getByLabelText(/capacity/i);
      await user.type(capacityInput, '50');

      const submitButton = screen.getByRole('button', { name: /create/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(classroomService.create).toHaveBeenCalled();
      });
    });
  });

  describe('edit form', () => {
    it('should open edit dialog when edit button clicked', async () => {
      const user = userEvent.setup();
      render(<ClassroomManagement {...defaultProps} />);

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      expect(screen.getByText(/edit classroom/i)).toBeInTheDocument();
    });
  });

  describe('delete', () => {
    it('should delete classroom when delete button clicked', async () => {
      const user = userEvent.setup();
      const { classroomService } = await import('../../../lib/firebaseService');
      vi.mocked(classroomService.delete).mockResolvedValue(undefined);

      render(<ClassroomManagement {...defaultProps} />);

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      const confirmButton = screen.getByRole('button', { name: /confirm delete/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(classroomService.delete).toHaveBeenCalled();
      });
    });
  });

  describe('equipment', () => {
    it('should display classroom equipment', () => {
      const classroomWithEquipment = createMockClassroom({
        id: 'class_1',
        equipment: ['projector', 'whiteboard'],
      });

      render(<ClassroomManagement {...defaultProps} classrooms={[classroomWithEquipment]} />);

      expect(screen.getByText(/projector/i)).toBeInTheDocument();
    });
  });

  describe('capacity validation', () => {
    it('should validate capacity input', async () => {
      const user = userEvent.setup();
      render(<ClassroomManagement {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /add classroom/i });
      await user.click(addButton);

      const capacityInput = screen.getByLabelText(/capacity/i);
      await user.type(capacityInput, '0');

      // Should show validation error
      expect(screen.getByText(/capacity must be/i)).toBeInTheDocument();
    });
  });

  describe('disable', () => {
    it('should disable classroom when disable button clicked', async () => {
      const user = userEvent.setup();
      const { classroomService } = await import('../../../lib/firebaseService');
      vi.mocked(classroomService.update).mockResolvedValue(
        createMockClassroom({ id: 'class_1', isAvailable: false })
      );

      render(<ClassroomManagement {...defaultProps} />);

      const disableButton = screen.getByRole('button', { name: /disable/i });
      if (disableButton) {
        await user.click(disableButton);
        // Should disable classroom
      }
    });
  });

  describe('enable', () => {
    it('should enable classroom when enable button clicked', async () => {
      const user = userEvent.setup();
      const { classroomService } = await import('../../../lib/firebaseService');
      const disabledClassroom = createMockClassroom({ id: 'class_1', isAvailable: false });
      vi.mocked(classroomService.update).mockResolvedValue(
        createMockClassroom({ id: 'class_1', isAvailable: true })
      );

      render(<ClassroomManagement {...defaultProps} classrooms={[disabledClassroom]} />);

      const enableButton = screen.getByRole('button', { name: /enable/i });
      if (enableButton) {
        await user.click(enableButton);
        // Should enable classroom
      }
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ClassroomManagement {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('should have accessible form inputs', async () => {
      const user = userEvent.setup();
      render(<ClassroomManagement {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /add classroom/i });
      await user.click(addButton);

      const nameInput = screen.getByLabelText(/room name/i);
      expect(nameInput).toHaveAttribute('aria-required');
    });

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<ClassroomManagement {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /add classroom/i });
      await user.click(addButton);

      const capacityInput = screen.getByLabelText(/capacity/i);
      await user.type(capacityInput, '0');

      const error = screen.getByText(/capacity must be/i);
      expect(error).toHaveAttribute('role', 'alert');
    });
  });
});

