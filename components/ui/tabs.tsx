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

    const recomputeShouldAuto = () => {
      try {
        shouldAutoRef.current = el.classList.contains('mobile-tab-scroll') || el.scrollWidth > el.clientWidth;
      } catch (e) {
        shouldAutoRef.current = false;
      }
    };

    const scrollNodeIntoView = (node: Element) => {
      try {
        if (!shouldAutoRef.current) return;
        (node as HTMLElement).scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      } catch (e) {
        // ignore
      }
    };

    // initial compute and scroll to active
    recomputeShouldAuto();
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

    // also watch for resize changes to recompute overflow behavior
    let ro: ResizeObserver | null = null;
    try {
      ro = new ResizeObserver(() => recomputeShouldAuto());
      ro.observe(el);
    } catch (e) {
      // ResizeObserver may not be available in some envs; ignore
      ro = null;
    }

    return () => {
      mo.disconnect();
      if (ro) try { ro.disconnect(); } catch {}
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
