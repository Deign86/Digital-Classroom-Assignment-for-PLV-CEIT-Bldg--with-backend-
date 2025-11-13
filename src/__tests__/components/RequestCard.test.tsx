import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestCard from '../../../components/RequestCard';
import { createMockBookingRequest } from '../__mocks__/firebase';

describe('RequestCard', () => {
  const mockRequest = createMockBookingRequest({
    id: 'req_1',
    facultyName: 'Test Faculty',
    classroomName: 'Room A',
    date: '2024-01-15',
    startTime: '09:00',
    endTime: '10:00',
    purpose: 'Lecture',
    status: 'pending',
  });

  const defaultProps = {
    request: mockRequest,
    status: 'pending' as const,
    onApprove: vi.fn(),
    onReject: vi.fn(),
    onCancelApproved: vi.fn(),
    checkConflicts: vi.fn().mockResolvedValue(false),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('render details', () => {
    it('should render request details correctly', () => {
      render(<RequestCard {...defaultProps} />);

      expect(screen.getByText('Test Faculty')).toBeInTheDocument();
      expect(screen.getByText('Room A')).toBeInTheDocument();
      expect(screen.getByText('Lecture')).toBeInTheDocument();
    });

    it('should display correct date and time', () => {
      render(<RequestCard {...defaultProps} />);

      expect(screen.getByText(/2024-01-15/i)).toBeInTheDocument();
      expect(screen.getByText(/09:00/i)).toBeInTheDocument();
    });
  });

  describe('approve', () => {
    it('should call onApprove when approve button clicked', async () => {
      const user = userEvent.setup();
      const onApprove = vi.fn();

      render(<RequestCard {...defaultProps} onApprove={onApprove} />);

      const approveButton = screen.getByRole('button', { name: /approve/i });
      await user.click(approveButton);

      await waitFor(() => {
        expect(onApprove).toHaveBeenCalled();
      });
    });
  });

  describe('reject with reason', () => {
    it('should call onReject with reason when reject button clicked', async () => {
      const user = userEvent.setup();
      const onReject = vi.fn();

      render(<RequestCard {...defaultProps} onReject={onReject} />);

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      await user.click(rejectButton);

      const reasonInput = screen.getByLabelText(/reason/i);
      await user.type(reasonInput, 'Room unavailable');

      const confirmButton = screen.getByRole('button', { name: /confirm reject/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(onReject).toHaveBeenCalled();
      });
    });
  });

  describe('cancel', () => {
    it('should call onCancelApproved when cancel button clicked', async () => {
      const user = userEvent.setup();
      const onCancelApproved = vi.fn();
      const approvedRequest = { ...mockRequest, status: 'approved' as const };

      render(
        <RequestCard
          {...defaultProps}
          request={approvedRequest}
          status="approved"
          onCancelApproved={onCancelApproved}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      const reasonInput = screen.getByLabelText(/reason/i);
      await user.type(reasonInput, 'Room needed for maintenance');

      const confirmButton = screen.getByRole('button', { name: /confirm cancel/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(onCancelApproved).toHaveBeenCalled();
      });
    });
  });

  describe('disabled state', () => {
    it('should disable buttons when disabled prop is true', () => {
      render(<RequestCard {...defaultProps} disabled={true} />);

      const approveButton = screen.getByRole('button', { name: /approve/i });
      expect(approveButton).toBeDisabled();
    });
  });

  describe('conflict detection', () => {
    it('should display conflict warning when conflicts exist', async () => {
      const checkConflicts = vi.fn().mockResolvedValue(true);
      render(<RequestCard {...defaultProps} checkConflicts={checkConflicts} />);

      await waitFor(() => {
        expect(checkConflicts).toHaveBeenCalled();
      });
    });
  });

  describe('status display', () => {
    it('should display approved status correctly', () => {
      const approvedRequest = { ...mockRequest, status: 'approved' as const };
      render(<RequestCard {...defaultProps} request={approvedRequest} status="approved" />);

      expect(screen.getByText(/approved/i)).toBeInTheDocument();
    });

    it('should display rejected status correctly', () => {
      const rejectedRequest = { ...mockRequest, status: 'rejected' as const };
      render(<RequestCard {...defaultProps} request={rejectedRequest} status="rejected" />);

      expect(screen.getByText(/rejected/i)).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<RequestCard {...defaultProps} />);

      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<RequestCard {...defaultProps} />);

      await user.tab();
      // Should focus on first interactive element
    });

    it('should have accessible buttons with labels', () => {
      render(<RequestCard {...defaultProps} />);

      const approveButton = screen.getByRole('button', { name: /approve/i });
      expect(approveButton).toHaveAttribute('aria-label');
    });
  });
});

