import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

type ItemStatus = 'pending' | 'processing' | 'fulfilled' | 'rejected' | 'cancelled';

export default function BulkProgressDialog<T extends { id: string; label?: string }>(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: T[];
  processed: number;
  total: number;
  results: Array<{ status: ItemStatus; reason?: any; value?: any }>;
  running: boolean;
  onCancel?: () => void;
  onRetry?: () => void;
}) {
  const { open, onOpenChange, items, processed, total, results, running, onCancel, onRetry } = props;

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-3 sm:p-6 w-[calc(100vw-32px)] sm:w-auto">
        <DialogHeader>
          <DialogTitle>Bulk Operation Progress</DialogTitle>
          <DialogDescription>
            Processing {processed}/{total} item(s). {running ? 'This may take a few moments.' : 'Operation complete.'}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
            <div className="h-2 bg-blue-600" style={{ width: `${total === 0 ? 0 : Math.round((processed / total) * 100)}%` }} />
          </div>
        </div>

        <div className="space-y-2 max-h-64 overflow-auto">
          {items.map((it, idx) => {
            const res = results[idx];
            const status = res?.status ?? 'pending';
            return (
              <div key={it.id} className="flex items-center justify-between py-2 px-3 border-b last:border-b-0">
                <div className="truncate text-sm">{it.label ?? it.id}</div>
                <div className="ml-4 flex items-center gap-2">
                  {status === 'processing' && <Badge className="text-sm">Processing</Badge>}
                  {status === 'fulfilled' && <Badge variant="secondary" className="text-sm">Success</Badge>}
                  {status === 'rejected' && <Badge variant="destructive" className="text-sm">Failed</Badge>}
                  {status === 'cancelled' && <Badge className="text-sm">Cancelled</Badge>}
                  {status === 'pending' && <Badge className="text-sm">Pending</Badge>}
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-4 flex justify-between items-center gap-4">
          <div className="text-sm text-gray-600">{succeeded} succeeded • {failed} failed</div>
          <div className="flex items-center gap-2">
            {onRetry && !running && failed > 0 && (
              <Button variant="ghost" onClick={onRetry}>Retry Failed</Button>
            )}
            {onCancel && running && (
              <Button variant="destructive" onClick={onCancel}>Cancel</Button>
            )}
            <Button onClick={() => onOpenChange(false)}>{running ? 'Close' : 'Done'}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
