import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { format } from 'date-fns';
import type { SignupHistory } from '../App';
import { Button } from './ui/button';
import { useAnnouncer } from './Announcer';

interface Props {
  signupHistory: SignupHistory[];
}

const formatDate = (d: string) => new Date(d).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

function getIdFromQuery(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  } catch (e) {
    return null;
  }
}

export default function SignupHistoryPage({ signupHistory }: Props) {
  const id = getIdFromQuery();
  const { announce } = useAnnouncer();

  useEffect(() => {
    if (!id) return;
    const el = document.getElementById(`history-item-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('ring-2', 'ring-indigo-400', 'bg-indigo-50');
      setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-400', 'bg-indigo-50'), 2500);
      // Announce to screen readers that we navigated to a specific history item
      const node = el.querySelector('.font-medium') || el.querySelector('h2') || el;
      const label = node?.textContent?.trim() ?? `Processed signup ${id}`;
      announce?.(`Showing signup history for ${label}`, 'polite');
    }
  }, [id, signupHistory]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Signup History</h2>
        <div>
          <Button variant="ghost" onClick={() => window.history.back()}>Back</Button>
        </div>
      </div>

      <div className="grid gap-4">
        {signupHistory.map((h) => (
          <Card key={h.id} id={`history-item-${h.id}`} className="border-l-4 border-l-gray-300">
            <CardHeader>
              <CardTitle>{h.name} — {h.email}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-600">Department: {h.department}</div>
              <div className="text-sm text-gray-600">Requested: {formatDate(h.requestDate)}</div>
              <div className="text-sm text-gray-600">Processed: {formatDate(h.resolvedAt)}</div>
              <div className="text-sm text-gray-600">Status: {h.status}</div>
              {h.adminFeedback && <div className="mt-2 text-sm text-gray-700 italic">{h.adminFeedback}</div>}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
