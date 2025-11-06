import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RoomBooking from '../../../components/RoomBooking'
import { mockFacultyUser, mockClassroom, mockClassroom2 } from '../mocks/mockData'

// Mock dependencies
vi.mock('../../../lib/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../lib/networkErrorHandler', () => ({
  executeWithNetworkHandling: vi.fn((fn) => fn()),
  checkIsOffline: vi.fn(() => false),
}))

vi.mock('../../../components/Announcer', () => ({
  useAnnouncer: () => ({
    announce: vi.fn(),
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

describe('RoomBooking', () => {
  const mockOnBookingRequest = vi.fn()
  const mockCheckConflicts = vi.fn()
  const classrooms = [mockClassroom, mockClassroom2]

  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckConflicts.mockResolvedValue(false) // No conflicts by default
  })

  describe('Rendering', () => {
    it('should render the booking form with all fields', () => {
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={[]}
          bookingRequests={[]}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      expect(screen.getByText(/request a classroom/i)).toBeInTheDocument()
      expect(screen.getByText(/classroom \*/i)).toBeInTheDocument()
      expect(screen.getByText(/date \*/i)).toBeInTheDocument()
      expect(screen.getByText(/start time \*/i)).toBeInTheDocument()
      expect(screen.getByText(/end time \*/i)).toBeInTheDocument()
      expect(screen.getByText(/purpose \*/i)).toBeInTheDocument()
    })

    it('should show submit button', () => {
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={[]}
          bookingRequests={[]}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      expect(screen.getByRole('button', { name: /submit reservation request/i })).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should not submit when fields are empty', async () => {
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={[]}
          bookingRequests={[]}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await userEvent.click(submitButton)

      // Should not call onBookingRequest when form is invalid
      await waitFor(() => {
        expect(mockOnBookingRequest).not.toHaveBeenCalled()
      })
    })
  })

  describe('Initial Data Pre-fill', () => {
    it('should pre-fill purpose with initialData', () => {
      const initialData = {
        classroomId: mockClassroom.id,
        date: '2024-12-25',
        startTime: '9:00 AM',
        endTime: '10:00 AM',
        purpose: 'Pre-filled test purpose',
      }

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={[]}
          bookingRequests={[]}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={initialData}
        />
      )

      const purposeField = screen.getByRole('textbox', { name: /purpose \*/i }) as HTMLTextAreaElement
      expect(purposeField.value).toBe('Pre-filled test purpose')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={[]}
          bookingRequests={[]}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      // Check for form fields with proper labels
      expect(screen.getByText(/classroom \*/i)).toBeInTheDocument()
      expect(screen.getByText(/date \*/i)).toBeInTheDocument()
      expect(screen.getByText(/purpose \*/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /submit reservation request/i })).toBeInTheDocument()
    })
  })
})
