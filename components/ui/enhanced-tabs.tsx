"use client";

/**
 * This file previously implemented a custom Tabs wrapper. The app now uses a
 * single canonical tabs implementation at `./tabs` which includes auto-scroll
 * behavior for mobile tab lists. Re-export the canonical implementations from
 * there so components importing `enhanced-tabs` receive the same behavior.
 */

export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';
