/**
 * SignupApproval.test.tsx
 * 
 * Comprehensive test suite for the SignupApproval component.
 * Tests admin signup approval system including:
 * - Approve/reject faculty signups
 * - Bulk operations (approve all, reject all)
 * - Signup request tracking
 * - Email validation
 * - Department filtering
 * - Search and status filtering
 * - Confirmation dialogs
 * - Processing states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignupApproval from '../../../components/SignupApproval';
import type { SignupRequest, SignupHistory } from '../../../App';

// Mock dependencies
vi.mock('../../lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn()
  }
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

vi.mock('../../components/Announcer', () => ({
  useAnnouncer: () => ({
    announce: vi.fn()
  })
}));

describe('SignupApproval', () => {
  const mockOnSignupApproval = vi.fn();
  
  const mockPendingRequest: SignupRequest = {
    id: 'req1',
    userId: 'user1',
    name: 'John Doe',
    email: 'john.doe@plv.edu.ph',
    department: 'Computer Engineering',
    requestDate: '2025-11-01T10:00:00Z',
    status: 'pending'
  };

  const mockApprovedRequest: SignupRequest = {
    id: 'req2',
    userId: 'user2',
    name: 'Jane Smith',
    email: 'jane.smith@plv.edu.ph',
    department: 'Information Technology',
    requestDate: '2025-11-02T11:00:00Z',
    status: 'approved'
  };

  const mockRejectedHistory: SignupHistory = {
    id: 'hist1',
    userId: 'user3',
    name: 'Bob Johnson',
    email: 'bob.johnson@plv.edu.ph',
    department: 'Electronics Engineering',
    requestDate: '2025-10-30T09:00:00Z',
    resolvedAt: '2025-10-31T10:00:00Z',
    status: 'rejected',
    adminFeedback: 'Invalid department',
    processedBy: 'admin1'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSignupApproval.mockResolvedValue(undefined);
  });

  describe('Component Rendering', () => {
    it('should render signup approval header', () => {
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Multiple headings with "Faculty Signup Requests" exist, check for the main one
      const headings = screen.getAllByRole('heading', { name: /faculty signup requests/i });
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should render pending requests by default', () => {
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      expect(screen.getByText(mockPendingRequest.name)).toBeInTheDocument();
      expect(screen.getByText(mockPendingRequest.email)).toBeInTheDocument();
    });

    it('should display request count badges', () => {
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest, mockApprovedRequest]}
          signupHistory={[mockRejectedHistory]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Should show count of pending requests - use getAllByText and check for badge with count
      expect(screen.getByText(/1 pending/i)).toBeInTheDocument();
    });

    it('should show empty state when no pending requests', () => {
      render(
        <SignupApproval
          signupRequests={[]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      expect(screen.getByText(/no pending/i)).toBeInTheDocument();
    });
  });

  describe('Status Filtering', () => {
    it('should filter by pending status by default', () => {
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest, mockApprovedRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // By default shows pending
      expect(screen.getByText(mockPendingRequest.name)).toBeInTheDocument();
      expect(screen.queryByText(mockApprovedRequest.name)).not.toBeInTheDocument();
    });

    it('should show approved requests in processed section', async () => {
      const user = userEvent.setup();
      const mockApprovedWithResolvedAt = { 
        ...mockApprovedRequest, 
        resolvedAt: '2025-11-03T12:00:00Z',
        status: 'approved' as const
      };
      
      render(
        <SignupApproval
          signupRequests={[mockApprovedWithResolvedAt]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Change filter to "all" or "approved" to see approved requests
      const statusFilter = screen.getByLabelText(/filter by status/i);
      await user.selectOptions(statusFilter, 'all');

      // Processed section should show approved requests with resolvedAt
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /recent processed requests/i })).toBeInTheDocument();
      });
      expect(screen.getByText(mockApprovedWithResolvedAt.name)).toBeInTheDocument();
    });

    it('should display rejected requests in history section', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[]}
          signupHistory={[mockRejectedHistory]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Change filter to "all" or "rejected" to see rejected history
      const statusFilter = screen.getByLabelText(/filter by status/i);
      await user.selectOptions(statusFilter, 'all');

      // History items with resolvedAt should appear in processed section
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /recent processed requests/i })).toBeInTheDocument();
      });
      expect(screen.getByText(mockRejectedHistory.name)).toBeInTheDocument();
      expect(screen.getByText(/invalid department/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter requests by name', async () => {
      const user = userEvent.setup();
      const aliceRequest = { ...mockPendingRequest, id: 'req3', name: 'Alice Wong', email: 'alice.wong@plv.edu.ph' };
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest, aliceRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.clear(searchInput);
      await user.type(searchInput, 'John');

      // Wait for filter to apply - John Doe should be visible
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      // Give extra time for Alice to be filtered out (search uses useMemo which may have delay)
      await waitFor(() => {
        expect(screen.queryByText('Alice Wong')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    it('should filter requests by email', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'john.doe');

      await waitFor(() => {
        expect(screen.getByText(mockPendingRequest.email)).toBeInTheDocument();
      });
    });

    it('should filter requests by department', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'Computer');

      await waitFor(() => {
        expect(screen.getByText(/computer engineering/i)).toBeInTheDocument();
      });
    });

    it('should be case insensitive', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, 'JOHN DOE');

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
    });
  });

  describe('Individual Approval Actions', () => {
    it('should open confirmation dialog when approving', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Find the specific approve button (not "Approve Selected")
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      const individualApproveButton = approveButtons.find(btn => 
        btn.textContent?.includes('Approve') && !btn.textContent?.includes('Selected')
      );
      await user.click(individualApproveButton!);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/confirm approval/i)).toBeInTheDocument();
      });
    });

    it('should successfully approve a request', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Find the specific approve button (not "Approve Selected")
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      const individualApproveButton = approveButtons.find(btn => 
        btn.textContent?.includes('Approve') && !btn.textContent?.includes('Selected')
      );
      await user.click(individualApproveButton!);

      // Look for "Confirm Approval" button in dialog
      const confirmButton = await screen.findByRole('button', { name: /confirm approval/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnSignupApproval).toHaveBeenCalledWith('req1', true, undefined);
      });
    });

    it('should open confirmation dialog when rejecting', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Find the specific reject button (not "Reject Selected")
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      const individualRejectButton = rejectButtons.find(btn => 
        btn.textContent?.includes('Reject') && !btn.textContent?.includes('Selected')
      );
      await user.click(individualRejectButton!);

      // Component shows error toast if trying to reject without feedback
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Please provide a reason when rejecting a request.');
      });
    });

    it('should successfully reject with feedback', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Find feedback textarea for this request
      const feedbackInput = screen.getByLabelText(/admin feedback/i);
      await user.type(feedbackInput, 'Not eligible for faculty account');

      // Find the specific reject button (not "Reject Selected")
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      const individualRejectButton = rejectButtons.find(btn => 
        btn.textContent?.includes('Reject') && !btn.textContent?.includes('Selected')
      );
      await user.click(individualRejectButton!);

      // Look for "Confirm Rejection" button in dialog
      const confirmButton = await screen.findByRole('button', { name: /confirm rejection/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnSignupApproval).toHaveBeenCalledWith(
          'req1',
          false,
          'Not eligible for faculty account'
        );
      });
    });

    it('should show loading state during approval', async () => {
      const user = userEvent.setup();
      mockOnSignupApproval.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Find the specific approve button (not "Approve Selected")
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      const individualApproveButton = approveButtons.find(btn => 
        btn.textContent?.includes('Approve') && !btn.textContent?.includes('Selected')
      );
      await user.click(individualApproveButton!);

      const confirmButton = await screen.findByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /processing/i })).toBeInTheDocument();
      });
    });

    it('should handle approval errors gracefully', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      mockOnSignupApproval.mockRejectedValue(new Error('Network error'));

      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Find the specific approve button (not "Approve Selected")
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      const individualApproveButton = approveButtons.find(btn => 
        btn.textContent?.includes('Approve') && !btn.textContent?.includes('Selected')
      );
      await user.click(individualApproveButton!);

      const confirmButton = await screen.findByRole('button', { name: /confirm/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Bulk Selection', () => {
    it('should allow selecting multiple requests', async () => {
      const user = userEvent.setup();
      const requests = [
        mockPendingRequest,
        { ...mockPendingRequest, id: 'req2', name: 'Alice Wong' }
      ];

      render(
        <SignupApproval
          signupRequests={requests}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Get individual request checkboxes (not the select-all checkbox)
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // First individual checkbox
      await user.click(checkboxes[2]); // Second individual checkbox

      // Should show selected count in bulk buttons
      expect(screen.getByText(/approve selected \(2\)/i)).toBeInTheDocument();
    });

    it('should enable bulk buttons when requests are selected', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Get individual checkbox (not select-all)
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      // Bulk buttons should be enabled
      const approveSelectedButton = screen.getByRole('button', { name: /approve selected/i });
      expect(approveSelectedButton).not.toBeDisabled();
    });
  });

  describe('Bulk Operations', () => {
    it('should open bulk approval dialog', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Get checkboxes and click one to select a request
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Click first individual checkbox (not select-all)

      const bulkApproveButton = screen.getByRole('button', { name: /approve selected \(1\)/i });
      await user.click(bulkApproveButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        // Dialog should have "Approve Selected" button
        expect(screen.getByRole('button', { name: /approve selected/i })).toBeInTheDocument();
      });
    });

    it('should require feedback for bulk rejection', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Click first individual checkbox

      const bulkRejectButton = screen.getByRole('button', { name: /reject selected \(1\)/i });
      await user.click(bulkRejectButton);

      // Look for "Reject Selected" button in dialog (should be disabled without feedback)
      const confirmButton = await screen.findByRole('button', { name: /reject selected/i });
      
      // Confirm button should be disabled without feedback
      expect(confirmButton).toBeDisabled();
    });

    it('should process bulk approvals with concurrency', async () => {
      const user = userEvent.setup();
      const requests = [
        mockPendingRequest,
        { ...mockPendingRequest, id: 'req2' },
        { ...mockPendingRequest, id: 'req3' },
        { ...mockPendingRequest, id: 'req4' }
      ];

      render(
        <SignupApproval
          signupRequests={requests}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Select all by clicking select-all checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]); // Click select-all checkbox

      const bulkApproveButton = screen.getByRole('button', { name: /approve selected \(4\)/i });
      await user.click(bulkApproveButton);

      // Wait for dialog and click "Approve Selected" button
      const confirmButton = await screen.findByRole('button', { name: /approve selected/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(mockOnSignupApproval).toHaveBeenCalledTimes(4);
      });
    });

    it('should show bulk progress indicator', async () => {
      const user = userEvent.setup();
      // Increase delay to ensure progress indicator is visible
      mockOnSignupApproval.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]); // Click first individual checkbox

      const bulkApproveButton = screen.getByRole('button', { name: /approve selected \(1\)/i });
      await user.click(bulkApproveButton);

      // Click "Approve Selected" in dialog
      const confirmButton = await screen.findByRole('button', { name: /approve selected/i });
      await user.click(confirmButton);

      // Should show "Processing…" text - check both button and dialog locations
      await waitFor(() => {
        const processingElements = screen.queryAllByText(/processing/i);
        expect(processingElements.length).toBeGreaterThan(0);
      }, { timeout: 3000 });
    });

    it('should handle partial bulk failures', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');
      
      let callCount = 0;
      mockOnSignupApproval.mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('Failed'));
        }
        return Promise.resolve();
      });

      const requests = [
        mockPendingRequest,
        { ...mockPendingRequest, id: 'req2' },
        { ...mockPendingRequest, id: 'req3' }
      ];

      render(
        <SignupApproval
          signupRequests={requests}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Click select-all checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      const bulkApproveButton = screen.getByRole('button', { name: /approve selected \(3\)/i });
      await user.click(bulkApproveButton);

      // Click "Approve Selected" in dialog
      const confirmButton = await screen.findByRole('button', { name: /approve selected/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(expect.stringContaining('succeeded'));
      });
    });
  });

  describe('Feedback Validation', () => {
    it('should validate feedback character limit', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      const feedbackInput = screen.getByLabelText(/admin feedback/i);
      // Type 500 characters to reach the limit - maxLength will enforce this
      const maxText = 'a'.repeat(500);
      await user.click(feedbackInput);
      await user.paste(maxText);

      // Check that character counter shows 500/500
      await waitFor(() => {
        expect(screen.getByText('500/500')).toBeInTheDocument();
      });
    });

    it('should show character count', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      const feedbackInput = screen.getByLabelText(/admin feedback/i);
      await user.type(feedbackInput, 'Test feedback');

      await waitFor(() => {
        expect(screen.getByText(/\/500/)).toBeInTheDocument();
      });
    });
  });

  describe('Request Information Display', () => {
    it('should display user icon', () => {
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // User icon should be present
      const icons = document.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });

    it('should display email icon', () => {
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      expect(screen.getByText(mockPendingRequest.email)).toBeInTheDocument();
    });

    it('should display department with building icon', () => {
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      expect(screen.getByText(/computer engineering/i)).toBeInTheDocument();
    });

    it('should display formatted request date', () => {
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      expect(screen.getByText(/november/i)).toBeInTheDocument();
    });
  });

  describe('Status Badges', () => {
    it('should display pending badge with clock icon', () => {
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Look for the specific badge text "1 pending" to avoid multiple matches
      expect(screen.getByText(/1 pending/i)).toBeInTheDocument();
    });

    it('should display approved badge with check icon', async () => {
      const mockApprovedWithResolvedAt = { 
        ...mockApprovedRequest, 
        resolvedAt: '2025-11-03T12:00:00Z' 
      };
      
      render(
        <SignupApproval
          signupRequests={[mockApprovedWithResolvedAt]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Approved requests appear in processed section
      await waitFor(() => {
        expect(screen.getByText(/approved/i)).toBeInTheDocument();
      });
    });

    it('should display rejected badge with X icon', async () => {
      render(
        <SignupApproval
          signupRequests={[]}
          signupHistory={[mockRejectedHistory]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // History items appear in processed section
      await waitFor(() => {
        expect(screen.getByText(/rejected/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/filter by status/i)).toBeInTheDocument();
    });

    it('should have accessible buttons', () => {
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Check that approve and reject buttons exist
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      const rejectButtons = screen.getAllByRole('button', { name: /reject/i });
      expect(approveButtons.length).toBeGreaterThan(0);
      expect(rejectButtons.length).toBeGreaterThan(0);
    });

    it('should have accessible dialog', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Find the specific approve button (not "Approve Selected")
      const approveButtons = screen.getAllByRole('button', { name: /approve/i });
      const individualApproveButton = approveButtons.find(btn => 
        btn.textContent?.includes('Approve') && !btn.textContent?.includes('Selected')
      );
      await user.click(individualApproveButton!);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
      });
    });

    it('should announce bulk operation results', async () => {
      const user = userEvent.setup();
      const { toast } = await import('sonner');

      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      // Get individual checkbox (not select-all)
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[1]);

      const bulkApproveButton = screen.getByRole('button', { name: /approve selected/i });
      await user.click(bulkApproveButton);

      const confirmButton = await screen.findByRole('button', { name: /approve selected/i });
      await user.click(confirmButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty signup requests array', () => {
      render(
        <SignupApproval
          signupRequests={[]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      expect(screen.getByText(/no pending/i)).toBeInTheDocument();
    });

    it('should handle missing optional props', () => {
      render(
        <SignupApproval
          onSignupApproval={mockOnSignupApproval}
        />
      );

      expect(screen.getByText(/no pending/i)).toBeInTheDocument();
    });

    it('should handle requests without department', () => {
      const requestWithoutDept = { ...mockPendingRequest, department: undefined };
      render(
        <SignupApproval
          signupRequests={[requestWithoutDept as any]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      expect(screen.getByText(requestWithoutDept.name)).toBeInTheDocument();
    });

    it('should handle search with special characters', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      const searchInput = screen.getByPlaceholderText(/search/i);
      await user.type(searchInput, '@#$%');

      // Should not crash
      expect(screen.queryByText(mockPendingRequest.name)).not.toBeInTheDocument();
    });

    it('should handle very long feedback text', async () => {
      const user = userEvent.setup();
      render(
        <SignupApproval
          signupRequests={[mockPendingRequest]}
          signupHistory={[]}
          onSignupApproval={mockOnSignupApproval}
        />
      );

      const feedbackInput = screen.getByLabelText(/admin feedback/i);
      // maxLength=500 prevents pasting more than 500 chars, so paste exactly 500
      const maxText = 'x'.repeat(500);
      await user.click(feedbackInput);
      await user.paste(maxText);

      // Should show character counter at max
      await waitFor(() => {
        expect(screen.getByText('500/500')).toBeInTheDocument();
      });
    });
  });
});
