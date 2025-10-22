"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps, toast as sonnerToast } from "sonner";
import { useEffect } from 'react';
import { useAnnouncer } from '../Announcer';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const { announce } = useAnnouncer();

  useEffect(() => {
    if (!announce || !sonnerToast) return;

  const originalSuccess = sonnerToast.success?.bind(sonnerToast) ?? null;
  const originalError = sonnerToast.error?.bind(sonnerToast) ?? null;
  const originalMessage = (sonnerToast as any).message?.bind(sonnerToast) ?? null;
  const originalInfo = (sonnerToast as any).info?.bind(sonnerToast) ?? null;
  const originalWarn = (sonnerToast as any).warning?.bind(sonnerToast) ?? null;
  const originalLoading = (sonnerToast as any).loading?.bind(sonnerToast) ?? null;

    if (originalSuccess) {
      sonnerToast.success = ((title: any, opts?: any) => {
      try {
        // Prefer explicit title + description when provided in opts
        let message = '';
        if (typeof title === 'string') {
          message = title;
          if (opts && typeof opts.description === 'string') message = `${message}. ${opts.description}`;
        } else if (title && typeof title === 'object') {
          message = (title?.title ?? title?.message ?? '') as string;
          if (title?.description) message = `${message}. ${title.description}`;
        } else {
          message = 'Success';
        }
        announce(String(message), 'polite');
      } catch (e) {}
      return originalSuccess(title, opts);
    }) as typeof sonnerToast.success;
    }

    if (originalError) {
      sonnerToast.error = ((title: any, opts?: any) => {
      try {
        let message = '';
        if (typeof title === 'string') {
          message = title;
          if (opts && typeof opts.description === 'string') message = `${message}. ${opts.description}`;
        } else if (title && typeof title === 'object') {
          message = (title?.title ?? title?.message ?? '') as string;
          if (title?.description) message = `${message}. ${title.description}`;
        } else {
          message = 'Error';
        }
        announce(String(message), 'assertive');
      } catch (e) {}
      return originalError(title, opts);
    }) as typeof sonnerToast.error;
    }

    if (originalWarn) {
      (sonnerToast as any).warning = ((title: any, opts?: any) => {
        try {
          let message = '';
          if (typeof title === 'string') {
            message = title;
            if (opts && typeof opts.description === 'string') message = `${message}. ${opts.description}`;
          } else if (title && typeof title === 'object') {
            message = (title?.title ?? title?.message ?? '') as string;
            if (title?.description) message = `${message}. ${title.description}`;
          } else {
            message = 'Warning';
          }
          announce(String(message), 'polite');
        } catch (e) {}
        return originalWarn(title, opts);
      });
    }

    // message / info / loading wrappers
    if (originalMessage) {
      (sonnerToast as any).message = ((title: any, opts?: any) => {
        try {
          const message = typeof title === 'string'
            ? (opts && typeof opts.description === 'string' ? `${title}. ${opts.description}` : title)
            : (title && typeof title === 'object' ? `${title?.title ?? title?.message ?? ''}${title?.description ? `. ${title.description}` : ''}` : String(title ?? ''));
          announce(String(message), 'polite');
        } catch (e) {}
        return originalMessage(title, opts);
      });
    }

    if (originalInfo) {
      (sonnerToast as any).info = ((title: any, opts?: any) => {
        try {
          const message = typeof title === 'string'
            ? (opts && typeof opts.description === 'string' ? `${title}. ${opts.description}` : title)
            : (title && typeof title === 'object' ? `${title?.title ?? title?.message ?? ''}${title?.description ? `. ${title.description}` : ''}` : String(title ?? ''));
          announce(String(message), 'polite');
        } catch (e) {}
        return originalInfo(title, opts);
      });
    }

    if (originalLoading) {
      (sonnerToast as any).loading = ((title: any, opts?: any) => {
        try {
          const message = typeof title === 'string' ? title : (title?.toString?.() ?? 'Loading');
          announce(String(message), 'polite');
        } catch (e) {}
        return originalLoading(title, opts);
      });
    }

    // Wrap promise to announce resolved/rejected messages when provided
    const originalPromise = (sonnerToast as any).promise?.bind(sonnerToast);
    if (originalPromise) {
      (sonnerToast as any).promise = (p: Promise<any>, msgs: any, opts?: any) => {
        try {
          // Attach handlers to the original promise to announce on resolution/rejection
          p.then((value) => {
            try {
              let successMsg = typeof msgs?.success === 'function' ? msgs.success(value) : msgs?.success;
              // If the resolved message is an object with title/description, combine them
              if (successMsg && typeof successMsg === 'object') {
                const t = successMsg?.title ?? successMsg?.message ?? '';
                const d = successMsg?.description ?? '';
                successMsg = d ? `${t}. ${d}` : t;
              }
              if (successMsg) announce(String(successMsg), 'polite');
            } catch (e) {}
          }).catch((err) => {
            try {
              let errMsg = typeof msgs?.error === 'function' ? msgs.error(err) : msgs?.error;
              if (errMsg && typeof errMsg === 'object') {
                const t = errMsg?.title ?? errMsg?.message ?? '';
                const d = errMsg?.description ?? '';
                errMsg = d ? `${t}. ${d}` : t;
              }
              if (errMsg) announce(String(errMsg), 'assertive');
            } catch (e) {}
          });
        } catch (e) {}

        return originalPromise(p, msgs, opts);
      };
    }

    // Cleanup: restore originals on unmount
    return () => {
      try {
        if (originalSuccess) sonnerToast.success = originalSuccess;
        if (originalError) sonnerToast.error = originalError;
        if (originalWarn) (sonnerToast as any).warning = originalWarn;
        if (originalMessage) (sonnerToast as any).message = originalMessage;
        if (originalInfo) (sonnerToast as any).info = originalInfo;
        if (originalLoading) (sonnerToast as any).loading = originalLoading;
      } catch (_) {}
    };
  }, [announce]);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: 'group toast group-[.toaster]:bg-white group-[.toaster]:text-gray-900 group-[.toaster]:border-gray-300 group-[.toaster]:shadow-lg',
          title: 'group-[.toast]:text-gray-900 group-[.toast]:font-semibold',
          description: '!group-[.toast]:text-gray-900',
          actionButton: 'group-[.toast]:bg-blue-600 group-[.toast]:text-white group-[.toast]:hover:bg-blue-700',
          cancelButton: 'group-[.toast]:bg-gray-200 group-[.toast]:text-gray-800 group-[.toast]:hover:bg-gray-300',
          error: 'group-[.toaster]:bg-red-50 group-[.toaster]:text-red-900 group-[.toaster]:border-red-300',
          success: 'group-[.toaster]:bg-green-50 group-[.toaster]:text-green-900 group-[.toaster]:border-green-300',
          warning: 'group-[.toaster]:bg-amber-50 group-[.toaster]:text-amber-900 group-[.toaster]:border-amber-300',
          info: 'group-[.toaster]:bg-blue-50 group-[.toaster]:text-blue-900 group-[.toaster]:border-blue-300',
        },
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
