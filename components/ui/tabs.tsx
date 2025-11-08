"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "./utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const localRef = React.useRef<HTMLElement | null>(null);
  const shouldAutoRef = React.useRef<boolean>(false);

  // expose the underlying node to parent refs
  React.useImperativeHandle(ref, () => localRef.current as any, []);

  // helper to set both localRef and forwarded ref
  const setRef = React.useCallback((node: HTMLElement | null) => {
    localRef.current = node;
    if (!ref) return;
    if (typeof ref === 'function') {
      try { (ref as any)(node); } catch {}
    } else {
      try { (ref as React.MutableRefObject<any>).current = node as any; } catch {}
    }
  }, [ref]);

  // Auto-scroll active tab into view when data-state changes (Radix sets data-state="active")
  React.useEffect(() => {
    const el = localRef.current;
    if (!el) return;

    // Use IntersectionObserver-based approach to avoid forced reflows
    const recomputeShouldAuto = () => {
      try {
        // Check class first (no layout cost)
        if (el.classList.contains('mobile-tab-scroll')) {
          shouldAutoRef.current = true;
          return;
        }
        // Defer geometry check - assume true initially to prevent layout thrashing
        shouldAutoRef.current = true;
        
        // Use ResizeObserver to update the flag asynchronously (avoids forced reflow)
        if (typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(() => {
            try {
              shouldAutoRef.current = el.scrollWidth > el.clientWidth;
            } catch (e) {
              shouldAutoRef.current = false;
            }
          });
          observer.observe(el);
          return () => observer.disconnect();
        }
      } catch (e) {
        shouldAutoRef.current = false;
      }
      return undefined;
    };

    const scrollNodeIntoView = (node: Element) => {
      try {
        if (!shouldAutoRef.current) return;
        (node as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } catch (e) {
        // ignore
      }
    };

    // Also scroll into view when a child receives focus (keyboard navigation)
    const onFocusIn = (ev: FocusEvent) => {
      try {
        const target = ev.target as Element | null;
        if (!target || !shouldAutoRef.current) return;
        // If the focused element is a tab trigger (role="tab") or a Radix Trigger (data-state attr), scroll it
        if (target.getAttribute && (target.getAttribute('role') === 'tab' || target.getAttribute('data-state') !== null)) {
          scrollNodeIntoView(target);
          return;
        }
        // Otherwise, walk up to nearest tab trigger
        let p: Element | null = target;
        while (p && p !== el) {
          if (p.getAttribute && (p.getAttribute('role') === 'tab' || p.getAttribute('data-state') !== null)) {
            scrollNodeIntoView(p);
            return;
          }
          p = p.parentElement;
        }
      } catch (e) {
        // ignore
      }
    };

    // initial compute and scroll to active
    const cleanupRecompute = recomputeShouldAuto();
    const initialActive = el.querySelector('[data-state="active"]');
    if (initialActive) scrollNodeIntoView(initialActive);

    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'data-state') {
          const target = m.target as Element;
          if ((target as HTMLElement).getAttribute('data-state') === 'active') {
            scrollNodeIntoView(target);
            return;
          }
        }
        if (m.type === 'childList' && m.addedNodes.length) {
          const act = el.querySelector('[data-state="active"]');
          if (act) { scrollNodeIntoView(act); return; }
        }
      }
    });

  mo.observe(el, { attributes: true, attributeFilter: ['data-state'], subtree: true, childList: true });
  // listen for focusin events to handle keyboard navigation (focus) so the focused tab slides into view
  el.addEventListener('focusin', onFocusIn as EventListener, true);

    // Removed redundant ResizeObserver - now handled in recomputeShouldAuto

    return () => {
      mo.disconnect();
      if (cleanupRecompute) cleanupRecompute();
      try { el.removeEventListener('focusin', onFocusIn as EventListener, true); } catch (e) {}
    };
  }, []);

  return (
    <TabsPrimitive.List
      ref={(node) => setRef(node as HTMLElement | null)}
      className={cn(
        "inline-flex h-12 items-center justify-center rounded-xl bg-gray-100 p-1 text-gray-600",
        className
      )}
      {...props}
    />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm hover:text-gray-900",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
