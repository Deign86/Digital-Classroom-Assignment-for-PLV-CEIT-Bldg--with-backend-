# Testing Guide

## Overview

This project uses **Vitest** as the test runner with **React Testing Library** for component testing. The test suite includes comprehensive coverage of services, hooks, components, and integration flows.

## Test Structure

```
src/__tests__/
├── __mocks__/
│   └── firebase.ts          # Shared Firebase mock helpers
├── mocks/
│   ├── factories.ts         # Test data factories
│   ├── fixtures.ts          # Test fixtures
│   └── handlers.ts          # MSW handlers
├── services/                # Service unit tests (40+ tests)
│   ├── bookingRequestService.test.ts
│   ├── userService.test.ts
│   ├── scheduleService.test.ts
│   ├── classroomService.test.ts
│   ├── customClaimsService.test.ts
│   ├── notificationService.test.ts
│   └── withRetry.test.ts
├── hooks/                   # Hook unit tests (20+ tests)
│   ├── useIdleTimeout.test.ts
│   ├── useAuth.test.ts
│   ├── useBulkRunner.test.ts
│   └── useNotificationContext.test.tsx
├── components/             # Component unit tests (60+ tests)
│   ├── NotificationCenter.test.tsx
│   ├── NotificationBell.test.tsx
│   ├── RequestCard.test.tsx
│   ├── ScheduleViewer.test.tsx
│   ├── ClassroomManagement.test.tsx
│   ├── AdminDashboard.test.tsx
│   └── FacultyDashboard.test.tsx
└── integration/            # Integration tests (12+ tests)
    ├── notification-flow.integration.test.tsx
    ├── auth-flow.integration.test.tsx
    ├── booking-flow.integration.test.tsx
    ├── classroom-flow.integration.test.tsx
    └── accessibility.integration.test.tsx
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests once (CI mode)
```bash
npm test -- --run
```

### Run tests with coverage
```bash
npm test -- --coverage
# or
npm run test:coverage
```

### Run specific test file
```bash
npm test -- src/__tests__/services/bookingRequestService.test.ts
```

### Run tests matching a pattern
```bash
npm test -- --grep "booking"
```

## Coverage Requirements

The project maintains the following coverage thresholds (configured in `vitest.config.ts`):

- **Lines**: 60%
- **Functions**: 60%
- **Statements**: 60%
- **Branches**: 50%

Coverage reports are generated in the `coverage/` directory (excluded from git).

## Test Patterns

### Service Tests

Service tests mock Firebase SDK calls and verify business logic:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { bookingRequestService } from '../../../lib/firebaseService';
import {
  mockGetDocs,
  mockAddDoc,
  createMockBookingRequest,
  resetFirebaseMocks,
} from '../__mocks__/firebase';

describe('bookingRequestService', () => {
  beforeEach(() => {
    resetFirebaseMocks();
    vi.clearAllMocks();
  });

  it('should create booking request', async () => {
    mockAddDoc.mockResolvedValue({ id: 'new-id' } as any);
    const result = await bookingRequestService.create({...});
    expect(result.id).toBe('new-id');
  });
});
```

### Hook Tests

Hook tests use `renderHook` from React Testing Library:

```typescript
import { renderHook, act, waitFor } from '@testing-library/react';
import { useIdleTimeout } from '../../../hooks/useIdleTimeout';

describe('useIdleTimeout', () => {
  it('should initialize with correct timeout', () => {
    const { result } = renderHook(() =>
      useIdleTimeout({ timeout: 5000, onIdle: vi.fn() })
    );
    expect(result.current.timeRemaining).toBe(5000);
  });
});
```

### Component Tests

Component tests use React Testing Library for rendering and user interactions:

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationCenter } from '../../../components/NotificationCenter';

describe('NotificationCenter', () => {
  it('should render notifications', () => {
    render(<NotificationCenter userId="user_1" />);
    expect(screen.getByText('Notification 1')).toBeInTheDocument();
  });

  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    render(<NotificationCenter userId="user_1" />);
    await user.click(screen.getByText('Acknowledge'));
    // Assert expected behavior
  });
});
```

### Integration Tests

Integration tests verify end-to-end flows:

```typescript
describe('Booking Flow Integration', () => {
  it('should complete full booking flow', async () => {
    // Step 1: Faculty creates request
    // Step 2: Admin receives request
    // Step 3: Admin approves
    // Step 4: Notification created
    // Step 5: Status updated
  });
});
```

## Mocking Firebase

All Firebase services are mocked using shared helpers in `src/__tests__/__mocks__/firebase.ts`:

- `mockHttpsCallable` - Cloud Functions
- `mockGetDocs`, `mockGetDoc` - Firestore queries
- `mockAddDoc`, `mockUpdateDoc`, `mockDeleteDoc` - Firestore mutations
- `mockAuth`, `mockAuthUser` - Firebase Auth
- Factory functions: `createMockBookingRequest()`, `createMockUser()`, etc.

## Accessibility Testing

All component tests include accessibility checks:

- ARIA labels and roles
- Keyboard navigation
- Screen reader announcements
- Focus management
- Modal accessibility

See `src/__tests__/integration/accessibility.integration.test.tsx` for comprehensive accessibility tests.

## CI/CD Integration

Tests run automatically on:
- Push to any branch
- Pull requests
- Scheduled runs (if configured)

GitHub Actions workflow: `.github/workflows/test.yml`

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Mock external dependencies (Firebase, APIs, etc.)
3. **Cleanup**: Reset mocks between tests using `beforeEach`/`afterEach`
4. **Descriptive names**: Use clear test descriptions that explain what is being tested
5. **AAA pattern**: Arrange, Act, Assert
6. **Accessibility**: Always test accessibility features
7. **Edge cases**: Test error conditions, empty states, and boundary cases

## Troubleshooting

### Tests failing with Firebase errors
- Ensure Firebase mocks are properly imported and reset
- Check that `vi.mock()` calls are at the top of test files

### Coverage not meeting thresholds
- Run `npm test -- --coverage` to see detailed coverage report
- Add tests for uncovered branches/statements
- Check `vitest.config.ts` for coverage configuration

### Tests timing out
- Check for missing `await` in async operations
- Verify mocks are resolving/rejecting correctly
- Use `waitFor()` for async UI updates

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library User Event](https://testing-library.com/docs/user-event/intro)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)

