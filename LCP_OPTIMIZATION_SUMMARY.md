# LCP Optimization Summary - PLV CEIT Classroom Assignment System

## Performance Test Results

### Login Page Performance
| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **LCP** | 512ms | 432ms | **-80ms (-15.6%)** ✅ |
| **TTFB** | 8ms | 7ms | -1ms |
| **Render Delay** | 503ms | 426ms | -77ms |
| **Third-Party Size** | 831.4 kB | 2.9 kB | **-828.5 kB (-99.7%)** ✅ |
| **Forced Reflows** | 30ms | 0ms | **Eliminated** ✅ |
| **CLS** | 0.00 | 0.00 | No change |

**Status:** ✅ **GOOD** (under 2.5s threshold)

### Admin Dashboard Performance
| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| **LCP** | 2,724ms | <2,500ms | ⚠️ **Needs Improvement** |
| **TTFB** | 11ms | - | ✅ Excellent |
| **Render Delay** | 2,713ms (99.6%) | - | ⚠️ Main bottleneck |
| **Third-Party Size** | 879.7 kB (Firebase) | - | ⚠️ High |
| **CLS** | 0.01 | <0.1 | ✅ Good |

**Status:** ⚠️ **Needs Improvement** (2.5s-4.0s range)

---

## Optimizations Implemented

### 1. ✅ Deferred reCAPTCHA Loading
**File:** `components/LoginForm.tsx`

- **Change:** Load reCAPTCHA only when signup tab is activated
- **Impact:** Eliminated 831.4 kB Google CDN load on initial page load
- **Result:** Login page third-party scripts reduced by 99.7%

```typescript
// Before: Loaded on component mount
useEffect(() => {
  if (typeof window !== 'undefined' && RECAPTCHA_SITE_KEY) {
    loadRecaptchaScript().catch((error) => {
      logger.error('Failed to load reCAPTCHA on mount:', error);
    });
  }
}, []);

// After: Load only when signup tab activated
useEffect(() => {
  if (activeTab === 'signup' && typeof window !== 'undefined' && RECAPTCHA_SITE_KEY) {
    loadRecaptchaScript().catch((error) => {
      logger.error('Failed to load reCAPTCHA on tab switch:', error);
    });
  }
}, [activeTab]);
```

### 2. ✅ Fixed Forced Reflows in Tabs Component
**File:** `components/ui/tabs.tsx`

- **Change:** Use ResizeObserver instead of synchronous layout reads
- **Impact:** Eliminated 30ms of forced reflow time
- **Result:** No forced reflow warnings in performance trace

```typescript
// Before: Synchronous layout read causing forced reflow
const recomputeShouldAuto = () => {
  shouldAutoRef.current = el.scrollWidth > el.clientWidth;
};

// After: Async layout observation with ResizeObserver
const recomputeShouldAuto = () => {
  if (el.classList.contains('mobile-tab-scroll')) {
    shouldAutoRef.current = true;
    return;
  }
  shouldAutoRef.current = true; // Assume true initially
  
  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      shouldAutoRef.current = el.scrollWidth > el.clientWidth;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }
};
```

### 3. ✅ Added DNS Prefetch and Preconnect Hints
**File:** `index.html`

- **Change:** Added resource hints for Firebase domains
- **Impact:** Reduced connection establishment time for Firebase services
- **Result:** Faster Firebase API requests

```html
<!-- DNS Prefetch and Preconnect for external resources -->
<link rel="dns-prefetch" href="https://www.google.com" />
<link rel="dns-prefetch" href="https://www.gstatic.com" />
<link rel="dns-prefetch" href="https://firebaseinstallations.googleapis.com" />
<link rel="dns-prefetch" href="https://firebaselogging.googleapis.com" />
<link rel="preconnect" href="https://www.google.com" crossorigin />
<link rel="preconnect" href="https://www.gstatic.com" crossorigin />
```

### 4. ✅ Created Lazy Push Service Wrapper
**File:** `lib/pushServiceLazy.ts` (New)

- **Change:** Created lazy-loading wrapper for Firebase Messaging
- **Impact:** Defers 879.7 kB Firebase Messaging load until needed
- **Status:** Created but not yet integrated into dashboard components
- **Next Step:** Update ProfileSettings and App.tsx to use lazy version

---

## Remaining Optimizations (Admin Dashboard)

### Priority 1: Defer Firestore Real-time Listeners ⚠️
**Problem:** Firestore listeners block LCP render (4,130ms critical path)

**Solution:**
1. Show skeleton/loading state immediately
2. Initialize Firestore listeners after initial render
3. Use `requestIdleCallback` or `setTimeout` to defer subscriptions

```typescript
// In AdminDashboard.tsx - defer real-time subscriptions
useEffect(() => {
  // Show initial UI with skeleton/loading states
  setIsInitializing(true);
  
  // Defer Firestore subscriptions until after paint
  const timeoutId = setTimeout(() => {
    const unsubscribe = realtimeService.subscribeToData(currentUser, {
      onClassroomsUpdate,
      onBookingRequestsUpdate,
      onSchedulesUpdate,
      onSignupRequestsUpdate,
      onSignupHistoryUpdate,
      onUsersUpdate,
    });
    setIsInitializing(false);
  }, 0);
  
  return () => clearTimeout(timeoutId);
}, [currentUser]);
```

### Priority 2: Optimize Component Bundle Size 🔄
**Problem:** AdminDashboard loads many heavy components upfront

**Solution:**
1. Code-split admin-only features (Reports, UserManagement)
2. Lazy-load icon libraries (@phosphor-icons/react - 2,552ms)
3. Use dynamic imports for heavy components

```typescript
// Lazy load admin-specific components
const AdminReports = React.lazy(() => import('./components/AdminReports'));
const AdminUserManagement = React.lazy(() => import('./components/AdminUserManagement'));
const NotificationBell = React.lazy(() => import('./components/NotificationBell'));
```

### Priority 3: Update Preconnect Hints 🔧
**Problem:** Unused preconnects for Google/reCAPTCHA (since deferred)

**Solution:** Update index.html to only preconnect to Firebase domains

```html
<!-- Remove or make conditional -->
<link rel="dns-prefetch" href="https://firestore.googleapis.com" />
<link rel="dns-prefetch" href="https://identitytoolkit.googleapis.com" />
<link rel="preconnect" href="https://firestore.googleapis.com" crossorigin />
```

### Priority 4: Implement Progressive Loading 🎯
**Problem:** Dashboard tries to load all data before showing content

**Solution:**
1. Show static UI elements immediately
2. Load dashboard cards progressively
3. Use Intersection Observer for below-fold content

---

## Performance Monitoring

### Core Web Vitals Thresholds
- **LCP (Largest Contentful Paint):**
  - ✅ Good: ≤ 2.5s
  - ⚠️ Needs Improvement: 2.5s - 4.0s
  - ❌ Poor: > 4.0s

- **CLS (Cumulative Layout Shift):**
  - ✅ Good: ≤ 0.1
  - ⚠️ Needs Improvement: 0.1 - 0.25
  - ❌ Poor: > 0.25

- **FID/INP (First Input Delay / Interaction to Next Paint):**
  - ✅ Good: ≤ 200ms / ≤ 200ms
  - ⚠️ Needs Improvement: 200-300ms / 200-500ms
  - ❌ Poor: > 300ms / > 500ms

### Testing Credentials
- **Admin:** admin@plv.edu.ph / Admin@123456
- **Faculty:** deigngreylazaro@plv.edu.ph / Greytot@37

### Testing URLs
- Login Page: http://localhost:3000/#tab=login
- Admin Dashboard: http://localhost:3000/ (after login)

---

## Next Steps

1. **Immediate:**
   - [ ] Remove unused preconnect hints for reCAPTCHA
   - [ ] Integrate `pushServiceLazy` in ProfileSettings
   - [ ] Add loading skeletons to AdminDashboard

2. **Short-term:**
   - [ ] Defer Firestore real-time listeners (Priority 1)
   - [ ] Code-split admin dashboard components
   - [ ] Lazy-load @phosphor-icons/react

3. **Long-term:**
   - [ ] Implement progressive loading strategy
   - [ ] Add performance budgets in CI/CD
   - [ ] Monitor real-user metrics with Vercel Analytics

---

## Files Modified

1. `index.html` - Added DNS prefetch and preconnect hints
2. `components/LoginForm.tsx` - Deferred reCAPTCHA loading
3. `components/ui/tabs.tsx` - Fixed forced reflows with ResizeObserver
4. `lib/pushServiceLazy.ts` - Created lazy push service wrapper (new file)

## Commit Message

```
feat: improve LCP performance for login page

- Defer reCAPTCHA loading until signup tab activation (-828.5 kB)
- Fix forced reflows in tabs component using ResizeObserver
- Add DNS prefetch hints for Firebase domains
- Create lazy push service wrapper for future use

Results:
- Login LCP: 512ms → 432ms (-15.6%)
- Eliminated forced reflows (30ms → 0ms)
- Third-party scripts: 831.4 kB → 2.9 kB (-99.7%)

Admin dashboard LCP (2,724ms) requires additional optimization:
- Defer Firestore real-time listeners
- Code-split admin components
- Add loading skeletons
```

---

**Date:** November 8, 2025
**Branch:** `improve/lcp`
**Testing Tool:** Chrome DevTools Performance Panel + MCP Chrome DevTools
