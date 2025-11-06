import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ClassroomManagement from '../../../components/ClassroomManagement'
import { mockClassrooms } from '../mocks/mockData'
import { classroomService } from '../../../lib/firebaseService'
import type { Classroom } from '../../../App'

// Mock dependencies
vi.mock('../../../lib/firebaseService', () => ({
  classroomService: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getAll: vi.fn(),
  },
}))

vi.mock('../../../lib/networkErrorHandler', () => ({
  executeWithNetworkHandling: vi.fn(async (operation) => {
    try {
      const result = await operation()
      return { success: true, data: result, isNetworkError: false }
    } catch (error) {
      return { success: false, error, isNetworkError: false }
    }
  }),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockOnClassroomUpdate = vi.fn()

describe('ClassroomManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(classroomService.getAll).mockResolvedValue([...mockClassrooms])
  })

  const defaultProps = {
    classrooms: mockClassrooms,
    onClassroomUpdate: mockOnClassroomUpdate,
  }

  describe('Rendering', () => {
    it('should render classroom management header', () => {
      render(<ClassroomManagement {...defaultProps} />)
      
      expect(screen.getByText('Classroom Management')).toBeInTheDocument()
      expect(screen.getByText('Manage CEIT classroom inventory and availability')).toBeInTheDocument()
    })

    it('should render add classroom button', () => {
      render(<ClassroomManagement {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /add classroom/i })
      expect(addButton).toBeInTheDocument()
    })

    it('should render table with correct headers', () => {
      render(<ClassroomManagement {...defaultProps} />)
      
      expect(screen.getByText('Room Name')).toBeInTheDocument()
      expect(screen.getByText('Building & Floor')).toBeInTheDocument()
      expect(screen.getByText('Capacity')).toBeInTheDocument()
      expect(screen.getByText('Equipment')).toBeInTheDocument()
      expect(screen.getByText('Status')).toBeInTheDocument()
      expect(screen.getByText('Actions')).toBeInTheDocument()
    })

    it('should render all classrooms in table', () => {
      render(<ClassroomManagement {...defaultProps} />)
      
      mockClassrooms.forEach((classroom) => {
        expect(screen.getByText(classroom.name)).toBeInTheDocument()
      })
    })

    it('should display total classroom count', () => {
      render(<ClassroomManagement {...defaultProps} />)
      
      const totalText = screen.getByText(/total:.*classrooms/i)
      expect(totalText).toHaveTextContent(`Total: ${mockClassrooms.length} classrooms`)
    })
  })

  describe('Classroom Display', () => {
    it('should display classroom building and floor info', () => {
      render(<ClassroomManagement {...defaultProps} />)
      
      const classroom = mockClassrooms[0]
      // Building info can appear multiple times if multiple classrooms have same building/floor
      const buildingTexts = screen.getAllByText(`${classroom.building}, ${classroom.floor}F`)
      expect(buildingTexts.length).toBeGreaterThan(0)
    })

    it('should display classroom capacity', () => {
      render(<ClassroomManagement {...defaultProps} />)
      
      // Capacity numbers can appear multiple times in the table
      const capacityTexts = screen.getAllByText(mockClassrooms[0].capacity.toString())
      expect(capacityTexts.length).toBeGreaterThan(0)
    })

    it('should display equipment badges', () => {
      render(<ClassroomManagement {...defaultProps} />)
      
      const classroomWithEquipment = mockClassrooms.find(c => c.equipment.length > 0)
      if (classroomWithEquipment) {
        // Equipment can appear multiple times if multiple classrooms have the same equipment
        const firstEquipment = classroomWithEquipment.equipment[0]
        const equipmentBadges = screen.getAllByText(firstEquipment)
        expect(equipmentBadges.length).toBeGreaterThan(0)
      }
    })

    it('should show "None" for classrooms without equipment', () => {
      const classroomsWithNoEquipment = [
        { ...mockClassrooms[0], equipment: [] as string[] }
      ]
      
      render(<ClassroomManagement classrooms={classroomsWithNoEquipment} onClassroomUpdate={mockOnClassroomUpdate} />)
      
      expect(screen.getByText('None')).toBeInTheDocument()
    })

    it('should show "+X more" badge when equipment exceeds 3 items', () => {
      const classroomWithManyEquipment = [
        { ...mockClassrooms[0], equipment: ['Projector', 'Computer', 'WiFi', 'Whiteboard', 'AC'] }
      ]
      
      render(<ClassroomManagement classrooms={classroomWithManyEquipment} onClassroomUpdate={mockOnClassroomUpdate} />)
      
      expect(screen.getByText('+2 more')).toBeInTheDocument()
    })
  })

  describe('Availability Status', () => {
    it('should display "Available" badge for available classrooms', () => {
      const availableClassroom = mockClassrooms.find(c => c.isAvailable)
      if (availableClassroom) {
        render(<ClassroomManagement {...defaultProps} />)
        
        const badges = screen.getAllByText('Available')
        expect(badges.length).toBeGreaterThan(0)
      }
    })

    it('should display "Disabled" badge for disabled classrooms', () => {
      const disabledClassroom = [
        { ...mockClassrooms[0], isAvailable: false }
      ]
      
      render(<ClassroomManagement classrooms={disabledClassroom} onClassroomUpdate={mockOnClassroomUpdate} />)
      
      expect(screen.getByText('Disabled')).toBeInTheDocument()
    })

    it('should show available count in summary', () => {
      render(<ClassroomManagement {...defaultProps} />)
      
      // Check for both "Total:" and "Available:" text in the document
      expect(screen.getByText(/total:/i)).toBeInTheDocument()
      // Use getAllByText since "Available" may also appear in status badges
      const availableTexts = screen.getAllByText(/available:/i)
      expect(availableTexts.length).toBeGreaterThan(0)
    })
  })

  describe('Add Classroom Dialog', () => {
    it('should open add dialog when clicking add button', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /add classroom/i })
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByText('Add New Classroom')).toBeInTheDocument()
      })
    })

    it('should display all form fields in add dialog', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /add classroom/i })
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/room name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/capacity/i)).toBeInTheDocument()
        // Floor is a Select component - check by text instead
        expect(screen.getByText('Floor *')).toBeInTheDocument()
        expect(screen.getByLabelText(/building/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/equipment/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/available for booking/i)).toBeInTheDocument()
      })
    })

    it('should successfully add a new classroom', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /add classroom/i })
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/room name/i)).toBeInTheDocument()
      })
      
      // Fill in form
      await user.type(screen.getByLabelText(/room name/i), 'CEIT-999')
      await user.type(screen.getByLabelText(/capacity/i), '50')
      await user.type(screen.getByLabelText(/building/i), 'CEIT Building')
      await user.type(screen.getByLabelText(/equipment/i), 'Projector, WiFi')
      
      // Submit form
      const submitButton = screen.getByRole('button', { name: /^add classroom$/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(classroomService.create).toHaveBeenCalledWith({
          name: 'CEIT-999',
          capacity: 50,
          equipment: ['Projector', 'WiFi'],
          building: 'CEIT Building',
          floor: 1,
          isAvailable: true,
        })
      })
    })

    it('should close dialog after successful add', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /add classroom/i })
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/room name/i)).toBeInTheDocument()
      })
      
      // Fill required fields
      await user.type(screen.getByLabelText(/room name/i), 'CEIT-999')
      await user.type(screen.getByLabelText(/capacity/i), '50')
      await user.type(screen.getByLabelText(/building/i), 'CEIT Building')
      
      const submitButton = screen.getByRole('button', { name: /^add classroom$/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockOnClassroomUpdate).toHaveBeenCalled()
      })
    })

    it('should cancel dialog without saving', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /add classroom/i })
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByText('Add New Classroom')).toBeInTheDocument()
      })
      
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Add New Classroom')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edit Classroom', () => {
    it('should open edit dialog with prepopulated data', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const classroom = mockClassrooms[0]
      const editButtons = screen.getAllByRole('button', { name: '' }) // Edit buttons with icon
      const editButton = editButtons.find(btn => 
        btn.querySelector('svg') && btn.classList.contains('h-4')
      )
      
      if (editButton) {
        await user.click(editButton)
        
        await waitFor(() => {
          expect(screen.getByText('Edit Classroom')).toBeInTheDocument()
          expect(screen.getByDisplayValue(classroom.name)).toBeInTheDocument()
          expect(screen.getByDisplayValue(classroom.capacity.toString())).toBeInTheDocument()
          expect(screen.getByDisplayValue(classroom.building)).toBeInTheDocument()
        })
      }
    })

    it('should successfully update classroom', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const editButtons = screen.getAllByRole('button', { name: '' })
      const editButton = editButtons[0]
      
      await user.click(editButton)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/room name/i)).toBeInTheDocument()
      })
      
      const nameInput = screen.getByLabelText(/room name/i)
      await user.clear(nameInput)
      await user.type(nameInput, 'CEIT-UPDATED')
      
      const updateButton = screen.getByRole('button', { name: /update classroom/i })
      await user.click(updateButton)
      
      await waitFor(() => {
        expect(classroomService.update).toHaveBeenCalled()
      })
    })
  })

  describe('Delete Classroom', () => {
    it('should open delete confirmation dialog', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons[deleteButtons.length - 1]
      
      await user.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByText('Delete Classroom')).toBeInTheDocument()
        expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
      })
    })

    it('should successfully delete classroom', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const classroom = mockClassrooms[0]
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons[deleteButtons.length - 1]
      
      await user.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByText('Delete Classroom')).toBeInTheDocument()
      })
      
      const confirmButton = screen.getByRole('button', { name: /^delete$/i })
      await user.click(confirmButton)
      
      await waitFor(() => {
        expect(classroomService.delete).toHaveBeenCalled()
      })
    })

    it('should cancel delete without removing classroom', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons[deleteButtons.length - 1]
      
      await user.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByText('Delete Classroom')).toBeInTheDocument()
      })
      
      const cancelButton = screen.getAllByRole('button', { name: /cancel/i })[0]
      await user.click(cancelButton)
      
      await waitFor(() => {
        expect(classroomService.delete).not.toHaveBeenCalled()
      })
    })
  })

  describe('Availability Toggle', () => {
    it('should toggle classroom availability', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const switches = screen.getAllByRole('switch')
      const firstSwitch = switches[0]
      
      await user.click(firstSwitch)
      
      await waitFor(() => {
        expect(classroomService.update).toHaveBeenCalled()
      })
    })

    it('should show loading state during availability update', async () => {
      const user = userEvent.setup()
      
      // Mock a delayed update
      vi.mocked(classroomService.update).mockImplementation(() => 
        new Promise((resolve) => setTimeout(resolve, 100))
      )
      
      render(<ClassroomManagement {...defaultProps} />)
      
      const switches = screen.getAllByRole('switch')
      await user.click(switches[0])
      
      // Check for sr-only loading text
      expect(screen.getByText('Updating availability')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no classrooms exist', () => {
      render(<ClassroomManagement classrooms={[]} onClassroomUpdate={mockOnClassroomUpdate} />)
      
      expect(screen.getByText('No classrooms added yet')).toBeInTheDocument()
    })

    it('should not show summary when no classrooms exist', () => {
      render(<ClassroomManagement classrooms={[]} onClassroomUpdate={mockOnClassroomUpdate} />)
      
      expect(screen.queryByText(/total:.*classrooms/i)).not.toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should handle equipment parsing with comma separation', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /add classroom/i })
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/equipment/i)).toBeInTheDocument()
      })
      
      await user.type(screen.getByLabelText(/room name/i), 'CEIT-999')
      await user.type(screen.getByLabelText(/capacity/i), '50')
      await user.type(screen.getByLabelText(/building/i), 'CEIT Building')
      await user.type(screen.getByLabelText(/equipment/i), 'Projector, WiFi, Whiteboard')
      
      const submitButton = screen.getByRole('button', { name: /^add classroom$/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(classroomService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            equipment: ['Projector', 'WiFi', 'Whiteboard'],
          })
        )
      })
    })

    it('should handle equipment with extra spaces', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /add classroom/i })
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/equipment/i)).toBeInTheDocument()
      })
      
      await user.type(screen.getByLabelText(/room name/i), 'CEIT-999')
      await user.type(screen.getByLabelText(/capacity/i), '50')
      await user.type(screen.getByLabelText(/building/i), 'CEIT Building')
      await user.type(screen.getByLabelText(/equipment/i), '  Projector  ,  WiFi  ')
      
      const submitButton = screen.getByRole('button', { name: /^add classroom$/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(classroomService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            equipment: ['Projector', 'WiFi'],
          })
        )
      })
    })

    it('should set isAvailable to false when toggled in form', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /add classroom/i })
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/available for booking/i)).toBeInTheDocument()
      })
      
      await user.type(screen.getByLabelText(/room name/i), 'CEIT-999')
      await user.type(screen.getByLabelText(/capacity/i), '50')
      await user.type(screen.getByLabelText(/building/i), 'CEIT Building')
      
      // Toggle availability off
      const availabilitySwitch = screen.getByLabelText(/available for booking/i)
      await user.click(availabilitySwitch)
      
      const submitButton = screen.getByRole('button', { name: /^add classroom$/i })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(classroomService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            isAvailable: false,
          })
        )
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', async () => {
      const user = userEvent.setup()
      render(<ClassroomManagement {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /add classroom/i })
      await user.click(addButton)
      
      await waitFor(() => {
        expect(screen.getByLabelText(/room name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/capacity/i)).toBeInTheDocument()
        // Floor is a Radix Select component - check by text instead
        expect(screen.getByText('Floor *')).toBeInTheDocument()
        expect(screen.getByLabelText(/building/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/equipment/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/available for booking/i)).toBeInTheDocument()
      })
    })

    it('should have accessible table structure', () => {
      render(<ClassroomManagement {...defaultProps} />)
      
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      const headers = screen.getAllByRole('columnheader')
      expect(headers.length).toBe(6)
    })
  })
})
