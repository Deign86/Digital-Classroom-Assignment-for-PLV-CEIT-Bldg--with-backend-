# Bulk Operation Loader - Universal Component Documentation

## Overview

The `BulkOperationLoader` is a universal, reusable React component for displaying progress and results of bulk operations across the entire Digital Classroom Assignment system. It replaces the previous `BulkProgressDialog` component with enhanced features, accessibility improvements, and extensive customization options.

## Features

### Core Functionality
- **Real-time progress tracking** with visual progress bar and percentage display
- **Per-item status display** showing pending, processing, success, failed, and cancelled states
- **Configurable operation metadata** including titles, descriptions, and status messages
- **Retry failed items** functionality for automatic re-execution of failed operations
- **Cancellable operations** with immediate user feedback

### Accessibility (WCAG Compliant)
- **ARIA labels** on all interactive elements and status indicators
- **Focus trap** prevents navigation outside modal during critical operations
- **Screen reader announcements** for progress updates and status changes
- **Keyboard navigation** with Escape key support (when not locked)
- **Live regions** for dynamic content updates announced to assistive technologies

### Mobile & Responsive Design
- **Scrollable results list** with max-height constraint for long operations
- **Flexible footer layout** adapts from column (mobile) to row (desktop)
- **Touch-friendly buttons** with adequate spacing and sizing
- **Responsive progress bar** with clear visual feedback

### Customization Options
- **Custom titles and descriptions** for operation-specific messaging
- **Operation type labels** (e.g., "Deleting", "Approving", "Processing")
- **Success/failure message templates** with dynamic count placeholders
- **Custom status labels** for each state (pending, processing, fulfilled, rejected, cancelled)
- **Custom icons** for different states (optional)
- **Error detail display** toggle for debugging

## Usage Examples

### Basic Usage (Reservation Approvals)

```tsx
import BulkOperationLoader from './components/BulkOperationLoader';
import useBulkRunner from './hooks/useBulkRunner';

function ReservationApprovals() {
  const bulkRunner = useBulkRunner();
  const [showBulkProgress, setShowBulkProgress] = useState(false);
  const [items, setItems] = useState([]);

  // ... bulk operation logic

  return (
    <BulkOperationLoader
      open={showBulkProgress}
      onOpenChange={setShowBulkProgress}
      items={items}
      processed={bulkRunner.processed}
      total={bulkRunner.total}
      results={bulkRunner.results}
      running={bulkRunner.running}
      title="Bulk Reservation Processing"
      operationType="Processing"
      successMessage="{count} reservation(s) processed successfully"
      failureMessage="{count} reservation(s) failed to process"
      showErrorDetails={true}
      preventCloseWhileRunning={true}
      onCancel={() => bulkRunner.cancel()}
      onRetry={async () => {
        // Retry logic
      }}
    />
  );
}
```

### Classroom Management (Delete Operations)

```tsx
<BulkOperationLoader
  open={showBulkProgress}
  onOpenChange={setShowBulkProgress}
  items={classroomsToDelete}
  processed={bulkRunner.processed}
  total={bulkRunner.total}
  results={bulkRunner.results}
  running={bulkRunner.running}
  title="Bulk Classroom Deletion"
  operationType="Deleting"
  successMessage="{count} classroom(s) deleted successfully"
  failureMessage="{count} classroom(s) failed to delete"
  showErrorDetails={true}
  preventCloseWhileRunning={true}
  onCancel={() => {
    bulkRunner.cancel();
    toast('Bulk delete cancelled.');
    setShowBulkProgress(false);
  }}
/>
```

### User Management (Lock/Unlock Operations)

```tsx
<BulkOperationLoader
  open={showBulkProgress}
  onOpenChange={setShowBulkProgress}
  items={usersToLock}
  processed={bulkRunner.processed}
  total={bulkRunner.total}
  results={bulkRunner.results}
  running={bulkRunner.running}
  title="Bulk User Account Lock"
  operationType="Locking"
  successMessage="{count} user account(s) locked successfully"
  failureMessage="{count} user account(s) failed to lock"
  preventCloseWhileRunning={true}
  onCancel={() => bulkRunner.cancel()}
/>
```

### Faculty Schedule (Booking Cancellations)

```tsx
<BulkOperationLoader
  open={showBulkProgress}
  onOpenChange={setShowBulkProgress}
  items={bookingsToCancel}
  processed={bulkRunner.processed}
  total={bulkRunner.total}
  results={bulkRunner.results}
  running={bulkRunner.running}
  title="Bulk Booking Cancellation"
  operationType="Cancelling"
  successMessage="{count} booking(s) cancelled successfully"
  failureMessage="{count} booking(s) failed to cancel"
  showErrorDetails={true}
  preventCloseWhileRunning={true}
  onCancel={() => bulkRunner.cancel()}
/>
```

## Props Interface

### Required Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controls dialog visibility |
| `onOpenChange` | `(open: boolean) => void` | Callback when dialog open state changes |
| `items` | `BulkOperationItem[]` | Items being processed |
| `processed` | `number` | Number of items processed so far |
| `total` | `number` | Total number of items |
| `results` | `BulkOperationResult[]` | Results for each item (aligned with items array by index) |
| `running` | `boolean` | Whether operation is currently running |

### Optional Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onCancel` | `() => void` | `undefined` | Callback to cancel ongoing operation |
| `onRetry` | `() => void` | `undefined` | Callback to retry failed items |
| `onComplete` | `(results) => void` | `undefined` | Callback when operation completes |
| `title` | `string` | `"Bulk Operation Progress"` | Custom title |
| `description` | `string` | Auto-generated | Custom description |
| `operationType` | `string` | `"Processing"` | Operation type label (e.g., "Deleting", "Approving") |
| `successMessage` | `string` | `undefined` | Success message template (use `{count}` for count) |
| `failureMessage` | `string` | `undefined` | Failure message template (use `{count}` for count) |
| `showErrorDetails` | `boolean` | `false` | Show detailed error messages in results list |
| `preventCloseWhileRunning` | `boolean` | `false` | Disable closing modal while operation is running |
| `statusLabels` | `object` | Default labels | Custom status labels for different states |
| `customIcons` | `object` | Default icons | Custom icons for different states |

## Type Definitions

```typescript
export type BulkItemStatus = 'pending' | 'processing' | 'fulfilled' | 'rejected' | 'cancelled';

export interface BulkOperationItem {
  id: string;
  label?: string;
  metadata?: Record<string, any>;
}

export interface BulkOperationResult {
  status: BulkItemStatus;
  value?: any;
  reason?: any;
}
```

## Integration with `useBulkRunner` Hook

The `BulkOperationLoader` is designed to work seamlessly with the `useBulkRunner` hook, which provides the core bulk operation orchestration:

```typescript
const bulkRunner = useBulkRunner();

// Start operation
const tasks = items.map(item => async () => processItem(item));
await bulkRunner.start(tasks, 4); // 4 = concurrency

// Cancel operation
bulkRunner.cancel();

// Retry failed items
bulkRunner.retry();
const failedTasks = getFailedTasks(); // Extract failed tasks
await bulkRunner.start(failedTasks, 4);
```

## Edge Cases & Behaviors

### Failure Modes

1. **Partial Success**: Some items succeed, others fail
   - Loader displays individual status for each item
   - Summary shows succeeded/failed counts
   - Retry button appears for failed items (if `onRetry` provided)

2. **Complete Failure**: All items fail
   - Failure message displayed prominently
   - Error details shown if `showErrorDetails={true}`
   - Retry button available

3. **Network Errors**: Operation interrupted by network issues
   - Items marked as "rejected" with error reason
   - User can retry failed items
   - Toast notifications provide additional context

### Slow API Handling

- Progress bar updates in real-time as each item completes
- Users can cancel long-running operations via Cancel button
- Processing state prevents accidental modal dismissal
- Live region updates keep screen reader users informed

### Cancel/Dismiss Behaviors

1. **Cancel Button (During Operation)**:
   - Immediately signals `useBulkRunner` to stop
   - Remaining items marked as "cancelled"
   - Completed items retain their status (fulfilled/rejected)
   - Modal can be closed after cancellation

2. **Close/Done Button**:
   - Available only when operation completes or is cancelled
   - Disabled during active operations if `preventCloseWhileRunning={true}`
   - Triggers `onOpenChange(false)` callback

3. **Escape Key**:
   - Works when operation is not running
   - Disabled during operations if `preventCloseWhileRunning={true}`
   - Accessibility-friendly exit method

### Empty States

- **No items**: Displays "No items to process" message
- **Zero progress**: Progress bar shows 0% with clear indication

## Component Locations

- **Component**: `components/BulkOperationLoader.tsx` (new universal component)
- **Hook**: `hooks/useBulkRunner.ts` (bulk operation orchestration)
- **Legacy**: `components/BulkProgressDialog.tsx` (deprecated, can be removed after migration)

## Migrated Components

The following components have been migrated from `BulkProgressDialog` to `BulkOperationLoader`:

1. ✅ **RequestApproval.tsx** - Reservation approval bulk operations
2. ✅ **SignupApproval.tsx** - Signup approval bulk operations
3. ✅ **ClassroomManagement.tsx** - Classroom bulk delete operations
4. ✅ **FacultySchedule.tsx** - Booking cancellation bulk operations

## Future Enhancements

Potential areas for expansion:

- **Push Notification Bulk Sends**: Add loader for bulk push notification operations
- **Schedule Bulk Updates**: Integrate with schedule modification flows
- **User Role Bulk Changes**: Support bulk role promotion/demotion operations
- **Export/Import Operations**: Show progress for large data import/export tasks
- **Custom Progress Indicators**: Allow operation-specific progress visualizations

## Testing Checklist

### Desktop Testing
- [ ] Progress bar updates smoothly during operations
- [ ] Individual item statuses display correctly
- [ ] Success/failure summary is accurate
- [ ] Cancel button stops operations immediately
- [ ] Retry button re-processes failed items only
- [ ] Modal cannot be closed during locked operations
- [ ] Keyboard navigation works (Tab, Escape, Enter)

### Mobile Testing
- [ ] Modal is scrollable on small screens
- [ ] Touch interactions work smoothly
- [ ] Footer buttons are accessible and properly sized
- [ ] Progress bar is visible and clear
- [ ] Results list scrolls properly with touch

### Accessibility Testing
- [ ] Screen reader announces progress updates
- [ ] All buttons have proper ARIA labels
- [ ] Focus trap keeps focus within modal
- [ ] Live regions update appropriately
- [ ] Status icons have aria-hidden="true"
- [ ] Color is not the only indicator of status

## Known Limitations

- **Maximum Items**: Performance may degrade with >1000 items (consider pagination)
- **Error Messages**: Long error messages are truncated (hover for full text)
- **Concurrency**: Managed by `useBulkRunner` (default 4 concurrent operations)
- **State Persistence**: Loader state is not persisted across page reloads

## Support

For questions or issues with the `BulkOperationLoader` component, please refer to:
- Component source: `components/BulkOperationLoader.tsx`
- Hook documentation: `hooks/useBulkRunner.ts`
- Copilot instructions: `.github/copilot-instructions.md`
