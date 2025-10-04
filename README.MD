# Digital Classroom Assignment System

> 🔥 **Firebase Edition** — A modern, production-ready classroom booking and management system built with React, TypeScript, and Firebase.

A comprehensive web-based classroom booking and management system for **Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology (PLV CEIT)**. Features role-based dashboards, real-time conflict detection, comprehensive reporting, Firebase authentication, and a modern Apple-inspired UI.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-)

## ✨ Key Features

### 🔐 **Authentication & User Management**
- Firebase Authentication with email/password
- Role-based access control (Admin/Faculty)
- Admin approval system for faculty signups
- Secure session management with idle timeout
- Password reset functionality

### 👨‍💼 **Admin Dashboard**
- **Classroom Management**: Full CRUD operations for classroom inventory
- **Booking Approval**: Review and approve/reject booking requests with feedback
- **Conflict Detection**: Automatic scheduling conflict detection and prevention
- **User Management**: Approve faculty signups and manage user accounts
- **Comprehensive Reports**: Generate utilization, booking, and analytics reports
- **Real-time Updates**: Live updates of all system activities

### 👨‍🏫 **Faculty Dashboard**
- **Smart Room Booking**: Request classrooms with intelligent availability checking
- **Advanced Search**: Filter classrooms by date, time, capacity, and equipment
- **Schedule Management**: View personal schedules and all classroom schedules
- **Request Tracking**: Real-time status updates on booking requests
- **Profile Settings**: Update personal information and account preferences

### 🏢 **Classroom & Schedule Management**
- Complete classroom inventory with capacity and equipment tracking
- Real-time availability checking and conflict prevention
- Flexible time slot management (30-minute intervals, 7 AM - 8 PM)
- Equipment tracking (TV, Projector, Whiteboard, Computer, Audio, AC)
- Building and floor organization

### 📊 **Real-time Features**
- Live booking status updates
- Instant conflict detection
- Real-time schedule synchronization
- Push notifications for request approvals
- Live dashboard updates

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
  - **Firebase Auth** - Secure user authentication and session management
  - **Firestore** - NoSQL real-time database with offline support
  - **Real-time Listeners** - Live data synchronization across all clients

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
│   ├── 🏢 ClassroomManagement.tsx     # Classroom CRUD operations
│   ├── 👨‍🏫 FacultyDashboard.tsx       # Faculty interface
│   ├── 📅 FacultySchedule.tsx         # Schedule viewing component
│   ├── 🔑 LoginForm.tsx               # Authentication interface
│   ├── 🔒 PasswordResetPage.tsx       # Password reset functionality
│   ├── ⚙️ ProfileSettings.tsx         # User profile management
│   ├── ✅ RequestApproval.tsx         # Booking request approval
│   ├── 📝 RoomBooking.tsx             # Booking form with validation
│   ├── 🔍 RoomSearch.tsx              # Advanced classroom search
│   ├── 📋 ScheduleViewer.tsx          # Schedule visualization
│   ├── 👥 SignupApproval.tsx          # Faculty signup approval
│   ├── ⚠️ SessionTimeoutWarning.tsx   # Security session management
│   ├── 🎨 animations/
│   │   └── AppleMotion.tsx             # Apple-inspired animations
│   └── 🧩 ui/                         # 40+ Shadcn/ui components
│       ├── button.tsx, card.tsx, dialog.tsx
│       ├── form.tsx, input.tsx, select.tsx
│       ├── table.tsx, tabs.tsx, toast.tsx
│       └── ... (complete UI component library)
├── 
├── 📂 lib/
│   ├── 🔥 firebaseConfig.ts           # Firebase initialization with error handling
│   ├── 🔄 firebaseService.ts         # Complete Firebase service layer
│   └── 💾 localStorageService.ts     # Client-side storage utilities
├── 
├── 📂 hooks/
│   ├── ⏰ useIdleTimeout.ts           # Security session timeout
│   └── 📜 useScrollTrigger.ts        # Smooth scroll animations
├── 
├── 📂 utils/
│   ├── 🎭 animation.ts                # Framer Motion utilities
│   └── 🕒 timeUtils.ts               # Date/time formatting utilities
├── 
├── 📂 styles/
│   └── 🎨 globals.css                # Tailwind CSS 4 with custom styles
├── 
├── 📂 email-templates/               # HTML email templates
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
  id: string;           // Auto-generated document ID
  email: string;        // User email (unique)
  name: string;         // Full name
  role: 'admin' | 'faculty';
  department?: string;  // Faculty department
  status: 'pending' | 'approved' | 'rejected';
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
  status: 'pending' | 'approved' | 'rejected';
  requestDate: string;  // ISO timestamp
  adminFeedback?: string; // Optional admin comments
  resolvedAt?: Timestamp; // Approval/rejection timestamp
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

## 🔒 Security Features

### Firebase Security Rules
- Role-based access control at database level
- User-specific data access restrictions
- Admin-only operations protection
- Real-time security rule validation

### Authentication Security
- Secure session management with automatic timeout
- Password reset with email verification
- Admin email verification for elevated permissions
- Client-side and server-side validation

### Data Protection
- Input sanitization and validation
- XSS protection with React's built-in escaping
- CSRF protection through Firebase security
- Secure environment variable handling

## 📊 System Workflows

### 👨‍🏫 Faculty Booking Process
1. **Login** → Secure authentication with Firebase Auth
2. **Search** → Filter available classrooms by criteria
3. **Book** → Fill detailed booking form with validation
4. **Submit** → Real-time request submission to admin
5. **Track** → Monitor request status with live updates
6. **Notification** → Receive instant approval/rejection alerts
7. **Confirmed** → Approved booking appears in live schedules

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
   ```

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

3. **Deploy**
   ```bash
   npm run build
   firebase deploy
   ```

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
- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/issues)
- 💡 **Feature Requests**: Open an issue with enhancement label

## 📈 Performance Features

### Optimization Techniques
- **Code Splitting**: Automatic route-based code splitting with Vite
- **Tree Shaking**: Dead code elimination for minimal bundle size
- **Image Optimization**: Automatic image compression and format conversion
- **Caching Strategy**: Aggressive caching with proper cache invalidation
- **CDN Integration**: Global content delivery through Vercel Edge Network

### Real-time Performance
- **Optimistic Updates**: Instant UI feedback before server confirmation
- **Efficient Queries**: Firestore query optimization with proper indexing
- **Connection Management**: Smart WebSocket connection handling
- **Offline Resilience**: Firestore offline persistence with sync queue

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

<div align="center">

**⭐ Star this repository if you find it helpful!**

**Last Updated**: October 4, 2025  
**Version**: 2.0.0 (Firebase Edition) - Production Ready  
**Status**: ✅ Actively Maintained

Built with ❤️ for PLV CEIT by [Deign](https://github.com/Deign86)

</div>