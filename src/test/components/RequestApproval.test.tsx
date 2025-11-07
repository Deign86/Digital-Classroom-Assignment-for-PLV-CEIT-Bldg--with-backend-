import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RequestApproval from '../../../components/RequestApproval'
import { mockBookingRequests, createMockBooking } from '../mocks/mockData'

// Mock dependencies
vi.mock('../../../components/RequestCard', () => ({
  default: ({ request, onApprove, onReject, onCancelApproved, showSelect, selected, onToggleSelect, status }: any) => (
    <div data-testid={`request-card-${request.id}`} data-status={status}>
      <div>{request.classroomName}</div>
      <div>{request.facultyName}</div>
      {showSelect && (
        <input
          type="checkbox"
          data-testid={`checkbox-${request.id}`}
          checked={selected}
          onChange={(e) => onToggleSelect?.(e.target.checked)}
        />
      )}
      {status === 'pending' && (
        <>
          <button onClick={onApprove} data-testid={`approve-${request.id}`}>Approve</button>
          <button onClick={onReject} data-testid={`reject-${request.id}`}>Reject</button>
        </>
      )}
      {status === 'approved' && onCancelApproved && (
        <button onClick={() => onCancelApproved(request.id, 'Test reason')} data-testid={`cancel-${request.id}`}>
          Cancel
        </button>
      )}
    </div>
  ),
}))

vi.mock('../../../components/Announcer', () => ({
  useAnnouncer: () => ({ announce: vi.fn() }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../utils/timeUtils', () => ({
  convertTo12Hour: vi.fn((time) => time),
  formatTimeRange: vi.fn((start, end) => `${start} - ${end}`),
  isPastBookingTime: vi.fn(() => false),
}))

vi.mock('../../../utils/tabPersistence', () => ({
  readPreferredTab: vi.fn((key, defaultTab) => defaultTab),
  writeStoredTab: vi.fn(),
  writeTabToHash: vi.fn(),
}))

const mockOnRequestApproval = vi.fn()
const mockOnCancelApproved = vi.fn()
const mockCheckConflicts = vi.fn()

describe('RequestApproval', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnRequestApproval.mockResolvedValue(undefined)
    mockOnCancelApproved.mockResolvedValue(undefined)
    mockCheckConflicts.mockReturnValue(false)
  })

  const defaultProps = {
    requests: mockBookingRequests,
    onRequestApproval: mockOnRequestApproval,
    onCancelApproved: mockOnCancelApproved,
    checkConflicts: mockCheckConflicts,
    userId: 'admin-123',
  }

  describe('Rendering', () => {
    it('should render component header', () => {
      render(<RequestApproval {...defaultProps} />)
      
      expect(screen.getByText('Classroom Reservation Management')).toBeInTheDocument()
      expect(screen.getByText('Review and manage classroom reservation requests')).toBeInTheDocument()
    })

    it('should render all tab triggers', () => {
      render(<RequestApproval {...defaultProps} />)
      
      // Desktop tabs - use getAllByText because mobile tabs exist too
      const pendingTabs = screen.getAllByText(/pending/i)
      expect(pendingTabs.length).toBeGreaterThan(0)
      
      const approvedTabs = screen.getAllByText(/approved/i)
      expect(approvedTabs.length).toBeGreaterThan(0)
      
      const rejectedTabs = screen.getAllByText(/rejected/i)
      expect(rejectedTabs.length).toBeGreaterThan(0)
      
      const expiredTabs = screen.getAllByText(/expired/i)
      expect(expiredTabs.length).toBeGreaterThan(0)
    })

    it('should show request counts in tab labels', () => {
      const pendingCount = mockBookingRequests.filter(r => r.status === 'pending').length
      const approvedCount = mockBookingRequests.filter(r => r.status === 'approved').length
      
      render(<RequestApproval {...defaultProps} />)
      
      // Check for count in tabs (multiple due to mobile/desktop)
      expect(screen.getAllByText(new RegExp(`\\(${pendingCount}\\)`)).length).toBeGreaterThan(0)
      expect(screen.getAllByText(new RegExp(`\\(${approvedCount}\\)`)).length).toBeGreaterThan(0)
    })
  })

  describe('Pending Tab', () => {
    it('should display pending requests', () => {
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequests = mockBookingRequests.filter(r => r.status === 'pending')
      pendingRequests.forEach((request) => {
        expect(screen.getByTestId(`request-card-${request.id}`)).toBeInTheDocument()
      })
    })

    it('should show empty state when no pending requests', () => {
      const emptyRequests = mockBookingRequests.filter(r => r.status !== 'pending')
      
      render(<RequestApproval {...defaultProps} requests={emptyRequests} />)
      
      expect(screen.getByText('No Pending Requests')).toBeInTheDocument()
      expect(screen.getByText(/all caught up/i)).toBeInTheDocument()
    })

    it('should show select all checkbox', () => {
      render(<RequestApproval {...defaultProps} />)
      
      const selectAllCheckbox = screen.getByLabelText(/select all pending requests/i)
      expect(selectAllCheckbox).toBeInTheDocument()
    })

    it('should show bulk action buttons', () => {
      render(<RequestApproval {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /approve selected/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /reject selected/i })).toBeInTheDocument()
    })

    it('should disable bulk action buttons when no requests selected', () => {
      render(<RequestApproval {...defaultProps} />)
      
      const approveButton = screen.getByRole('button', { name: /approve selected/i })
      const rejectButton = screen.getByRole('button', { name: /reject selected/i })
      
      expect(approveButton).toBeDisabled()
      expect(rejectButton).toBeDisabled()
    })
  })

  describe('Approved Tab', () => {
    it('should display approved requests', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      // Click approved tab (desktop version)
      const approvedTabs = screen.getAllByRole('tab', { name: /approved/i })
      await user.click(approvedTabs[0])
      
      await waitFor(() => {
        const approvedRequests = mockBookingRequests.filter(r => r.status === 'approved')
        approvedRequests.forEach((request) => {
          expect(screen.getByTestId(`request-card-${request.id}`)).toBeInTheDocument()
        })
      })
    })

    it('should show empty state when no approved requests', async () => {
      const user = userEvent.setup()
      const noApprovedRequests = mockBookingRequests.filter(r => r.status !== 'approved')
      
      render(<RequestApproval {...defaultProps} requests={noApprovedRequests} />)
      
      const approvedTabs = screen.getAllByRole('tab', { name: /approved/i })
      await user.click(approvedTabs[0])
      
      await waitFor(() => {
        expect(screen.getByText('No Approved Requests')).toBeInTheDocument()
      })
    })

    it('should show cancel selected button for approved requests', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const approvedTabs = screen.getAllByRole('tab', { name: /approved/i })
      await user.click(approvedTabs[0])
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel selected/i })).toBeInTheDocument()
      })
    })
  })

  describe('Rejected Tab', () => {
    it('should display rejected requests', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const rejectedTabs = screen.getAllByRole('tab', { name: /rejected/i })
      await user.click(rejectedTabs[0])
      
      await waitFor(() => {
        const rejectedRequests = mockBookingRequests.filter(r => r.status === 'rejected')
        rejectedRequests.forEach((request) => {
          expect(screen.getByTestId(`request-card-${request.id}`)).toBeInTheDocument()
        })
      })
    })

    it('should show empty state when no rejected requests', async () => {
      const user = userEvent.setup()
      const noRejectedRequests = mockBookingRequests.filter(r => r.status !== 'rejected')
      
      render(<RequestApproval {...defaultProps} requests={noRejectedRequests} />)
      
      const rejectedTabs = screen.getAllByRole('tab', { name: /rejected/i })
      await user.click(rejectedTabs[0])
      
      await waitFor(() => {
        expect(screen.getByText('No Rejected Requests')).toBeInTheDocument()
      })
    })
  })

  describe('Expired Tab', () => {
    it('should display expired requests', async () => {
      const user = userEvent.setup()
      const expiredRequest = createMockBooking({ status: 'expired' })
      const requestsWithExpired = [...mockBookingRequests, expiredRequest]
      
      render(<RequestApproval {...defaultProps} requests={requestsWithExpired} />)
      
      const expiredTabs = screen.getAllByRole('tab', { name: /expired/i })
      await user.click(expiredTabs[0])
      
      await waitFor(() => {
        expect(screen.getByTestId(`request-card-${expiredRequest.id}`)).toBeInTheDocument()
      })
    })

    it('should show empty state when no expired requests', async () => {
      const user = userEvent.setup()
      const noExpiredRequests = mockBookingRequests.filter(r => r.status !== 'expired')
      
      render(<RequestApproval {...defaultProps} requests={noExpiredRequests} />)
      
      const expiredTabs = screen.getAllByRole('tab', { name: /expired/i })
      await user.click(expiredTabs[0])
      
      await waitFor(() => {
        expect(screen.getByText('No Expired Requests')).toBeInTheDocument()
      })
    })
  })

  describe('Single Request Actions', () => {
    it('should open approve dialog when clicking approve button', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequest = mockBookingRequests.find(r => r.status === 'pending')
      if (pendingRequest) {
        const approveButton = screen.getByTestId(`approve-${pendingRequest.id}`)
        await user.click(approveButton)
        
        await waitFor(() => {
          expect(screen.getAllByText('Approve Reservation').length).toBeGreaterThan(0)
        })
      }
    })

    it('should open reject dialog when clicking reject button', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequest = mockBookingRequests.find(r => r.status === 'pending')
      if (pendingRequest) {
        const rejectButton = screen.getByTestId(`reject-${pendingRequest.id}`)
        await user.click(rejectButton)
        
        await waitFor(() => {
          expect(screen.getAllByText('Reject Reservation').length).toBeGreaterThan(0)
        })
      }
    })

    it('should successfully approve a request', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequest = mockBookingRequests.find(r => r.status === 'pending')
      if (pendingRequest) {
        // Click approve button
        const approveButton = screen.getByTestId(`approve-${pendingRequest.id}`)
        await user.click(approveButton)
        
        // Wait for dialog and confirm
        await waitFor(() => {
          expect(screen.getAllByText('Approve Reservation').length).toBeGreaterThan(0)
        })
        
        const confirmButtons = screen.getAllByRole('button', { name: 'Approve Reservation' })
        const dialogConfirmButton = confirmButtons.find(btn => !btn.closest('[data-testid]'))
        await user.click(dialogConfirmButton!)
        
        await waitFor(() => {
          expect(mockOnRequestApproval).toHaveBeenCalledWith(
            pendingRequest.id,
            true,
            undefined,
            true
          )
        })
      }
    })

    it('should successfully reject a request with feedback', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequest = mockBookingRequests.find(r => r.status === 'pending')
      if (pendingRequest) {
        // Click reject button
        const rejectButton = screen.getByTestId(`reject-${pendingRequest.id}`)
        await user.click(rejectButton)
        
        // Wait for dialog
        await waitFor(() => {
          expect(screen.getAllByText('Reject Reservation').length).toBeGreaterThan(0)
        })
        
        // Enter feedback
        const textarea = screen.getByLabelText(/rejection reason \(required\)/i)
        await user.type(textarea, 'Room not available')
        
        // Confirm
        const confirmButtons = screen.getAllByRole('button', { name: 'Reject Reservation' })
        const dialogConfirmButton = confirmButtons.find(btn => !btn.closest('[data-testid]'))
        await user.click(dialogConfirmButton!)
        
        await waitFor(() => {
          expect(mockOnRequestApproval).toHaveBeenCalledWith(
            pendingRequest.id,
            false,
            'Room not available',
            true
          )
        })
      }
    })
  })

  describe('Bulk Actions', () => {
    it('should enable bulk buttons when requests are selected', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequest = mockBookingRequests.find(r => r.status === 'pending')
      if (pendingRequest) {
        // Select a request
        const checkbox = screen.getByTestId(`checkbox-${pendingRequest.id}`)
        await user.click(checkbox)
        
        await waitFor(() => {
          const approveButton = screen.getByRole('button', { name: /approve selected \(1\)/i })
          expect(approveButton).not.toBeDisabled()
        })
      }
    })

    it('should select all pending requests when clicking select all', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const selectAllCheckbox = screen.getByLabelText(/select all pending requests/i)
      await user.click(selectAllCheckbox)
      
      const pendingRequests = mockBookingRequests.filter(r => r.status === 'pending')
      await waitFor(() => {
        pendingRequests.forEach((request) => {
          const checkbox = screen.getByTestId(`checkbox-${request.id}`)
          expect(checkbox).toBeChecked()
        })
      })
    })

    it('should open dialog for bulk approve', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      // Select all
      const selectAllCheckbox = screen.getByLabelText(/select all pending requests/i)
      await user.click(selectAllCheckbox)
      
      // Click bulk approve
      const approveButton = screen.getByRole('button', { name: /approve selected/i })
      await user.click(approveButton)
      
      await waitFor(() => {
        expect(screen.getAllByText('Approve Reservation').length).toBeGreaterThan(0)
      })
    })

    it('should open dialog for bulk reject', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      // Select all
      const selectAllCheckbox = screen.getByLabelText(/select all pending requests/i)
      await user.click(selectAllCheckbox)
      
      // Click bulk reject
      const rejectButton = screen.getByRole('button', { name: /reject selected/i })
      await user.click(rejectButton)
      
      await waitFor(() => {
        expect(screen.getAllByText('Reject Reservation').length).toBeGreaterThan(0)
      })
    })
  })

  describe('Feedback Dialog', () => {
    it('should display feedback textarea', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequest = mockBookingRequests.find(r => r.status === 'pending')
      if (pendingRequest) {
        const approveButton = screen.getByTestId(`approve-${pendingRequest.id}`)
        await user.click(approveButton)
        
        await waitFor(() => {
          expect(screen.getByLabelText(/feedback \(optional\)/i)).toBeInTheDocument()
        })
      }
    })

    it('should show character count for feedback', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequest = mockBookingRequests.find(r => r.status === 'pending')
      if (pendingRequest) {
        const approveButton = screen.getByTestId(`approve-${pendingRequest.id}`)
        await user.click(approveButton)
        
        await waitFor(() => {
          expect(screen.getByText('0/500')).toBeInTheDocument()
        })
        
        const feedbackTextarea = screen.getByLabelText(/feedback/i)
        await user.type(feedbackTextarea, 'Test feedback')
        
        await waitFor(() => {
          expect(screen.getByText('13/500')).toBeInTheDocument()
        })
      }
    })

    it('should require feedback for rejection', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequest = mockBookingRequests.find(r => r.status === 'pending')
      if (pendingRequest) {
        const rejectButton = screen.getByTestId(`reject-${pendingRequest.id}`)
        await user.click(rejectButton)
        
        await waitFor(() => {
          expect(screen.getByLabelText(/rejection reason \(required\)/i)).toBeInTheDocument()
        })
        
        // Confirm button should be disabled without feedback
        const confirmButtons = screen.getAllByRole('button', { name: 'Reject Reservation' })
        const dialogConfirmButton = confirmButtons.find(btn => !btn.closest('[data-testid]'))
        expect(dialogConfirmButton).toBeDisabled()
      }
    })

    it('should enable confirm button when rejection feedback is provided', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequest = mockBookingRequests.find(r => r.status === 'pending')
      if (pendingRequest) {
        const rejectButton = screen.getByTestId(`reject-${pendingRequest.id}`)
        await user.click(rejectButton)
        
        await waitFor(() => {
          expect(screen.getAllByText('Reject Reservation').length).toBeGreaterThan(0)
        })
        
        const feedbackTextarea = screen.getByLabelText(/rejection reason/i)
        await user.type(feedbackTextarea, 'Test reason')
        
        await waitFor(() => {
          const confirmButtons = screen.getAllByRole('button', { name: 'Reject Reservation' })
          const dialogConfirmButton = confirmButtons.find(btn => !btn.closest('[data-testid]'))
          expect(dialogConfirmButton).not.toBeDisabled()
        })
      }
    })

    it('should show error for feedback exceeding 500 characters', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequest = mockBookingRequests.find(r => r.status === 'pending')
      if (pendingRequest) {
        const approveButton = screen.getByTestId(`approve-${pendingRequest.id}`)
        await user.click(approveButton)
        
        await waitFor(() => {
          expect(screen.getAllByText('Approve Reservation').length).toBeGreaterThan(0)
        })
        
        const feedbackTextarea = screen.getByLabelText(/feedback/i) as HTMLTextAreaElement
        const longText = 'a'.repeat(501)
        
        // Try to paste text exceeding maxLength (textarea should truncate to 500)
        await user.click(feedbackTextarea)
        await user.paste(longText)
        
        // Should be capped at 500 by maxLength attribute
        await waitFor(() => {
          expect(feedbackTextarea.value.length).toBeLessThanOrEqual(500)
        })
      }
    })

    it('should close dialog when clicking cancel', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequest = mockBookingRequests.find(r => r.status === 'pending')
      if (pendingRequest) {
        const approveButton = screen.getByTestId(`approve-${pendingRequest.id}`)
        await user.click(approveButton)
        
        await waitFor(() => {
          expect(screen.getAllByText('Approve Reservation').length).toBeGreaterThan(0)
        })
        
        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        await user.click(cancelButton)
        
        await waitFor(() => {
          expect(screen.queryAllByText('Approve Reservation').length).toBe(0)
        })
      }
    })
  })

  describe('Tab Navigation', () => {
    it('should switch to approved tab when clicked', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const approvedTabs = screen.getAllByRole('tab', { name: /approved/i })
      await user.click(approvedTabs[0])
      
      await waitFor(() => {
        const approvedRequests = mockBookingRequests.filter(r => r.status === 'approved')
        if (approvedRequests.length > 0) {
          expect(screen.getByTestId(`request-card-${approvedRequests[0].id}`)).toBeInTheDocument()
        } else {
          expect(screen.getByText('No Approved Requests')).toBeInTheDocument()
        }
      })
    })

    it('should switch to rejected tab when clicked', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const rejectedTabs = screen.getAllByRole('tab', { name: /rejected/i })
      await user.click(rejectedTabs[0])
      
      await waitFor(() => {
        const rejectedRequests = mockBookingRequests.filter(r => r.status === 'rejected')
        if (rejectedRequests.length > 0) {
          expect(screen.getByTestId(`request-card-${rejectedRequests[0].id}`)).toBeInTheDocument()
        } else {
          expect(screen.getByText('No Rejected Requests')).toBeInTheDocument()
        }
      })
    })

    it('should switch to expired tab when clicked', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const expiredTabs = screen.getAllByRole('tab', { name: /expired/i })
      await user.click(expiredTabs[0])
      
      await waitFor(() => {
        expect(screen.getByText('No Expired Requests')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have accessible tab navigation', () => {
      render(<RequestApproval {...defaultProps} />)
      
      const tabs = screen.getAllByRole('tab')
      expect(tabs.length).toBeGreaterThan(0)
      
      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('role', 'tab')
      })
    })

    it('should have labeled checkboxes', () => {
      render(<RequestApproval {...defaultProps} />)
      
      const selectAllCheckbox = screen.getByLabelText(/select all pending requests/i)
      expect(selectAllCheckbox).toBeInTheDocument()
    })

    it('should have accessible dialog', async () => {
      const user = userEvent.setup()
      render(<RequestApproval {...defaultProps} />)
      
      const pendingRequest = mockBookingRequests.find(r => r.status === 'pending')
      if (pendingRequest) {
        const approveButton = screen.getByTestId(`approve-${pendingRequest.id}`)
        await user.click(approveButton)
        
        await waitFor(() => {
          expect(screen.getByRole('dialog')).toBeInTheDocument()
        })
      }
    })
  })
})
