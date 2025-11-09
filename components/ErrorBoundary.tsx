import React, { Component, ReactNode } from 'react';
import { Button } from './ui/button';
import { logClientError } from '../lib/errorLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Best-effort write to client error log collection for debugging
    try {
      const payload = {
        message: error?.message ?? String(error),
        stack: error?.stack ?? null,
        info: errorInfo ?? null,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        userId: null,
      };
      // Fire-and-forget
      logClientError(payload)
        .then((id) => {
          if (id) console.info('Logged client error id=', id);
        })
        .catch((e) => {
          // Handle promise rejection
          console.warn('Failed to send client error log', e);
        });
    } catch (e) {
      // swallow any logging failure
      console.warn('Failed to send client error log', e);
    }
  }

  render() {
    if (this.state.hasError) {
      const supportEmail = process.env.REACT_APP_SUPPORT_EMAIL || process.env.VITE_SUPPORT_EMAIL || 'support@plv.edu';

      const handleReport = async () => {
        try {
          const payload = {
            message: this.state.error?.message ?? 'Unknown client error',
            stack: this.state.error?.stack ?? null,
            info: null,
            url: typeof window !== 'undefined' ? window.location.href : undefined,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            userId: null,
          };
          const id = await logClientError(payload);
          const body = [`Error ID: ${id ?? 'n/a'}`, `URL: ${payload.url}`, `User agent: ${payload.userAgent}`, '', 'Please describe what you were doing when the error happened:'].join('\n');
          const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent('App error report')}&body=${encodeURIComponent(body)}`;
          
          // Open mail client with better cross-platform compatibility
          try {
            window.location.href = mailtoUrl;
          } catch (err) {
            // Fallback for Mac/browsers that block mailto:
            window.open(mailtoUrl, '_blank');
          }
        } catch (e) {
          // Final fallback to basic mailto
          const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent('App error report')}`;
          try {
            window.location.href = mailtoUrl;
          } catch (err) {
            window.open(mailtoUrl, '_blank');
          }
        }
      };

      return this.props.fallback || (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-pink-50 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="h-16 w-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg mx-auto mb-4">
              <div className="text-white text-lg font-bold">!</div>
            </div>
            <h1 className="text-2xl font-bold text-red-800 mb-4">Something went wrong</h1>
            <p className="text-red-600 mb-6">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="destructive" onClick={() => { this.setState({ hasError: false, error: undefined }); window.location.reload(); }} className="px-6 py-3 rounded-lg">Reload app</Button>
              <Button variant="outline" onClick={handleReport} className="px-6 py-3 rounded-lg">Report problem</Button>
            </div>
            <p className="text-sm text-gray-600 mt-4">If the issue persists, contact <button 
              type="button"
              className="underline cursor-pointer"
              onClick={() => {
                try {
                  window.location.href = `mailto:${supportEmail}`;
                } catch (err) {
                  window.open(`mailto:${supportEmail}`, '_blank');
                }
              }}
            >{supportEmail}</button> with the error ID.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}