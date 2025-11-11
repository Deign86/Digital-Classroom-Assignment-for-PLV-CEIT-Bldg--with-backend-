import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
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
  executeWithNetworkHandling: vi.fn(async (fn) => {
    try {
      const result = await fn()
      return { success: true, data: result }
    } catch (error) {
      return { success: false, error }
    }
  }),
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

  // Helper to scope to primary tablist (desktop) to avoid duplicate mobile+desktop elements
  const getPrimaryWithin = () => within(screen.getAllByRole('tablist')[0]);

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
  expect(getPrimaryWithin().getByRole('tab', { name: /faculty sign in/i })).toBeInTheDocument()
  expect(getPrimaryWithin().getByRole('tab', { name: /faculty signup/i })).toBeInTheDocument()
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

    it('should require email', async () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

      const passwordInput = screen.getByPlaceholderText(/enter your password/i)
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(passwordInput, 'password123')
      await userEvent.click(loginButton)

      // LoginForm uses state-based error display for empty email
      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument()
      })
      expect(mockOnLogin).not.toHaveBeenCalled()
    })

    it('should require password', async () => {
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

      // LoginForm uses state-based error display for empty password
      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument()
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
    it('should switch to faculty signup tab', async () => {
      render(
        <LoginForm
          onLogin={mockOnLogin}
          onSignup={mockOnSignup}
          users={mockUsers}
        />
      )

  const signupTab = getPrimaryWithin().getByRole('tab', { name: /faculty signup/i })
      await userEvent.click(signupTab)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /request faculty account/i })).toBeInTheDocument()
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

      // Make sure we're on the login tab
  const loginTab = getPrimaryWithin().getByRole('tab', { name: /faculty sign in/i })
      await userEvent.click(loginTab)

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/your.email@plv.edu.ph/i)).toBeInTheDocument()
      })

      const emailInput = screen.getByPlaceholderText(/your.email@plv.edu.ph/i)
      const passwordInput = screen.getByPlaceholderText(/enter your password/i)
      const loginButton = screen.getByRole('button', { name: /sign in/i })

      await userEvent.type(emailInput, 'faculty@plv.edu.ph')
      await userEvent.type(passwordInput, 'wrongpassword')
      await userEvent.click(loginButton)

      // Wait for login to be called and error to be handled
      await waitFor(() => {
        expect(mockOnLogin).toHaveBeenCalled()
      }, { timeout: 3000 })

      // Wait a bit more for the error to be fully processed
      await new Promise(resolve => setTimeout(resolve, 100))
    })
  })
})