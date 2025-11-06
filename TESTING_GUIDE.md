# Testing Guide - PLV CEIT Digital Classroom Assignment System

> **Status**: ✅ 580 Tests Passing | **Coverage**: 80%+ | **Test Duration**: ~35s | **Last Updated**: November 6, 2025

## 🎯 For System Testers & QA Engineers

Welcome! This guide will help you understand and work with the comprehensive test suite for the PLV CEIT Digital Classroom Assignment System.

### What You'll Find Here

This system has a **production-ready automated test suite** with:
- ✅ **580 passing tests** across 16 test files
- ✅ **80%+ code coverage** for all critical paths
- ✅ **Automated CI/CD** testing on GitHub Actions
- ✅ **~35-second** test execution time
- ✅ **Component, Service, Utility, and Integration** tests

### Quick Verification

To verify the test suite is working:

```bash
# 1. Install dependencies
npm install

# 2. Run all tests
npm test -- --run

# Expected output: ✓ 580 passed in ~35 seconds
```

### What's Tested

| Category | Coverage | Description |
|----------|----------|-------------|
| **Authentication** | 40+ tests | Login, signup, password reset, brute force protection |
| **Booking System** | 120+ tests | Room booking, conflict detection, approval workflows |
| **Admin Functions** | 120+ tests | User management, classroom management, request approval |
| **Real-time Sync** | 40+ tests | Firebase listeners, live updates, data synchronization |
| **Network Resilience** | 47 tests | Retry logic, exponential backoff, error recovery |
| **Input Security** | 70+ tests | XSS prevention, input sanitization, validation |
| **Time Management** | 80+ tests | Date/time validation, school hours, booking limits |
| **Integration** | 20+ tests | End-to-end workflows, multi-service operations |

### Test Quality Assurance

- **No flaky tests** - All tests are deterministic and reliable
- **Fast execution** - Full suite runs in ~35 seconds
- **Comprehensive mocking** - Firebase services fully mocked (no real backend calls)
- **CI/CD verified** - Tests run automatically on every pull request
- **Well-documented** - Each test describes what it validates

### For Manual Testing

While we have comprehensive automated tests, manual testing is still valuable for:
- 🖱️ **User experience** - Visual polish, animations, responsiveness
- 📱 **Cross-browser testing** - Chrome, Firefox, Safari, Edge
- � **Mobile devices** - Touch interactions, responsive design
- ♿ **Accessibility** - Screen readers, keyboard navigation
- 🌐 **Real Firebase integration** - Live backend behavior
- 🔔 **Push notifications** - FCM on actual devices

See the [Manual Testing Checklist](#manual-testing-checklist) section below for guidance.

---

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Infrastructure](#test-infrastructure)
4. [Running Tests](#running-tests)
5. [Test Coverage Summary](#test-coverage-summary)
6. [Writing Tests](#writing-tests)
7. [Testing Best Practices](#testing-best-practices)
8. [CI/CD Integration](#cicd-integration)
9. [Debugging Tests](#debugging-tests)
10. [Common Testing Patterns](#common-testing-patterns)
11. [Troubleshooting](#troubleshooting)
12. [Resources](#resources)

## Overview

This project uses **Vitest** and **React Testing Library** for comprehensive testing of the React TypeScript Firebase application. The test suite includes **580 tests** across **16 test files** covering components, services, utilities, and integration workflows.

### Test Statistics

- **Total Tests**: 580 passing
- **Test Files**: 16
- **Test Duration**: ~35 seconds
- **Coverage**: 80%+ (lines, functions, branches, statements)
- **CI/CD**: Automated testing on GitHub Actions

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests in watch mode
npm test

# Run tests once (for CI/CD)
npm run test:run

# Run tests with UI dashboard
npm run test:ui

# Generate coverage report
npm run test:coverage

# View coverage report (after generating)
# Open: coverage/index.html in your browser
```

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
│   ├── setup.ts                          # Global test setup and configuration
│   ├── mocks/
│   │   ├── firebase.ts                   # Firebase Auth, Firestore, Functions mocks
│   │   └── mockData.ts                   # Test data factories and fixtures
│   ├── components/
│   │   ├── LoginForm.test.tsx            # LoginForm component tests (40+ tests)
│   │   ├── RoomBooking.comprehensive.test.tsx  # Comprehensive RoomBooking tests (40+ tests)
│   │   ├── FacultyDashboard.test.tsx     # Faculty dashboard tests (60+ tests)
│   │   ├── AdminDashboard.test.tsx       # Admin dashboard tests (80+ tests)
│   │   ├── ClassroomManagement.test.tsx  # Classroom management tests (40+ tests)
│   │   ├── RequestApproval.test.tsx      # Request approval tests (50+ tests)
│   │   ├── ScheduleViewer.test.tsx       # Schedule viewer tests (30+ tests)
│   │   └── ...                           # Additional component tests
│   ├── lib/
│   │   ├── firebaseService.test.tsx      # Firebase service tests (60+ tests)
│   │   ├── withRetry.test.ts             # Network retry utility tests (47 tests)
│   │   ├── notificationService.test.ts   # Notification service tests (20+ tests)
│   │   ├── pushService.test.ts           # Push notification tests (15+ tests)
│   │   └── errorLogger.test.ts           # Error logging tests (10+ tests)
│   ├── utils/
│   │   ├── timeUtils.test.ts             # Time utility tests (80+ tests)
│   │   └── inputValidation.test.ts       # Input validation tests (70+ tests)
│   └── integration/
│       └── bookingWorkflow.test.tsx      # End-to-end integration tests (20+ tests)
```

### Test Coverage Breakdown

| Category | Test Files | Tests | Coverage |
|----------|-----------|-------|----------|
| **Components** | 8 files | 400+ tests | Component behavior, user interactions, edge cases |
| **Services** | 5 files | 100+ tests | Firebase operations, network resilience, error handling |
| **Utilities** | 2 files | 150+ tests | Time management, input validation, security |
| **Integration** | 1 file | 20+ tests | End-to-end workflows, multi-service operations |
| **Total** | **16 files** | **580 tests** | **80%+ coverage** |

## Running Tests

### Basic Commands

```bash
# Run all tests in watch mode (recommended for development)
npm test

# Run tests once (CI mode)
npm run test:run

# Run tests with interactive UI dashboard
npm run test:ui
# Then open: http://localhost:51204/__vitest__/

# Generate coverage report
npm run test:coverage

# Run tests with verbose output
npm test -- --reporter=verbose
```

### Advanced Options

```bash
# Run specific test file
npm test -- src/test/components/LoginForm.test.tsx

# Run specific test suite
npm test -- --grep="RoomBooking"

# Run tests in a specific directory
npm test -- src/test/lib/

# Run tests matching a pattern
npm test -- --grep="validation"

# Run tests with coverage for specific file
npm test -- --coverage src/test/components/LoginForm.test.tsx

# Update snapshots (if using snapshot testing)
npm test -- -u

# Run only tests marked with .only
npm test -- --run

# Skip tests marked with .skip
# (automatically done by default)

# Run tests in parallel (faster for large suites)
npm test -- --threads

# Run tests in sequence (for debugging race conditions)
npm test -- --no-threads

# Set timeout for slow tests
npm test -- --testTimeout=10000
```

### Watch Mode Commands

When running `npm test` in watch mode, you have access to these commands:

- **Press `a`** - Run all tests
- **Press `f`** - Run only failed tests
- **Press `p`** - Filter tests by filename pattern
- **Press `t`** - Filter tests by test name pattern
- **Press `q`** - Quit watch mode
- **Press `h`** - Show help menu

## Test Coverage Summary

### Current Coverage Metrics

The project maintains **80%+ coverage** across all metrics:

```
Lines:       80%+
Functions:   80%+
Branches:    80%+
Statements:  80%+
```

### Coverage by Category

**Component Tests (400+ tests)**
- User authentication and authorization flows
- Form validation and submission
- Real-time data synchronization
- Role-based UI rendering (Admin/Faculty)
- Conflict detection and prevention
- Error handling and recovery
- Loading and success states
- Edge cases and boundary conditions

**Service Tests (100+ tests)**
- Firebase Authentication operations
- Firestore CRUD operations
- Cloud Functions integration
- Network retry logic (47 tests for withRetry utility)
- Push notification management
- Real-time listener subscriptions
- Error logging and reporting

**Utility Tests (150+ tests)**
- Time conversion and validation (80+ tests)
- Input sanitization and validation (70+ tests)
- Security checks (XSS prevention)
- Date/time manipulation
- Performance optimizations

**Integration Tests (20+ tests)**
- Complete booking workflow (creation → approval → schedule)
- Multi-user concurrent operations
- Conflict detection across services
- Real-time data synchronization
- Error recovery scenarios

### Viewing Coverage Reports

```bash
# Generate HTML coverage report
npm run test:coverage

# Open the report (Windows)
start coverage/index.html

# Open the report (Mac/Linux)
open coverage/index.html  # or xdg-open coverage/index.html
```

The HTML report provides:
- **File-by-file coverage** - See which files need more tests
- **Line-by-line highlighting** - Identify untested code paths
- **Branch coverage** - View conditional logic coverage
- **Function coverage** - Check which functions are tested

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

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:
- **Pull requests** targeting `master`, `main`, `develop`, or `feature/**` branches
- **Pushes** to `master`, `main`, `develop`, `feature/**`, or `demo/**` branches

### Workflow Details

The CI/CD pipeline (`.github/workflows/test.yml`) performs:

1. **Environment Setup**
   - Node.js 20.x LTS
   - npm ci for clean dependency installation
   - Mock Firebase environment variables

2. **Test Execution**
   - Runs all 580 tests with verbose reporting
   - Executes in ~35-60 seconds in CI environment
   - Uses `--run` flag to prevent watch mode

3. **Coverage Generation**
   - Generates comprehensive coverage reports
   - Uploads to Codecov for tracking trends
   - Archives reports as GitHub artifacts (30-day retention)

4. **Lint Check**
   - TypeScript compiler check (`tsc --noEmit`)
   - Ensures type safety across codebase
   - Continues on error (non-blocking)

### CI Configuration

```yaml
name: Test Suite

on:
  push:
    branches: [ main, master, develop, feature/**, demo/** ]
  pull_request:
    branches: [ main, master, develop, feature/** ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js 20.x
        uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --run --reporter=verbose
        env:
          CI: true
          # Mock Firebase environment variables
          VITE_FIREBASE_API_KEY: "mock-api-key"
          VITE_FIREBASE_AUTH_DOMAIN: "mock-domain.firebaseapp.com"
          VITE_FIREBASE_PROJECT_ID: "mock-project"
          VITE_FIREBASE_STORAGE_BUCKET: "mock-bucket.appspot.com"
          VITE_FIREBASE_MESSAGING_SENDER_ID: "123456789"
          VITE_FIREBASE_APP_ID: "1:123456789:web:abc123"
          VITE_FIREBASE_MEASUREMENT_ID: "G-MOCK123"
          VITE_FIREBASE_VAPID_KEY: "mock-vapid-key"
      
      - name: Generate coverage report
        run: npm run test:coverage
        continue-on-error: true
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/lcov.info
          flags: unittests
          name: codecov-umbrella
          fail_ci_if_error: false
        continue-on-error: true
      
      - name: Archive test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results
          path: |
            coverage/
            test-results/
          retention-days: 30
```

### Viewing CI Results

**GitHub Actions Tab**: https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/actions

- ✅ **Green checkmark** - All tests passed
- ❌ **Red X** - Tests failed (click for details)
- 🟡 **Yellow circle** - Tests running
- ⚫ **Gray circle** - Tests skipped/cancelled

### CI Success Criteria

For a PR to be mergeable:
- ✅ All 580 tests must pass
- ✅ TypeScript compilation must succeed
- ✅ No blocking errors in coverage generation
- ✅ Test duration should be under 2 minutes

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

**Issue**: Tests pass locally but fail in CI
```bash
# Check environment variables in CI
# Ensure mock Firebase config is set
# Verify Node version matches (use 20.x)
# Check for timezone-dependent tests
```

**Issue**: Flaky tests (sometimes pass, sometimes fail)
```typescript
// Common causes:
// 1. Race conditions in async code
// 2. Insufficient waitFor timeouts
// 3. Shared state between tests
// 4. Date/time-dependent logic

// Solutions:
// 1. Use vi.useFakeTimers() for time-based tests
// 2. Increase waitFor timeout
// 3. Clear mocks in beforeEach
// 4. Mock Date.now() for consistent results
```

**Issue**: Memory leaks in tests
```typescript
// Solution: Clean up subscriptions and timers
afterEach(() => {
  vi.clearAllTimers()
  vi.clearAllMocks()
  cleanup() // from @testing-library/react
})
```

**Issue**: Tests slow or hanging
```bash
# Check for:
# 1. Missing vi.useFakeTimers() for setTimeout/setInterval
# 2. Real network calls instead of mocks
# 3. Infinite loops in components
# 4. Missing waitFor for async operations

# Debug with:
npm test -- --reporter=verbose --no-coverage
```

### Debugging Tips

**1. Isolate the failing test**
```typescript
it.only('should test specific behavior', () => {
  // Only this test runs
})
```

**2. Skip problematic tests temporarily**
```typescript
it.skip('should test behavior - WIP', () => {
  // This test is skipped
})
```

**3. Add console logs strategically**
```typescript
screen.debug() // Print entire DOM
screen.debug(element) // Print specific element
console.log(screen.getByRole('button').textContent)
```

**4. Use Vitest UI for visual debugging**
```bash
npm run test:ui
# Interactive test explorer with filtering and debugging
```

**5. Check test execution order**
```bash
# Tests should be independent
# Ensure no shared state between tests
# Use beforeEach to reset state
```

## Test Categories Deep Dive

### Component Tests (400+ tests)

**LoginForm.test.tsx** (40+ tests)
- Email/password validation
- Password visibility toggles
- Sanitization of pasted passwords
- Brute force protection UI
- Account lockout messages
- Error handling for auth failures
- Loading states during login
- Signup/login mode switching

**RoomBooking.comprehensive.test.tsx** (40+ tests)
- Required field validation
- Date/time range validation
- 2-month advance booking limit
- Past date rejection
- Conflict detection (pending/confirmed)
- Special character handling
- Input sanitization (XSS prevention)
- Network error handling
- Loading states
- InitialData prefill functionality

**FacultyDashboard.test.tsx** (60+ tests)
- Tab navigation and persistence
- Real-time booking request updates
- Schedule viewing and filtering
- Booking request creation
- Request status updates
- Notification handling
- Role-based UI rendering
- Session timeout warnings

**AdminDashboard.test.tsx** (80+ tests)
- Request approval/rejection workflows
- Conflict detection during approval
- Admin feedback for rejections
- User management operations
- Classroom management CRUD
- Bulk operations
- Real-time data synchronization
- Role-based access control

**ClassroomManagement.test.tsx** (40+ tests)
- Classroom creation with validation
- Equipment management
- Capacity validation
- Duplicate classroom prevention
- Classroom editing
- Classroom deletion
- Filter and search functionality

**RequestApproval.test.tsx** (50+ tests)
- Request list filtering (pending/approved/rejected)
- Sort by date functionality
- Request detail viewing
- Approval with schedule creation
- Rejection with feedback
- Conflict detection
- Batch operations
- Status badge rendering

**ScheduleViewer.test.tsx** (30+ tests)
- Schedule list rendering
- Time sorting and formatting
- Date filtering
- Faculty-specific filtering
- Classroom-specific filtering
- Status indicators
- Empty state handling

### Service Tests (100+ tests)

**firebaseService.test.tsx** (60+ tests)
- Authentication (signIn, signOut, signUp)
- User CRUD operations
- Booking request operations
- Schedule management
- Classroom operations
- Real-time subscriptions
- Error handling
- Retry logic integration

**withRetry.test.ts** (47 tests)
- Basic retry functionality (3 attempts default)
- Custom retry attempts
- Exponential backoff (300ms initial, 2x factor)
- Jitter implementation
- Network error detection
- shouldRetry predicate
- Error type preservation
- Return value types
- Edge cases (zero attempts, negative, large values)
- Integration with Firebase operations

**notificationService.test.ts** (20+ tests)
- Notification creation (server-side)
- Notification retrieval
- Acknowledgment operations
- Timestamp handling (Firestore Timestamp conversion)
- Real-time notification updates
- Actor filtering (no self-notifications)

**pushService.test.ts** (15+ tests)
- FCM token registration
- Push notification enabling/disabling
- Service worker initialization
- Token management
- Browser support detection
- Permission handling
- Error recovery

**errorLogger.test.ts** (10+ tests)
- Client error logging
- Firestore fallback mechanism
- Server timestamp inclusion
- Error context capture
- Network error handling

### Utility Tests (150+ tests)

**timeUtils.test.ts** (80+ tests)
- 12-hour ↔ 24-hour conversion
- Time slot generation (7:00 AM - 8:30 PM, 30-min intervals)
- School hours validation
- Time comparison
- Time range validation
- Booking duration validation (30min-8hr)
- Past booking detection (5-minute buffer)
- Time slot availability
- Date manipulation
- Performance tests (1000 iterations < 100ms)

**inputValidation.test.ts** (70+ tests)
- Text sanitization (whitespace, control chars, zero-width chars)
- Email validation (RFC 5322 compliant)
- Name validation (2-100 chars, letters/spaces only)
- XSS detection (script tags, javascript:, event handlers)
- Password sanitization (line breaks, tabs, zero-width)
- Password strength validation (8+ chars, mixed case, number, special)
- Length enforcement (configurable limits)
- Special character handling
- Emoji support
- Performance tests (10,000 operations < 500ms)

### Integration Tests (20+ tests)

**bookingWorkflow.test.tsx** (20+ tests)

Complete workflows:
1. **Faculty Creates Booking** → Admin Approves → Schedule Created → Notification Sent
2. **Faculty Creates Booking** → Admin Rejects → Feedback Sent → Notification Sent
3. **Conflict Detection** → Prevents double-booking
4. **Concurrent Operations** → Multiple faculty/admin actions
5. **Network Failures** → Retry logic activates → Success after retry
6. **Real-time Sync** → Changes propagate to all connected clients

Scenarios covered:
- Booking request creation
- Conflict detection
- Approval workflow
- Rejection workflow
- Schedule creation
- Schedule cancellation
- Real-time subscriptions
- Multi-user operations
- Error recovery
- Network resilience

## Manual Testing Checklist

While automated tests cover functionality, manual testing ensures excellent user experience.

### Pre-Testing Setup

1. **Environment**: Use development environment with real Firebase backend
2. **Test Accounts**: Create admin and faculty test accounts
3. **Test Data**: Add sample classrooms and schedules
4. **Browsers**: Test on Chrome, Firefox, Safari, Edge (latest versions)
5. **Devices**: Test on desktop, tablet, mobile (responsive design)

### Authentication & Authorization (15 minutes)

- [ ] **Login Flow**
  - [ ] Valid credentials → successful login
  - [ ] Invalid credentials → error message
  - [ ] Empty fields → validation errors
  - [ ] Password visibility toggle works
  - [ ] "Remember me" functionality
  - [ ] Brute force protection after 5 failed attempts
  - [ ] Account lockout message displays correctly

- [ ] **Signup Flow**
  - [ ] New account registration
  - [ ] Email validation
  - [ ] Password strength indicator
  - [ ] Admin approval required message
  - [ ] Duplicate email rejection

- [ ] **Password Reset**
  - [ ] Reset email sent
  - [ ] Reset link works
  - [ ] New password accepted
  - [ ] Password requirements enforced

- [ ] **Session Management**
  - [ ] 30-minute idle timeout warning
  - [ ] Auto-logout after 35 minutes idle
  - [ ] Manual logout works
  - [ ] Session persists across page refresh

### Faculty Dashboard (20 minutes)

- [ ] **Room Booking**
  - [ ] Create new booking request
  - [ ] Select classroom from dropdown
  - [ ] Date picker shows valid dates (today to +2 months)
  - [ ] Time slots (7:00 AM - 8:30 PM, 30-min intervals)
  - [ ] Conflict detection shows existing bookings
  - [ ] Past dates/times disabled
  - [ ] Purpose field validation (required, max length)
  - [ ] Submit shows loading state
  - [ ] Success notification appears

- [ ] **My Requests**
  - [ ] View pending requests
  - [ ] View approved requests
  - [ ] View rejected requests (with admin feedback)
  - [ ] Real-time updates when admin approves/rejects
  - [ ] Filter by status works
  - [ ] Sort by date works

- [ ] **My Schedule**
  - [ ] View upcoming bookings
  - [ ] See classroom details
  - [ ] See time range
  - [ ] Calendar integration (if implemented)

- [ ] **Notifications**
  - [ ] Bell icon shows unread count
  - [ ] Notification dropdown opens
  - [ ] Acknowledge notification removes from count
  - [ ] Push notifications work (if enabled)

### Admin Dashboard (30 minutes)

- [ ] **Request Approval**
  - [ ] View all pending requests
  - [ ] See faculty details
  - [ ] See booking details
  - [ ] Check for conflicts before approval
  - [ ] Approve request → creates schedule
  - [ ] Reject request → requires feedback
  - [ ] Admin feedback sent to faculty
  - [ ] Notification sent on approval/rejection
  - [ ] Real-time updates work

- [ ] **Classroom Management**
  - [ ] Add new classroom
  - [ ] Edit existing classroom
  - [ ] Delete classroom (with confirmation)
  - [ ] Set capacity
  - [ ] Manage equipment list
  - [ ] Upload classroom image (if implemented)
  - [ ] Validation prevents duplicate names

- [ ] **User Management**
  - [ ] View pending signups
  - [ ] Approve faculty accounts
  - [ ] Reject faculty accounts
  - [ ] Bulk approve/reject
  - [ ] Lock/unlock accounts
  - [ ] View user activity

- [ ] **Reports** (if implemented)
  - [ ] View booking statistics
  - [ ] Export data
  - [ ] Filter by date range

### Real-time Features (10 minutes)

- [ ] **Multi-user Testing**
  - [ ] Open two browser windows (admin + faculty)
  - [ ] Faculty creates booking → admin sees it immediately
  - [ ] Admin approves → faculty sees update immediately
  - [ ] Test with slow network (throttle in DevTools)

### Responsive Design (15 minutes)

- [ ] **Desktop (1920x1080)**
  - [ ] All elements visible
  - [ ] Navigation works
  - [ ] Modals centered
  - [ ] Tables not overflowing

- [ ] **Tablet (768x1024)**
  - [ ] Responsive layout activates
  - [ ] Horizontal scrolling tabs work
  - [ ] Touch interactions smooth

- [ ] **Mobile (375x667)**
  - [ ] Mobile layout renders correctly
  - [ ] All features accessible
  - [ ] Touch targets large enough
  - [ ] Keyboard doesn't obscure inputs

### Accessibility (10 minutes)

- [ ] **Keyboard Navigation**
  - [ ] Tab through all interactive elements
  - [ ] Enter/Space activates buttons
  - [ ] Escape closes modals
  - [ ] Focus indicators visible

- [ ] **Screen Reader**
  - [ ] ARIA labels present
  - [ ] Form labels associated
  - [ ] Error messages announced
  - [ ] Status updates announced

### Performance (10 minutes)

- [ ] **Load Times**
  - [ ] Initial page load < 3 seconds
  - [ ] Dashboard renders < 1 second
  - [ ] Form submissions < 2 seconds

- [ ] **Network Conditions**
  - [ ] Test on slow 3G
  - [ ] Offline detection works
  - [ ] Retry logic handles timeouts

### Edge Cases (15 minutes)

- [ ] **Data Edge Cases**
  - [ ] Empty classrooms list
  - [ ] No booking requests
  - [ ] 100+ bookings in a day
  - [ ] Very long classroom names
  - [ ] Special characters in names

- [ ] **Error Scenarios**
  - [ ] Invalid date format
  - [ ] Network disconnection mid-submission
  - [ ] Session expired during action
  - [ ] Concurrent booking of same slot

### Browser Compatibility

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | Latest | ✅ Tested | |
| Firefox | Latest | ✅ Tested | |
| Safari | 16.4+ | ✅ Tested | iOS Push requires 16.4+ |
| Edge | Latest | ✅ Tested | |

### Mobile Compatibility

| Device | OS | Status | Notes |
|--------|---|--------|-------|
| iPhone | iOS 16.4+ | ✅ Tested | Push notifications require Web Push enabled |
| Android | 10+ | ✅ Tested | Chrome recommended |
| iPad | iPadOS 16.4+ | ✅ Tested | |

### Testing Report Template

```markdown
## Test Report - [Date]

**Tester**: [Your Name]
**Environment**: [Dev/Staging/Production]
**Browsers Tested**: [Chrome 120, Firefox 121, etc.]
**Devices Tested**: [Desktop, iPhone 14, etc.]

### Summary
- Tests Passed: X/Y
- Critical Issues: X
- Minor Issues: X

### Critical Issues Found
1. [Description]
   - **Steps to Reproduce**: 
   - **Expected**: 
   - **Actual**: 
   - **Severity**: Critical/High/Medium/Low

### Minor Issues Found
1. [Description]

### Recommendations
- [Suggestions for improvement]

### Screenshots
- [Attach relevant screenshots]
```

## Resources

### Documentation

- **[Vitest Documentation](https://vitest.dev/)** - Test framework documentation
- **[React Testing Library](https://testing-library.com/react)** - Component testing best practices
- **[Testing Library Queries](https://testing-library.com/docs/queries/about)** - Query priority guide
- **[Kent C. Dodds Blog](https://kentcdodds.com/blog)** - Testing best practices and patterns
- **[Firebase Testing](https://firebase.google.com/docs/emulator-suite)** - Firebase Emulator Suite docs

### Project-Specific Docs

- **[NETWORK_TESTING_ANALYSIS.md](./NETWORK_TESTING_ANALYSIS.md)** - Network resilience testing deep dive (47 withRetry tests)
- **[FIREBASE_QUICK_REFERENCE.md](./guidelines/FIREBASE_QUICK_REFERENCE.md)** - Firebase service usage
- **[README.md](./README.md)** - Project overview and features
- **[.github/workflows/test.yml](./.github/workflows/test.yml)** - CI/CD configuration

### Testing Philosophy

This project follows these testing principles:

1. **Test behavior, not implementation** - Focus on user-visible outcomes
2. **Write maintainable tests** - Use accessible queries, avoid brittle selectors
3. **Mock external dependencies** - Firebase, network calls, timers
4. **Test edge cases** - Null values, empty arrays, network failures
5. **Keep tests fast** - Use fake timers, parallel execution
6. **Fail fast, fail clearly** - Descriptive test names and error messages

### Key Testing Patterns Used

- **Arrange-Act-Assert** - Clear test structure
- **User-centric testing** - Test from user's perspective
- **Integration over unit** - Test component + service interactions
- **Comprehensive edge cases** - Null, undefined, empty, large values
- **Performance benchmarks** - Utility functions tested for speed
- **Real-time simulation** - Mock Firestore listeners

## Contributing

When adding new features or fixing bugs, follow these testing guidelines:

### 1. Test-Driven Development (Recommended)

```typescript
// 1. Write failing test first
it('should validate email format', () => {
  expect(isValidEmail('invalid')).toBe(false)
})

// 2. Implement feature to make test pass
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// 3. Refactor and add edge cases
it('should handle empty email', () => {
  expect(isValidEmail('')).toBe(false)
})
```

### 2. Component Testing Checklist

When adding/modifying components:

- [ ] Test happy path (successful user flow)
- [ ] Test validation errors
- [ ] Test loading states
- [ ] Test error states
- [ ] Test edge cases (empty data, null props)
- [ ] Test user interactions (clicks, typing, form submission)
- [ ] Test accessibility (keyboard navigation, ARIA labels)
- [ ] Test responsive behavior (if relevant)

### 3. Service Testing Checklist

When adding/modifying services:

- [ ] Test successful operation
- [ ] Test error handling
- [ ] Test network failures (with retry logic)
- [ ] Test parameter validation
- [ ] Test return value types
- [ ] Test integration with Firebase
- [ ] Test real-time subscriptions
- [ ] Test cleanup on unmount

### 4. Before Submitting PR

```bash
# 1. Run all tests
npm test -- --run

# 2. Check coverage
npm run test:coverage

# 3. Run TypeScript compiler
npx tsc --noEmit

# 4. Fix any issues
npm test -- --run

# 5. Commit and push
git add .
git commit -m "feat: add feature with tests"
git push
```

### 5. PR Testing Requirements

For a PR to be approved:

- ✅ All existing tests must pass
- ✅ New features must have tests
- ✅ Bug fixes must have regression tests
- ✅ Coverage must not decrease
- ✅ CI/CD checks must pass
- ✅ No TypeScript errors

### 6. Writing Good Test Names

❌ **Bad**: `it('works', () => { ... })`  
✅ **Good**: `it('should validate email format and show error for invalid emails', () => { ... })`

❌ **Bad**: `it('test 1', () => { ... })`  
✅ **Good**: `it('should prevent booking past dates and show validation error', () => { ... })`

### 7. Test Organization

```typescript
describe('ComponentName', () => {
  describe('Feature 1', () => {
    it('should do X when Y')
    it('should do A when B')
  })
  
  describe('Feature 2', () => {
    it('should handle edge case Z')
  })
  
  describe('Error Handling', () => {
    it('should show error when network fails')
  })
})
```

### 8. Updating This Guide

When you add significant testing patterns or discover important testing insights:

1. Document the pattern in the relevant section
2. Add examples with code snippets
3. Update the coverage statistics
4. Commit with descriptive message: `docs: update testing guide with [pattern]`

---

## Questions or Issues?

If you encounter any issues with the test suite:

1. **Check this guide** - Most common issues are documented
2. **Run with verbose output** - `npm test -- --reporter=verbose`
3. **Check CI logs** - View GitHub Actions for CI failures
4. **Open an issue** - [GitHub Issues](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/issues)
5. **Contact developer** - Available via GitHub

---

**Last Updated**: November 6, 2025  
**Test Suite Version**: 1.0.0  
**Total Tests**: 580 passing  
**Maintained by**: [Deign](https://github.com/Deign86)
