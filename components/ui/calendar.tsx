import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

type CalendarProps = {
  value?: string; // YYYY-MM-DD (internal storage)
  onSelect?: (isoDate?: string) => void; // emits YYYY-MM-DD
  min?: string; // YYYY-MM-DD
  className?: string;
};

function parseISOToLocal(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const parts = iso.split('-');
  if (parts.length !== 3) return undefined;
  const y = Number(parts[0]);
  const m = Number(parts[1]) - 1;
  const d = Number(parts[2]);
  return new Date(y, m, d);
}

function formatLocalDateToISO(date?: Date): string | undefined {
  if (!date) return undefined;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function Calendar({ value, onSelect, min, className }: CalendarProps) {
  const selected = parseISOToLocal(value);
  const fromDate = parseISOToLocal(min);

  const wrapper = ['app-calendar', className].filter(Boolean).join(' ');

  return (
    <div className={wrapper}>
      <DayPicker
        mode="single"
        selected={selected}
        onSelect={(date) => {
          if (!onSelect) return;
          onSelect(date ? formatLocalDateToISO(date) : undefined);
        }}
        disabled={fromDate ? { before: fromDate } : undefined}
      />
    </div>
  );
}

export default Calendar;
