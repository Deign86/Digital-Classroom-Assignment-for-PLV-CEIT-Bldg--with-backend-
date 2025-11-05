import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /faculty sign in/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /faculty request/i })).toBeInTheDocument()
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

      const emailInput = screen.getByPlaceholderText(/your.email@plv.edu.ph/i)
      const passwordInput = screen.getByPlaceholderText(/enter your password/i)
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

      const emailInput = screen.getByPlaceholderText(/your.email@plv.edu.ph/i)
      const passwordInput = screen.getByPlaceholderText(/enter your password/i)
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'invalid-email')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(loginButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
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

      const emailInput = screen.getByPlaceholderText(/your.email@plv.edu.ph/i)
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'faculty@plv.edu.ph')
      await userEvent.click(loginButton)

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled()
      })
      expect(mockOnLogin).not.toHaveBeenCalled()
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

      const emailInput = screen.getByPlaceholderText(/your.email@plv.edu.ph/i)
      const passwordInput = screen.getByPlaceholderText(/enter your password/i)
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'faculty@plv.edu.ph')
      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(loginButton)

      expect(loginButton).toBeDisabled()
    })
  })

  describe('Password Reset', () => {
    it('should show forgot password button', () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const forgotPasswordButton = screen.getByText(/forgot password/i)
      expect(forgotPasswordButton).toBeInTheDocument()
    })
  })

  describe('Tab Switching', () => {
    it('should switch to faculty request tab', async () => {
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
        expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle login failure gracefully', async () => {
      mockOnLogin.mockResolvedValue(false)

      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const emailInput = screen.getByPlaceholderText(/your.email@plv.edu.ph/i)
      const passwordInput = screen.getByPlaceholderText(/enter your password/i)
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'faculty@plv.edu.ph')
      await userEvent.type(passwordInput, 'wrongpassword')
      await userEvent.click(loginButton)

      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalled()
      })
    })
  })
})
