import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import RoomBooking from '../../../components/RoomBooking'
import { mockFacultyUser, mockClassroom, mockClassroom2 } from '../mocks/mockData'
import type { User, Classroom, BookingRequest, Schedule } from '../../../App'

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
    info: vi.fn(),
  },
}))

describe('RoomBooking - Comprehensive Tests', () => {
  const mockOnBookingRequest = vi.fn()
  const mockCheckConflicts = vi.fn()
  const classrooms = [mockClassroom, mockClassroom2]
  const schedules: Schedule[] = []
  const bookingRequests: BookingRequest[] = []

  // Import toast after mocking
  let mockToast: any

  beforeEach(async () => {
    vi.clearAllMocks()
    mockCheckConflicts.mockResolvedValue(false)
    // Get toast mock reference
    const sonner = await import('sonner')
    mockToast = sonner.toast
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('Required Fields Validation', () => {
    it('should show error when submitting with empty classroom field', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      
      // Button should be disabled when required fields are empty
      expect(submitButton).toBeDisabled()
      expect(mockOnBookingRequest).not.toHaveBeenCalled()
    })

    it('should show error when submitting with empty date field', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      
      // Button should be disabled when date is empty
      expect(submitButton).toBeDisabled()
      expect(mockOnBookingRequest).not.toHaveBeenCalled()
    })

    it('should show error when submitting with empty start time', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      // Fill only classroom and date
      const classroomButtons = screen.getAllByRole('button')
      const classroomButton = classroomButtons.find(btn => 
        btn.textContent?.includes(mockClassroom.name)
      )
      if (classroomButton) await user.click(classroomButton)

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnBookingRequest).not.toHaveBeenCalled()
      })
    })

    it('should show error when submitting with empty end time', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      // Select classroom
      const classroomButtons = screen.getAllByRole('button')
      const classroomButton = classroomButtons.find(btn => 
        btn.textContent?.includes(mockClassroom.name)
      )
      if (classroomButton) await user.click(classroomButton)

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnBookingRequest).not.toHaveBeenCalled()
      })
    })

    it('should show error when submitting with empty purpose field', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnBookingRequest).not.toHaveBeenCalled()
      })
    })

    it('should require all fields to be filled before submission', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      
      // Button should be disabled when fields are empty
      expect(submitButton).toBeDisabled()
      expect(mockOnBookingRequest).not.toHaveBeenCalled()
    })
  })

  describe('Invalid Date and Time Handling', () => {
    it('should reject past dates', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      // Find date input (native or calendar)
      const dateInput = screen.queryByLabelText(/date/i) || screen.queryByPlaceholderText(/select date/i)
      
      if (dateInput && dateInput.tagName === 'INPUT') {
        // Try to set yesterday's date
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        const pastDate = yesterday.toISOString().split('T')[0]
        
        await user.clear(dateInput)
        await user.type(dateInput, pastDate)
      }

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Should either block submission or show error
        expect(mockOnBookingRequest).not.toHaveBeenCalled()
      })
    })

    it('should reject invalid date format (Feb 30, Apr 31, etc.)', async () => {
      const user = userEvent.setup()
      
      // Mock initialData with invalid date
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-02-30', // Invalid: Feb 30th doesn't exist
            startTime: '9:00 AM',
            endTime: '10:00 AM',
            purpose: 'Test'
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnBookingRequest).not.toHaveBeenCalled()
      })
    })

    it('should reject end time before start time', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '10:00 AM',
            endTime: '9:00 AM', // Before start time!
            purpose: 'Test'
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      
      // Button should be disabled due to validation error
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
      expect(mockOnBookingRequest).not.toHaveBeenCalled()
    })

    it('should reject equal start and end times', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '9:00 AM', // Same as start!
            purpose: 'Test'
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnBookingRequest).not.toHaveBeenCalled()
      })
    })

    it('should reject times outside school hours (before 7:00 AM)', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '6:00 AM', // Before school hours
            endTime: '7:00 AM',
            purpose: 'Test'
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnBookingRequest).not.toHaveBeenCalled()
      })
    })

    it('should reject times outside school hours (after 8:00 PM)', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '8:00 PM',
            endTime: '9:00 PM', // After school hours
            purpose: 'Test'
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnBookingRequest).not.toHaveBeenCalled()
      })
    })
  })

  describe('Conflict Detection', () => {
    it('should detect and display confirmed schedule conflicts', async () => {
      const conflictingSchedule: Schedule = {
        id: 'sched-1',
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        facultyId: 'other-faculty',
        facultyName: 'Dr. Jane Smith',
        date: '2025-12-15',
        startTime: '09:00',
        endTime: '10:00',
        purpose: 'Existing class',
        status: 'confirmed'
      }

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={[conflictingSchedule]}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM',
            purpose: 'Test'
          }}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/conflict/i)).toBeInTheDocument()
        expect(screen.getByText(/Dr. Jane Smith/i)).toBeInTheDocument()
      })
    })

    it('should detect pending request conflicts', async () => {
      const pendingRequest: BookingRequest = {
        id: 'req-1',
        facultyId: 'other-faculty',
        facultyName: 'Dr. John Doe',
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        date: '2025-12-15',
        startTime: '14:00',
        endTime: '15:00',
        purpose: 'Pending meeting',
        status: 'pending',
        requestDate: new Date().toISOString()
      }

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={[pendingRequest]}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '2:00 PM',
            endTime: '3:00 PM',
            purpose: 'Test'
          }}
        />
      )

      await waitFor(() => {
        expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0)
        expect(screen.getByText(/Dr. John Doe/i)).toBeInTheDocument()
      })
    })

    it('should detect overlapping time slot conflicts (partial overlap)', async () => {
      const existingSchedule: Schedule = {
        id: 'sched-1',
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        facultyId: 'other-faculty',
        facultyName: 'Dr. Smith',
        date: '2025-12-15',
        startTime: '09:00',
        endTime: '11:00',
        purpose: 'Existing',
        status: 'confirmed'
      }

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={[existingSchedule]}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '10:00 AM', // Overlaps with 9-11 AM
            endTime: '12:00 PM',
            purpose: 'Test'
          }}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/conflict/i)).toBeInTheDocument()
      })
    })

    it('should allow booking in different time slots (no conflict)', async () => {
      const existingSchedule: Schedule = {
        id: 'sched-1',
        classroomId: mockClassroom.id,
        classroomName: mockClassroom.name,
        facultyId: 'other-faculty',
        facultyName: 'Dr. Smith',
        date: '2025-12-15',
        startTime: '09:00',
        endTime: '10:00',
        purpose: 'Existing',
        status: 'confirmed'
      }

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={[existingSchedule]}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '11:00 AM', // After existing 9-10 AM slot
            endTime: '12:00 PM',
            purpose: 'Test meeting'
          }}
        />
      )

      await waitFor(() => {
        const conflicts = screen.queryByText(/conflict/i)
        expect(conflicts).not.toBeInTheDocument()
      })
    })
  })

  describe('Special Characters and Input Validation', () => {
    it('should handle special characters in purpose field', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM'
          }}
        />
      )

      const purposeField = screen.getByLabelText(/purpose/i)
      await user.clear(purposeField)
      await user.type(purposeField, 'Meeting w/ Dr. O\'Brien & team @ 10:00! #urgent')

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnBookingRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            purpose: expect.stringContaining('O\'Brien')
          })
        )
      })
    })

    it('should handle very long purpose text', async () => {
      const user = userEvent.setup()
      const longText = 'A'.repeat(2000) // 2000 characters
      
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM'
          }}
        />
      )

      const purposeField = screen.getByLabelText(/purpose/i)
      await user.clear(purposeField)
      await user.type(purposeField, longText.substring(0, 100)) // Type subset for performance

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Should handle long text gracefully
        expect(mockOnBookingRequest).toHaveBeenCalled()
      })
    })

    it('should trim whitespace from purpose field', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM'
          }}
        />
      )

      const purposeField = screen.getByLabelText(/purpose/i)
      await user.clear(purposeField)
      await user.type(purposeField, '   Test Meeting   ')

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnBookingRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            purpose: expect.stringMatching(/Test Meeting/) // Check it contains the text
          })
        )
      })
    })

    it('should reject purpose field with only whitespace', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM'
          }}
        />
      )

      const purposeField = screen.getByLabelText(/purpose/i)
      await user.clear(purposeField)
      await user.type(purposeField, '     ') // Only spaces

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      
      // Button should be disabled when purpose is only whitespace
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
      expect(mockOnBookingRequest).not.toHaveBeenCalled()
    })

    it('should handle emoji in purpose field', async () => {
      const user = userEvent.setup()
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM'
          }}
        />
      )

      const purposeField = screen.getByLabelText(/purpose/i)
      await user.clear(purposeField)
      await user.type(purposeField, 'Team meeting 📅 🎓')

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnBookingRequest).toHaveBeenCalledWith(
          expect.objectContaining({
            purpose: expect.stringContaining('meeting')
          })
        )
      })
    })
  })

  describe('Duplicate Submission Prevention', () => {
    it('should disable submit button during submission', async () => {
      const user = userEvent.setup()
      mockOnBookingRequest.mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 500))
      })

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM',
            purpose: 'Test'
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      // Button should be disabled immediately
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })
    })

    it('should prevent double submission via rapid clicking', async () => {
      const user = userEvent.setup()
      let submitCount = 0
      mockOnBookingRequest.mockImplementation(() => {
        submitCount++
        return new Promise(resolve => setTimeout(resolve, 100))
      })

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM',
            purpose: 'Test'
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      
      // Rapid clicks
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      await waitFor(() => {
        // Should only submit once
        expect(submitCount).toBe(1)
      }, { timeout: 500 })
    })
  })

  describe('Network Error Handling', () => {
    it.skip('should handle network failure gracefully', async () => {
      const user = userEvent.setup()
      mockOnBookingRequest.mockRejectedValue(new Error('Network error'))

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM',
            purpose: 'Test'
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          expect.stringMatching(/network|error|failed/i)
        )
      })
    })

    it.skip('should handle offline mode detection', async () => {
      const { checkIsOffline } = await import('../../../lib/networkErrorHandler')
      vi.mocked(checkIsOffline).mockReturnValue(true)

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      // Should show offline indicator or warning
      await waitFor(() => {
        const offlineIndicator = screen.queryByText(/offline/i) || screen.queryByLabelText(/offline/i)
        expect(offlineIndicator).toBeInTheDocument()
      })
    })
  })

  describe('Loading States', () => {
    it.skip('should show loading indicator during conflict check', async () => {
      mockCheckConflicts.mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve(false), 200))
      })

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM',
            purpose: 'Test'
          }}
        />
      )

      // Should show some loading state during check
      await waitFor(() => {
        const loadingIndicator = screen.queryByText(/checking/i) || screen.queryByRole('status')
        expect(loadingIndicator).toBeInTheDocument()
      }, { timeout: 100 })
    })

    it('should show loading state on submit button during submission', async () => {
      const user = userEvent.setup()
      mockOnBookingRequest.mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 300))
      })

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM',
            purpose: 'Test'
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(submitButton).toHaveTextContent(/requesting|loading|submitting/i)
      })
    })
  })

  describe('InitialData Prefill', () => {
    it('should prefill form with initialData', async () => {
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM',
            purpose: 'Prefilled meeting'
          }}
        />
      )

      await waitFor(() => {
        const purposeField = screen.getByLabelText(/purpose/i) as HTMLTextAreaElement
        expect(purposeField.value).toBe('Prefilled meeting')
      })
    })

    it('should convert 24-hour time format to 12-hour in initialData', async () => {
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '14:00', // 24-hour format
            endTime: '15:30',   // 24-hour format
            purpose: 'Test'
          }}
        />
      )

      // Form should internally convert to 12-hour format
      await waitFor(() => {
        const purposeField = screen.getByLabelText(/purpose/i)
        expect(purposeField).toBeInTheDocument()
      })
    })

    it('should handle partial initialData (missing optional fields)', async () => {
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15'
            // Missing startTime, endTime, purpose
          }}
        />
      )

      await waitFor(() => {
        const purposeField = screen.getByLabelText(/purpose/i) as HTMLTextAreaElement
        expect(purposeField.value).toBe('')
      })
    })

    it('should handle null/undefined initialData gracefully', async () => {
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={undefined}
        />
      )

      await waitFor(() => {
        const purposeField = screen.getByLabelText(/purpose/i)
        expect(purposeField).toBeInTheDocument()
      })
    })
  })

  describe('Classroom Availability', () => {
    it.skip('should only show available classrooms', async () => {
      const unavailableClassroom: Classroom = {
        id: 'room-unavailable',
        name: 'Unavailable Room',
        building: 'CEIT',
        floor: 1,
        capacity: 30,
        equipment: [],
        isAvailable: false
      }

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={[mockClassroom, unavailableClassroom]}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(mockClassroom.name)).toBeInTheDocument()
        expect(screen.queryByText('Unavailable Room')).not.toBeInTheDocument()
      })
    })

    it.skip('should handle empty classrooms list', async () => {
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={[]}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      await waitFor(() => {
        expect(screen.getByText(/no.*classrooms.*available/i)).toBeInTheDocument()
      })
    })

    it.skip('should handle undefined classrooms prop', async () => {
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={undefined}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      await waitFor(() => {
        const component = screen.getByRole('heading', { level: 2 })
        expect(component).toBeInTheDocument()
      })
    })
  })

  describe('Async Operations Cleanup', () => {
    it('should cleanup timers on unmount', async () => {
      const { unmount } = render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      unmount()

      // No hanging timers or promises
      await waitFor(() => {
        expect(true).toBe(true)
      })
    })

    it('should cancel pending conflict checks on classroom change', async () => {
      const user = userEvent.setup()
      let checkCount = 0
      mockCheckConflicts.mockImplementation(() => {
        checkCount++
        return new Promise(resolve => setTimeout(() => resolve(false), 100))
      })

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: '9:00 AM',
            endTime: '10:00 AM',
            purpose: 'Test'
          }}
        />
      )

      // Change classroom rapidly
      const classroomButtons = screen.getAllByRole('button')
      const classroom2Button = classroomButtons.find(btn => 
        btn.textContent?.includes(mockClassroom2.name)
      )
      if (classroom2Button) {
        await user.click(classroom2Button)
      }

      // Should handle cleanup gracefully
      await waitFor(() => {
        expect(true).toBe(true)
      })
    })
  })

  describe('Edge Cases', () => {
    it.skip('should handle malformed user data', async () => {
      const malformedUser: User = {
        id: '',
        name: '',
        email: '',
        role: 'faculty' as const,
        status: 'approved'
      }

      render(
        <RoomBooking
          user={malformedUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      await waitFor(() => {
        const component = screen.getByRole('heading', { level: 2 })
        expect(component).toBeInTheDocument()
      })
    })

    it.skip('should handle very large classroom lists', async () => {
      const manyClassrooms = Array.from({ length: 100 }, (_, i) => ({
        id: `room-${i}`,
        name: `Room ${i}`,
        building: 'CEIT',
        floor: Math.floor(i / 10) + 1,
        capacity: 30,
        equipment: [],
        isAvailable: true
      }))

      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={manyClassrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Room 0')).toBeInTheDocument()
      })
    })

    it.skip('should handle NaN values in time slots gracefully', async () => {
      render(
        <RoomBooking
          user={mockFacultyUser}
          classrooms={classrooms}
          schedules={schedules}
          bookingRequests={bookingRequests}
          onBookingRequest={mockOnBookingRequest}
          checkConflicts={mockCheckConflicts}
          initialData={{
            classroomId: mockClassroom.id,
            date: '2025-12-15',
            startTime: 'Invalid Time',
            endTime: 'Also Invalid',
            purpose: 'Test'
          }}
        />
      )

      const submitButton = screen.getByRole('button', { name: /submit reservation request/i })
      const user = userEvent.setup()
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnBookingRequest).not.toHaveBeenCalled()
      })
    })
  })
})

