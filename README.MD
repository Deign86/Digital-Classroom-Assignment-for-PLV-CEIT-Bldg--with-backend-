# Digital Classroom Assignment System

> 🔥 **Firebase Edition v3** — A modern, production-ready classroom reservation and management system built with React, TypeScript, and Firebase.

A comprehensive, enterprise-grade web-based classroom reservation and management system for **Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology (PLV CEIT)**. Features role-based dashboards, real-time conflict detection, comprehensive reporting, Firebase authentication with advanced security, push notifications, and a polished Apple-inspired UI/UX.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-)
[![Firebase](https://img.shields.io/badge/Firebase-12.3.0-orange.svg)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.2-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7.1.7-646CFF.svg)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0.0-38B2AC.svg)](https://tailwindcss.com/)

## ✨ Key Features

### 🔐 **Authentication & Security**
- **Firebase Authentication**: Secure email/password authentication with brute force protection
- **Role-Based Access Control (RBAC)**: Admin and Faculty roles with granular permissions
- **Admin Approval System**: Controlled faculty signup with admin verification
- **Brute Force Protection**: 
  - Automatic account lockout after 5 failed login attempts
  - 30-minute timeout with auto-unlock
  - Manual admin lock/unlock capabilities
  - Server-side tracking via Cloud Functions
- **Session Management**: 
  - Automatic idle timeout (30 minutes default)
  - 5-minute warning before auto-logout
  - Activity detection (mouse, keyboard, scroll)
  - Configurable timeout duration
- **Password Security**: 
  - Comprehensive validation and strength indicators
  - Secure password reset with email verification
  - Input sanitization (removes hidden characters, line breaks)
  - Password visibility toggles
- **Account Management**: 
  - Admin-controlled manual account lock/unlock
  - Bulk cleanup operations for rejected accounts
  - Secure account deletion with data cleanup

### 👨‍💼 **Admin Dashboard**
- **Classroom Management**: Full CRUD operations with capacity and equipment tracking
- **Reservation Approval**: Review, approve, reject requests with admin feedback
- **Conflict Detection**: Real-time scheduling conflict prevention
- **User Management**: 
  - Approve/reject faculty signups
  - Manual account lock/unlock
  - View login attempt history
  - Bulk operations for account cleanup
- **Comprehensive Reports**: 
  - Utilization analytics
  - Reservation history
  - Usage statistics
  - Export capabilities
- **Real-time Dashboard**: Live updates of all system activities
- **Push Notification Management**: Send and manage push notifications

### 👨‍🏫 **Faculty Dashboard**
- **Smart Room Reservation**: Intelligent availability checking with real-time conflict detection
- **Advanced Search & Filters**: 
  - Search by date, time range, capacity
  - Filter by equipment (TV, Projector, Whiteboard, etc.)
  - Building and floor filtering
  - Real-time availability status
- **Schedule Management**: 
  - Personal schedule view
  - All classroom schedules
  - Calendar integration
  - Conflict notifications
- **Request Tracking**: 
  - Real-time status updates
  - View admin feedback
  - Request history
  - Expiration tracking
- **Real-time Notifications**: 
  - In-app notification bell with badge counter
  - Notification center with read/unread status
  - Individual and bulk acknowledgment
  - Notification filtering and search
- **Push Notifications**: 
  - Browser and device push alerts (FCM)
  - Configurable notification preferences
  - Test notification sender
  - Token management
- **Profile Settings**: 
  - Update personal information
  - Change password securely
  - Manage notification preferences
  - Push notification toggle

### 🏢 **Classroom & Schedule Management**
- **Complete Inventory**: Classroom database with capacity and equipment
- **Real-time Availability**: Live checking with automatic conflict prevention
- **Flexible Time Slots**: 30-minute intervals, 7 AM - 8 PM operational hours
- **Equipment Tracking**: TV, Projector, Whiteboard, Computer, Audio, AC
- **Building Organization**: Multi-building support with floor navigation
- **Conflict Prevention**: Client and server-side validation
- **Auto-expiration**: Scheduled cleanup of past pending bookings (hourly)

### 📊 **Real-time Features & Notifications**
- **Live Notification Center**: 
  - Real-time notification bell with unread counter
  - Centralized notification management interface
  - Read/unread status tracking
  - Acknowledge individual or all notifications
  - Notification type filtering (approved, rejected, info, cancelled)
- **Push Notifications (FCM)**: 
  - Browser and device push alerts
  - Background notification support
  - Service worker implementation
  - Token registration and management
  - User-controlled push preferences
  - Test push notification capability
- **Real-time Data Sync**: 
  - Live reservation status updates
  - Instant conflict detection
  - Live schedule synchronization
  - Real-time dashboard updates
- **Auto-expiration System**: 
  - Cloud Function runs hourly
  - Automatically expires past pending bookings
  - Prevents stale data accumulation
  - Server-side status management
- **Activity Tracking**: 
  - User session monitoring
  - Login attempt tracking
  - Action history logging

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** ([Download](https://nodejs.org/)) - JavaScript runtime
- **npm/yarn/pnpm** - Package manager (comes with Node.js)
- **Firebase Account** ([Sign up](https://firebase.google.com/)) - Backend services
- **Git** - Version control ([Download](https://git-scm.com/))
- **Modern Browser** - Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### 🔧 Installation

1. **Clone the Repository**
   ```bash
   # Clone the stable v3 branch (recommended)
   git clone -b stable-v3 https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git

   # Navigate to project directory
   cd "Digital Classroom Assignment for PLV CEIT Bldg (with backend)"
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Firebase Setup**
   
   Create a Firebase project and configure the following services:
   - **Authentication**: Enable Email/Password provider
   - **Firestore Database**: Create database with security rules
   - **Cloud Functions**: Deploy backend functions
   - **Cloud Messaging (FCM)**: Enable push notifications
   - **Environment Variables**: Add your Firebase config

   > 📖 **Detailed Setup**: See [`FIREBASE_DEPLOYMENT_GUIDE.md`](FIREBASE_DEPLOYMENT_GUIDE.md) for complete Firebase configuration instructions.

4. **Environment Configuration**
   
   Create a `.env` file in the root directory (use `.env.example` as template):
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   
   # Admin Configuration (comma-separated)
   VITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph,another@plv.edu.ph
   
   # Firebase Cloud Messaging (FCM) for Push Notifications
   VITE_FIREBASE_VAPID_KEY=your_vapid_key_for_fcm
   ```

5. **Deploy Cloud Functions** (Required for full functionality)
   ```bash
   cd plv-classroom-assignment-functions
   npm install
   npm run build
   firebase deploy --only functions
   cd ..
   ```
   > 📖 **Cloud Functions Guide**: See [`plv-classroom-assignment-functions/DEPLOYMENT_GUIDE.md`](plv-classroom-assignment-functions/DEPLOYMENT_GUIDE.md)

6. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

7. **Build for Production**
   ```bash
   npm run build
   ```
   Production-ready files will be generated in the `dist/` directory.

## 🏗️ Technology Stack

### Frontend Framework & Core
- **React 18.3.1** - Modern React with Concurrent Features, Suspense, and Transitions
- **TypeScript 5.6.2** - Type-safe development with strict mode and advanced type inference
- **Vite 7.1.7** - Next-generation frontend tooling with lightning-fast HMR
- **Tailwind CSS 4.0.0** - Utility-first CSS framework with JIT compiler and CSS variables

### UI Components & Design System
- **Shadcn/ui** - 40+ accessible, customizable components built on Radix UI primitives
- **Radix UI** - Unstyled, accessible, WAI-ARIA compliant UI primitives
- **Framer Motion 12.23.22** - Production-ready animation library with 60fps performance
- **Lucide React 0.468.0** - Beautiful, consistent SVG icon library (1000+ icons)
- **Sonner** - Modern, accessible toast notification system
- **Phosphor Icons** - Flexible icon family with 6,000+ icons

### Backend & Cloud Services
- **Firebase 12.3.0** - Complete Backend-as-a-Service (BaaS) platform
  - **Firebase Authentication** - Secure user authentication with session management
  - **Cloud Firestore** - NoSQL real-time database with offline persistence
  - **Cloud Functions (Gen 2)** - Serverless backend logic with TypeScript
  - **Firebase Cloud Messaging (FCM)** - Cross-platform push notifications
  - **Firebase Hosting** - Global CDN with automatic SSL certificates
  - **Real-time Listeners** - Live data synchronization with WebSocket connections
  - **Security Rules** - Database-level role-based access control

### Cloud Functions Architecture
- **Node.js 20** - LTS runtime for Cloud Functions
- **TypeScript** - Type-safe function development
- **Express.js** - HTTP request handling (when needed)
- **HTTPS Callable Functions** - Client-callable serverless endpoints
- **Scheduled Functions** - Cron-based background jobs
- **Firestore Triggers** - Event-driven database operations

### Form Management & Validation
- **React Hook Form 7.54.2** - Performant, flexible form validation with minimal re-renders
- **Zod** - TypeScript-first schema validation (if used)
- **Input Sanitization** - Custom validation and sanitization utilities

### Date & Time Management
- **date-fns 4.1.0** - Modern, modular date utility library
- **Custom Time Utils** - Business hours enforcement and time slot validation

### Styling & Design Utilities
- **Class Variance Authority (CVA)** - Type-safe component variant system
- **clsx & tailwind-merge** - Conditional className utilities with Tailwind conflict resolution
- **@tailwindcss/typography** - Beautiful typographic defaults for prose content

### Development & Build Tools
- **ESLint** - JavaScript/TypeScript linting with React hooks rules
- **PostCSS** - CSS transformations and Tailwind processing
- **TypeScript ESLint** - TypeScript-specific linting rules
- **Vite Plugins** - React Fast Refresh, environment variable handling

### Testing & Quality Assurance
- **Vitest** - Vite-native unit test framework
- **React Testing Library** - Component testing utilities
- **Coverage Reports** - Code coverage analysis

### Deployment & Analytics
- **Vercel** - Optimized edge deployment with automatic HTTPS
- **Vercel Analytics** - Real user monitoring and performance insights
- **Firebase Hosting** - Alternative hosting with CDN and custom domains
- **GitHub Actions** - CI/CD pipeline automation (ready to configure)

### Performance & Monitoring
- **Web Vitals** - Core Web Vitals monitoring
- **Error Boundaries** - React error handling with graceful fallbacks
- **Network Retry Logic** - Exponential backoff for failed requests
- **Service Workers** - PWA support with FCM background sync

### Browser & Platform Support
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile Responsive**: iOS Safari 14+, Chrome Mobile, Samsung Internet
- **Progressive Web App (PWA)**: Installable with offline capabilities
- **Push Notifications**: FCM support on supported browsers (not iOS Safari <16.4)

## 📁 Project Architecture

```
├── 📄 App.tsx                          # Main application shell with routing & Firebase integration
├── 📄 main.tsx                         # React 18 entry point with StrictMode
├── 📄 index.html                       # Optimized HTML template
├── ⚙️ vite.config.ts                   # Vite 7 configuration with React plugin
├── ⚙️ package.json                     # Dependencies (React 18, Firebase 12, TypeScript 5)
├── ⚙️ tsconfig.json                    # TypeScript strict mode configuration
├── 🔥 firebase.json                    # Firebase deployment configuration
├── 🔒 firestore.rules                  # Firestore security rules (RBAC enforcement)
├── 🌍 vercel.json                      # Vercel deployment settings
├── 📝 FIREBASE_DEPLOYMENT_GUIDE.md     # Complete Firebase setup guide
├── 📝 FIREBASE_ENVIRONMENT_GUIDE.md    # Environment configuration reference
├── � BRUTE_FORCE_PROTECTION_IMPLEMENTATION.md  # Security implementation docs
├── 
├── �📂 components/                      # React Components (TypeScript)
│   ├── 👨‍💼 AdminDashboard.tsx          # Complete admin interface with tabs
│   ├── 📊 AdminReports.tsx            # Analytics & utilization reports
│   ├── 👥 AdminUserManagement.tsx     # User account & lock management
│   ├── 🏢 ClassroomManagement.tsx     # Classroom CRUD with equipment tracking
│   ├── 👨‍🏫 FacultyDashboard.tsx       # Faculty interface with booking management
│   ├── 📅 FacultySchedule.tsx         # Personal & all schedules viewer
│   ├── 🔑 LoginForm.tsx               # Auth form with brute force protection
│   ├── 🔔 NotificationBell.tsx        # Real-time notification indicator with badge
│   ├── 📬 NotificationCenter.tsx      # Full notification management interface
│   ├── 🔒 PasswordResetDialog.tsx     # In-app password reset dialog
│   ├── 🔒 PasswordResetPage.tsx       # Standalone password reset page
│   ├── ⚙️ ProfileSettings.tsx         # User profile, password, push settings
│   ├── 📝 RequestCard.tsx             # Reusable booking request card component
│   ├── ✅ RequestApproval.tsx         # Admin reservation approval interface
│   ├── 📝 RoomBooking.tsx             # Reservation form with conflict detection
│   ├── 🔍 RoomSearch.tsx              # Advanced classroom search with filters
│   ├── 📋 ScheduleViewer.tsx          # Calendar-based schedule visualization
│   ├── 👥 SignupApproval.tsx          # Faculty signup approval workflow
│   ├── ⏰ SessionTimeoutWarning.tsx   # Idle timeout warning modal
│   ├── 🌐 NetworkStatusIndicator.tsx  # Connection status indicator
│   ├── 🔊 Announcer.tsx               # Accessibility announcer for screen readers
│   ├── 🐛 ErrorBoundary.tsx           # React error boundary
│   ├── 🦶 Footer.tsx                  # App footer component
│   ├── 🎨 animations/
│   │   └── AppleMotion.tsx             # Apple-inspired motion components
│   └── 🧩 ui/                         # 40+ Shadcn/ui components (Radix UI + Tailwind)
│       ├── button.tsx, card.tsx, dialog.tsx
│       ├── form.tsx, input.tsx, select.tsx
│       ├── switch.tsx, badge.tsx, alert.tsx
│       ├── table.tsx, tabs.tsx, toast.tsx
│       └── ... (complete accessible UI component library)
├── 
├── 📂 lib/                            # Core Services & Utilities
│   ├── 🔥 firebaseConfig.ts           # Firebase initialization with env validation
│   ├── 🔄 firebaseService.ts          # Complete Firebase service layer (2500+ lines)
│   │   ├── authService                 # Authentication operations
│   │   ├── userService                 # User CRUD & management
│   │   ├── classroomService            # Classroom operations
│   │   ├── bookingRequestService       # Booking request management
│   │   ├── scheduleService             # Schedule operations
│   │   ├── signupRequestService        # Signup approval workflow
│   │   ├── signupHistoryService        # Signup audit logs
│   │   ├── notificationService         # Notification management (wrapped)
│   │   └── realtimeService             # Real-time data subscriptions
│   ├── 🔔 notificationService.ts      # Standalone notification service with Cloud Function integration
│   ├── 📱 pushService.ts              # Firebase Cloud Messaging (FCM) integration
│   ├── � customClaimsService.ts      # Firebase custom claims management
│   ├── �🔁 withRetry.ts                # Network retry logic (3 attempts, exponential backoff)
│   ├── 🌐 networkErrorHandler.ts      # Centralized network error handling
│   ├── 📝 errorLogger.ts              # Error logging utilities
│   ├── 📝 logger.ts                   # Console logging wrapper
│   ├── 💾 localStorageService.ts      # Client-side storage utilities
│   └── 🎨 equipmentIcons.tsx          # Equipment icon mapping (Lucide icons)
├── 
├── 📂 hooks/                          # Custom React Hooks
│   ├── ⏰ useIdleTimeout.ts           # Idle session timeout with activity detection
│   └── 📜 useScrollTrigger.ts         # Smooth scroll trigger animations
├── 
├── 📂 utils/                          # Helper Utilities
│   ├── 🎭 animation.ts                # Framer Motion animation configs
│   ├── 🕒 timeUtils.ts                # Date/time formatting & validation
│   ├── 📝 inputValidation.ts          # Form input validation utilities
│   ├── 📋 bookingPrefill.ts           # Booking form prefill logic
│   └── 💾 tabPersistence.ts           # Tab state persistence utility
├── 
├── 📂 styles/                         # Global Styles
│   ├── 🎨 globals.css                 # Tailwind CSS 4 with custom variables
│   └── 📱 responsive.css              # Responsive utility classes
├── 
├── 📂 types/                          # TypeScript Type Definitions
│   ├── missing-ambient.d.ts           # Ambient type declarations
│   ├── recaptcha.d.ts                 # reCAPTCHA type definitions
│   └── yauzl.d.ts                     # Yauzl library type definitions
├── 
├── 📂 src/test/                       # Vitest Test Suite
│   ├── setup.ts                        # Test environment setup with polyfills
│   └── 📂 components/                 # Component tests
│       ├── ClassroomManagement.test.tsx   # 32 comprehensive tests
│       ├── RoomBooking.test.tsx
│       ├── NotificationCenter.test.tsx
│       └── ... (full component test coverage)
├── 
├── 📂 plv-classroom-assignment-functions/  # Firebase Cloud Functions (TypeScript)
│   ├── 📄 DEPLOYMENT_GUIDE.md         # Cloud Functions deployment instructions
│   ├── 📄 CHANGELOG.md                # Cloud Functions version history
│   ├── ⚙️ package.json                # Cloud Functions dependencies (Firebase Admin SDK)
│   ├── ⚙️ tsconfig.json               # TypeScript config for Cloud Functions
│   └── 📂 src/
│       └── 📄 index.ts                 # Cloud Functions implementation (1945 lines)
│           ├── 🔒 trackFailedLogin            # Brute force protection (tracks attempts)
│           ├── 🔓 resetFailedLogins           # Login counter reset on success
│           ├── 🔔 createNotification          # Server-side notification creation
│           ├── ✅ acknowledgeNotification     # Single notification acknowledgment
│           ├── ✅ acknowledgeNotifications    # Bulk notification acknowledgment
│           ├── 📱 registerPushToken           # FCM token registration
│           ├── 🔕 unregisterPushToken         # FCM token removal
│           ├── ⚙️ setPushEnabled              # Push notification preference toggle
│           ├── 📤 sendTestPush                # Test push notification sender
│           ├── ⏰ expirePastPendingBookings   # Scheduled job (hourly) - auto-expire old bookings
│           ├── 🗑️ deleteUserAccount           # Complete user account deletion with cleanup
│           └── 🧹 bulkCleanupRejectedAccounts # Bulk deletion of rejected signup accounts
├── 
├── 📂 public/                         # Static Assets
│   ├── 🔥 firebase-config.json        # Public Firebase configuration (non-sensitive)
│   ├── 👷 firebase-messaging-sw.js   # FCM service worker for background push notifications
│   ├── 👷 sw.js                       # General service worker
│   └── 📱 manifest.json               # Web app manifest for PWA support
├── 
├── 📂 email-templates/                # Firebase Auth Email Templates (HTML)
│   ├── email-verification-template.html
│   ├── password-reset-template-FIXED.html
│   └── email-change-template.html
├── 
├── 📂 .github/                        # GitHub Configuration
│   └── 📂 workflows/
│       └── test.yml                    # GitHub Actions CI/CD for automated testing
├── 
└── 📂 guidelines/                     # Comprehensive Documentation
    ├── 🔥 FIREBASE_QUICK_REFERENCE.md      # Quick Firebase service reference
    ├── 🛠️ FIREBASE_TROUBLESHOOTING.md     # Common issues & solutions
    ├── 📋 FirebaseDashboardSetup.md       # Firebase console configuration
    └── 📝 Guidelines.md                    # Development guidelines
```

### Service Layer Architecture (`lib/firebaseService.ts`)

The application uses a comprehensive service layer pattern to interact with Firebase:

- **authService**: Sign in, sign out, password resets, email verification
- **userService**: User CRUD, role management, account operations
- **classroomService**: Classroom management with equipment tracking
- **bookingRequestService**: Reservation requests with conflict detection
- **scheduleService**: Schedule management and conflict checking
- **signupRequestService**: Faculty signup approval workflow
- **signupHistoryService**: Audit trail for signup approvals
- **notificationService**: Real-time notifications (Cloud Function integration)
- **realtimeService**: Role-filtered real-time data subscriptions

All services include:
- ✅ Type-safe TypeScript interfaces
- ✅ Error handling with retry logic
- ✅ Loading states and user feedback
- ✅ Real-time listeners with auto-cleanup
- ✅ Optimistic updates where appropriate

## 🗄️ Database Schema (Firestore)

### Collections Structure

#### `users`
Core user accounts with authentication and security tracking.

```typescript
{
  id: string;                    // Auto-generated document ID (matches Firebase Auth UID)
  email: string;                 // User email (unique, indexed)
  name: string;                  // Full name
  role: 'admin' | 'faculty';     // User role (indexed)
  department?: string;           // Faculty department (optional)
  status: 'pending' | 'approved' | 'rejected';  // Account approval status
  
  // 🔒 Brute Force Protection Fields
  failedLoginAttempts?: number;  // Failed login counter (default: 0)
  accountLocked?: boolean;       // Auto-lock after 5 failed attempts
  lockedUntil?: string;          // ISO timestamp for 30-min auto-unlock
  lockedByAdmin?: boolean;       // Manual admin lock (prevents auto-unlock)
  
  // 📱 Push Notification Settings
  pushEnabled?: boolean;         // User's push notification preference (default: false)
  
  // 📅 Timestamps
  createdAt: Timestamp;          // Account creation
  updatedAt: Timestamp;          // Last modification
}

// Composite Indexes:
// - email (for uniqueness and login queries)
// - role (for role-based filtering)
// - status (for approval workflows)
```

#### `classrooms`
Classroom inventory with capacity and equipment tracking.

```typescript
{
  id: string;           // Auto-generated document ID
  name: string;         // Room identifier (e.g., "CEIT IT Faculty Room")
  capacity: number;     // Maximum occupancy (must be > 0)
  equipment: string[];  // Equipment array
                        // Options: 'Projector', 'Computer', 'WiFi', 'Whiteboard', 
                        //          'TV', 'Speakers', 'Air Conditioner', 'Podium',
                        //          'Microphone', 'Camera', 'Printer', 'Scanner'
  building: string;     // Building name
  floor: number;        // Floor number (1-4)
  isAvailable: boolean; // Operational status (admin can disable temporarily)
  createdAt: Timestamp; // Creation timestamp
  updatedAt: Timestamp; // Last modification
}

// Composite Indexes:
// - isAvailable (for availability filtering)
// - building, floor (for location-based queries)
// - floor, isAvailable (for floor + status filtering)
```

#### `bookingRequests`
Faculty room reservation requests with approval workflow.

```typescript
{
  id: string;           // Auto-generated document ID
  facultyId: string;    // Reference to users collection (indexed)
  facultyName: string;  // Cached faculty name (denormalized for performance)
  classroomId: string;  // Reference to classrooms collection (indexed)
  classroomName: string; // Cached classroom name (denormalized)
  date: string;         // ISO date string (YYYY-MM-DD) (indexed)
  startTime: string;    // 24-hour format (HH:mm) (e.g., "07:30")
  endTime: string;      // 24-hour format (HH:mm) (e.g., "12:00")
  purpose: string;      // Reservation purpose/description (max 500 chars)
  status: 'pending' | 'approved' | 'rejected' | 'expired';  // Request status (indexed)
  requestDate: string;  // ISO timestamp for sorting (e.g., "2025-10-24T14:38:42.180Z")
  adminFeedback?: string; // Admin comments/rejection reason (max 500 chars)
  resolvedAt?: Timestamp; // Approval/rejection/expiration timestamp
  expiredAt?: Timestamp;  // Auto-expiration timestamp (set by Cloud Function)
  updatedBy?: string;   // User ID or 'system' for audit trail
  createdAt: Timestamp; // Creation timestamp
  updatedAt: Timestamp; // Last modification timestamp
}

// Composite Indexes:
// - status, requestDate (for admin pending queue, sorted by date)
// - facultyId, status (for faculty request history)
// - classroomId, date, startTime (for conflict detection)
// - date, status (for date-based filtering)

// Security Rules:
// - Clients CANNOT set status to 'expired' - enforced server-side only
// - Only Cloud Function can set updatedBy: 'system'
```

#### `schedules`
Confirmed and active classroom schedules.

```typescript
{
  id: string;           // Auto-generated document ID
  classroomId: string;  // Reference to classrooms collection (indexed)
  classroomName: string; // Cached classroom name (denormalized)
  facultyId: string;    // Reference to users collection (indexed)
  facultyName: string;  // Cached faculty name (denormalized)
  date: string;         // ISO date string (YYYY-MM-DD) (indexed)
  startTime: string;    // 24-hour format (HH:mm)
  endTime: string;      // 24-hour format (HH:mm)
  purpose: string;      // Schedule purpose/description
  status: 'confirmed' | 'cancelled';  // Schedule status
  createdAt: Timestamp; // Creation timestamp
  updatedAt: Timestamp; // Last modification
}

// Composite Indexes:
// - classroomId, date, startTime (for schedule queries + conflict detection)
// - facultyId, date (for faculty personal schedule view)
// - date, status (for date-based + status filtering)
```

#### `signupRequests`
Faculty signup requests awaiting admin approval.

```typescript
{
  id: string;           // Auto-generated document ID
  email: string;        // Requested email (indexed for duplicate prevention)
  name: string;         // Full name
  department: string;   // Department (required field)
  status: 'pending' | 'approved' | 'rejected';  // Approval status (indexed)
  adminFeedback?: string; // Admin comments/rejection reason (max 500 chars)
  requestDate: string;  // ISO timestamp for sorting
  resolvedAt?: Timestamp; // Processing timestamp
  createdAt: Timestamp; // Creation timestamp
  updatedAt: Timestamp; // Last modification
}

// Composite Indexes:
// - email (for duplicate signup detection)
// - status, requestDate (for admin approval queue sorted by date)
```

#### `signupHistory`
Audit log of all signup approvals and rejections.

```typescript
{
  id: string;              // Auto-generated document ID
  email: string;           // User email (indexed)
  name: string;            // Full name
  department: string;      // Department
  status: 'approved' | 'rejected';  // Final decision
  adminFeedback?: string;  // Admin reason/comments
  processedBy: string;     // Admin user ID who processed
  processedAt: Timestamp;  // Processing timestamp
  originalRequestId: string; // Reference to original signupRequest document
}

// Indexes:
// - email (for user history lookup)
// - processedAt (for chronological sorting)
```

#### `notifications`
In-app notifications for users (faculty and admin).

```typescript
{
  id: string;              // Auto-generated document ID
  userId: string;          // Recipient user ID (faculty or admin) (indexed)
  type: 'approved' | 'rejected' | 'info' | 'cancelled' | 'signup';  // Notification category
  message: string;         // Notification message text (max 500 chars)
  bookingRequestId?: string; // Optional reference to booking request
  adminFeedback?: string;  // Optional admin feedback text
  acknowledgedBy?: string; // User ID who acknowledged (null if unread)
  acknowledgedAt?: string; // ISO timestamp of acknowledgment (null if unread)
  createdAt: string;       // ISO timestamp (sortable)
  updatedAt: string;       // ISO timestamp (for tracking changes)
}

// Composite Indexes:
// - userId, acknowledgedBy, createdAt (DESC) - for user's notifications sorted newest first
// - userId, type (for filtering notifications by type)

// Security Rules:
// - Notifications can ONLY be created server-side via Cloud Functions
// - Prevents users from creating self-notifications
// - Clients can only acknowledge their own notifications
```

#### `pushTokens`
Firebase Cloud Messaging (FCM) device tokens for push notifications.

```typescript
{
  id: string;              // Document ID = the FCM token itself
  userId: string;          // Owner user ID (indexed)
  createdAt: Timestamp;    // Registration timestamp
}

// Indexes:
// - userId (for querying all tokens owned by a user)

// Notes:
// - Supports multiple devices per user (different tokens)
// - Token lifecycle managed by Cloud Functions
// - Tokens stored separately from users collection for scalability
```

#### `deletionLogs`
Audit trail of user account deletions.

```typescript
{
  id: string;                 // Auto-generated document ID
  deletedUserId: string;      // Original user ID (before deletion)
  deletedEmail: string;       // Original email
  deletedName: string;        // Original name
  deletedRole: string;        // Original role
  deletedBy: string;          // Admin user ID who performed deletion
  deletionReason?: string;    // Optional reason for deletion
  deletedAt: Timestamp;       // Deletion timestamp
  associatedDataCleaned: {    // Cleanup summary
    bookingRequests: number;
    schedules: number;
    notifications: number;
    pushTokens: number;
  };
}

// Indexes:
// - deletedUserId (for lookup of deleted accounts)
// - deletedAt (for chronological sorting)
```

#### `deletionNotifications`
Notifications sent to users about deletions (e.g., rejected signups).

```typescript
{
  id: string;              // Auto-generated document ID
  recipientEmail: string;  // Email of person to notify
  type: 'account_deleted' | 'signup_rejected';  // Notification type
  message: string;         // Notification message
  sentAt: Timestamp;       // When notification was sent
  delivered?: boolean;     // Email delivery status
}

// Indexes:
// - recipientEmail (for user notification lookup)
// - sentAt (for chronological sorting)
```

#### `tokenRevocations`
Revoked Firebase Auth tokens for security.

```typescript
{
  id: string;              // Auto-generated document ID
  userId: string;          // User whose token was revoked (indexed)
  reason: string;          // Revocation reason (e.g., "Account deletion", "Password reset")
  revokedAt: Timestamp;    // Revocation timestamp
  revokedBy: string;       // Admin or 'system' who revoked
}

// Indexes:
// - userId (for user token history)
// - revokedAt (for chronological sorting)
```

### Firestore Security Rules Highlights

```javascript
// 🔒 Role-Based Access Control (RBAC) enforced at database level
// - Admins: Full read/write access to all collections
// - Faculty: Read own data, create requests, read public data
// - Public: Read-only access to classrooms for search

// 🛡️ Key Security Features:
// 1. Notification creation BLOCKED client-side (Cloud Functions only)
// 2. Status 'expired' CANNOT be set by clients (server-only via Cloud Function)
// 3. Users can only acknowledge their own notifications
// 4. Role verification required on every request
// 5. Timestamp validation on all writes
// 6. Field-level validation (types, lengths, enums)
// 7. Admin-only operations protected (user management, approvals)
```

### Database Best Practices Implemented

1. **Denormalization for Performance**: Cached names (facultyName, classroomName) avoid expensive joins
2. **Composite Indexes**: Optimized for common query patterns (status + date, user + type)
3. **ISO Timestamps**: String timestamps for sortability and consistency
4. **Enum Constraints**: Status fields limited to valid values for data integrity
5. **Optional Fields**: Marked with `?` for schema flexibility
6. **Character Limits**: Max lengths enforced (500 chars for text fields)
7. **Server-side Critical Operations**: Sensitive status updates via Cloud Functions only
8. **Audit Trails**: Comprehensive logs (signupHistory, deletionLogs, tokenRevocations)
9. **Separate Token Storage**: pushTokens collection enables multi-device support
10. **Security-First Design**: Rules prevent common attacks (self-notification, status manipulation)
// - email (for duplicate detection)
// - status, requestDate (for admin approval queue)
```

#### `notifications`
```typescript
{
  id: string;              // Auto-generated document ID
  userId: string;          // Recipient user ID (faculty or admin) (indexed)
  type: 'approved' | 'rejected' | 'info' | 'cancelled' | 'signup';  // Notification type
  message: string;         // Notification message (max 500 chars)
  bookingRequestId?: string; // Optional reference to booking request
  adminFeedback?: string;  // Optional admin feedback text
  acknowledgedBy?: string; // User ID who acknowledged (null if unread)
  acknowledgedAt?: string; // ISO timestamp of acknowledgment (null if unread)
  createdAt: string;       // ISO timestamp (sortable)
  updatedAt: string;       // ISO timestamp (for tracking changes)
}

// Indexes (Composite):
// - userId, acknowledgedBy, createdAt (for user's notifications sorted by date)
// - userId, type (for filtering by type)

// Security Note: Notifications can ONLY be created via Cloud Functions to prevent
// self-notifications and ensure proper authorization. Clients can only acknowledge.
```

#### `pushTokens`
```typescript
{
  id: string;              // Auto-generated document ID (the FCM token itself)
  userId: string;          // User ID who owns this token (indexed)
  createdAt: Timestamp;    // When token was registered
}

// Indexes:
// - userId (for querying user's tokens)

// Note: Token lifecycle managed by Cloud Functions. Tokens are stored here
// instead of in the users collection to support multiple devices per user.
```

### Firestore Security Rules Highlights

```javascript
// Role-based access control enforced at database level
// - Admins: Full read/write access to all collections
// - Faculty: Read own data, create requests, read approved data
// - Public: Read-only access to classrooms for search

// Key Security Features:
// 1. Notification creation blocked client-side (Cloud Functions only)
// 2. Status 'expired' cannot be set by clients (server-only)
// 3. Users can only acknowledge their own notifications
// 4. Role verification on every request
// 5. Timestamp validation on writes
```

### Database Best Practices

1. **Denormalization**: Cached names (facultyName, classroomName) for query performance
2. **Composite Indexes**: Optimized for common query patterns
3. **ISO Timestamps**: Sortable date strings for consistent ordering
4. **Enum Types**: Constrained status fields for data integrity
5. **Optional Fields**: Marked with `?` for flexibility
6. **Character Limits**: Enforced on text fields to prevent abuse
7. **Server-side Operations**: Critical status updates via Cloud Functions

## 🔒 Security Features

### Firebase Security Rules
- **Role-based Access Control (RBAC)**: Database-level permissions enforcement for all collections
- **User-specific Data Access**: Faculty can only access their own bookings and schedules
- **Admin-only Operations**: Protected administrative actions (user management, approvals, reports)
- **Real-time Security Validation**: Security rules enforced on every read/write operation
- **Notification Protection**: Client-side notification creation blocked (Cloud Functions only)
- **Status Protection**: Clients cannot set bookings to 'expired' status (server-only via Cloud Function)
- **Collection-level Rules**: Granular permissions for each Firestore collection
- **Field-level Validation**: Data type and value constraints enforced at database level

### Authentication Security
- **Brute Force Protection**: Cloud Functions-based account lockout system
  - Tracks failed login attempts in Firestore (`failedLoginAttempts` field)
  - 5 failed attempts trigger 30-minute automatic lockout
  - Auto-unlock after timeout expires (`lockedUntil` timestamp)
  - Manual admin lock/unlock capability (`lockedByAdmin` flag prevents auto-unlock)
  - Attempts counter reset on successful login
  - Server-side tracking via `trackFailedLogin` and `resetFailedLogins` functions
  
- **Session Management**: Automatic idle timeout with activity detection
  - 30-minute idle timeout (configurable via `useIdleTimeout` hook)
  - 5-minute warning dialog before logout (`SessionTimeoutWarning` component)
  - User activity tracking (mouse, keyboard, scroll events)
  - Activity resets timer automatically
  - Clean session termination on timeout
  
- **Password Security**: Comprehensive password validation and strength indicators
  - Minimum 8 characters with complexity requirements
  - Password strength meter with visual feedback
  - Secure password reset flow via Firebase Auth email
  - Password visibility toggles in all forms (Eye/EyeOff icons)
  - Password sanitization removes hidden characters, line breaks, zero-width chars
  
- **Admin Verification**: Environment-based admin email validation
  - Admin emails defined in `VITE_FIREBASE_ADMIN_EMAILS` environment variable
  - Automatic role assignment based on email validation
  - Prevents privilege escalation attacks

### Data Protection & Input Validation
- **Input Sanitization**: All user inputs validated and sanitized before processing
  - `sanitizePassword()`: Removes line breaks, zero-width characters, trims whitespace
  - Email validation: `.trim().toLowerCase()` for case-insensitive matching
  - Text fields: Maximum length validation (500 chars for descriptions/feedback)
  - Required fields: Inline validation with immediate user feedback
  
- **XSS Protection**: React's built-in escaping prevents injection attacks
  - Automatic HTML escaping in JSX
  - Dangerous HTML operations explicitly marked
  - Content Security Policy headers (configurable)
  
- **CSRF Protection**: Firebase security tokens prevent cross-site attacks
  - Firebase ID tokens validate every request
  - Token rotation and expiration
  - Secure token storage in browser
  
- **Secure Environment Variables**: Sensitive config in environment variables only
  - `.env` file not committed to repository
  - `.env.example` provided as template
  - Vite prefix (`VITE_`) for client-side variables
  - Server-side secrets in Firebase config or Cloud Functions environment
  
- **Network Retry Logic**: Exponential backoff for failed network requests
  - 3 retry attempts by default (configurable in `withRetry.ts`)
  - Exponential backoff: 1s, 2s, 4s delay between retries
  - Proper error handling and user feedback
  - Network status indicator shows connection state

### Cloud Functions Security
- **Authentication Required**: All callable functions validate user authentication
- **Role-based Authorization**: Functions check user role before execution
- **Rate Limiting**: Built-in Firebase rate limiting prevents abuse
- **Input Validation**: All function inputs validated and sanitized
- **Error Handling**: Sensitive error details not exposed to clients
- **Audit Logging**: Critical operations logged for security monitoring

### Security Best Practices Implemented
1. **Principle of Least Privilege**: Users have minimal required permissions
2. **Defense in Depth**: Multiple layers of security (client, rules, functions)
3. **Fail Securely**: Errors result in denied access, not exposed data
4. **Audit Trail**: Critical actions logged with timestamps and user IDs
5. **Secure Defaults**: Security features enabled by default
6. **Regular Updates**: Dependencies kept up-to-date for security patches

## 📊 System Workflows

### 👨‍🏫 Faculty Reservation Process
1. **Login** → Secure authentication with Firebase Auth
2. **Search** → Filter available classrooms by criteria
3. **Reserve** → Fill detailed reservation form with validation
4. **Submit** → Real-time reservation request submission to admin
5. **Track** → Monitor reservation request status with live updates
6. **Notification** → Receive instant approval/rejection alerts
7. **Confirmed** → Approved reservation appears in live schedules

### 👨‍💼 Admin Approval Process
1. **Dashboard** → Real-time view of all pending requests
2. **Review** → Detailed request information with context
3. **Conflict Check** → Automatic scheduling conflict detection
4. **Decision** → Approve/reject with optional feedback
5. **Process** → Instant notification to faculty member
6. **Schedule** → Auto-creation of confirmed schedule entry

### 🆕 Faculty Registration Process
1. **Signup Form** → Public registration with validation
2. **Request Submission** → Secure request to admin queue
3. **Admin Review** → Admin validates faculty credentials
4. **Account Creation** → Firebase Auth account creation
5. **Email Notification** → Welcome email with login instructions
6. **First Login** → Secure access to faculty dashboard

## 🎨 Design System

### Apple-Inspired Interface
- **Clean Minimalism**: Spacious layouts with purposeful whitespace
- **60fps Animations**: Smooth Framer Motion transitions
- **Consistent Typography**: Modern font hierarchy with perfect contrast
- **Accessible Colors**: WCAG 2.1 AA compliant color palette
- **Responsive Design**: Mobile-first approach with breakpoint optimization

### Interactive Elements
- **Hover States**: Subtle feedback on all interactive elements
- **Loading States**: Skeleton loaders and progress indicators
- **Error Handling**: User-friendly error messages with recovery options
- **Success Feedback**: Satisfying confirmation animations and toasts

### Time Management
- **School Hours**: 7:00 AM - 8:00 PM operational window
- **Time Slots**: Flexible 30-minute interval scheduling
- **Format**: 12-hour display (AM/PM) with 24-hour backend storage
- **Timezone**: Local timezone handling with proper formatting

## 🚀 Deployment Guide

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for production deployment"
   git push origin latest-stable-build-v2
   ```

2. **Deploy to Vercel**
   - Connect your GitHub repository to [Vercel](https://vercel.com)
   - Import the project with automatic framework detection
   - Configure environment variables in Vercel dashboard
   - Deploy with automatic optimizations

3. **Environment Variables in Vercel**
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph
   VITE_FIREBASE_VAPID_KEY=your_vapid_key_for_fcm
   ```

4. **Deploy Cloud Functions**
   ```bash
   cd plv-classroom-assignment-functions
   npm install
   npm run build
   npm run deploy
   ```
   > 📖 **Cloud Functions Guide**: See [`plv-classroom-assignment-functions/DEPLOYMENT_GUIDE.md`](plv-classroom-assignment-functions/DEPLOYMENT_GUIDE.md) for detailed instructions.

### Deploy to Firebase Hosting (Alternative)

1. **Install Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Initialize Firebase Hosting**
   ```bash
   firebase init hosting
   # Select your Firebase project
   # Set public directory to: dist
   # Configure as single-page app: Yes
   # Set up automatic builds: No (handled by GitHub Actions)
   ```

3. **Deploy Cloud Functions First**
   ```bash
   cd plv-classroom-assignment-functions
   npm install
   npm run build
   firebase deploy --only functions
   cd ..
   ```

4. **Deploy Hosting**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

> 💡 **Important**: Always deploy Cloud Functions before hosting to ensure backend functionality is available.

## 🛠️ Development

### Available Scripts
```bash
# Development
npm run dev          # Start Vite dev server with hot reload
npm run build        # TypeScript compilation + Vite production build
npm run preview      # Preview production build locally

# Deployment
npm run predeploy    # Automated pre-deployment build
```

### Development Best Practices
- **TypeScript Strict Mode**: Full type safety with strict compiler options
- **Component Architecture**: Functional components with hooks pattern
- **Performance Optimization**: React.memo, useMemo, useCallback where beneficial
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support
- **Code Organization**: Feature-based component structure with clear separation

### Firebase Development
- **Real-time Listeners**: Efficient subscription management with cleanup
- **Error Handling**: Comprehensive Firebase error catching and user feedback
- **Offline Support**: Firestore offline persistence for reliability
- **Performance**: Optimized queries with proper indexing

## 🐛 Troubleshooting

### Common Issues & Solutions

#### 🔥 Firebase Configuration Error
**Problem**: Missing or incorrect Firebase environment variables  
**Solution**: 
1. Verify all required environment variables are present
2. Check Firebase console for correct configuration values
3. Restart development server after env changes
4. Validate Firebase project permissions

#### 🔐 Authentication Issues
**Problem**: Login failures or session problems  
**Solution**:
1. Confirm Firebase Auth is enabled in console
2. Verify email/password provider is configured
3. Check admin email configuration in environment
4. Review Firebase Auth debugging in browser console

#### 📱 Build/Deployment Failures
**Problem**: Build process errors or deployment issues  
**Solution**:
1. Verify Node.js version compatibility (18+)
2. Clear `node_modules` and reinstall dependencies
3. Check TypeScript compilation errors
4. Validate environment variables in deployment platform

#### 🔄 Real-time Updates Not Working
**Problem**: Live data not syncing between clients  
**Solution**:
1. Check Firestore security rules allow read access
2. Verify network connectivity and Firebase status
3. Review browser console for WebSocket errors
4. Confirm Firestore real-time listeners are properly attached

### Getting Help
- 📖 **Documentation**: [`guidelines/`](guidelines/) folder contains comprehensive guides
- 🔥 **Firebase Issues**: [`FIREBASE_TROUBLESHOOTING.md`](guidelines/FIREBASE_TROUBLESHOOTING.md)
- � **Security Features**: [`BRUTE_FORCE_PROTECTION_IMPLEMENTATION.md`](BRUTE_FORCE_PROTECTION_IMPLEMENTATION.md)
- ☁️ **Cloud Functions**: [`plv-classroom-assignment-functions/DEPLOYMENT_GUIDE.md`](plv-classroom-assignment-functions/DEPLOYMENT_GUIDE.md)
- �🐛 **Bug Reports**: [GitHub Issues](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/issues)
- 💡 **Feature Requests**: Open an issue with enhancement label

## 📈 Performance Features

### Optimization Techniques
- **Code Splitting**: Automatic route-based code splitting with Vite
- **Lazy Loading**: Heavy components (dashboards, forms) loaded on demand
- **Tree Shaking**: Dead code elimination for minimal bundle size
- **Image Optimization**: Automatic image compression and format conversion
- **Caching Strategy**: Aggressive caching with proper cache invalidation
- **CDN Integration**: Global content delivery through Vercel Edge Network
- **Service Worker**: PWA-ready with FCM service worker for offline capability

### Real-time Performance
- **Optimistic Updates**: Instant UI feedback before server confirmation
- **Efficient Queries**: Firestore query optimization with proper indexing
- **Connection Management**: Smart WebSocket connection handling with retry logic
- **Offline Resilience**: Firestore offline persistence with sync queue
- **Network Retry**: Exponential backoff for failed requests (3 attempts default)
- **Debounced Listeners**: Optimized real-time subscription management

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes with proper TypeScript types
4. Test thoroughly in development environment
5. Commit with descriptive messages: `git commit -m 'Add amazing feature'`
6. Push to your branch: `git push origin feature/amazing-feature`
7. Open a Pull Request with detailed description

### Contribution Guidelines
- Follow TypeScript strict mode requirements
- Maintain existing code style and formatting
- Add proper error handling and user feedback
- Test all features in both admin and faculty roles
- Update documentation for new features
- Ensure mobile responsiveness for UI changes

## 📄 License & Usage

This project is developed for **Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology** for educational and institutional use.

### Usage Rights
- ✅ Educational use within PLV CEIT
- ✅ Modification for institutional needs
- ✅ Learning and reference purposes
- ❌ Commercial redistribution
- ❌ Use outside PLV CEIT without permission

## 👨‍💻 Developer Information

**Built by**: [Deign](https://github.com/Deign86)  
**Repository**: [GitHub - Digital Classroom Assignment System](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-)  
**Latest Stable**: `latest-stable-build-v2`  
**Contact**: Available via GitHub Issues and Pull Requests

### Development Timeline
- **Initial Development**: Complete system architecture and core features
- **Firebase Migration**: Full migration from Supabase to Firebase backend
- **UI/UX Enhancement**: Apple-inspired design system implementation
- **Production Ready**: Comprehensive testing and deployment optimization
- **Current Version**: 2.0.0 (Firebase Edition) - Production Ready

## 🙏 Acknowledgments

### Technology Partners
- **Firebase** - Exceptional backend-as-a-service platform
- **Vercel** - Outstanding deployment and hosting platform
- **Shadcn/ui** - Beautiful, accessible component library
- **Tailwind CSS** - Revolutionary utility-first CSS framework
- **React Team** - Incredible frontend library and ecosystem

### Educational Institution
- **PLV CEIT Faculty** - Requirements gathering and testing feedback
- **PLV Administration** - Project support and guidance
- **Students** - User acceptance testing and feature validation

### Open Source Community
- All the amazing open-source contributors who made this possible
- The TypeScript team for excellent developer experience
- Vite team for blazing-fast development tools

---

## 📞 Support & Contact

### Technical Support
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/issues)
- 💡 **Feature Requests**: Open issue with `enhancement` label
- 📖 **Documentation**: Comprehensive guides in [`guidelines/`](guidelines/) folder
- 🔥 **Firebase Help**: [`FIREBASE_TROUBLESHOOTING.md`](guidelines/FIREBASE_TROUBLESHOOTING.md)

### Institution Contact
- **PLV CEIT**: For institutional deployment and customization requests
- **Admissions**: For general PLV CEIT information and enrollment

---

## 🆕 Latest Updates (v3.0.0 - Stable Release)

### 🎨 UI/UX Polish & Enhancements
- ✅ **Refined Apple-inspired Design**: Enhanced visual consistency across all components
- ✅ **Improved Responsive Design**: Better mobile and tablet experiences with optimized touch interactions
- ✅ **Animation Refinements**: Smoother transitions and micro-interactions with Framer Motion
- ✅ **Accessibility Improvements**: Enhanced keyboard navigation and screen reader support
- ✅ **Loading States**: Polished skeleton loaders and progress indicators
- ✅ **Form UX**: Improved validation feedback and error messaging
- ✅ **Dark Mode Preparations**: CSS variable system ready for theme switching

### 🔐 Security Enhancements
- ✅ **Brute Force Protection** - Cloud Functions-based account lockout system
  - Automatic 30-minute lockout after 5 failed attempts
  - Admin manual lock/unlock controls
  - Login attempt tracking and history
- ✅ **Session Management** - Idle timeout with activity detection
  - Configurable 30-minute timeout
  - 5-minute warning dialog
  - Activity tracking (mouse, keyboard, scroll)
- ✅ **Enhanced Password Security** - Comprehensive validation and sanitization
  - Password strength indicators
  - Visibility toggles
  - Hidden character removal
- ✅ **Improved Security Rules** - Tightened Firestore security rules
  - Client-side notification creation blocked
  - Server-only status transitions

### 📱 Real-time Features & Notifications
- ✅ **Push Notifications (FCM)** - Firebase Cloud Messaging integration
  - Browser and device push alerts
  - Service worker implementation
  - Token registration and management
  - User-controlled preferences
  - Test push notification capability
- ✅ **Notification Center** - Centralized notification management
  - Real-time notification bell with badge counter
  - Read/unread status tracking
  - Individual and bulk acknowledgment
  - Notification filtering and search
- ✅ **Live Data Sync** - Real-time updates across all clients
  - Instant reservation status changes
  - Live conflict detection
  - Dashboard auto-refresh
- ✅ **Auto-expiration System** - Scheduled cleanup of past bookings
  - Cloud Function runs hourly
  - Automatically expires pending bookings past start time
  - Server-side status management

### ☁️ Cloud Functions Updates
- ✅ **Authentication Functions**: `trackFailedLogin`, `resetFailedLogins`
- ✅ **Notification Functions**: `createNotification`, `acknowledgeNotification`, `acknowledgeNotifications`
- ✅ **Push Functions**: `registerPushToken`, `unregisterPushToken`, `setPushEnabled`, `sendTestPush`
- ✅ **Scheduled Functions**: `expirePastPendingBookings` (hourly cron job)
- ✅ **Account Functions**: `deleteUserAccount`, `bulkCleanupRejectedAccounts`
- ✅ **Error Handling**: Comprehensive error handling and user feedback
- ✅ **Performance**: Optimized function execution times
- ✅ **Logging**: Enhanced Cloud Functions logging for debugging

### 🚀 Performance Optimizations
- ✅ **Code Splitting**: Optimized bundle sizes with route-based splitting
- ✅ **Lazy Loading**: Heavy components loaded on demand
- ✅ **Query Optimization**: Efficient Firestore queries with composite indexes
- ✅ **Caching Strategy**: Smart caching with proper invalidation
- ✅ **Network Retry Logic**: Exponential backoff for reliability (3 attempts default)
- ✅ **Debounced Listeners**: Optimized real-time subscription management
- ✅ **Asset Optimization**: Compressed images and optimized SVG icons

### 🛠️ Developer Experience
- ✅ **TypeScript Strict Mode**: Enhanced type safety throughout codebase
- ✅ **Comprehensive Documentation**: Updated README, guides, and inline comments
- ✅ **Testing Framework**: Vitest integration with coverage reports
- ✅ **Error Logging**: Centralized error handling and logging system
- ✅ **Component Organization**: Improved file structure and naming conventions
- ✅ **Code Quality**: ESLint rules and formatting standards

### 📚 Documentation Updates
- ✅ **README.md**: Complete rewrite with comprehensive feature documentation
- ✅ **FIREBASE_DEPLOYMENT_GUIDE.md**: Step-by-step Firebase setup
- ✅ **BRUTE_FORCE_PROTECTION_IMPLEMENTATION.md**: Security feature documentation
- ✅ **Cloud Functions DEPLOYMENT_GUIDE.md**: Function deployment instructions
- ✅ **TESTING_GUIDE.md**: Testing strategies and best practices

### 🐛 Bug Fixes
- ✅ Fixed conflict detection edge cases in reservation system
- ✅ Resolved timezone issues in date/time handling
- ✅ Fixed notification delivery timing issues
- ✅ Corrected mobile responsive layout bugs
- ✅ Fixed form validation edge cases
- ✅ Resolved FCM token registration errors on certain browsers
- ✅ Fixed session timeout false triggers

### 📦 Dependencies Updates
- ✅ React 18.3.1 - Latest stable
- ✅ Vite 7.1.7 - Latest with performance improvements
- ✅ Tailwind CSS 4.0.0 - Latest with new features
- ✅ Firebase 12.3.0 - Latest with security patches
- ✅ Framer Motion 12.23.22 - Latest animation features
- ✅ All dependencies updated to latest stable versions

---

### Previous Versions

#### v2.1.0 (Firebase Edition)
- Initial Firebase migration from Supabase
- Cloud Functions implementation
- Real-time notification system
- Basic push notification support

#### v2.0.0 (Firebase Edition)
- Complete Firebase backend integration
- Firestore database setup
- Firebase Authentication implementation
- Basic Cloud Functions

#### v1.0.0 (Initial Release)
- Core reservation system
- Admin and Faculty dashboards
- Basic authentication
- Supabase backend (deprecated)

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

**Last Updated**: November 6, 2025  
**Version**: 3.0.0 (Stable v3 - Production Ready)  
**Status**: ✅ Actively Maintained  
**Branch**: `stable-v3` (Recommended)

Built with ❤️ for PLV CEIT by [Deign](https://github.com/Deign86)

</div>