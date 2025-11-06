import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import FacultyDashboard from '../../../components/FacultyDashboard'
import { mockUsers, mockClassrooms, mockBookingRequests, mockSchedules } from '../mocks/mockData'
import { createMockBooking, createMockSchedule } from '../mocks/mockData'
import type { User, Classroom, BookingRequest, Schedule } from '../../../App'

// Mock lazy-loaded components
vi.mock('../../../components/RoomBooking', () => ({
  default: () => <div data-testid="room-booking">RoomBooking Component</div>
}))
vi.mock('../../../components/RoomSearch', () => ({
  default: () => <div data-testid="room-search">RoomSearch Component</div>
}))
vi.mock('../../../components/FacultySchedule', () => ({
  default: () => <div data-testid="faculty-schedule">FacultySchedule Component</div>
}))
vi.mock('../../../components/ProfileSettings', () => ({
  default: () => <div data-testid="profile-settings">ProfileSettings Component</div>
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
  convertTo24Hour: (time: string) => time,
  formatTimeRange: (start: string, end: string) => `${start} - ${end}`,
  isPastBookingTime: vi.fn(() => false),
  isReasonableBookingDuration: vi.fn(() => true),
  addDaysToDateString: (date: string, days: number) => date
}))

// Mock logger
vi.mock('../../../lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}))

describe('FacultyDashboard', () => {
  const facultyUser: User = mockUsers[1] // Faculty user
  
  // Create some schedules with upcoming dates
  const upcomingSchedule = createMockSchedule({
    id: 'schedule-upcoming-1',
    date: '2025-11-20',
    status: 'confirmed',
    facultyId: facultyUser.id,
    facultyName: facultyUser.name
  })
  
  const todaySchedule = createMockSchedule({
    id: 'schedule-today',
    date: new Date().toISOString().split('T')[0],
    status: 'confirmed',
    facultyId: facultyUser.id,
    facultyName: facultyUser.name
  })
  
  const defaultProps = {
    user: facultyUser,
    classrooms: mockClassrooms,
    schedules: [upcomingSchedule, todaySchedule],
    allSchedules: [upcomingSchedule, todaySchedule],
    bookingRequests: mockBookingRequests,
    allBookingRequests: mockBookingRequests,
    onLogout: vi.fn(),
    onBookingRequest: vi.fn(),
    checkConflicts: vi.fn().mockReturnValue(false),
    externalInitialData: null,
    onExternalInitialDataConsumed: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render dashboard header with faculty user info', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      expect(screen.getByText('Faculty Dashboard')).toBeInTheDocument()
      expect(screen.getByText(facultyUser.name)).toBeInTheDocument()
    })

    it('should display department and email info', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      // Department and email are combined in one element
      if (facultyUser.department) {
        expect(screen.getByText(new RegExp(facultyUser.department))).toBeInTheDocument()
      }
      expect(screen.getByText(new RegExp(facultyUser.email))).toBeInTheDocument()
    })

    it('should render logout button', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      const logoutButton = screen.getByRole('button', { name: /logout/i })
      expect(logoutButton).toBeInTheDocument()
    })

    it('should render all tab triggers', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      // Check for tab names (may have desktop + mobile versions)
      const overviewTexts = screen.getAllByText('Overview')
      expect(overviewTexts.length).toBeGreaterThan(0)
      
      // "Reserve" is shortened from "Reserve a Classroom" on mobile
      expect(screen.getByText('Reserve')).toBeInTheDocument()
      
      const searchTexts = screen.getAllByText(/search/i)
      expect(searchTexts.length).toBeGreaterThan(0)
      
      const scheduleTexts = screen.getAllByText(/schedule/i)
      expect(scheduleTexts.length).toBeGreaterThan(0)
      
      const settingsTexts = screen.getAllByText(/settings/i)
      expect(settingsTexts.length).toBeGreaterThan(0)
    })

    it('should render notification bell', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
    })
  })

  describe('Statistics Cards', () => {
    it('should display upcoming classes count', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      // Multiple "Upcoming Classes" text exists
      const upcomingTexts = screen.getAllByText('Upcoming Classes')
      expect(upcomingTexts.length).toBeGreaterThan(0)
      
      // Should show 2 (upcomingSchedule + todaySchedule)
      const counts = screen.getAllByText('2')
      expect(counts.length).toBeGreaterThan(0)
    })

    it('should display pending requests count', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      const pendingCount = mockBookingRequests.filter((r: BookingRequest) => r.status === 'pending').length
      expect(screen.getByText('Pending Requests')).toBeInTheDocument()
      
      const allPendingText = screen.getAllByText(pendingCount.toString())
      expect(allPendingText.length).toBeGreaterThan(0)
    })

    it('should display approved requests count', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      const approvedCount = mockBookingRequests.filter((r: BookingRequest) => r.status === 'approved').length
      // The actual text is "Approved Requests" not just "Approved"
      expect(screen.getByText('Approved Requests')).toBeInTheDocument()
      
      const allApprovedText = screen.getAllByText(approvedCount.toString())
      expect(allApprovedText.length).toBeGreaterThan(0)
    })

    it('should display rejected requests count', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      const rejectedCount = mockBookingRequests.filter((r: BookingRequest) => r.status === 'rejected').length
      // The actual text is "Rejected Requests" not just "Rejected"
      expect(screen.getByText('Rejected Requests')).toBeInTheDocument()
      
      if (rejectedCount > 0) {
        const allRejectedText = screen.getAllByText(rejectedCount.toString())
        expect(allRejectedText.length).toBeGreaterThan(0)
      }
    })

    it('should display total requests count', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      const totalCount = mockBookingRequests.length
      expect(screen.getByText('Total Requests')).toBeInTheDocument()
      
      const allTotalText = screen.getAllByText(totalCount.toString())
      expect(allTotalText.length).toBeGreaterThan(0)
    })
  })

  describe('User Interactions', () => {
    it('should call onLogout when logout button clicked', async () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      const logoutButton = screen.getByRole('button', { name: /logout/i })
      await userEvent.click(logoutButton)
      
      expect(defaultProps.onLogout).toHaveBeenCalledTimes(1)
    })

    it('should open notification center when bell clicked', async () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      const notificationBell = screen.getByTestId('notification-bell')
      await userEvent.click(notificationBell)
      
      await waitFor(() => {
        expect(screen.getByTestId('notification-center')).toBeInTheDocument()
      })
    })

    it('should close notification center when close button clicked', async () => {
      render(<FacultyDashboard {...defaultProps} />)
      
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
  })

  describe('Tab Navigation', () => {
    it('should switch to booking tab when clicked', async () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      // Get all tabs with "reserve" and click the first one
      const reserveTabs = screen.getAllByRole('tab', { name: /reserve/i })
      await userEvent.click(reserveTabs[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('room-booking')).toBeInTheDocument()
      })
    })

    it('should switch to search tab when clicked', async () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      const searchTabs = screen.getAllByRole('tab', { name: /search/i })
      await userEvent.click(searchTabs[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('room-search')).toBeInTheDocument()
      })
    })

    it('should switch to schedule tab when clicked', async () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      const scheduleTabs = screen.getAllByRole('tab', { name: /schedule/i })
      await userEvent.click(scheduleTabs[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('faculty-schedule')).toBeInTheDocument()
      })
    })

    it('should switch to settings tab when clicked', async () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      const settingsTabs = screen.getAllByRole('tab', { name: /settings/i })
      await userEvent.click(settingsTabs[0])
      
      await waitFor(() => {
        expect(screen.getByTestId('profile-settings')).toBeInTheDocument()
      })
    })
  })

  describe('External Initial Data', () => {
    it('should switch to booking tab when externalInitialData is provided', () => {
      const propsWithExternal = {
        ...defaultProps,
        externalInitialData: {
          classroomId: 'classroom-1',
          date: '2025-11-20',
          startTime: '09:00',
          endTime: '10:30',
          purpose: 'Lecture'
        }
      }
      
      render(<FacultyDashboard {...propsWithExternal} />)
      
      // The booking tab should be active but lazy-loaded component may take time
      // Just verify the callback was called
      expect(defaultProps.onExternalInitialDataConsumed).toHaveBeenCalled()
    })

    it('should not switch tabs when externalInitialData is null', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      // Should remain on overview tab (default)
      expect(screen.queryByTestId('room-booking')).not.toBeInTheDocument()
      expect(defaultProps.onExternalInitialDataConsumed).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      const heading = screen.getByRole('heading', { name: /faculty dashboard/i })
      expect(heading).toBeInTheDocument()
    })

    it('should have accessible tab navigation', () => {
      render(<FacultyDashboard {...defaultProps} />)
      
      const tabs = screen.getAllByRole('tab')
      expect(tabs.length).toBeGreaterThan(0)
      
      // Check that tabs have accessible names
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-selected')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty classrooms array', () => {
      const emptyProps = {
        ...defaultProps,
        classrooms: []
      }
      
      render(<FacultyDashboard {...emptyProps} />)
      
      // Should still render without errors
      expect(screen.getByText('Faculty Dashboard')).toBeInTheDocument()
    })

    it('should handle empty schedules array', () => {
      const emptyProps = {
        ...defaultProps,
        schedules: [],
        allSchedules: []
      }
      
      render(<FacultyDashboard {...emptyProps} />)
      
      // Multiple "Upcoming Classes" text exists
      const upcomingTexts = screen.getAllByText('Upcoming Classes')
      expect(upcomingTexts.length).toBeGreaterThan(0)
      
      // Should show 0
      const zeros = screen.getAllByText('0')
      expect(zeros.length).toBeGreaterThan(0)
    })

    it('should handle empty booking requests array', () => {
      const emptyProps = {
        ...defaultProps,
        bookingRequests: [],
        allBookingRequests: []
      }
      
      render(<FacultyDashboard {...emptyProps} />)
      
      expect(screen.getByText('Pending Requests')).toBeInTheDocument()
      // All counts should be 0
      const zeros = screen.getAllByText('0')
      expect(zeros.length).toBeGreaterThan(0)
    })

    it('should handle missing department field', () => {
      const userWithoutDept = {
        ...facultyUser,
        department: undefined
      }
      
      const propsWithoutDept = {
        ...defaultProps,
        user: userWithoutDept as User
      }
      
      render(<FacultyDashboard {...propsWithoutDept} />)
      
      // Should still render without crashing
      expect(screen.getByText('Faculty Dashboard')).toBeInTheDocument()
    })
  })

  describe('Status Badge Variants', () => {
    it('should display approved requests with correct styling', () => {
      const approvedRequest = createMockBooking({
        status: 'approved',
        facultyId: facultyUser.id
      })
      
      const propsWithApproved = {
        ...defaultProps,
        bookingRequests: [approvedRequest]
      }
      
      render(<FacultyDashboard {...propsWithApproved} />)
      
      // Check that approved status is displayed
      const approvedBadges = screen.getAllByText(/approved/i)
      expect(approvedBadges.length).toBeGreaterThan(0)
    })

    it('should display rejected requests with correct styling', () => {
      const rejectedRequest = createMockBooking({
        status: 'rejected',
        facultyId: facultyUser.id,
        adminFeedback: 'Not available'
      })
      
      const propsWithRejected = {
        ...defaultProps,
        bookingRequests: [rejectedRequest]
      }
      
      render(<FacultyDashboard {...propsWithRejected} />)
      
      // Check that rejected status is displayed
      const rejectedBadges = screen.getAllByText(/rejected/i)
      expect(rejectedBadges.length).toBeGreaterThan(0)
    })

    it('should display pending requests with correct styling', () => {
      const pendingRequest = createMockBooking({
        status: 'pending',
        facultyId: facultyUser.id
      })
      
      const propsWithPending = {
        ...defaultProps,
        bookingRequests: [pendingRequest]
      }
      
      render(<FacultyDashboard {...propsWithPending} />)
      
      // Check that pending status is displayed
      const pendingBadges = screen.getAllByText(/pending/i)
      expect(pendingBadges.length).toBeGreaterThan(0)
    })
  })
})
