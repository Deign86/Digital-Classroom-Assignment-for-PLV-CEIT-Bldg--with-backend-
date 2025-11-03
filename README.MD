# Digital Classroom Assignment System

> 🔥 **Firebase Edition** — A modern, production-ready classroom reservation and management system built with React, TypeScript, and Firebase.

A comprehensive web-based classroom reservation and management system for **Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology (PLV CEIT)**. Features role-based dashboards, real-time conflict detection, comprehensive reporting, Firebase authentication, and a modern Apple-inspired UI.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-)

## ✨ Key Features

### 🔐 **Authentication & User Management**
- Firebase Authentication with email/password
- Role-based access control (Admin/Faculty)
- Admin approval system for faculty signups
- **Brute Force Protection**: Account lockout after 5 failed login attempts (30-minute timeout)
- **Session Management**: Automatic idle timeout (30 minutes) with 5-minute warning
- **Password Security**: Comprehensive password validation and secure reset functionality
- **Account Lock Management**: Admin-controlled manual lock/unlock capabilities

### 👨‍💼 **Admin Dashboard**
- **Classroom Management**: Full CRUD operations for classroom inventory
- **Reservation Approval**: Review and approve/reject reservation requests with feedback
- **Conflict Detection**: Automatic scheduling conflict detection and prevention
- **User Management**: Approve faculty signups and manage user accounts
- **Comprehensive Reports**: Generate utilization, reservation, and analytics reports
- **Real-time Updates**: Live updates of all system activities

### 👨‍🏫 **Faculty Dashboard**
- **Smart Room Reservation**: Reserve classrooms with intelligent availability checking
- **Advanced Search**: Filter classrooms by date, time, capacity, and equipment
- **Schedule Management**: View personal schedules and all classroom schedules
- **Request Tracking**: Real-time status updates on reservation requests
- **Real-time Notifications**: Instant updates on request approvals/rejections with notification bell
- **Push Notifications**: Browser and device push notifications (FCM) for important updates
- **Profile Settings**: Update personal information, change password, and manage notification preferences

### 🏢 **Classroom & Schedule Management**
- Complete classroom inventory with capacity and equipment tracking
- Real-time availability checking and conflict prevention
- Flexible time slot management (30-minute intervals, 7 AM - 8 PM)
- Equipment tracking (TV, Projector, Whiteboard, Computer, Audio, AC)
- Building and floor organization

### 📊 **Real-time Features**
- **Live Notifications**: Real-time notification center with read/unread tracking
- **Push Notifications**: Firebase Cloud Messaging (FCM) for browser and device alerts
- **Live Updates**: Instant reservation status changes and conflict detection
- **Real-time Synchronization**: Live schedule updates across all clients
- **Notification Management**: Acknowledge individual or all notifications with one click
- **Auto-expiration**: Scheduled Cloud Function to automatically expire past pending bookings
- **Live Dashboard**: Real-time activity updates for admins and faculty

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- Firebase Account ([Sign up](https://firebase.google.com/))
- Git for version control

### 🔧 Installation

1. **Clone the Repository**
   ```bash
   # Clone the latest stable version
   git clone -b latest-stable-build-v2 https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git

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
   - **Firestore**: Create database with security rules
   - **Environment Variables**: Add your Firebase config

   > 📖 **Detailed Setup**: See [`FIREBASE_DEPLOYMENT_GUIDE.md`](FIREBASE_DEPLOYMENT_GUIDE.md) for complete Firebase configuration instructions.

4. **Environment Configuration**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph,another@plv.edu.ph
   VITE_FIREBASE_VAPID_KEY=your_vapid_key_for_fcm
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

6. **Build for Production**
   ```bash
   npm run build
   ```

## 🏗️ Technology Stack

### Frontend
- **React 18.3.1** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development with strict mode
- **Vite 7.1.7** - Lightning-fast build tool and dev server
- **Tailwind CSS 4.0.0** - Utility-first CSS framework with latest features

### UI Components & Design
- **Shadcn/ui** - 40+ accessible, customizable components built on Radix UI
- **Radix UI** - Unstyled, accessible UI primitives
- **Framer Motion 12.23.22** - Smooth 60fps animations and transitions
- **Lucide React** - Beautiful, consistent icon library
- **Sonner** - Modern toast notification system

### Backend & Database
- **Firebase 12.3.0** - Complete backend-as-a-service platform
  - **Firebase Auth** - Secure user authentication with brute force protection
  - **Firestore** - NoSQL real-time database with offline support
  - **Cloud Functions** - Server-side logic for security and notifications
  - **Firebase Cloud Messaging (FCM)** - Push notifications for web and mobile
  - **Real-time Listeners** - Live data synchronization across all clients
  - **Security Rules** - Role-based access control at database level

### Development Tools
- **React Hook Form** - Performant forms with easy validation
- **date-fns** - Modern date utility library
- **Class Variance Authority** - Type-safe component variants
- **Vercel Analytics** - Production performance monitoring

### Deployment & Hosting
- **Vercel** - Optimized for modern frontend deployment
- **Firebase Hosting** - Alternative hosting option with CDN
- **GitHub Actions** - Automated CI/CD pipeline ready

## 📁 Project Architecture

```
├── 📄 App.tsx                          # Main application with Firebase integration
├── 📄 main.tsx                         # React 18 entry point with StrictMode
├── 📄 index.html                       # Optimized HTML template
├── ⚙️ vite.config.ts                   # Vite 7 configuration with React plugin
├── ⚙️ package.json                     # Dependencies and scripts
├── ⚙️ tsconfig.json                    # TypeScript strict configuration
├── 🔥 firebase.json                    # Firebase deployment configuration
├── 🔒 firestore.rules                  # Firestore security rules
├── 🌍 vercel.json                      # Vercel deployment settings
├── 📝 FIREBASE_DEPLOYMENT_GUIDE.md     # Complete Firebase setup guide
├── 
├── 📂 components/
│   ├── 👨‍💼 AdminDashboard.tsx          # Complete admin interface
│   ├── 📊 AdminReports.tsx            # Analytics and reporting
│   ├── 👥 AdminUserManagement.tsx     # User account management
│   ├── 🏢 ClassroomManagement.tsx     # Classroom CRUD operations
│   ├── 👨‍🏫 FacultyDashboard.tsx       # Faculty interface
│   ├── 📅 FacultySchedule.tsx         # Schedule viewing component
│   ├── 🔑 LoginForm.tsx               # Authentication with brute force protection
│   ├── 🔔 NotificationBell.tsx        # Real-time notification indicator
│   ├── 📬 NotificationCenter.tsx      # Notification management interface
│   ├── 🔒 PasswordResetPage.tsx       # Password reset functionality
│   ├── ⚙️ ProfileSettings.tsx         # User profile & push notification settings
│   ├── ✅ RequestApproval.tsx         # Reservation request approval
│   ├── 📝 RoomBooking.tsx             # Reservation form with validation
│   ├── 🔍 RoomSearch.tsx              # Advanced classroom search
│   ├── 📋 ScheduleViewer.tsx          # Schedule visualization
│   ├── 👥 SignupApproval.tsx          # Faculty signup approval
│   ├── ⏰ SessionTimeoutWarning.tsx   # Idle timeout warning dialog
│   ├── 🎨 animations/
│   │   └── AppleMotion.tsx             # Apple-inspired animations
│   └── 🧩 ui/                         # 40+ Shadcn/ui components
│       ├── button.tsx, card.tsx, dialog.tsx
│       ├── form.tsx, input.tsx, select.tsx
│       ├── switch.tsx, badge.tsx, alert.tsx
│       ├── table.tsx, tabs.tsx, toast.tsx
│       └── ... (complete UI component library)
├── 
├── 📂 lib/
│   ├── 🔥 firebaseConfig.ts           # Firebase initialization with error handling
│   ├── 🔄 firebaseService.ts          # Complete Firebase service layer
│   ├── 🔔 notificationService.ts      # Real-time notification management
│   ├── 📱 pushService.ts              # Firebase Cloud Messaging (FCM) integration
│   ├── 🔁 withRetry.ts                # Network retry logic with exponential backoff
│   ├── 📝 errorLogger.ts              # Centralized error logging
│   └── 💾 localStorageService.ts      # Client-side storage utilities
├── 
├── 📂 hooks/
│   ├── ⏰ useIdleTimeout.ts           # Idle session timeout with activity detection
│   └── 📜 useScrollTrigger.ts         # Smooth scroll animations
├── 
├── 📂 utils/
│   ├── 🎭 animation.ts                # Framer Motion utilities
│   └── 🕒 timeUtils.ts               # Date/time formatting utilities
├── 
├── 📂 styles/
│   └── 🎨 globals.css                # Tailwind CSS 4 with custom styles
├── 
├── 📂 plv-classroom-assignment-functions/  # Firebase Cloud Functions
│   ├── 📄 DEPLOYMENT_GUIDE.md         # Cloud Functions deployment instructions
│   ├── 📄 CHANGELOG.md                # Cloud Functions version history
│   ├── ⚙️ package.json                # Cloud Functions dependencies
│   └── 📂 src/
│       └── index.ts                    # Cloud Functions implementation
│           ├── 🔒 trackFailedLogin      # Brute force protection
│           ├── 🔓 resetFailedLogins     # Login counter reset
│           ├── 🔔 createNotification    # Server-side notifications
│           ├── ✅ acknowledgeNotification # Notification acknowledgment
│           ├── 📱 registerPushToken     # FCM token registration
│           ├── 🔕 unregisterPushToken   # FCM token removal
│           ├── ⚙️ setPushEnabled        # Push preference toggle
│           ├── 📤 sendTestPush          # Test notification sender
│           ├── ⏰ expirePastPendingBookings  # Scheduled cleanup
│           ├── 🗑️ deleteUserAccount     # Account deletion
│           └── 🧹 bulkCleanupRejectedAccounts # Bulk cleanup
├── 
├── 📂 public/
│   ├── 🔥 firebase-config.json        # Public Firebase configuration
│   ├── 👷 firebase-messaging-sw.js   # FCM service worker for push notifications
│   └── 👷 sw.js                       # General service worker
├── 
├── 📂 email-templates/                # HTML email templates
│   ├── email-verification-template.html
│   ├── password-reset-template-FIXED.html
│   └── email-change-template.html
├── 
└── 📂 guidelines/                    # Comprehensive documentation
    ├── 🔥 FIREBASE_QUICK_REFERENCE.md
    ├── 🛠️ FIREBASE_TROUBLESHOOTING.md
    ├── 📋 FirebaseDashboardSetup.md
    └── 📝 Guidelines.md
```

## 🗄️ Database Schema (Firestore)

### Collections Structure

#### `users`
```typescript
{
  id: string;                    // Auto-generated document ID
  email: string;                 // User email (unique)
  name: string;                  // Full name
  role: 'admin' | 'faculty';
  department?: string;           // Faculty department
  status: 'pending' | 'approved' | 'rejected';
  // Brute Force Protection Fields
  failedLoginAttempts?: number;  // Counter for failed login attempts
  accountLocked?: boolean;       // Auto-lock after 5 failed attempts
  lockedUntil?: string;          // ISO timestamp for auto-unlock
  lockedByAdmin?: boolean;       // Manual admin lock (prevents auto-unlock)
  // Push Notification Fields
  pushEnabled?: boolean;         // User's push notification preference
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `classrooms`
```typescript
{
  id: string;           // Auto-generated document ID
  name: string;         // Room identifier (e.g., "Room 101")
  capacity: number;     // Maximum occupancy
  equipment: string[];  // Available equipment array
  building: string;     // Building name
  floor: number;        // Floor number
  isAvailable: boolean; // Operational status
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### `bookingRequests`
```typescript
{
  id: string;           // Auto-generated document ID
  facultyId: string;    // Reference to users collection
  facultyName: string;  // Cached faculty name
  classroomId: string;  // Reference to classrooms collection
  classroomName: string; // Cached classroom name
  date: string;         // ISO date string
  startTime: string;    // 24-hour format
  endTime: string;      // 24-hour format
  purpose: string;      // Booking purpose/description
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestDate: string;  // ISO timestamp
  adminFeedback?: string; // Optional admin comments
  resolvedAt?: Timestamp; // Approval/rejection timestamp
  updatedBy?: string;   // User ID who last updated (or 'system')
}
```

#### `schedules`
```typescript
{
  id: string;           // Auto-generated document ID
  classroomId: string;  // Reference to classrooms collection
  classroomName: string; // Cached classroom name
  facultyId: string;    // Reference to users collection
  facultyName: string;  // Cached faculty name
  date: string;         // ISO date string
  startTime: string;    // 24-hour format
  endTime: string;      // 24-hour format
  purpose: string;      // Schedule purpose
  status: 'confirmed' | 'cancelled';
  createdAt: Timestamp;
}
```

#### `signupRequests`
```typescript
{
  id: string;           // Auto-generated document ID
  email: string;        // Requested email
  name: string;         // Full name
  department: string;   // Department
  status: 'pending' | 'approved' | 'rejected';
  adminFeedback?: string; // Optional admin comments
  requestDate: string;  // ISO timestamp
  resolvedAt?: Timestamp; // Processing timestamp
}
```

#### `notifications`
```typescript
{
  id: string;              // Auto-generated document ID
  userId: string;          // Recipient user ID (faculty or admin)
  type: 'approved' | 'rejected' | 'info' | 'cancelled' | 'signup';
  message: string;         // Notification message
  bookingRequestId?: string; // Optional reference to booking request
  adminFeedback?: string;  // Optional admin feedback
  acknowledgedBy?: string; // User ID who acknowledged
  acknowledgedAt?: string; // ISO timestamp of acknowledgment
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

#### `pushTokens`
```typescript
{
  id: string;              // Auto-generated document ID (the FCM token itself)
  userId: string;          // User ID who owns this token
  createdAt: Timestamp;    // When token was registered
}
```

## 🔒 Security Features

### Firebase Security Rules
- **Role-based Access Control**: Database-level permissions enforcement
- **User-specific Data Access**: Users can only access their own data
- **Admin-only Operations**: Protected administrative actions
- **Real-time Security Validation**: Security rules enforced on every operation
- **Notification Protection**: Client-side notification creation blocked (Cloud Functions only)
- **Status Protection**: Clients cannot set bookings to 'expired' status (server-only)

### Authentication Security
- **Brute Force Protection**: Cloud Functions track failed attempts and lock accounts
  - 5 failed attempts trigger 30-minute lockout
  - Auto-unlock after timeout expires
  - Manual admin lock/unlock capability
  - Attempts counter reset on successful login
- **Session Management**: Automatic idle timeout with activity detection
  - 30-minute idle timeout (configurable)
  - 5-minute warning before logout
  - User activity (mouse, keyboard, scroll) resets timer
- **Password Security**: Comprehensive password validation and strength indicators
- **Password Reset**: Secure email-based password reset flow
- **Admin Verification**: Environment-based admin email validation

### Data Protection
- **Input Sanitization**: All user inputs validated and sanitized
- **Password Sanitization**: Removes hidden characters, line breaks, and whitespace
- **XSS Protection**: React's built-in escaping prevents injection attacks
- **CSRF Protection**: Firebase security tokens prevent cross-site attacks
- **Secure Environment Variables**: Sensitive config in environment variables only
- **Network Retry Logic**: Exponential backoff for failed network requests

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

## 🆕 Latest Updates (v2.1.0)

### New Features
- ✅ **Brute Force Protection** - Cloud Functions-based account lockout system
- ✅ **Push Notifications** - Firebase Cloud Messaging (FCM) integration
- ✅ **Real-time Notifications** - Notification bell and center with acknowledgment
- ✅ **Session Timeout** - Idle detection with customizable timeout and warning
- ✅ **Auto-expiration** - Scheduled Cloud Function for past pending bookings
- ✅ **Enhanced Security** - Improved Firestore security rules and password sanitization
- ✅ **Network Retry Logic** - Automatic retry for failed requests with exponential backoff
- ✅ **Admin User Management** - Account lock/unlock and manual controls

### Cloud Functions
- `trackFailedLogin` - Track and lock accounts after failed attempts
- `resetFailedLogins` - Reset counter on successful login
- `createNotification` - Server-side notification creation
- `acknowledgeNotification` - Mark notifications as read
- `registerPushToken` - FCM token registration
- `unregisterPushToken` - FCM token cleanup
- `setPushEnabled` - Toggle push notifications
- `sendTestPush` - Test push notification sender
- `expirePastPendingBookings` - Hourly cleanup of expired bookings
- `deleteUserAccount` - Admin account deletion
- `bulkCleanupRejectedAccounts` - Bulk cleanup operations

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

**Last Updated**: November 3, 2025  
**Version**: 2.1.0 (Firebase Edition) - Production Ready  
**Status**: ✅ Actively Maintained

Built with ❤️ for PLV CEIT by [Deign](https://github.com/Deign86)

</div>