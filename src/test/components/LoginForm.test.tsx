import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginForm from '../../../components/LoginForm'
import { mockFacultyUser, mockAdminUser } from '../mocks/mockData'

// Mock the dependencies
vi.mock('../../../lib/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../../../lib/networkErrorHandler', () => ({
  executeWithNetworkHandling: vi.fn((fn) => fn()),
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

// Mock reCAPTCHA
;(global as any).grecaptcha = {
  enterprise: {
    ready: vi.fn((callback) => callback()),
    execute: vi.fn().mockResolvedValue('mock-recaptcha-token'),
  },
}

describe('LoginForm', () => {
  const mockOnLogin = vi.fn()
  const mockOnSignup = vi.fn()
  const mockUsers = [mockFacultyUser, mockAdminUser]

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnLogin.mockResolvedValue(true)
    mockOnSignup.mockResolvedValue(true)
  })

  describe('Rendering', () => {
    it('should render login form by default', () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      expect(screen.getByText(/Welcome to PLV CEIT/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should render signup form when signup tab is clicked', async () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const signupTab = screen.getByRole('tab', { name: /faculty request/i })
      await userEvent.click(signupTab)

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/last name/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/department/i)).toBeInTheDocument()
      })
    })

    it('should show account locked message when isLocked is true', () => {
      const lockedMessage = 'Account locked due to too many failed attempts'
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
          isLocked={true}
          accountLockedMessage={lockedMessage}
        />
      )

      expect(screen.getByText(lockedMessage)).toBeInTheDocument()
    })
  })

  describe('Login Functionality', () => {
    it('should handle successful login', async () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'faculty@plv.edu.ph')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(loginButton)

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith(
          'faculty@plv.edu.ph',
          'password123'
        )
      })
    })

    it('should validate email format', async () => {
      const { toast } = await import('sonner')
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'invalid-email')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(loginButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('valid email')
        )
      })
      expect(mockOnLogin).not.toHaveBeenCalled()
    })

    it('should require password', async () => {
      const { toast } = await import('sonner')
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const emailInput = screen.getByLabelText(/email/i)
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'faculty@plv.edu.ph')
      await userEvent.click(loginButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
      expect(mockOnLogin).not.toHaveBeenCalled()
    })

    it('should sanitize password (remove line breaks and zero-width chars)', async () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'faculty@plv.edu.ph')
      // Simulate pasting password with line breaks and zero-width characters
      fireEvent.change(passwordInput, {
        target: { value: 'pass\nword\r\n123\u200B' },
      })
      await userEvent.click(loginButton)

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalledWith(
          'faculty@plv.edu.ph',
          'password123' // Should be sanitized
        )
      })
    })

    it('should toggle password visibility', async () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement
      expect(passwordInput.type).toBe('password')

      const toggleButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')
      )
      
      if (toggleButton) {
        await userEvent.click(toggleButton)
        expect(passwordInput.type).toBe('text')

        await userEvent.click(toggleButton)
        expect(passwordInput.type).toBe('password')
      }
    })

    it('should disable login button when loading', async () => {
      mockOnLogin.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(true), 100)))
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'faculty@plv.edu.ph')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(loginButton)

      expect(loginButton).toBeDisabled()
    })
  })

  describe('Signup Functionality', () => {
    beforeEach(async () => {
      const { default: LoginForm } = await import('../../../components/LoginForm')
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const signupTab = screen.getByRole('tab', { name: /sign up/i })
      await userEvent.click(signupTab)
    })

    it('should handle successful signup', async () => {
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      })

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const departmentSelect = screen.getByRole('combobox')
      const passwordInput = screen.getAllByLabelText(/^password$/i)[0]
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const signupButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(firstNameInput, 'John')
      await userEvent.type(lastNameInput, 'Doe')
      await userEvent.type(emailInput, 'john.doe@plv.edu.ph')
      
      // Select department
      await userEvent.click(departmentSelect)
      const option = await screen.findByText(/Computer Science/i)
      await userEvent.click(option)

      await userEvent.type(passwordInput, 'SecurePass123!')
      await userEvent.type(confirmPasswordInput, 'SecurePass123!')
      await userEvent.click(signupButton)

      await waitFor(() => {
        expect(mockOnSignup).toHaveBeenCalledWith(
          'john.doe@plv.edu.ph',
          'John Doe',
          expect.any(String),
          'SecurePass123!',
          expect.any(String)
        )
      }, { timeout: 3000 })
    })

    it('should validate email domain (@plv.edu.ph)', async () => {
      const { toast } = await import('sonner')
      
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      })

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const signupButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(firstNameInput, 'John')
      await userEvent.type(lastNameInput, 'Doe')
      await userEvent.type(emailInput, 'john.doe@gmail.com')
      await userEvent.click(signupButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('@plv.edu.ph')
        )
      })
      expect(mockOnSignup).not.toHaveBeenCalled()
    })

    it('should validate password match', async () => {
      const { toast } = await import('sonner')
      
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      })

      const passwordInput = screen.getAllByLabelText(/^password$/i)[0]
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const signupButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(passwordInput, 'Password123!')
      await userEvent.type(confirmPasswordInput, 'DifferentPass123!')
      await userEvent.click(signupButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Passwords do not match')
        )
      })
      expect(mockOnSignup).not.toHaveBeenCalled()
    })

    it('should require all fields', async () => {
      const { toast } = await import('sonner')
      
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      })

      const signupButton = screen.getByRole('button', { name: /create account/i })
      await userEvent.click(signupButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
      expect(mockOnSignup).not.toHaveBeenCalled()
    })

    it('should validate password strength', async () => {
      const { toast } = await import('sonner')
      
      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      })

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getAllByLabelText(/^password$/i)[0]
      const confirmPasswordInput = screen.getByLabelText(/confirm password/i)
      const signupButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(firstNameInput, 'John')
      await userEvent.type(lastNameInput, 'Doe')
      await userEvent.type(emailInput, 'john.doe@plv.edu.ph')
      await userEvent.type(passwordInput, 'weak')
      await userEvent.type(confirmPasswordInput, 'weak')
      await userEvent.click(signupButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringMatching(/password.*characters/i)
        )
      })
      expect(mockOnSignup).not.toHaveBeenCalled()
    })
  })

  describe('Password Reset', () => {
    it('should open password reset dialog', async () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const forgotPasswordButton = screen.getByText(/forgot password/i)
      await userEvent.click(forgotPasswordButton)

      await waitFor(() => {
        expect(screen.getByText(/reset your password/i)).toBeInTheDocument()
      })
    })
  })

  describe('Tab Persistence', () => {
    it('should persist active tab to localStorage', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem')
      
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const signupTab = screen.getByRole('tab', { name: /sign up/i })
      await userEvent.click(signupTab)

      expect(setItemSpy).toHaveBeenCalledWith(
        expect.stringContaining('loginForm'),
        'signup'
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle login failure', async () => {
      const { toast } = await import('sonner')
      mockOnLogin.mockResolvedValue(false)

      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'faculty@plv.edu.ph')
      await userEvent.type(passwordInput, 'wrongpassword')
      await userEvent.click(loginButton)

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalled()
      })
    })

    it('should handle signup failure', async () => {
      mockOnSignup.mockResolvedValue(false)

      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const signupTab = screen.getByRole('tab', { name: /sign up/i })
      await userEvent.click(signupTab)

      await waitFor(() => {
        expect(screen.getByLabelText(/first name/i)).toBeInTheDocument()
      })

      const firstNameInput = screen.getByLabelText(/first name/i)
      const lastNameInput = screen.getByLabelText(/last name/i)
      const emailInput = screen.getByLabelText(/email/i)
      const signupButton = screen.getByRole('button', { name: /create account/i })

      await userEvent.type(firstNameInput, 'John')
      await userEvent.type(lastNameInput, 'Doe')
      await userEvent.type(emailInput, 'john.doe@plv.edu.ph')
      await userEvent.click(signupButton)

      await waitFor(() => {
        expect(mockOnSignup).toHaveBeenCalled()
      })
    })
  })
})
