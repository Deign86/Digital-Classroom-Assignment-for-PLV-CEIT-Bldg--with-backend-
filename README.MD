# Digital Classroom Assignment System# Digital Classroom Assignment System



> 🔥 **Firebase Edition** — A modern, production-ready classroom booking and management system built with React, TypeScript, and Firebase.> 📌 **Firebase Edition** — This application uses Firebase Authentication and Firestore for all backend services.



A comprehensive web-based classroom booking and management system for **Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology (PLV CEIT)**. Features role-based dashboards, real-time conflict detection, comprehensive reporting, Firebase authentication, and a modern Apple-inspired UI.A comprehensive web-based classroom booking and management system for Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology. Features role-based dashboards, real-time conflict detection, comprehensive reporting, and secure Firebase authentication.



[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-)## 🚀 Quick Start Guide



## ✨ Key Features### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### 🔐 **Authentication & User Management**- Firebase project with Authentication and Firestore enabled

- Firebase Authentication with email/password- Git (for cloning)

- Role-based access control (Admin/Faculty)

- Admin approval system for faculty signups### 📋 Cloning Instructions

- Secure session management with idle timeout

- Password reset functionality**Clone the stable release branch:**

```bash

### 👨‍💼 **Admin Dashboard**git clone -b latest-stable-build-v2 https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git

- **Classroom Management**: Full CRUD operations for classroom inventorycd "Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-"

- **Booking Approval**: Review and approve/reject booking requests with feedback```

- **Conflict Detection**: Automatic scheduling conflict detection and prevention

- **User Management**: Approve faculty signups and manage user accounts**Or clone main repository and switch to stable branch:**

- **Comprehensive Reports**: Generate utilization, booking, and analytics reports```bash

- **Real-time Updates**: Live updates of all system activitiesgit clone https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git

cd "Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-"

### 👨‍🏫 **Faculty Dashboard**git checkout latest-stable-build-v2

- **Smart Room Booking**: Request classrooms with intelligent availability checking```

- **Advanced Search**: Filter classrooms by date, time, capacity, and equipment

- **Schedule Management**: View personal schedules and all classroom schedules### 🔧 Installation & Setup

- **Request Tracking**: Real-time status updates on booking requests

- **Profile Settings**: Update personal information and account preferences1. **Install Dependencies**

   ```bash

### 🏢 **Classroom & Schedule Management**   npm install

- Complete classroom inventory with capacity and equipment tracking   # or

- Real-time availability checking and conflict prevention   yarn install

- Flexible time slot management (30-minute intervals, 7 AM - 8 PM)   # or

- Equipment tracking (TV, Projector, Whiteboard, Computer, Audio, AC)   pnpm install

- Building and floor organization   ```



### 📊 **Real-time Features**2. **Firebase Configuration**

- Live booking status updates   - See [`guidelines/FirebaseDashboardSetup.md`](guidelines/FirebaseDashboardSetup.md) for detailed Firebase setup

- Instant conflict detection   - Copy your Firebase config to `lib/firebaseConfig.ts`

- Real-time schedule synchronization

- Push notifications for request approvals3. **Run Development Server**

- Live dashboard updates   ```bash

   npm run dev

## 🚀 Quick Start   # or

   yarn dev

### Prerequisites   # or

- Node.js 18+ ([Download](https://nodejs.org/))   pnpm dev

- Firebase Account ([Sign up](https://firebase.google.com/))   ```

- Git for version control

4. **Build for Production**

### 🔧 Installation   ```bash

   npm run build

1. **Clone the Repository**   # or

   ```bash   yarn build

   # Clone the latest stable version   # or

   git clone -b latest-stable-build-v2 https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git   pnpm build

   ```

   # Navigate to project directory

   cd "Digital Classroom Assignment for PLV CEIT Bldg (with backend)"## 🎯 Features

   ```

### For Administrators (Registrar)

2. **Install Dependencies**- **Classroom Management**: Add, edit, and manage classroom inventory

   ```bash- **Request Approval**: Review and approve/reject booking and signup requests

   npm install- **Conflict Detection**: Automatic scheduling conflict detection

   # or- **Reports**: Generate utilization and booking reports

   yarn install- **User Management**: Approve faculty signups and manage accounts

   # or

   pnpm install### For Faculty

   ```- **Room Booking**: Request classrooms with date and time selection

- **Availability Search**: Search available classrooms by date, time, equipment

3. **Firebase Setup**- **Schedule Viewing**: View personal and all classroom schedules

   - **Request Tracking**: Monitor booking request status

   Create a Firebase project and configure the following services:- **Profile Settings**: Update personal information and account settings

   - **Authentication**: Enable Email/Password provider

   - **Firestore**: Create database with security rules## � Project Structure

   - **Environment Variables**: Add your Firebase config

```

   > 📖 **Detailed Setup**: See [`FIREBASE_DEPLOYMENT_GUIDE.md`](FIREBASE_DEPLOYMENT_GUIDE.md) for complete Firebase configuration instructions.├── components/           # React components

│   ├── ui/              # Shadcn/ui components

4. **Environment Configuration**│   ├── animations/      # Animation components

   │   └── *.tsx           # Feature components

   Create a `.env` file in the root directory:├── lib/                 # Core libraries

   ```env│   ├── firebaseConfig.ts    # Firebase configuration

   VITE_FIREBASE_API_KEY=your_api_key_here│   └── firebaseService.ts   # Firebase services

   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com├── hooks/              # Custom React hooks

   VITE_FIREBASE_PROJECT_ID=your_project_id├── utils/              # Utility functions

   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com├── styles/             # Global styles

   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id├── email-templates/    # Email templates

   VITE_FIREBASE_APP_ID=your_app_id├── guidelines/         # Documentation & guides

   VITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph,another@plv.edu.ph└── public/            # Static assets

   ``````



5. **Run Development Server**## �🗂️ Technology Stack

   ```bash

   npm run dev### Frontend

   ```- React 19 + TypeScript

   Open [http://localhost:5173](http://localhost:5173) in your browser.- Vite 7

- Tailwind CSS 4

6. **Build for Production**- Shadcn/ui (Radix UI)

   ```bash- Framer Motion

   npm run build- Sonner (toasts)

   ```- React Hook Form

- date-fns

## 🏗️ Technology Stack

### Backend

### Frontend- Firebase Authentication

- **React 18.3.1** - Modern React with hooks and concurrent features- Firebase Firestore

- **TypeScript** - Type-safe development with strict mode- Real-time listeners

- **Vite 7.1.7** - Lightning-fast build tool and dev server- Firebase SDK

- **Tailwind CSS 4.0.0** - Utility-first CSS framework with latest features

## 📁 Project Structure

### UI Components & Design

- **Shadcn/ui** - 40+ accessible, customizable components built on Radix UI```

- **Radix UI** - Unstyled, accessible UI primitives├── App.tsx                          # Main application with Firebase integration

- **Framer Motion 12.23.22** - Smooth 60fps animations and transitions├── main.tsx                         # React entry point

- **Lucide React** - Beautiful, consistent icon library├── index.html                       # HTML template

- **Sonner** - Modern toast notification system├── vite.config.ts                   # Vite configuration

├── package.json                     # Dependencies

### Backend & Database├── .env.example                     # Environment variables template

- **Firebase 12.3.0** - Complete backend-as-a-service platform├── components/

  - **Firebase Auth** - Secure user authentication and session management│   ├── AdminDashboard.tsx          # Admin dashboard

  - **Firestore** - NoSQL real-time database with offline support│   ├── AdminReports.tsx            # Reporting

  - **Real-time Listeners** - Live data synchronization across all clients│   ├── ClassroomManagement.tsx     # Classroom CRUD

│   ├── FacultyDashboard.tsx        # Faculty dashboard

### Development Tools│   ├── LoginForm.tsx               # Authentication

- **React Hook Form** - Performant forms with easy validation│   ├── RoomBooking.tsx             # Booking form

- **date-fns** - Modern date utility library│   ├── SignupApproval.tsx          # Signup approvals

- **Class Variance Authority** - Type-safe component variants│   └── ui/                         # UI components

- **Vercel Analytics** - Production performance monitoring├── lib/

│   ├── firebaseConfig.ts           # Firebase configuration

### Deployment & Hosting│   └── firebaseService.ts          # Firebase services

- **Vercel** - Optimized for modern frontend deployment├── hooks/

- **Firebase Hosting** - Alternative hosting option with CDN│   └── useScrollTrigger.ts

- **GitHub Actions** - Automated CI/CD pipeline ready├── utils/

│   ├── animation.ts

## 📁 Project Architecture│   └── timeUtils.ts

├── styles/

```│   └── globals.css

├── 📄 App.tsx                          # Main application with Firebase integration└── guidelines/

├── 📄 main.tsx                         # React 18 entry point with StrictMode    └── FirebaseDashboardSetup.md   # Detailed Firebase setup

├── 📄 index.html                       # Optimized HTML template```

├── ⚙️ vite.config.ts                   # Vite 7 configuration with React plugin

├── ⚙️ package.json                     # Dependencies and scripts## 🚀 Getting Started

├── ⚙️ tsconfig.json                    # TypeScript strict configuration

├── 🔥 firebase.json                    # Firebase deployment configuration### Prerequisites

├── 🔒 firestore.rules                  # Firestore security rules- Node.js 18+ ([Download](https://nodejs.org/))

├── 🌍 vercel.json                      # Vercel deployment settings- npm (comes with Node.js)

├── 📝 FIREBASE_DEPLOYMENT_GUIDE.md     # Complete Firebase setup guide- Firebase Account ([Sign up](https://firebase.google.com/))

├── 

├── 📂 components/### Installation

│   ├── 👨‍💼 AdminDashboard.tsx          # Complete admin interface

│   ├── 📊 AdminReports.tsx            # Analytics and reporting1. **Clone the repository**

│   ├── 🏢 ClassroomManagement.tsx     # Classroom CRUD operations   ```bash

│   ├── 👨‍🏫 FacultyDashboard.tsx       # Faculty interface   git clone https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git

│   ├── 📅 FacultySchedule.tsx         # Schedule viewing component   cd "Digital Classroom Assignment for PLV CEIT Bldg (with backend)"

│   ├── 🔑 LoginForm.tsx               # Authentication interface   ```

│   ├── 🔒 PasswordResetPage.tsx       # Password reset functionality

│   ├── ⚙️ ProfileSettings.tsx         # User profile management2. **Install dependencies**

│   ├── ✅ RequestApproval.tsx         # Booking request approval   ```bash

│   ├── 📝 RoomBooking.tsx             # Booking form with validation   npm install

│   ├── 🔍 RoomSearch.tsx              # Advanced classroom search   ```

│   ├── 📋 ScheduleViewer.tsx          # Schedule visualization

│   ├── 👥 SignupApproval.tsx          # Faculty signup approval3. **Configure Firebase**

│   ├── ⚠️ SessionTimeoutWarning.tsx   # Security session management   - Copy `.env.example` to `.env`

│   ├── 🎨 animations/   - Add your Firebase configuration:

│   │   └── AppleMotion.tsx             # Apple-inspired animations   ```

│   └── 🧩 ui/                         # 40+ Shadcn/ui components   VITE_FIREBASE_API_KEY=your_api_key

│       ├── button.tsx, card.tsx, dialog.tsx   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain

│       ├── form.tsx, input.tsx, select.tsx   VITE_FIREBASE_PROJECT_ID=your_project_id

│       ├── table.tsx, tabs.tsx, toast.tsx   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket

│       └── ... (complete UI component library)   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id

├──    VITE_FIREBASE_APP_ID=your_app_id

├── 📂 lib/   VITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph

│   ├── 🔥 firebaseConfig.ts           # Firebase initialization with error handling   ```

│   ├── 🔄 firebaseService.ts         # Complete Firebase service layer

│   └── 💾 localStorageService.ts     # Client-side storage utilities4. **Run the development server**

├──    ```bash

├── 📂 hooks/   npm run dev

│   ├── ⏰ useIdleTimeout.ts           # Security session timeout   ```

│   └── 📜 useScrollTrigger.ts        # Smooth scroll animations   Visit `http://localhost:5173`

├── 

├── 📂 utils/5. **Build for production**

│   ├── 🎭 animation.ts                # Framer Motion utilities   ```bash

│   └── 🕒 timeUtils.ts               # Date/time formatting utilities   npm run build

├──    ```

├── 📂 styles/

│   └── 🎨 globals.css                # Tailwind CSS 4 with custom styles## 🔧 Firebase Setup

├── 

├── 📂 email-templates/               # HTML email templatesFor detailed Firebase setup instructions, see: [`guidelines/FirebaseDashboardSetup.md`](guidelines/FirebaseDashboardSetup.md)

│   ├── email-verification-template.html

│   ├── password-reset-template-FIXED.html### Quick Setup Steps:

│   └── email-change-template.html1. Create a Firebase project

├── 2. Enable Authentication (Email/Password)

└── 📂 guidelines/                    # Comprehensive documentation3. Create Firestore database

    ├── 🔥 FIREBASE_QUICK_REFERENCE.md4. Configure security rules

    ├── 🛠️ FIREBASE_TROUBLESHOOTING.md5. Create initial admin user

    ├── 📋 FirebaseDashboardSetup.md6. Add environment variables

    └── 📝 Guidelines.md

```## 🔐 Authentication Overview



## 🗄️ Database Schema (Firestore)- Email/password accounts managed by **Firebase Auth**

- Faculty sign up through public request form (status: `pending`)

### Collections Structure- Admin approval required before faculty can sign in

- Configure admin emails via `VITE_FIREBASE_ADMIN_EMAILS` environment variable

#### `users`- Create initial admin user in Firebase Auth before first run

```typescript

{## 📊 Database Collections (Firestore)

  id: string;           // Auto-generated document ID

  email: string;        // User email (unique)### `users`

  name: string;         // Full name- email, name, role, department, status, timestamps

  role: 'admin' | 'faculty';

  department?: string;  // Faculty department### `classrooms`

  status: 'pending' | 'approved' | 'rejected';- name, capacity, equipment, building, floor, isAvailable

  createdAt: Timestamp;

  updatedAt: Timestamp;### `bookingRequests`

}- classroomId, facultyId, date, startTime, endTime, purpose, status, adminFeedback

```

### `schedules`

#### `classrooms`- classroomId, facultyId, date, startTime, endTime, purpose

```typescript

{### `signupRequests`

  id: string;           // Auto-generated document ID- email, name, department, status, adminFeedback

  name: string;         // Room identifier (e.g., "Room 101")

  capacity: number;     // Maximum occupancy## 📈 Application Workflows

  equipment: string[];  // Available equipment array

  building: string;     // Building name### Faculty Booking Workflow

  floor: number;        // Floor number1. **Login** → Faculty logs in with credentials

  isAvailable: boolean; // Operational status2. **Search** → (Optional) Search for available classrooms

  createdAt: Timestamp;3. **Book** → Fill in booking form (classroom, date, time, purpose)

  updatedAt: Timestamp;4. **Submit** → Request sent to admin

}5. **Wait** → Monitor request status

```6. **Notified** → Receive notification when admin approves/rejects

7. **Confirmed** → Approved booking appears in schedules

#### `bookingRequests`

```typescript### Admin Approval Workflow

{1. **Login** → Admin logs in

  id: string;           // Auto-generated document ID2. **Review** → Go to "Approve Requests" tab

  facultyId: string;    // Reference to users collection3. **Check Conflicts** → System auto-detects conflicts

  facultyName: string;  // Cached faculty name4. **Decision** → Approve or reject with optional feedback

  classroomId: string;  // Reference to classrooms collection5. **Feedback** → Faculty receives notification

  classroomName: string; // Cached classroom name

  date: string;         // ISO date string### Faculty Signup Workflow

  startTime: string;    // 24-hour format1. **Register** → Click "Sign up as Faculty" on login page

  endTime: string;      // 24-hour format2. **Fill Form** → Provide email, name, department

  purpose: string;      // Booking purpose/description3. **Submit** → Request sent to admin

  status: 'pending' | 'approved' | 'rejected';4. **Admin Approves** → Admin reviews in "Signup Approvals"

  requestDate: string;  // ISO timestamp5. **Account Created** → User account created in Firebase Auth

  adminFeedback?: string; // Optional admin comments6. **Login** → Faculty can now login

  resolvedAt?: Timestamp; // Approval/rejection timestamp

}## 🎨 Design System

```

### School Hours

#### `schedules`- **Start**: 7:00 AM

```typescript- **End**: 8:00 PM

{- **Time Format**: 12-hour (AM/PM)

  id: string;           // Auto-generated document ID- **Time Slots**: 30-minute intervals

  classroomId: string;  // Reference to classrooms collection

  classroomName: string; // Cached classroom name### Equipment Types

  facultyId: string;    // Reference to users collection- TV (Television)

  facultyName: string;  // Cached faculty name- Projector

  date: string;         // ISO date string- Whiteboard

  startTime: string;    // 24-hour format- Computer

  endTime: string;      // 24-hour format- Audio System

  purpose: string;      // Schedule purpose- Air Conditioning

  status: 'confirmed' | 'cancelled';

  createdAt: Timestamp;### Design Features

}- Apple-inspired design system

```- 60fps smooth animations via Framer Motion

- 40+ Shadcn UI components

#### `signupRequests`- Mobile-first responsive design

```typescript- Accessible by default with keyboard navigation

{

  id: string;           // Auto-generated document ID## 🚀 Deployment

  email: string;        // Requested email

  name: string;         // Full name### Deploy to Vercel (Recommended)

  department: string;   // Department

  status: 'pending' | 'approved' | 'rejected';1. **Push to GitHub**

  adminFeedback?: string; // Optional admin comments   ```bash

  requestDate: string;  // ISO timestamp   git add .

  resolvedAt?: Timestamp; // Processing timestamp   git commit -m "Ready for deployment"

}   git push origin main

```   ```



## 🔒 Security Features2. **Connect to Vercel**

   - Go to [Vercel Dashboard](https://vercel.com)

### Firebase Security Rules   - Import your GitHub repository

- Role-based access control at database level   - Configure build settings

- User-specific data access restrictions

- Admin-only operations protection3. **Add Environment Variables**

- Real-time security rule validation   - Add all Firebase environment variables to Vercel project settings



### Authentication Security4. **Deploy**

- Secure session management with automatic timeout   - Vercel will automatically build and deploy your app

- Password reset with email verification

- Admin email verification for elevated permissions### Important Notes

- Client-side and server-side validation- The project is configured for Vercel deployment

- Add environment variables to your Vercel project

### Data Protection- Firebase keys are safe to use in frontend builds

- Input sanitization and validation

- XSS protection with React's built-in escaping## 🔧 Development

- CSRF protection through Firebase security

- Secure environment variable handling### Available Scripts

```bash

## 📊 System Workflowsnpm run dev          # Start development server

npm run build        # Build for production

### 👨‍🏫 Faculty Booking Processnpm run preview      # Preview production build

1. **Login** → Secure authentication with Firebase Authnpm run lint         # Run ESLint (if configured)

2. **Search** → Filter available classrooms by criteria```

3. **Book** → Fill detailed booking form with validation

4. **Submit** → Real-time request submission to admin### Code Style

5. **Track** → Monitor request status with live updates- TypeScript with strict mode

6. **Notification** → Receive instant approval/rejection alerts- Functional components with hooks

7. **Confirmed** → Approved booking appears in live schedules- Clean component architecture

- Responsive design patterns

### 👨‍💼 Admin Approval Process

1. **Dashboard** → Real-time view of all pending requests## 🐛 Troubleshooting

2. **Review** → Detailed request information with context

3. **Conflict Check** → Automatic scheduling conflict detection### Common Issues

4. **Decision** → Approve/reject with optional feedback

5. **Process** → Instant notification to faculty member#### Missing Firebase Environment Variables

6. **Schedule** → Auto-creation of confirmed schedule entry**Cause**: Missing or incorrect Firebase configuration  

**Solution**: 

### 🆕 Faculty Registration Process1. Check your `.env` file has all required variables

1. **Signup Form** → Public registration with validation2. Verify Firebase project configuration

2. **Request Submission** → Secure request to admin queue3. Restart development server

3. **Admin Review** → Admin validates faculty credentials

4. **Account Creation** → Firebase Auth account creation#### Authentication Issues

5. **Email Notification** → Welcome email with login instructions**Cause**: Firebase Auth not properly configured  

6. **First Login** → Secure access to faculty dashboard**Solution**:

1. Check Firebase Auth is enabled in console

## 🎨 Design System2. Verify admin emails are configured

3. Check Authentication providers are enabled

### Apple-Inspired Interface

- **Clean Minimalism**: Spacious layouts with purposeful whitespace#### Build/Deployment Issues

- **60fps Animations**: Smooth Framer Motion transitions**Cause**: Missing environment variables or incorrect configuration  

- **Consistent Typography**: Modern font hierarchy with perfect contrast**Solution**:

- **Accessible Colors**: WCAG 2.1 AA compliant color palette1. Verify all environment variables are set

- **Responsive Design**: Mobile-first approach with breakpoint optimization2. Check Firebase project configuration

3. Ensure build command is correct: `npm run build`

### Interactive Elements

- **Hover States**: Subtle feedback on all interactive elements## 📚 Additional Resources

- **Loading States**: Skeleton loaders and progress indicators

- **Error Handling**: User-friendly error messages with recovery options- [Firebase Setup Guide](guidelines/FirebaseDashboardSetup.md)

- **Success Feedback**: Satisfying confirmation animations and toasts- [Firebase Quick Reference](guidelines/FIREBASE_QUICK_REFERENCE.md)

- [Troubleshooting Guide](guidelines/FIREBASE_TROUBLESHOOTING.md)

### Time Management

- **School Hours**: 7:00 AM - 8:00 PM operational window## 🤝 Contributing

- **Time Slots**: Flexible 30-minute interval scheduling

- **Format**: 12-hour display (AM/PM) with 24-hour backend storage1. Fork the repository

- **Timezone**: Local timezone handling with proper formatting2. Create a feature branch: `git checkout -b feature-name`

3. Commit your changes: `git commit -m 'Add feature'`

## 🚀 Deployment Guide4. Push to the branch: `git push origin feature-name`

5. Open a Pull Request

### Deploy to Vercel (Recommended)

## 📄 License

1. **Push to GitHub**

   ```bashThis project is developed for Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology.

   git add .

   git commit -m "Ready for production deployment"## 🆘 Support

   git push origin latest-stable-build-v2

   ```For issues and questions:

- Check the [troubleshooting guide](guidelines/FIREBASE_TROUBLESHOOTING.md)

2. **Deploy to Vercel**- Review [Firebase documentation](https://firebase.google.com/docs)

   - Connect your GitHub repository to [Vercel](https://vercel.com)- Open an issue in this repository

   - Import the project with automatic framework detection

   - Configure environment variables in Vercel dashboard---

   - Deploy with automatic optimizations

**Latest Stable Build**: `v2` - Ready for production deployment

3. **Environment Variables in Vercel**3. Create initial admin user in Firebase Auth

   ```

   VITE_FIREBASE_API_KEY=your_api_key#### Build Errors

   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com**Cause**: Missing dependencies or configuration  

   VITE_FIREBASE_PROJECT_ID=your_project_id**Solution**:

   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com1. Run `npm install` to ensure all dependencies

   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id2. Check Node.js version (18+ required)

   VITE_FIREBASE_APP_ID=your_app_id3. Verify TypeScript configuration

   VITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph

   ```## 📚 Additional Resources



### Deploy to Firebase Hosting (Alternative)- [Firebase Documentation](https://firebase.google.com/docs)

- [React Documentation](https://react.dev/)

1. **Install Firebase CLI**- [Vite Documentation](https://vitejs.dev/)

   ```bash- [Tailwind CSS](https://tailwindcss.com/)

   npm install -g firebase-tools- [Shadcn UI](https://ui.shadcn.com/)

   firebase login

   ```## 🤝 Contributing



2. **Initialize Firebase Hosting**Contributions are welcome! To contribute:

   ```bash

   firebase init hosting1. Fork the repository

   # Select your Firebase project2. Create a feature branch: `git checkout -b feature/your-feature-name`

   # Set public directory to: dist3. Make your changes

   # Configure as single-page app: Yes4. Test thoroughly

   # Set up automatic builds: No (handled by GitHub Actions)5. Submit a pull request with clear description

   ```

## 📄 License

3. **Deploy**

   ```bashThis project is developed for PLV CEIT educational purposes.

   npm run build

   firebase deploy## 👨‍💻 Developer

   ```

**Built by**: Deign  

## 🛠️ Development**Repository**: [GitHub - Digital Classroom Assignment](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-)  

**Contact**: Available via GitHub Issues

### Available Scripts

```bash## 🙏 Acknowledgments

# Development

npm run dev          # Start Vite dev server with hot reload- **PLV CEIT** - For the project requirements and support

npm run build        # TypeScript compilation + Vite production build- **Firebase** - For the excellent backend-as-a-service platform

npm run preview      # Preview production build locally- **Shadcn** - For the beautiful UI component library

- **React & Vite** - For the modern development experience

# Deployment

npm run predeploy    # Automated pre-deployment build## 📞 Support

```

For issues, questions, or contributions:

### Development Best Practices- Open an issue on [GitHub](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/issues)

- **TypeScript Strict Mode**: Full type safety with strict compiler options- Check existing documentation

- **Component Architecture**: Functional components with hooks pattern- Review Firebase Console for backend errors

- **Performance Optimization**: React.memo, useMemo, useCallback where beneficial

- **Accessibility**: ARIA labels, keyboard navigation, screen reader support---

- **Code Organization**: Feature-based component structure with clear separation

**Last Updated**: October 3, 2025  

### Firebase Development**Version**: 2.0.0 (Firebase Edition)
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