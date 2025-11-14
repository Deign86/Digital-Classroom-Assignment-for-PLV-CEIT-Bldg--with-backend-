import React, { ReactNode } from 'react';
import { cn } from './utils';

/**
 * ScrollableBulkList Component
 * 
 * A reusable component for displaying lists of items in bulk operation modals.
 * Shows the first 5 items in full detail, with remaining items in a scrollable
 * container. This prevents modals from becoming too tall and covering the viewport.
 * 
 * Features:
 * - First 5 items always visible
 * - Items 6+ in scrollable container with max-height
 * - Maintains keyboard accessibility
 * - Responsive design
 * - Smooth scroll behavior
 * - ARIA labels for accessibility
 */

export interface ScrollableBulkListProps<T = any> {
  /** Array of items to display */
  items: T[];
  /** Render function for each item */
  renderItem: (item: T, index: number) => ReactNode;
  /** Number of items to show before scrolling (default: 5) */
  visibleCount?: number;
  /** Optional custom className for the container */
  className?: string;
  /** Optional custom className for visible items container */
  visibleClassName?: string;
  /** Optional custom className for scrollable items container */
  scrollableClassName?: string;
  /** Optional empty state message */
  emptyMessage?: string;
  /** Optional max height for scrollable area (default: "16rem" / 256px) */
  maxScrollHeight?: string;
  /** Optional aria-label for the list */
  ariaLabel?: string;
}

export default function ScrollableBulkList<T = any>({
  items,
  renderItem,
  visibleCount = 5,
  className,
  visibleClassName,
  scrollableClassName,
  emptyMessage = 'No items to display',
  maxScrollHeight = '16rem',
  ariaLabel = 'Bulk operation items list',
}: ScrollableBulkListProps<T>) {
  // Split items into visible and scrollable
  const visibleItems = items.slice(0, visibleCount);
  const scrollableItems = items.slice(visibleCount);
  const hasScrollableItems = scrollableItems.length > 0;

  // Empty state
  if (items.length === 0) {
    return (
      <div className={cn('text-center py-8 text-sm text-muted-foreground', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)} role="list" aria-label={ariaLabel}>
      {/* Always visible items (first 5 or less) */}
      <div className={cn('space-y-2', visibleClassName)}>
        {visibleItems.map((item, index) => (
          <div key={index} role="listitem">
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {/* Scrollable items (6+) */}
      {hasScrollableItems && (
        <div className="space-y-2">
          {/* Divider with item count */}
          <div className="flex items-center gap-3 py-2">
            <div className="flex-1 border-t border-gray-300" />
            <span className="text-xs font-medium text-gray-500 px-2">
              {scrollableItems.length} more item{scrollableItems.length !== 1 ? 's' : ''}
            </span>
            <div className="flex-1 border-t border-gray-300" />
          </div>

          {/* Scrollable container */}
          <div
            className={cn(
              'space-y-2 overflow-y-auto rounded-md border border-gray-200 bg-gray-50/50 p-2',
              'scroll-smooth scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100',
              scrollableClassName
            )}
            style={{ maxHeight: maxScrollHeight }}
            role="list"
            aria-label={`Additional ${scrollableItems.length} items`}
            tabIndex={0}
          >
            {scrollableItems.map((item, index) => (
              <div key={index + visibleCount} role="listitem">
                {renderItem(item, index + visibleCount)}
              </div>
            ))}
          </div>

          {/* Scroll hint for users */}
          <p className="text-xs text-center text-muted-foreground italic">
            ↕ Scroll to see all items
          </p>
        </div>
      )}

      {/* Total count */}
      <div className="flex items-center gap-3 py-2">
        <div className="flex-1 border-t border-gray-300" />
        <p className="text-sm font-medium text-gray-700 px-2">
          Total: {items.length} item{items.length !== 1 ? 's' : ''}
        </p>
        <div className="flex-1 border-t border-gray-300" />
      </div>
    </div>
  );
}

/**
 * ScrollableBulkSummary Component
 * 
 * A compact summary component for showing counts in bulk operation modals
 * when you don't need to show individual item details.
 */

export interface ScrollableBulkSummaryProps {
  /** Total number of items */
  count: number;
  /** Singular noun for item (e.g., "reservation", "classroom", "user") */
  itemName: string;
  /** Plural noun for item (defaults to itemName + "s") */
  itemNamePlural?: string;
  /** Optional icon to show */
  icon?: ReactNode;
  /** Optional variant for styling */
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  /** Optional additional message */
  message?: string;
  /** Optional className */
  className?: string;
}

export function ScrollableBulkSummary({
  count,
  itemName,
  itemNamePlural,
  icon,
  variant = 'default',
  message,
  className,
}: ScrollableBulkSummaryProps) {
  const plural = itemNamePlural || `${itemName}s`;
  const displayName = count === 1 ? itemName : plural;

  const variantStyles = {
    default: 'bg-gray-50 border-gray-200 text-gray-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    destructive: 'bg-red-50 border-red-200 text-red-900',
  };

  return (
    <div
      className={cn(
        'border rounded-lg p-4 flex items-start gap-3',
        variantStyles[variant],
        className
      )}
      role="status"
      aria-live="polite"
    >
      {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
      <div className="flex-1 space-y-1">
        <p className="font-medium">
          {count} {displayName}
        </p>
        {message && <p className="text-sm opacity-90">{message}</p>}
      </div>
    </div>
  );
}
