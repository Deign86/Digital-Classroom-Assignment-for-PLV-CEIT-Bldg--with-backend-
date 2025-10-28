import React from 'react'

export default function Spinner({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex items-center justify-center ${className}`}>
      <svg className="animate-spin text-gray-600" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
        <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className="sr-only">Loading</span>
    </div>
  )
}
