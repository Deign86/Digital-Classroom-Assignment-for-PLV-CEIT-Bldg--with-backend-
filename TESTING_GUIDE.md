# Testing Guide - PLV CEIT Digital Classroom Assignment System

## Overview

This project uses **Vitest** and **React Testing Library** for comprehensive testing of the React TypeScript Firebase application.

## Test Infrastructure

### Technologies

- **Vitest**: Fast unit test framework powered by Vite
- **React Testing Library**: Testing utilities for React components
- **@testing-library/user-event**: Simulating user interactions
- **@testing-library/jest-dom**: Custom Jest matchers for DOM assertions
- **jsdom**: DOM implementation for Node.js
- **@vitest/coverage-v8**: Code coverage using V8
- **@vitest/ui**: Visual test UI

### Project Structure

```
src/
├── test/
│   ├── setup.ts                 # Global test setup and configuration
│   ├── mocks/
│   │   ├── firebase.ts         # Firebase Auth, Firestore, Functions mocks
│   │   └── mockData.ts         # Test data factories and fixtures
│   ├── components/
│   │   ├── LoginForm.test.tsx  # LoginForm component tests
│   │   └── ...                 # Other component tests
│   ├── lib/
│   │   └── firebaseService.test.tsx  # Firebase service tests
│   └── integration/
│       └── bookingWorkflow.test.tsx  # End-to-end integration tests
```

## Running Tests

### Basic Commands

```bash
# Run all tests in watch mode
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

### Advanced Options

```bash
# Run specific test file
npm test -- src/test/components/LoginForm.test.tsx

# Run tests matching pattern
npm test -- --grep="Login"

# Run tests in specific file with coverage
npm test -- --coverage src/test/components/LoginForm.test.tsx

# Update snapshots
npm test -- -u

# Show verbose output
npm test -- --reporter=verbose
```

## Writing Tests

### Component Test Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from '../../../components/MyComponent'

// Mock external dependencies
vi.mock('../../../lib/firebaseService', () => ({
  authService: {
    signIn: vi.fn(),
  },
}))

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText(/expected text/i)).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    render(<MyComponent />)
    const button = screen.getByRole('button', { name: /click me/i })
    
    await userEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument()
    })
  })
})
```

### Firebase Service Test Pattern

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { authService } from '../../../lib/firebaseService'
import * as firebase from 'firebase/auth'

// Mock Firebase modules
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  getAuth: vi.fn(() => mockAuth),
}))

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should sign in user', async () => {
    const mockUser = { uid: 'test-uid', email: 'test@example.com' }
    vi.mocked(firebase.signInWithEmailAndPassword).mockResolvedValue({
      user: mockUser,
    } as any)

    const result = await authService.signIn('test@example.com', 'password')
    
    expect(result).toBe(true)
    expect(firebase.signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'test@example.com',
      'password'
    )
  })
})
```

### Using Test Fixtures

```typescript
import { mockFacultyUser, mockAdminUser, createMockBooking } from '../mocks/mockData'

it('should create booking', () => {
  const booking = createMockBooking({
    facultyId: mockFacultyUser.id,
    classroomName: 'Room 101',
    date: '2025-12-01',
  })
  
  expect(booking).toMatchObject({
    facultyId: mockFacultyUser.id,
    classroomName: 'Room 101',
    date: '2025-12-01',
    status: 'pending',
  })
})
```

## Testing Best Practices

### 1. Test User Behavior, Not Implementation

❌ **Don't test implementation details:**
```typescript
expect(component.state.isLoading).toBe(true)
```

✅ **Do test user-visible behavior:**
```typescript
expect(screen.getByRole('button')).toBeDisabled()
expect(screen.getByText(/loading/i)).toBeInTheDocument()
```

### 2. Use Accessible Queries

Priority order (from highest to lowest):

1. `getByRole` - Queries by ARIA role
2. `getByLabelText` - Queries form fields by label
3. `getByPlaceholderText` - Queries by placeholder
4. `getByText` - Queries by text content
5. `getByTestId` - Last resort only

```typescript
// ✅ Good - accessible and semantic
const button = screen.getByRole('button', { name: /submit/i })
const input = screen.getByLabelText(/email/i)

// ❌ Avoid - not accessible
const button = screen.getByTestId('submit-btn')
```

### 3. Use `userEvent` Over `fireEvent`

```typescript
import userEvent from '@testing-library/user-event'

// ✅ Preferred - simulates real user interaction
await userEvent.type(input, 'hello')
await userEvent.click(button)

// ❌ Avoid - lower-level, doesn't simulate real behavior
fireEvent.change(input, { target: { value: 'hello' } })
fireEvent.click(button)
```

### 4. Async Testing with `waitFor`

```typescript
import { waitFor } from '@testing-library/react'

it('should load data', async () => {
  render(<MyComponent />)
  
  // ✅ Wait for async operations
  await waitFor(() => {
    expect(screen.getByText(/loaded/i)).toBeInTheDocument()
  })
  
  // ❌ Don't use arbitrary timeouts
  // await new Promise(r => setTimeout(r, 1000))
})
```

### 5. Mock External Dependencies

```typescript
// Mock Firebase
vi.mock('../../../lib/firebaseService', () => ({
  authService: {
    signIn: vi.fn().mockResolvedValue(true),
    signOut: vi.fn().mockResolvedValue(undefined),
  },
  bookingRequestService: {
    create: vi.fn().mockResolvedValue('booking-id'),
  },
}))

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))
```

### 6. Test Edge Cases and Error States

```typescript
describe('Error Handling', () => {
  it('should show error when API fails', async () => {
    const mockError = new Error('Network error')
    vi.mocked(apiCall).mockRejectedValue(mockError)
    
    render(<MyComponent />)
    const button = screen.getByRole('button')
    await userEvent.click(button)
    
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })

  it('should handle empty state', () => {
    render(<MyList items={[]} />)
    expect(screen.getByText(/no items/i)).toBeInTheDocument()
  })
})
```

## Coverage Requirements

The project is configured with the following coverage thresholds:

- **Lines**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Statements**: 80%

### Viewing Coverage

```bash
# Generate and view HTML coverage report
npm run test:coverage
# Then open: coverage/index.html
```

### Coverage Configuration

Coverage is configured in `vite.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html', 'lcov'],
  exclude: [
    'node_modules/',
    'src/test/',
    '**/*.d.ts',
    '**/*.config.*',
    'dist/',
  ],
  thresholds: {
    lines: 80,
    functions: 80,
    branches: 80,
    statements: 80,
  },
}
```

## Continuous Integration

Tests run automatically on:
- Pull requests to `main` or `develop`
- Pushes to `main`, `develop`, or `feature/**` branches

### GitHub Actions Workflow

See `.github/workflows/test.yml` for the CI configuration.

The workflow:
1. Runs tests on Node.js 18.x and 20.x
2. Generates coverage reports
3. Uploads coverage to Codecov
4. Archives test results as artifacts

## Debugging Tests

### VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Current Test File",
  "autoAttachChildProcesses": true,
  "skipFiles": ["<node_internals>/**", "**/node_modules/**"],
  "program": "${workspaceRoot}/node_modules/vitest/vitest.mjs",
  "args": ["run", "${relativeFile}"],
  "smartStep": true,
  "console": "integratedTerminal"
}
```

### Using Vitest UI

```bash
npm run test:ui
```

Then open the URL shown in terminal (usually `http://localhost:51204/__vitest__/`)

### Debug Specific Test

```typescript
it.only('should test this specific case', () => {
  // Only this test will run
})

it.skip('should skip this test', () => {
  // This test will be skipped
})
```

## Common Testing Patterns

### Testing Forms

```typescript
it('should submit form with valid data', async () => {
  const mockOnSubmit = vi.fn()
  render(<MyForm onSubmit={mockOnSubmit} />)
  
  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com')
  await userEvent.type(screen.getByLabelText(/password/i), 'password123')
  await userEvent.click(screen.getByRole('button', { name: /submit/i }))
  
  await waitFor(() => {
    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    })
  })
})
```

### Testing Real-time Updates

```typescript
it('should update when data changes', async () => {
  const { rerender } = render(<DataDisplay data={[]} />)
  expect(screen.getByText(/no data/i)).toBeInTheDocument()
  
  const newData = [{ id: 1, name: 'Item 1' }]
  rerender(<DataDisplay data={newData} />)
  
  expect(screen.getByText('Item 1')).toBeInTheDocument()
})
```

### Testing Role-based Access

```typescript
it('should show admin features for admin users', () => {
  render(<Dashboard user={mockAdminUser} />)
  expect(screen.getByText(/manage users/i)).toBeInTheDocument()
})

it('should hide admin features for faculty users', () => {
  render(<Dashboard user={mockFacultyUser} />)
  expect(screen.queryByText(/manage users/i)).not.toBeInTheDocument()
})
```

## Troubleshooting

### Common Issues

**Issue**: `ReferenceError: window is not defined`
```typescript
// Solution: Ensure jsdom environment is set in vite.config.ts
test: {
  environment: 'jsdom',
}
```

**Issue**: Firebase mock not working
```typescript
// Solution: Mock at the module level before importing
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
}))
```

**Issue**: Async test timeout
```typescript
// Solution: Increase timeout or use waitFor
await waitFor(() => {
  expect(screen.getByText(/loaded/i)).toBeInTheDocument()
}, { timeout: 3000 })
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Effective Snapshot Testing](https://kentcdodds.com/blog/effective-snapshot-testing)

## Contributing

When adding new features:

1. Write tests first (TDD approach recommended)
2. Ensure all tests pass: `npm test -- --run`
3. Check coverage: `npm run test:coverage`
4. Update this guide if adding new testing patterns

---

For questions or issues with testing, please open an issue on GitHub.
