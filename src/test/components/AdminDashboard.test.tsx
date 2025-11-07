import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import AdminDashboard from '../../../components/AdminDashboard'
import { mockUsers, mockClassrooms, mockBookingRequests, mockSignupRequests, mockSchedules } from '../mocks/mockData'
import type { User, Classroom, BookingRequest, SignupRequest, SignupHistory } from '../../../App'

// Mock lazy-loaded components
vi.mock('../../../components/ClassroomManagement', () => ({
  default: () => <div data-testid="classroom-management">ClassroomManagement Component</div>
}))
vi.mock('../../../components/RequestApproval', () => ({
  default: () => <div data-testid="request-approval">RequestApproval Component</div>
}))
vi.mock('../../../components/SignupApproval', () => ({
  default: () => <div data-testid="signup-approval">SignupApproval Component</div>
}))
vi.mock('../../../components/ScheduleViewer', () => ({
  default: () => <div data-testid="schedule-viewer">ScheduleViewer Component</div>
}))
vi.mock('../../../components/AdminReports', () => ({
  default: () => <div data-testid="admin-reports">AdminReports Component</div>
}))
vi.mock('../../../components/ProfileSettings', () => ({
  default: () => <div data-testid="profile-settings">ProfileSettings Component</div>
}))
vi.mock('../../../components/AdminUserManagement', () => ({
  default: () => <div data-testid="user-management">AdminUserManagement Component</div>
}))
vi.mock('../../../components/NotificationBell', () => ({
  default: ({ onOpen }: { onOpen: () => void }) => (
    <button data-testid="notification-bell" onClick={onOpen}>
      Notifications
    </button>
  )
}))
vi.mock('../../../components/NotificationCenter', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="notification-center">
      <button onClick={onClose}>Close Notifications</button>
    </div>
  )
}))

// Mock timeUtils
vi.mock('../../../utils/timeUtils', () => ({
  convertTo12Hour: (time: string) => time,
  formatTimeRange: (start: string, end: string) => `${start} - ${end}`,
  isPastBookingTime: vi.fn(() => false)
}))

describe('AdminDashboard', () => {
  const adminUser: User = mockUsers[0] // Admin user
  const mockSignupHistory: SignupHistory[] = []
  
  const defaultProps = {
    user: adminUser,
    classrooms: mockClassrooms,
    bookingRequests: mockBookingRequests,
    signupRequests: mockSignupRequests,
    signupHistory: mockSignupHistory,
    schedules: mockSchedules,
    users: mockUsers,
    onLogout: vi.fn(),
    onClassroomUpdate: vi.fn(),
    onRequestApproval: vi.fn().mockResolvedValue(undefined),
    onSignupApproval: vi.fn().mockResolvedValue(undefined),
    onCancelSchedule: vi.fn(),
    onCancelApprovedBooking: vi.fn(),
    onUnlockAccount: vi.fn().mockResolvedValue({ message: 'Account unlocked' }),
    checkConflicts: vi.fn().mockReturnValue(false)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render dashboard header with admin user info', () => {
      render(<AdminDashboard {...defaultProps} />)
      
      expect(screen.getByText('PLV CEIT Admin Dashboard')).toBeInTheDocument()
      expect(screen.getByText(adminUser.name)).toBeInTheDocument()
      // Email may be combined with department in a single text node
      const emailElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes(adminUser.email) || false
      })
      expect(emailElements.length).toBeGreaterThan(0)
    })

    it('should render logout button', () => {
      render(<AdminDashboard {...defaultProps} />)
      
      const logoutButton = screen.getByRole('button', { name: /logout/i })
      expect(logoutButton).toBeInTheDocument()
    })

    it('should render all tab triggers', () => {
      render(<AdminDashboard {...defaultProps} />)
      
      // Check for tab names (desktop + mobile versions exist, verify at least one)
      const overviewTexts = screen.getAllByText('Overview')
      expect(overviewTexts.length).toBeGreaterThan(0)
      
      const roomsTexts = screen.getAllByText('Rooms')
      expect(roomsTexts.length).toBeGreaterThan(0)
      
      const requestsTexts = screen.getAllByText('Requests')
      expect(requestsTexts.length).toBeGreaterThan(0)
      
      const signupsTexts = screen.getAllByText('Signups')
      expect(signupsTexts.length).toBeGreaterThan(0)
      
      const scheduleTexts = screen.getAllByText('Schedule')
      expect(scheduleTexts.length).toBeGreaterThan(0)
      
      const reportsTexts = screen.getAllByText('Reports')
      expect(reportsTexts.length).toBeGreaterThan(0)
      
      const usersTexts = screen.getAllByText('Users')
      expect(usersTexts.length).toBeGreaterThan(0)
      
      const settingsTexts = screen.getAllByText('Settings')
      expect(settingsTexts.length).toBeGreaterThan(0)
    })

    it('should render notification bell', () => {
      render(<AdminDashboard {...defaultProps} />)
      
      expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
    })
  })

  describe('Statistics Cards', () => {
    it('should display correct total classrooms count', () => {
      render(<AdminDashboard {...defaultProps} />)
      
      const totalClassrooms = mockClassrooms.length
      expect(screen.getByText('Total Classrooms')).toBeInTheDocument()
      expect(screen.getByText(totalClassrooms.toString())).toBeInTheDocument()
    })

    it('should display correct available classrooms count', () => {
      render(<AdminDashboard {...defaultProps} />)
      
      const availableCount = mockClassrooms.filter((c: Classroom) => c.isAvailable).length
      expect(screen.getByText('Available Rooms')).toBeInTheDocument()
      // Multiple "2" counts exist (badges, stats), just verify at least one
      const availableTexts = screen.getAllByText(availableCount.toString())
      expect(availableTexts.length).toBeGreaterThan(0)
    })

    it('should display pending requests count', () => {
      render(<AdminDashboard {...defaultProps} />)
      
      const pendingCount = mockBookingRequests.filter((r: BookingRequest) => r.status === 'pending').length
      expect(screen.getByText('Pending Requests')).toBeInTheDocument()
      // Count appears in stat card and possibly badge
      const allPendingText = screen.getAllByText(pendingCount.toString())
      expect(allPendingText.length).toBeGreaterThan(0)
    })

    it('should display pending signups count', () => {
      render(<AdminDashboard {...defaultProps} />)
      
      const pendingSignups = mockSignupRequests.filter((r: SignupRequest) => r.status === 'pending').length
      expect(screen.getByText('Pending Signups')).toBeInTheDocument()
      const allSignupText = screen.getAllByText(pendingSignups.toString())
      expect(allSignupText.length).toBeGreaterThan(0)
    })

    it('should display today\'s classes count', () => {
      render(<AdminDashboard {...defaultProps} />)
      
      expect(screen.getByText('Today\'s Classes')).toBeInTheDocument()
      // Will be 0 since mock schedules are not today's date
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  describe('Recent Requests', () => {
    it('should display recent requests section', () => {
      render(<AdminDashboard {...defaultProps} />)
      
      expect(screen.getByText('Recent Requests')).toBeInTheDocument()
      expect(screen.getByText('Latest classroom reservation requests from faculty')).toBeInTheDocument()
    })

    it('should show no requests message when empty', () => {
      const emptyProps = {
        ...defaultProps,
        bookingRequests: []
      }
      
      render(<AdminDashboard {...emptyProps} />)
      
      expect(screen.getByText('No recent requests')).toBeInTheDocument()
    })

    it('should display pending request with approve and reject buttons', () => {
      const pendingRequest = mockBookingRequests.find((r: BookingRequest) => r.status === 'pending')!
      const propsWithPending = {
        ...defaultProps,
        bookingRequests: [pendingRequest]
      }
      
      render(<AdminDashboard {...propsWithPending} />)
      
      expect(screen.getByText(pendingRequest.facultyName)).toBeInTheDocument()
      // Classroom name appears in combined text like "Room 101 • date • time"
      expect(screen.getByText(new RegExp(pendingRequest.classroomName))).toBeInTheDocument()
      
      // Check for approve button
      const approveButton = screen.getByRole('button', { name: /approve request/i })
      expect(approveButton).toBeInTheDocument()
    })

    it('should display request status badges correctly', () => {
      render(<AdminDashboard {...defaultProps} />)
      
      // Check for at least one status badge (pending/approved/rejected)
      const badges = screen.getAllByText(/pending|approved|rejected/i)
      expect(badges.length).toBeGreaterThan(0)
    })
  })

  describe('User Interactions', () => {
    it('should call onLogout when logout button clicked', async () => {
      render(<AdminDashboard {...defaultProps} />)
      
      const logoutButton = screen.getByRole('button', { name: /logout/i })
      await userEvent.click(logoutButton)
      
      expect(defaultProps.onLogout).toHaveBeenCalledTimes(1)
    })

    it('should open notification center when bell clicked', async () => {
      render(<AdminDashboard {...defaultProps} />)
      
      const notificationBell = screen.getByTestId('notification-bell')
      await userEvent.click(notificationBell)
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-center')).toBeInTheDocument()
      })
    })

    it('should close notification center when close button clicked', async () => {
      render(<AdminDashboard {...defaultProps} />)
      
      // Open notification center
      const notificationBell = screen.getByTestId('notification-bell')
      await userEvent.click(notificationBell)
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-center')).toBeInTheDocument()
      })
      
      // Close it
      const closeButton = screen.getByRole('button', { name: /close notifications/i })
      await userEvent.click(closeButton)
      
      await waitFor(() => {
        expect(screen.queryByTestId('notification-center')).not.toBeInTheDocument()
      })
    })

    it('should call onRequestApproval when approve button clicked', async () => {
      const pendingRequest = mockBookingRequests.find((r: BookingRequest) => r.status === 'pending')!
      const propsWithPending = {
        ...defaultProps,
        bookingRequests: [pendingRequest]
      }
      
      render(<AdminDashboard {...propsWithPending} />)
      
      const approveButton = screen.getByRole('button', { name: /approve request/i })
      await userEvent.click(approveButton)
      
      await waitFor(() => {
        expect(defaultProps.onRequestApproval).toHaveBeenCalledWith(pendingRequest.id, true)
      })
    })
  })

  describe('Tab Navigation', () => {
    it('should switch to classrooms tab when clicked', async () => {
      render(<AdminDashboard {...defaultProps} />)
      
      // Get all tabs with "rooms" and click the first one (handles desktop + mobile)
      const roomsTabs = screen.getAllByRole('tab', { name: /rooms/i })
      await userEvent.click(roomsTabs[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('classroom-management')).toBeInTheDocument()
      })
    })

    it('should switch to requests tab when clicked', async () => {
      render(<AdminDashboard {...defaultProps} />)
      
      const requestsTabs = screen.getAllByRole('tab', { name: /requests/i })
      await userEvent.click(requestsTabs[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('request-approval')).toBeInTheDocument()
      })
    })

    it('should switch to signups tab when clicked', async () => {
      render(<AdminDashboard {...defaultProps} />)
      
      const signupsTabs = screen.getAllByRole('tab', { name: /signups/i })
      await userEvent.click(signupsTabs[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('signup-approval')).toBeInTheDocument()
      })
    })

    it('should switch to schedule tab when clicked', async () => {
      render(<AdminDashboard {...defaultProps} />)
      
      const scheduleTabs = screen.getAllByRole('tab', { name: /schedule/i })
      await userEvent.click(scheduleTabs[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('schedule-viewer')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels on interactive elements', () => {
      const pendingRequest = mockBookingRequests.find((r: BookingRequest) => r.status === 'pending')!
      const propsWithPending = {
        ...defaultProps,
        bookingRequests: [pendingRequest]
      }
      
      render(<AdminDashboard {...propsWithPending} />)
      
      // Check approve button has aria-label
      const approveButton = screen.getByRole('button', { name: /approve request/i })
      expect(approveButton).toHaveAttribute('aria-label')
    })

    it('should have proper heading structure', () => {
      render(<AdminDashboard {...defaultProps} />)
      
      const heading = screen.getByRole('heading', { name: /plv ceit admin dashboard/i })
      expect(heading).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty classrooms array', () => {
      const emptyProps = {
        ...defaultProps,
        classrooms: []
      }
      
      render(<AdminDashboard {...emptyProps} />)
      
      expect(screen.getByText('Total Classrooms')).toBeInTheDocument()
      // Multiple "0" counts exist, just verify at least one
      const zeros = screen.getAllByText('0')
      expect(zeros.length).toBeGreaterThan(0)
    })

    it('should handle empty users array', () => {
      const emptyProps = {
        ...defaultProps,
        users: []
      }
      
      render(<AdminDashboard {...emptyProps} />)
      
      // Should still render without errors
      expect(screen.getByText('PLV CEIT Admin Dashboard')).toBeInTheDocument()
    })

    it('should call approval handler when approve button clicked', async () => {
      const pendingRequest = mockBookingRequests.find((r: BookingRequest) => r.status === 'pending')!
      
      const propsWithPending = {
        ...defaultProps,
        bookingRequests: [pendingRequest]
      }
      
      render(<AdminDashboard {...propsWithPending} />)
      
      const approveButton = screen.getByRole('button', { name: /approve request/i })
      
      // Click the button
      await userEvent.click(approveButton)
      
      // Should call the handler (button becomes disabled AFTER state update)
      await waitFor(() => {
        expect(defaultProps.onRequestApproval).toHaveBeenCalled()
      })
    })
  })
})
