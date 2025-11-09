import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RequestCard from '../../components/RequestCard';
import { toast } from 'sonner';
import type { BookingRequest } from '../../App';

// Mock external dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock useAnnouncer hook
vi.mock('../../components/Announcer', () => ({
  useAnnouncer: () => ({
    announce: vi.fn(),
  }),
}));

describe('RequestCard', () => {
  const mockRequest: BookingRequest = {
    id: 'req-12345678',
    classroomId: 'room-1',
    classroomName: 'Room 101',
    facultyId: 'faculty-1',
    facultyName: 'John Doe',
    date: '2025-12-15', // Future date to avoid expiration
    startTime: '09:00',
    endTime: '11:00',
    purpose: 'Advanced Programming Lecture',
    status: 'pending',
    requestDate: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders the request card with faculty name', () => {
      render(<RequestCard request={mockRequest} status="pending" />);
      
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('renders the request ID (first 8 characters)', () => {
      render(<RequestCard request={mockRequest} status="pending" />);
      
      expect(screen.getByText(/Request ID:.*req-1234/i)).toBeInTheDocument();
    });

    it('renders the classroom name', () => {
      render(<RequestCard request={mockRequest} status="pending" />);
      
      expect(screen.getByText('Room 101')).toBeInTheDocument();
    });

    it('renders the purpose text', () => {
      render(<RequestCard request={mockRequest} status="pending" />);
      
      expect(screen.getByText('Advanced Programming Lecture')).toBeInTheDocument();
    });

    it('renders the date in readable format', () => {
      render(<RequestCard request={mockRequest} status="pending" />);
      
      expect(screen.getByText(/December 15, 2025/i)).toBeInTheDocument();
    });

    it('renders the time range in 12-hour format', () => {
      render(<RequestCard request={mockRequest} status="pending" />);
      
      expect(screen.getByText(/9:00 AM - 11:00 AM/i)).toBeInTheDocument();
    });
  });

  describe('Status Display', () => {
    it('displays Pending badge for pending status', () => {
      render(<RequestCard request={mockRequest} status="pending" />);
      
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('displays Approved badge for approved status', () => {
      render(<RequestCard request={mockRequest} status="approved" />);
      
      expect(screen.getByText('Approved')).toBeInTheDocument();
    });

    it('displays Rejected badge for rejected status', () => {
      render(<RequestCard request={mockRequest} status="rejected" />);
      
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    it('displays Expired badge for expired status', () => {
      render(<RequestCard request={mockRequest} status="expired" />);
      
      expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    it('displays Expired badge when status is expired', () => {
      render(<RequestCard request={mockRequest} status="expired" />);
      
      // Component shows only the Expired badge, not both Expired and status badge
      expect(screen.getByText('Expired')).toBeInTheDocument();
      expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    });
  });

  describe('Border Colors', () => {
    it('applies orange border for pending status without conflict', () => {
      const { container } = render(<RequestCard request={mockRequest} status="pending" />);
      
      const card = container.querySelector('[class*="border-l-orange-500"]');
      expect(card).toBeInTheDocument();
    });

    it('applies green border for approved status', () => {
      const { container } = render(<RequestCard request={mockRequest} status="approved" />);
      
      const card = container.querySelector('[class*="border-l-green-500"]');
      expect(card).toBeInTheDocument();
    });

    it('applies red border for rejected status', () => {
      const { container } = render(<RequestCard request={mockRequest} status="rejected" />);
      
      const card = container.querySelector('[class*="border-l-red-500"]');
      expect(card).toBeInTheDocument();
    });

    it('applies gray border for expired status', () => {
      const { container } = render(<RequestCard request={mockRequest} status="expired" />);
      
      const card = container.querySelector('[class*="border-l-gray-400"]');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Conflict Detection', () => {
    it('displays conflict warning when checkConflicts returns true (synchronous)', async () => {
      const mockCheckConflicts = vi.fn().mockReturnValue(true);
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          checkConflicts={mockCheckConflicts}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/scheduling conflict/i)).toBeInTheDocument();
      });
      
      expect(mockCheckConflicts).toHaveBeenCalledWith(
        mockRequest.classroomId,
        mockRequest.date,
        mockRequest.startTime,
        mockRequest.endTime,
        false, // checkPastTime is false in component
        mockRequest.id
      );
    });

    it('displays conflict warning when checkConflicts returns true (asynchronous)', async () => {
      const mockCheckConflicts = vi.fn().mockResolvedValue(true);
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          checkConflicts={mockCheckConflicts}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText(/scheduling conflict/i)).toBeInTheDocument();
      });
      
      expect(mockCheckConflicts).toHaveBeenCalledWith(
        mockRequest.classroomId,
        mockRequest.date,
        mockRequest.startTime,
        mockRequest.endTime,
        false, // checkPastTime is false in component
        mockRequest.id
      );
    });

    it('does not display conflict warning when checkConflicts returns false', async () => {
      const mockCheckConflicts = vi.fn().mockReturnValue(false);
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          checkConflicts={mockCheckConflicts}
        />
      );
      
      await waitFor(() => {
        expect(mockCheckConflicts).toHaveBeenCalled();
      });
      
      expect(screen.queryByText(/scheduling conflict/i)).not.toBeInTheDocument();
    });

    it('applies red border when conflict is detected', async () => {
      const mockCheckConflicts = vi.fn().mockReturnValue(true);
      
      const { container } = render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          checkConflicts={mockCheckConflicts}
        />
      );
      
      await waitFor(() => {
        const card = container.querySelector('[class*="border-l-red-500"]');
        expect(card).toBeInTheDocument();
      });
    });

    it('does not call checkConflicts if not provided', () => {
      render(<RequestCard request={mockRequest} status="pending" />);
      
      expect(screen.queryByText(/scheduling conflict/i)).not.toBeInTheDocument();
    });

    it('does not display conflict warning for non-pending statuses', async () => {
      const mockCheckConflicts = vi.fn().mockReturnValue(true);
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          checkConflicts={mockCheckConflicts}
        />
      );
      
      // checkConflicts should NOT be called for approved status (only pending)
      expect(mockCheckConflicts).not.toHaveBeenCalled();
      
      // Conflict warning should not be visible for approved status
      expect(screen.queryByText(/scheduling conflict/i)).not.toBeInTheDocument();
    });
  });

  describe('Selection Checkbox', () => {
    it('displays checkbox when showSelect is true', () => {
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          showSelect={true}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeInTheDocument();
    });

    it('does not display checkbox when showSelect is false', () => {
      render(<RequestCard request={mockRequest} status="pending" showSelect={false} />);
      
      const checkbox = screen.queryByRole('checkbox');
      expect(checkbox).not.toBeInTheDocument();
    });

    it('checkbox is checked when selected is true', () => {
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          showSelect={true}
          selected={true}
          onToggleSelect={vi.fn()}
        />
      );
      
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('checkbox is unchecked when selected is false', () => {
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          showSelect={true}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );
      
      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('calls onToggleSelect when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const mockOnToggleSelect = vi.fn();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          showSelect={true}
          selected={false}
          onToggleSelect={mockOnToggleSelect}
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      
      expect(mockOnToggleSelect).toHaveBeenCalledWith(true);
    });

    it('checkbox is disabled when disabled prop is true', () => {
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          showSelect={true}
          selected={false}
          onToggleSelect={vi.fn()}
          disabled={true}
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeDisabled();
    });
  });

  describe('Pending Status Actions', () => {
    it('displays Approve and Reject buttons for pending status', () => {
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );
      
      expect(screen.getByText(/Approve/)).toBeInTheDocument();
      expect(screen.getByText(/Reject/)).toBeInTheDocument();
    });

    it('calls onApprove when Approve button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnApprove = vi.fn();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          onApprove={mockOnApprove}
          onReject={vi.fn()}
        />
      );
      
      const approveButton = screen.getByRole('button', { name: /Approve/i });
      await user.click(approveButton);
      
      expect(mockOnApprove).toHaveBeenCalledTimes(1);
    });

    it('calls onReject when Reject button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnReject = vi.fn();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          onApprove={vi.fn()}
          onReject={mockOnReject}
        />
      );
      
      const rejectButton = screen.getByRole('button', { name: /Reject/i });
      await user.click(rejectButton);
      
      expect(mockOnReject).toHaveBeenCalledTimes(1);
    });

    it('disables Approve button when hasConflict is true', async () => {
      const mockCheckConflicts = vi.fn().mockReturnValue(true);
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          onApprove={vi.fn()}
          onReject={vi.fn()}
          checkConflicts={mockCheckConflicts}
        />
      );
      
      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /Approve/i });
        expect(approveButton).toBeDisabled();
      });
    });

    it('does not disable Reject button when hasConflict is true', async () => {
      const mockCheckConflicts = vi.fn().mockReturnValue(true);
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          onApprove={vi.fn()}
          onReject={vi.fn()}
          checkConflicts={mockCheckConflicts}
        />
      );
      
      await waitFor(() => {
        const rejectButton = screen.getByRole('button', { name: /Reject/i });
        expect(rejectButton).not.toBeDisabled();
      });
    });

    it('disables both action buttons when disabled prop is true', () => {
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          onApprove={vi.fn()}
          onReject={vi.fn()}
          disabled={true}
        />
      );
      
      const approveButton = screen.getByRole('button', { name: /Approve/i });
      const rejectButton = screen.getByRole('button', { name: /Reject/i });
      
      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });

    it('displays tooltip explaining conflict when Approve is disabled', async () => {
      const user = userEvent.setup();
      const mockCheckConflicts = vi.fn().mockReturnValue(true);
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          onApprove={vi.fn()}
          onReject={vi.fn()}
          checkConflicts={mockCheckConflicts}
        />
      );
      
      await waitFor(() => {
        const approveButton = screen.getByRole('button', { name: /Approve/i });
        expect(approveButton).toBeDisabled();
      });
      
      // There's both a conflict warning banner and a tooltip with "scheduling conflict"
      // The banner should be visible, the tooltip appears on hover
      // Just verify the button is disabled with the right aria-label
      const approveButton = screen.getByRole('button', { name: /Approve.*disabled due to scheduling conflict/i });
      expect(approveButton).toBeDisabled();
      expect(approveButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Expired Status', () => {
    it('does not display action buttons for expired status', () => {
      render(
        <RequestCard 
          request={mockRequest} 
          status="expired" 
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );
      
      expect(screen.queryByRole('button', { name: /Approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Reject/i })).not.toBeInTheDocument();
    });

    it('displays expired message for expired pending requests', () => {
      // For the "Expired — cannot be approved or rejected" message to appear,
      // status must be "pending" with a past date
      const pastRequest = {
        ...mockRequest,
        date: '2024-01-15', // Past date to trigger expiration
      };
      
      render(
        <RequestCard 
          request={pastRequest} 
          status="pending" 
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );
      
      // Look for the visible paragraph element (not the sr-only span)
      const message = screen.getByText((content, element) => {
        return element?.tagName === 'P' && /Expired.+cannot be approved or rejected/i.test(content);
      });
      expect(message).toBeInTheDocument();
    });

    it('includes accessible status message for expired requests', () => {
      // For the accessible status message to appear, use status="pending" with past date
      const pastRequest = {
        ...mockRequest,
        date: '2024-01-15', // Past date to trigger expiration
      };
      
      render(
        <RequestCard 
          request={pastRequest} 
          status="pending" 
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );
      
      // The sr-only span contains the accessible status message
      const statusMessage = screen.getByText(/This request has expired and cannot be approved or rejected/i);
      expect(statusMessage).toHaveAttribute('role', 'status');
      expect(statusMessage).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Approved Status and Cancellation', () => {
    it('displays Cancel Reservation button for approved status', () => {
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={vi.fn()}
        />
      );
      
      expect(screen.getByRole('button', { name: /Cancel Reservation/i })).toBeInTheDocument();
    });

    it('does not display Cancel button if onCancelApproved is not provided', () => {
      render(<RequestCard request={mockRequest} status="approved" />);
      
      expect(screen.queryByRole('button', { name: /Cancel Reservation/i })).not.toBeInTheDocument();
    });

    it('opens cancel dialog when Cancel Reservation button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={vi.fn()}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to cancel/i)).toBeInTheDocument();
      });
    });

    it('displays cancellation reason textarea in dialog', async () => {
      const user = userEvent.setup();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={vi.fn()}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
    });

    it('updates cancel reason when user types in textarea', async () => {
      const user = userEvent.setup();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={vi.fn()}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Cancellation reason/i);
      await user.type(textarea, 'Emergency maintenance required');
      
      expect(textarea).toHaveValue('Emergency maintenance required');
    });

    it('displays character count for cancellation reason', async () => {
      const user = userEvent.setup();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={vi.fn()}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.getByText('0/500')).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Cancellation reason/i);
      await user.type(textarea, 'Emergency');
      
      await waitFor(() => {
        expect(screen.getByText('9/500')).toBeInTheDocument();
      });
    });

    it('prevents exceeding 500 character limit', async () => {
      const user = userEvent.setup();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={vi.fn()}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Cancellation reason/i) as HTMLTextAreaElement;
      
      // Component has maxLength={500} attribute which prevents typing beyond 500 chars
      expect(textarea).toHaveAttribute('maxLength', '500');
      
      // Verify the character counter is displayed
      expect(screen.getByText(/0\/500/i)).toBeInTheDocument();
    });

    it('disables Cancel Reservation button in dialog if reason is empty', async () => {
      const user = userEvent.setup();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={vi.fn()}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const dialogCancelButton = screen.getAllByRole('button').find(btn => 
          btn.textContent === 'Cancel Reservation'
        );
        expect(dialogCancelButton).toBeDisabled();
      });
    });

    it('enables Cancel Reservation button in dialog when reason is provided', async () => {
      const user = userEvent.setup();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={vi.fn()}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Cancellation reason/i);
      await user.type(textarea, 'Emergency maintenance');
      
      await waitFor(() => {
        const dialogCancelButton = screen.getAllByRole('button').find(btn => 
          btn.textContent === 'Cancel Reservation'
        );
        expect(dialogCancelButton).not.toBeDisabled();
      });
    });

    it('calls onCancelApproved with request ID and reason when confirmed', async () => {
      const user = userEvent.setup();
      const mockOnCancelApproved = vi.fn().mockResolvedValue(undefined);
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={mockOnCancelApproved}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Cancellation reason/i);
      await user.type(textarea, 'Emergency maintenance');
      
      const dialogCancelButton = screen.getAllByRole('button').find(btn => 
        btn.textContent === 'Cancel Reservation'
      );
      await user.click(dialogCancelButton!);
      
      await waitFor(() => {
        expect(mockOnCancelApproved).toHaveBeenCalledWith('req-12345678', 'Emergency maintenance');
      });
    });

    it('closes dialog after successful cancellation', async () => {
      const user = userEvent.setup();
      const mockOnCancelApproved = vi.fn().mockResolvedValue(undefined);
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={mockOnCancelApproved}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Cancellation reason/i);
      await user.type(textarea, 'Emergency maintenance');
      
      const dialogCancelButton = screen.getAllByRole('button').find(btn => 
        btn.textContent === 'Cancel Reservation'
      );
      await user.click(dialogCancelButton!);
      
      await waitFor(() => {
        expect(screen.queryByText(/Are you sure you want to cancel/i)).not.toBeInTheDocument();
      });
    });

    it('displays loading state during cancellation', async () => {
      const user = userEvent.setup();
      const mockOnCancelApproved = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={mockOnCancelApproved}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Cancellation reason/i);
      await user.type(textarea, 'Emergency maintenance');
      
      const dialogCancelButton = screen.getAllByRole('button').find(btn => 
        btn.textContent === 'Cancel Reservation'
      );
      await user.click(dialogCancelButton!);
      
      // Should show loading state
      expect(screen.getByText(/Cancelling/i)).toBeInTheDocument();
    });

    it('displays error toast on cancellation failure', async () => {
      const user = userEvent.setup();
      const mockOnCancelApproved = vi.fn().mockRejectedValue(new Error('Network error'));
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={mockOnCancelApproved}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Cancellation reason/i);
      await user.type(textarea, 'Emergency maintenance');
      
      const dialogCancelButton = screen.getAllByRole('button').find(btn => 
        btn.textContent === 'Cancel Reservation'
      );
      await user.click(dialogCancelButton!);
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error');
      });
    });

    it('can close cancel dialog with Keep Reservation button', async () => {
      const user = userEvent.setup();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={vi.fn()}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        expect(screen.getByText(/Are you sure you want to cancel/i)).toBeInTheDocument();
      });
      
      const keepButton = screen.getByRole('button', { name: /Keep Reservation/i });
      await user.click(keepButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/Are you sure you want to cancel/i)).not.toBeInTheDocument();
      });
    });

    it('clears cancel reason when dialog is closed', async () => {
      const user = userEvent.setup();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={vi.fn()}
        />
      );
      
      // Open dialog and type reason
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Cancellation reason/i);
      await user.type(textarea, 'Test reason');
      
      // Close dialog
      const keepButton = screen.getByRole('button', { name: /Keep Reservation/i });
      await user.click(keepButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/Are you sure you want to cancel/i)).not.toBeInTheDocument();
      });
      
      // Reopen dialog - reason should be cleared
      await user.click(cancelButton);
      
      await waitFor(() => {
        const clearedTextarea = screen.getByLabelText(/Cancellation reason/i);
        expect(clearedTextarea).toHaveValue('');
      });
    });
  });

  describe('Admin Feedback Display', () => {
    it('displays admin feedback when present', () => {
      const requestWithFeedback = {
        ...mockRequest,
        adminFeedback: 'This request was rejected due to scheduling conflicts.',
      };
      
      render(<RequestCard request={requestWithFeedback} status="rejected" />);
      
      expect(screen.getByText('Admin Feedback:')).toBeInTheDocument();
      expect(screen.getByText(/scheduling conflicts/i)).toBeInTheDocument();
    });

    it('does not display admin feedback section when feedback is absent', () => {
      render(<RequestCard request={mockRequest} status="rejected" />);
      
      expect(screen.queryByText('Admin Feedback:')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible labels on action buttons', () => {
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          onApprove={vi.fn()}
          onReject={vi.fn()}
        />
      );
      
      expect(screen.getByRole('button', { name: /Approve request/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Reject request/i })).toBeInTheDocument();
    });

    it('has accessible label on checkbox', () => {
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          showSelect={true}
          selected={false}
          onToggleSelect={vi.fn()}
        />
      );
      
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAccessibleName();
    });

    it('has accessible label on cancellation reason textarea', async () => {
      const user = userEvent.setup();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={vi.fn()}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
    });

    it('error messages have role="alert" for accessibility', async () => {
      const user = userEvent.setup();
      const mockOnCancelApproved = vi.fn().mockRejectedValue(new Error('Network error'));
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={mockOnCancelApproved}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Cancellation reason/i);
      await user.type(textarea, 'Test reason');
      
      const confirmButton = screen.getAllByRole('button').find(btn => 
        btn.textContent === 'Cancel Reservation'
      );
      await user.click(confirmButton!);
      
      // Wait for the error to appear after the async operation fails
      await waitFor(() => {
        const errorMessage = screen.getByRole('alert');
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles missing callbacks gracefully', () => {
      render(<RequestCard request={mockRequest} status="pending" />);
      
      // Should render without crashing even without callbacks
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('handles very long purpose text', () => {
      const longPurposeRequest = {
        ...mockRequest,
        purpose: 'A'.repeat(500),
      };
      
      render(<RequestCard request={longPurposeRequest} status="pending" />);
      
      expect(screen.getByText('A'.repeat(500))).toBeInTheDocument();
    });

    it('handles very long faculty name', () => {
      const longNameRequest = {
        ...mockRequest,
        facultyName: 'Dr. ' + 'A'.repeat(100),
      };
      
      render(<RequestCard request={longNameRequest} status="pending" />);
      
      expect(screen.getByText('Dr. ' + 'A'.repeat(100))).toBeInTheDocument();
    });

    it('handles very long classroom name', () => {
      const longClassroomRequest = {
        ...mockRequest,
        classroomName: 'Building ' + 'A'.repeat(100),
      };
      
      render(<RequestCard request={longClassroomRequest} status="pending" />);
      
      expect(screen.getByText('Building ' + 'A'.repeat(100))).toBeInTheDocument();
    });

    it('handles checkConflicts errors gracefully', async () => {
      const mockCheckConflicts = vi.fn().mockRejectedValue(new Error('Network error'));
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="pending" 
          checkConflicts={mockCheckConflicts}
        />
      );
      
      await waitFor(() => {
        expect(mockCheckConflicts).toHaveBeenCalled();
      });
      
      // Component sets hasConflict=true on error (defensive: assume conflict if check fails)
      // This prevents approving potentially conflicting reservations
      await waitFor(() => {
        expect(screen.getByText(/scheduling conflict/i)).toBeInTheDocument();
      });
    });

    it('disables Cancel button when disabled prop is true', () => {
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={vi.fn()}
          disabled={true}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      expect(cancelButton).toBeDisabled();
    });

    it('prevents dialog interaction during cancellation', async () => {
      const user = userEvent.setup();
      const mockOnCancelApproved = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={mockOnCancelApproved}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Cancellation reason/i);
      await user.type(textarea, 'Emergency maintenance');
      
      const dialogCancelButton = screen.getAllByRole('button').find(btn => 
        btn.textContent === 'Cancel Reservation'
      );
      await user.click(dialogCancelButton!);
      
      // Textarea should be disabled during cancellation
      await waitFor(() => {
        expect(textarea).toBeDisabled();
      });
      
      // Keep Reservation button should be disabled
      const keepButton = screen.getByRole('button', { name: /Keep Reservation/i });
      expect(keepButton).toBeDisabled();
    });

    it('validates cancel reason is not only whitespace', async () => {
      const user = userEvent.setup();
      const mockOnCancelApproved = vi.fn();
      
      render(
        <RequestCard 
          request={mockRequest} 
          status="approved" 
          onCancelApproved={mockOnCancelApproved}
        />
      );
      
      const cancelButton = screen.getByRole('button', { name: /Cancel Reservation/i });
      await user.click(cancelButton);
      
      await waitFor(() => {
        const textarea = screen.getByLabelText(/Cancellation reason/i);
        expect(textarea).toBeInTheDocument();
      });
      
      const textarea = screen.getByLabelText(/Cancellation reason/i);
      await user.type(textarea, '     ');
      
      const dialogCancelButton = screen.getAllByRole('button').find(btn => 
        btn.textContent === 'Cancel Reservation'
      );
      
      // Button should be disabled since trimmed value is empty
      expect(dialogCancelButton).toBeDisabled();
    });
  });
});
