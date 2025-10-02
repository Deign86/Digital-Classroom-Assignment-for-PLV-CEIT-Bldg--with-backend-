# Digital Classroom Assignment System# Digital Classroom Assignment System# Digital Classroom Assignment System# Digital Classroom Assignment System



> 📌 **Firebase Edition** – This application uses Firebase Authentication and Firestore for all backend services.



A comprehensive web-based classroom booking and management system for Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology. Features role-based dashboards, real-time conflict detection, comprehensive reporting, and secure Firebase authentication.> 📌 **Firebase Edition** – This application uses Firebase Authentication and Firestore for all backend services.



## 📘 Firebase Setup Guide



For detailed Firebase setup instructions, see: [`guidelines/FirebaseDashboardSetup.md`](guidelines/FirebaseDashboardSetup.md)A comprehensive web-based classroom booking and management system for Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology. Features role-based dashboards, real-time conflict detection, comprehensive reporting, and secure Firebase authentication.> 📌 **Firebase-first edition** – This application uses Firebase Authentication and Firestore for backend services. Follow the setup guide below to get started.> 📌 **Firebase-first edition** – This branch has been migrated to Firebase Authentication and Firestore. The architecture, seed data, and login flows are now powered by Firebase. Use the notes below to get set up quickly.igital Classroom Assignment System



## 🔐 Authentication Overview



- Email/password accounts managed by **Firebase Auth**## 📘 Firebase Setup Guide

- Faculty sign up through public request form (status: `pending`)

- Admin approval required before faculty can sign in

- Configure admin emails via `VITE_FIREBASE_ADMIN_EMAILS` environment variable

- Create initial admin user in Firebase Auth before first runFor detailed Firebase setup instructions, see: [`guidelines/FirebaseDashboardSetup.md`](guidelines/FirebaseDashboardSetup.md)## 📘 Firebase setup guide> 📌 **Firebase-first edition** – This branch has been migrated to Firebase Authentication and Firestore. If you followed an older “localStorage” or “Supabase” guide, please note that the architecture, seed data, and login flows have changed. Use the notes below to get set up quickly.



## 🎯 Features



### For Administrators (Registrar)## 🔐 Authentication Overview



- **Classroom Management**: Add, edit, and manage classroom inventory

- **Request Approval**: Review and approve/reject booking and signup requests

- **Conflict Detection**: Automatic scheduling conflict detection- Email/password accounts managed by **Firebase Auth**For step-by-step instructions on connecting this application to Firebase, see [`guidelines/FirebaseDashboardSetup.md`](guidelines/FirebaseDashboardSetup.md).## 📘 Firebase setup guide

- **Reports**: Generate utilization and booking reports

- **User Management**: Approve faculty signups and manage accounts- Faculty sign up through public request form (status: `pending`)



### For Faculty- Admin approval required before faculty can sign in



- **Room Booking**: Request classrooms with date and time selection- Configure admin emails via `VITE_FIREBASE_ADMIN_EMAILS` environment variable

- **Availability Search**: Search available classrooms by date, time, equipment

- **Schedule Viewing**: View personal and all classroom schedules- Create initial admin user in Firebase Auth before first run## 🔐 Authentication OverviewFor step-by-step instructions on wiring this build to the Firebase dashboard, see [`guidelines/FirebaseDashboardSetup.md`](guidelines/FirebaseDashboardSetup.md).

- **Request Tracking**: Monitor booking request status

- **Profile Settings**: Update personal information and account settings



## 🏗️ Technology Stack## 🎯 Features



### Frontend

- React 19 + TypeScript

- Vite 7### For Administrators (Registrar)- Email/Password accounts are created and managed by **Firebase Auth**.## 🔐 Authentication quick facts

- Tailwind CSS 4

- Shadcn/ui (Radix UI)

- Framer Motion

- Sonner (toasts)- **Classroom Management**: Add, edit, and manage classroom inventory- Faculty sign up through the public request form. Their `status` remains `pending` until an administrator approves them in the "Signups" tab.

- React Hook Form

- date-fns- **Request Approval**: Review and approve/reject booking and signup requests



### Backend- **Conflict Detection**: Automatic scheduling conflict detection- Admin approval changes the user's Firestore status to `approved`; rejected users cannot sign in.- Email/Password accounts are created and managed by **Firebase Auth**.

- Firebase Authentication

- Firebase Firestore- **Reports**: Generate utilization and booking reports

- Real-time listeners

- Firebase SDK- **User Management**: Approve faculty signups and manage accounts- Configure comma-separated admin emails via `VITE_FIREBASE_ADMIN_EMAILS` so that those accounts automatically get the `admin` role on first login.- Faculty sign up through the public request form. Their `status` remains `pending` until an administrator approves them in the “Signups” tab.



## 📁 Project Structure



```### For Faculty- There are **no default seeded passwords**. Create your initial admin user directly in Firebase Auth before running the app.- Admin approval flips the user’s Firebase/Firestore status to `approved`; rejected users can’t sign in.

├── App.tsx                          # Main application with Firebase integration

├── main.tsx                         # React entry point

├── index.html                       # HTML template

├── vite.config.ts                   # Vite configuration- **Room Booking**: Request classrooms with date and time selection- Configure comma-separated admin emails via `VITE_FIREBASE_ADMIN_EMAILS` so that those accounts automatically get the `admin` role on first login.

├── package.json                     # Dependencies

├── .env.example                     # Environment variables template- **Availability Search**: Search available classrooms by date, time, equipment

├── components/

│   ├── AdminDashboard.tsx          # Admin dashboard- **Schedule Viewing**: View personal and all classroom schedules---- There are **no default seeded passwords**. Create your initial admin user directly in Firebase Auth (or invite one) before running the app.

│   ├── AdminReports.tsx            # Reporting

│   ├── ClassroomManagement.tsx     # Classroom CRUD- **Request Tracking**: Monitor booking request status

│   ├── FacultyDashboard.tsx        # Faculty dashboard

│   ├── LoginForm.tsx               # Authentication- **Profile Settings**: Update personal information and account settings

│   ├── RoomBooking.tsx             # Booking form

│   ├── SignupApproval.tsx          # Signup approvals

│   └── ui/                         # UI components

├── lib/## 🏗️ Technology StackA comprehensive web-based classroom booking and management system for Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology. It features role-based dashboards, real-time conflict detection, comprehensive reporting capabilities, and secure authentication powered by Firebase.---

│   ├── firebaseConfig.ts           # Firebase configuration

│   └── firebaseService.ts          # Firebase services

├── hooks/

│   └── useScrollTrigger.ts### Frontend

├── utils/

│   ├── animation.ts- React 19 + TypeScript

│   └── timeUtils.ts

├── styles/- Vite 7## 🎯 OverviewA comprehensive web-based classroom booking and management system for Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology. It features role-based dashboards, real-time conflict detection, comprehensive reporting capabilities, and secure authentication powered by Firebase.

│   └── globals.css

└── guidelines/- Tailwind CSS 4

    └── FirebaseDashboardSetup.md   # Detailed Firebase setup

```- Shadcn/ui (Radix UI)



## 🚀 Getting Started- Framer Motion



### Prerequisites- Sonner (toasts)- **Role-aware dashboards** – rich admin tooling plus a focused faculty view.## 🎯 Overview



- Node.js 18+ ([Download](https://nodejs.org/))- React Hook Form

- npm (comes with Node.js)

- Firebase Account ([Sign up](https://firebase.google.com/))- date-fns- **Conflict-aware scheduling** – prevents double-bookings with automatic validation.



### Installation



1. **Clone the repository**### Backend- **Polished UI toolkit** – built with React 19, TypeScript, Tailwind CSS 4, Radix UI, Framer Motion, and Sonner toasts.- **Role-aware dashboards** – rich admin tooling plus a focused faculty view.



```bash- Firebase Authentication

git clone https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git

cd "Digital Classroom Assignment for PLV CEIT Bldg (with backend)"- Firebase Firestore

```

- Real-time listeners

2. **Install dependencies**

- Firebase SDK### For Administrators (Registrar)- **Conflict-aware scheduling** – prevents double-bookings with the same validation logic used in the original backend.### For Administrators (Registrar)

```bash

npm install

```

## 📁 Project Structure

3. **Set up Firebase**



   See [`guidelines/FirebaseDashboardSetup.md`](guidelines/FirebaseDashboardSetup.md) for:

   - Creating Firebase project```- **Classroom Management**: Add, edit, and manage classroom inventory with real-time database updates- **Polished UI toolkit** – built with React 19, TypeScript, Tailwind CSS 4, Radix UI, Framer Motion, and Sonner toasts.- **Classroom Management**: Add, edit, and manage classroom inventory with real-time database updates

   - Configuring authentication

   - Setting up Firestore├── App.tsx                          # Main application with Firebase integration

   - Security rules

   - Environment variables├── main.tsx                         # React entry point- **Request Approval**: Review and approve/reject booking and signup requests with admin feedback



4. **Configure environment variables**├── index.html                       # HTML template



   Create `.env` file with your Firebase credentials:├── vite.config.ts                   # Vite configuration- **Conflict Detection**: Automatic detection of scheduling conflicts across all bookings- **Request Approval**: Review and approve/reject booking and signup requests with admin feedback



```bash├── package.json                     # Dependencies

VITE_FIREBASE_API_KEY=your_api_key

VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain├── .env.example                     # Environment variables template- **Comprehensive Reports**: Generate utilization and booking reports with filtering

VITE_FIREBASE_PROJECT_ID=your_project_id

VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket├── components/

VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id

VITE_FIREBASE_APP_ID=your_app_id│   ├── AdminDashboard.tsx          # Admin dashboard- **User Management**: Approve new faculty signup requests and manage user accounts---- **Conflict Detection**: Automatic detection of scheduling conflicts across all bookings

VITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph

```│   ├── AdminReports.tsx            # Reporting



5. **Run the application**│   ├── ClassroomManagement.tsx     # Classroom CRUD- **Profile Management**: Update profile information and change password securely



```bash│   ├── FacultyDashboard.tsx        # Faculty dashboard

npm run dev

```│   ├── LoginForm.tsx               # Authentication- **Comprehensive Reports**: Generate utilization and booking reports with filtering



Visit `http://localhost:5173`│   ├── RoomBooking.tsx             # Booking form



## 🔧 Build & Deploy│   ├── SignupApproval.tsx          # Signup approvals### For Faculty



### Build for Production│   └── ui/                         # UI components



```bash├── lib/## 🧱 Technology Stack- **User Management**: Approve new faculty signup requests and manage user accounts

npm run build

```│   ├── firebaseConfig.ts           # Firebase configuration



Output in `dist/` folder.│   └── firebaseService.ts          # Firebase services- **User Registration**: Self-service signup with admin approval workflow



### Preview Build├── hooks/



```bash│   └── useScrollTrigger.ts- **Room Booking**: Request classrooms with date and time selection- **Profile Management**: Update profile information and change password securely

npm run preview

```├── utils/



### Deploy to Vercel│   ├── animation.ts- **Availability Search**: Search for available classrooms by date, time, and equipment



1. Push to GitHub│   └── timeUtils.ts

2. Import project in Vercel

3. Add Firebase environment variables├── styles/- **Schedule Viewing**: View personal and all classroom schedules in real-time| Layer        | Tools |

4. Deploy

│   └── globals.css

### Deploy to Netlify

└── guidelines/- **Request Tracking**: Monitor status of booking requests with admin feedback

1. Build locally: `npm run build`

2. Deploy `dist/` folder to Netlify    └── FirebaseDashboardSetup.md   # Detailed Firebase setup

3. Add environment variables in Site Settings

```- **Profile Settings**: Update personal information and manage account settings|--------------|-------|### For Faculty

## 📊 Database Collections (Firestore)



### `users`

User profiles and authentication data## 🚀 Getting Started- **Password Reset**: Secure password reset via email

- `email` (string, unique)

- `name` (string)

- `role` (string: 'admin' or 'faculty')

- `department` (string, optional)### Prerequisites| Framework    | React 19 + TypeScript |- **User Registration**: Self-service signup with admin approval workflow

- `status` (string: 'pending' or 'approved')

- `createdAt` (timestamp)

- `updatedAt` (timestamp)

- Node.js 18+ ([Download](https://nodejs.org/))> _Data and authentication are managed with Firebase (Firestore + Auth). Configure credentials in `.env` per the Firebase dashboard guide._

### `classrooms`

Classroom inventory- npm (comes with Node.js)

- `name` (string, unique)

- `capacity` (number)- Firebase Account ([Sign up](https://firebase.google.com/))| Build Tool   | Vite 7 |- **Room Booking**: Request classrooms with date and time selection

- `equipment` (array)

- `building` (string)

- `floor` (number)

- `isAvailable` (boolean)### Installation### Authentication & Security

- `createdAt` (timestamp)



### `bookingRequests`

Faculty booking requests pending approval1. **Clone the repository**| Styling      | Tailwind CSS 4 + CSS Modules |- **Availability Search**: Search for available classrooms by date, time, and equipment

- `classroomId` (reference)

- `facultyId` (reference)

- `date` (date)

- `startTime` (string)```bash- **Firebase Auth**: Secure authentication with email/password

- `endTime` (string)

- `purpose` (string)git clone https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git

- `status` (string: 'pending', 'approved', 'rejected')

- `adminFeedback` (string, optional)cd "Digital Classroom Assignment for PLV CEIT Bldg (with backend)"- **Password Reset**: Email-based password recovery| UI Library   | Radix UI primitives, Shadcn-inspired components |- **Schedule Viewing**: View personal and all classroom schedules in real-time

- `requestDate` (timestamp)

- `reviewedAt` (timestamp, optional)```



### `schedules`- **Firestore Security Rules**: Database-level access control

Confirmed/approved classroom schedules

- `classroomId` (reference)2. **Install dependencies**

- `facultyId` (reference)

- `date` (date)- **Anonymous Signup**: Public access for new faculty registration| Animation    | Framer Motion |- **Request Tracking**: Monitor status of booking requests with admin feedback

- `startTime` (string)

- `endTime` (string)```bash

- `purpose` (string)

- `createdAt` (timestamp)npm install- **Auto-confirmed Emails**: Admin-approved users are auto-verified



### `signupRequests````

New faculty registration requests

- `email` (string, unique)| Notifications| Sonner |- **Profile Settings**: Update personal information and manage account settings

- `name` (string)

- `department` (string)3. **Set up Firebase**

- `status` (string: 'pending', 'approved', 'rejected')

- `adminFeedback` (string, optional)## 🏗️ Technical Stack

- `requestDate` (timestamp)

- `reviewedAt` (timestamp, optional)   See [`guidelines/FirebaseDashboardSetup.md`](guidelines/FirebaseDashboardSetup.md) for:



## 🔐 Security Features   - Creating Firebase project- **Password Reset**: Secure password reset via email



### Firebase Authentication   - Configuring authentication

- Email/password authentication

- Secure password hashing (handled by Firebase)   - Setting up Firestore### Frontend

- JWT tokens for session management

- Email verification for approved users   - Security rules

- Password reset via email

   - Environment variables> _Data and authentication now live in Firebase (Firestore + Auth). Configure credentials in `.env` per the Firebase dashboard guide._

### Firestore Security Rules

- Users can only access their own data

- Admins have full access to all data

- Anonymous users can submit signup requests4. **Configure environment variables**- **Framework**: React 19 with TypeScript

- Faculty can view classrooms and submit bookings



### Data Validation

- Client-side validation with React Hook Form   Create `.env` file with your Firebase credentials:- **Styling**: Tailwind CSS v4 with Apple-style design system### Authentication & Security

- Server-side validation via Firestore Security Rules

- Conflict detection for overlapping bookings

- Equipment and time slot validation

```bash- **UI Components**: Shadcn/ui component library (Radix UI primitives)

## 🔧 Configuration

VITE_FIREBASE_API_KEY=your_api_key

### School Hours

- **Start**: 7:00 AMVITE_FIREBASE_AUTH_DOMAIN=your_auth_domain- **Icons**: Lucide React---- **Supabase Auth**: Secure authentication with email/password

- **End**: 8:00 PM

- **Time Format**: 12-hour (AM/PM)VITE_FIREBASE_PROJECT_ID=your_project_id

- **Time Slots**: 30-minute intervals

VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket- **Toast Notifications**: Sonner

### Equipment Types

- TV (Television)VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id

- Projector

- WhiteboardVITE_FIREBASE_APP_ID=your_app_id- **Date Handling**: date-fns- **Password Reset**: Email-based password recovery

- Computer

- Audio SystemVITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph

- Air Conditioning

```- **Animations**: Framer Motion

## 🎨 Design System



The application uses an Apple-inspired design system:

5. **Run the application**- **Forms**: React Hook Form## 🚀 Getting Started- **Row-Level Security (RLS)**: Database-level access control

### Typography

- **Font Stack**: SF Pro-style system fonts

- **Base Size**: 14px

- **Hierarchy**: Clear heading levels (h1-h6)```bash- **Build Tool**: Vite 7



### Colorsnpm run dev

- **Primary**: Apple Blue (#007aff)

- **Success**: Green (#34c759)```- **State Management**: React Hooks (useState, useEffect, useMemo, useCallback)- **Anonymous Signup**: Public access for new faculty registration

- **Warning**: Orange (#ff9500)

- **Danger**: Red (#ff3b30)

- **Neutral**: Gray scale palette

Visit `http://localhost:5173`

### Animations

- **60fps smooth animations** via Framer Motion

- **Page transitions**

- **Scroll-triggered effects**## 🔧 Build & Deploy### Backend1. **Install prerequisites**- **Auto-confirmed Emails**: Admin-approved users are auto-verified

- **Micro-interactions**



### Components

- **40+ Shadcn UI components**### Build for Production

- **Accessible by default**

- **Keyboard navigation**

- **Screen reader support**

```bash- **Database**: Firebase Firestore   - Node.js 18 or newer

## 🔄 Application Workflows

npm run build

### Faculty Booking Workflow

1. **Login** → Faculty logs in with credentials```- **Authentication**: Firebase Auth

2. **Search** → (Optional) Search for available classrooms

3. **Book** → Fill in booking form (classroom, date, time, purpose)

4. **Submit** → Request sent to admin

5. **Wait** → Monitor request statusOutput in `dist/` folder.- **Real-time**: Firestore real-time listeners   - npm 9+ (ships with Node)## 🏗️ Technical Stack

6. **Notified** → Receive notification when admin approves/rejects

7. **Confirmed** → Approved booking appears in schedules



### Admin Approval Workflow### Preview Build- **Storage**: Firestore for secure data persistence

1. **Login** → Admin logs in

2. **Review** → Go to "Approve Requests" tab

3. **Check Conflicts** → System auto-detects conflicts

4. **Decision** → Approve or reject with optional feedback```bash- **API**: Firebase SDK

5. **Feedback** → Faculty receives notification

npm run preview

### Faculty Signup Workflow

1. **Register** → Click "Sign up as Faculty" on login page```

2. **Fill Form** → Provide email, name, department

3. **Submit** → Request sent to admin

4. **Admin Approves** → Admin reviews in "Signup Approvals"

5. **Account Created** → User account created in Firebase Auth### Deploy to Vercel## 📁 Project Structure2. **Install dependencies**### Frontend

6. **Login** → Faculty can now login



### Password Reset Workflow

1. **Forgot Password** → Click "Forgot Password?" on login1. Push to GitHub

2. **Enter Email** → Provide registered email

3. **Check Email** → Receive reset link from Firebase2. Import project in Vercel

4. **Reset** → Click link and set new password

5. **Login** → Login with new credentials3. Add Firebase environment variables```   ```bash- **Framework**: React 19 with TypeScript



## 🔐 Features Implementation Details4. Deploy



### Conflict Detection├── App.tsx                          # Main application entry point with Firebase integration

- Real-time validation against existing schedules

- Checking pending requests to avoid conflicts## 📊 Database Collections (Firestore)

- Past time validation (can't book in the past)

- Self-exclusion during approval├── main.tsx                         # React entry point   npm install- **Styling**: Tailwind CSS v4 with Apple-style design system

- Time overlap detection

### `users`

### Real-time Updates

- Firestore listeners for live data changes- email, name, role, department, status, timestamps├── index.html                       # HTML template

- Toast notifications for success/error feedback

- Admin feedback displayed on request status

- Automatic data refresh when records change

### `classrooms`├── vite.config.ts                   # Vite configuration   ```- **UI Components**: Shadcn/ui component library (Radix UI primitives)

### Responsive Design

- Mobile-first approach- name, capacity, equipment, building, floor, isAvailable

- Tablet optimization

- Desktop layouts├── tsconfig.json                    # TypeScript configuration

- Touch-friendly buttons and inputs

- Collapsible navigation on mobile### `bookingRequests`



### Form Validation- classroomId, facultyId, date, startTime, endTime, purpose, status, adminFeedback├── package.json                     # Dependencies and scripts- **Icons**: Lucide React

- Required field checks

- Email format validation

- Password strength requirements

- Date/time validity### `schedules`├── .env.example                     # Environment variables template

- Capacity limits

- Duplicate prevention- classroomId, facultyId, date, startTime, endTime, purpose



## 📊 Reports & Analytics├── components/3. **Start the development server**- **Toast Notifications**: Sonner



### Classroom Utilization Report### `signupRequests`

- Total bookings per classroom

- Utilization percentage- email, name, department, status, adminFeedback│   ├── AdminDashboard.tsx          # Admin dashboard container

- Peak usage times

- Equipment usage statistics

- Filters: Date range, specific classrooms

## 🔐 Security│   ├── AdminReports.tsx            # Reporting functionality   ```bash- **Date Handling**: date-fns

### Faculty Booking Report

- Total bookings per faculty member

- Booking frequency

- Preferred classrooms- **Firebase Auth**: Secure email/password authentication│   ├── ClassroomManagement.tsx     # Classroom CRUD operations

- Cancellation rate

- Filters: Date range, department, faculty- **Firestore Security Rules**: Row-level access control



### Schedule Overview- **JWT Tokens**: Session management│   ├── ErrorBoundary.tsx           # Error handling wrapper   npm run dev- **Animations**: Framer Motion

- Chronological listing

- Faculty and classroom details- **Password Reset**: Email-based recovery

- Time slot information

- Purpose/reason display- **Client-side Validation**: React Hook Form│   ├── FacultyDashboard.tsx        # Faculty dashboard container

- Actions: Admin can cancel schedules

- **Conflict Detection**: Prevents double-bookings

## 🐛 Troubleshooting

│   ├── FacultySchedule.tsx         # Faculty schedule viewer   ```- **Forms**: React Hook Form

### ❌ "Missing Firebase environment variables"

**Cause**: `.env` file not created or incorrect values  ## 🎨 Design System

**Solution**:

1. Create `.env` file in project root│   ├── Footer.tsx                  # Application footer

2. Copy from `.env.example`

3. Fill in Firebase credentials from Firebase Console- **Apple-inspired UI**: Clean, modern design

4. Restart dev server (`Ctrl+C` then `npm run dev`)

- **60fps Animations**: Framer Motion│   ├── LoginForm.tsx               # Authentication form- **Build Tool**: Vite 7

### ❌ Firebase connection fails

**Cause**: Wrong Firebase configuration  - **Responsive**: Mobile-first approach

**Solution**:

1. Verify credentials in Firebase Console → Project Settings- **Accessible**: Keyboard navigation, screen readers│   ├── PasswordResetDialog.tsx     # Password reset modal

2. Ensure no extra spaces in `.env` file

3. Check if Firebase project is active- **Dark Mode Ready**: Theme support



### ❌ Login fails with correct credentials│   ├── PasswordResetPage.tsx       # Password reset page4. Visit [http://localhost:5173](http://localhost:5173) and sign in with one of the default accounts below.- **State Management**: React Hooks (useState, useEffect, useMemo, useCallback)

**Cause**: User doesn't exist in Firebase Auth  

**Solution**:## 🔄 Workflows

1. Check Firebase Console → Authentication → Users

2. Create admin user manually if needed│   ├── ProfileSettings.tsx         # User profile management

3. Verify email in `VITE_FIREBASE_ADMIN_EMAILS` for admin access

### Faculty Booking

### ❌ Signup requests not working

**Cause**: Firestore security rules not configured  1. Login → Search rooms → Book → Submit → Wait for approval → Confirmed│   ├── RequestApproval.tsx         # Booking request approval

**Solution**:

1. Check Firestore Security Rules in Firebase Console

2. Verify `signupRequests` collection allows anonymous writes

3. Refer to Firebase setup guide for correct rules### Admin Approval│   ├── RoomBooking.tsx             # Room booking form



### ❌ Port already in use1. Login → Review requests → Check conflicts → Approve/Reject → Faculty notified

**Cause**: Another app using port 5173  

**Solution**:│   ├── RoomSearch.tsx              # Availability search---### Backend

- Vite auto-assigns next available port

- Or specify: `npm run dev -- --port 3000`### Faculty Signup



## 📚 Documentation1. Register → Fill form → Submit → Admin reviews → Approved → Login│   ├── ScheduleViewer.tsx          # Schedule display



- [Firebase Documentation](https://firebase.google.com/docs)

- [React Documentation](https://react.dev/)

- [Vite Documentation](https://vitejs.dev/)### Password Reset│   ├── SignupApproval.tsx          # Faculty signup approval- **Database**: Supabase (PostgreSQL)

- [Tailwind CSS](https://tailwindcss.com/)

- [Shadcn UI](https://ui.shadcn.com/)1. Forgot password → Enter email → Check email → Reset → Login



## 🧪 Testing Checklist│   ├── animations/



### Authentication## 🐛 Troubleshooting

- ✅ Login with valid/invalid credentials

- ✅ Logout clears session│   │   └── AppleMotion.tsx         # Animation utilities## 🔐 Default Accounts- **Authentication**: Supabase Auth

- ✅ Password reset sends email

- ✅ Signup form validation### Missing Firebase environment variables



### Faculty Features- Create `.env` file from `.env.example`│   ├── figma/

- ✅ Book a classroom

- ✅ Search for available rooms- Add Firebase credentials from Firebase Console

- ✅ View own schedule

- ✅ View all schedules- Restart dev server│   │   └── ImageWithFallback.tsx   # Image component with fallback- **Real-time**: Supabase Realtime subscriptions

- ✅ Update profile

- ✅ Change password



### Admin Features### Firebase connection fails│   └── ui/                         # Shadcn UI components (40+ components)

- ✅ Approve/reject booking requests

- ✅ Approve/reject signup requests- Verify credentials in Firebase Console → Project Settings

- ✅ Add new classroom

- ✅ Edit classroom details- Check for extra spaces in `.env`├── hooks/| Role   | Email                | Password      |- **Storage**: Supabase for secure data persistence

- ✅ Generate reports

- ✅ Cancel confirmed schedules- Ensure Firebase project is active



### Conflict Detection│   └── useScrollTrigger.ts         # Scroll-based animations

- ✅ Cannot book overlapping times

- ✅ Cannot book past dates/times### Login fails

- ✅ Pending requests checked for conflicts

- ✅ Self-conflicts excluded during approval- Check user exists in Firebase Auth├── lib/|--------|----------------------|---------------|- **API**: Supabase auto-generated REST API



## 🤝 Contributing- Verify email in `VITE_FIREBASE_ADMIN_EMAILS` for admin access



Contributions are welcome! To contribute:│   ├── firebaseConfig.ts           # Firebase configuration



1. Fork the repository### Port in use

2. Create a feature branch

3. Make your changes- Vite auto-assigns next available port│   └── firebaseService.ts          # Firebase service functions| Admin  | `admin@plv.edu.ph`   | `admin123456` |

4. Test thoroughly

5. Submit a pull request- Or specify: `npm run dev -- --port 3000`



## 📄 License├── utils/



This project is developed for PLV CEIT educational purposes.## 📚 Documentation



## 👨‍💻 Developer│   ├── animation.ts                # Animation helpers| Faculty| `faculty@plv.edu.ph` | `faculty123`  |## 📁 Project Structure



**Built by**: Deign  - [Firebase Documentation](https://firebase.google.com/docs)

**Repository**: [GitHub - Digital Classroom Assignment](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-)  

**Contact**: Available via GitHub Issues- [React Documentation](https://react.dev/)│   └── timeUtils.ts                # Time formatting utilities



## 🙏 Acknowledgments- [Vite Documentation](https://vitejs.dev/)



- **PLV CEIT** - For the project requirements and support- [Tailwind CSS](https://tailwindcss.com/)├── styles/

- **Firebase** - For the excellent backend-as-a-service platform

- **Shadcn** - For the beautiful UI component library- [Shadcn UI](https://ui.shadcn.com/)

- **React & Vite** - For the modern development experience

│   └── globals.css                 # Global styles and design tokens

## 📞 Support

## 🧪 Testing Checklist

For issues, questions, or contributions:

- Open an issue on [GitHub](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/issues)└── guidelines/You can create additional faculty accounts through the signup request flow. Approved accounts receive the password you set during approval.```

- Check existing documentation

- Review Firebase Console for backend errors### Authentication



---- ✅ Login with valid/invalid credentials    ├── FirebaseDashboardSetup.md   # Firebase setup guide



**Last Updated**: October 3, 2025  - ✅ Logout

**Version**: 2.0.0 (Firebase Edition)

- ✅ Password reset    └── Guidelines.md               # Development guidelines├── App.tsx                          # Main application entry point with Supabase integration

- ✅ Signup validation

```

### Faculty Features

- ✅ Book classroom---├── main.tsx                         # React entry point

- ✅ Search rooms

- ✅ View schedules## 🚀 Getting Started

- ✅ Update profile

├── index.html                       # HTML template

### Admin Features

- ✅ Approve/reject requests### Prerequisites

- ✅ Add/edit classrooms

- ✅ Generate reports## 📦 Data & Persistence├── vite.config.ts                   # Vite configuration

- ✅ Cancel schedules

- **Node.js** 18 or higher ([Download here](https://nodejs.org/))

### Conflict Detection

- ✅ Prevent overlapping bookings- **npm** (comes with Node.js) or **yarn** package manager├── tsconfig.json                    # TypeScript configuration

- ✅ Validate past dates

- ✅ Check pending requests- **Firebase Account** ([Sign up free](https://firebase.google.com/))



## 🤝 Contributing- **Git** (optional, for cloning)- All records (users, classrooms, requests, schedules) are saved inside browser `localStorage` with keys that begin with `classroom_`.├── package.json                     # Dependencies and scripts



1. Fork the repository

2. Create feature branch

3. Make changes---- The first load seeds:├── .env.example                     # Environment variables template

4. Test thoroughly

5. Submit pull request



## 📄 License### Step 1: Clone or Download the Repository  - 1 admin + 1 faculty account├── components/



Developed for PLV CEIT educational purposes.



## 👨‍💻 Developer#### Option A: Clone with Git  - 3 sample classrooms (Room 101, Room 102, Lab 201)│   ├── AdminDashboard.tsx          # Admin dashboard container



**Built by**: Deign  

**Repository**: [GitHub](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-)  

**Contact**: GitHub Issues```bash- Data persists per browser profile. Open a private window to start with a clean slate.│   ├── AdminReports.tsx            # Reporting functionality



## 🙏 Acknowledgmentsgit clone https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git



- **PLV CEIT** - Project requirements and supportcd "Digital Classroom Assignment for PLV CEIT Bldg (with backend)"│   ├── ClassroomManagement.tsx     # Classroom CRUD operations

- **Firebase** - Backend platform

- **Shadcn** - UI components```

- **React & Vite** - Development framework

### Resetting Everything│   ├── ErrorBoundary.tsx           # Error handling wrapper

## 📞 Support

#### Option B: Download ZIP

- [Open an Issue](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/issues)

- Check Firebase Console for errors│   ├── FacultyDashboard.tsx        # Faculty dashboard container

- Review documentation

1. Download the ZIP file from GitHub

---

2. Extract to your desired locationUse whichever method you prefer:│   ├── FacultySchedule.tsx         # Faculty schedule viewer

**Last Updated**: October 3, 2025  

**Version**: 2.0.0 (Firebase Edition)3. Open terminal/command prompt in the extracted folder


│   ├── Footer.tsx                  # Application footer

---

- **In-app utility** – open DevTools console and run:│   ├── LoginForm.tsx               # Authentication form

### Step 2: Install Dependencies

  ```ts│   ├── PasswordResetDialog.tsx     # Password reset modal

```bash

npm install  import { clearAllData } from './lib/localStorageService';│   ├── PasswordResetPage.tsx       # Password reset page

```

  clearAllData();│   ├── ProfileSettings.tsx         # User profile management

This will install all required packages including:

- React, TypeScript, and Vite  ```│   ├── RequestApproval.tsx         # Booking request approval

- Firebase SDK

- UI components (Radix UI, Shadcn)- **Browser tools** – DevTools → Application/Storage tab → Clear localStorage.│   ├── RoomBooking.tsx             # Room booking form

- Utilities (date-fns, Framer Motion, etc.)

- **Manual tweak** – remove specific `classroom_*` keys to keep selected data.│   ├── RoomSearch.tsx              # Availability search

---

│   ├── ScheduleViewer.tsx          # Schedule display

### Step 3: Set Up Firebase Backend

The app will reseed default data on the next reload if no records are present.│   ├── SignupApproval.tsx          # Faculty signup approval

Please refer to the comprehensive Firebase setup guide:

**[`guidelines/FirebaseDashboardSetup.md`](guidelines/FirebaseDashboardSetup.md)**│   ├── animations/



This guide covers:---│   │   └── AppleMotion.tsx         # Animation utilities

- Creating a Firebase project

- Configuring authentication│   ├── figma/

- Setting up Firestore database

- Configuring environment variables## 🧩 Code Map│   │   └── ImageWithFallback.tsx   # Image component with fallback

- Security rules

│   └── ui/                         # Shadcn UI components (40+ components)

---

```├── database/

### Step 4: Run the Application

├── App.tsx                     # Root component and state orchestration│   ├── COMPLETE_SETUP.sql          # Complete database setup script

```bash

npm run dev├── components/                 # Dashboards, dialogs, and UI building blocks│   ├── schema.sql                  # Database schema

```

│   ├── AdminDashboard.tsx      # Administrative workspace│   ├── schema_supabase_auth.sql    # Auth schema setup

The app will start at `http://localhost:5173` (or another port if 5173 is busy)

│   ├── FacultyDashboard.tsx    # Faculty scheduling portal│   ├── supabase_auth_setup.sql     # Auth configuration

---

│   ├── LoginForm.tsx           # Auth entry point (local handlers)│   ├── fix_rls_anonymous_access.sql # RLS fixes

### 🎉 You're Ready!

│   └── ...                     # Supporting components│   └── reset_auth_setup.sql        # Reset script

Your local instance is now running with:

- ✅ Firebase authentication├── lib/localStorageService.ts  # Central data layer & auth/session helpers├── hooks/

- ✅ Firestore database

- ✅ Real-time updates├── utils/                      # Time utilities and animation helpers│   └── useScrollTrigger.ts         # Scroll-based animations



---├── styles/globals.css          # Global Tailwind + custom styles├── lib/



## 🔧 Additional Configuration└── vite.config.ts              # Vite configuration│   ├── supabaseClient.ts           # Supabase client configuration



### Building for Production```│   ├── supabaseAuth.ts             # Authentication service



```bash│   └── supabaseService.ts          # Database service functions

npm run build

```Key service contracts exposed from `lib/localStorageService.ts`:├── utils/



This creates an optimized production build in the `dist/` folder.│   ├── animation.ts                # Animation helpers



### Preview Production Build- `authService` – sign in/out, password updates, auth listeners│   └── timeUtils.ts                # Time formatting utilities



```bash- `userService` – CRUD for admin/faculty records├── styles/

npm run preview

```- `classroomService` – classroom inventory management│   └── globals.css                 # Global styles and design tokens



### Environment Variables- `bookingRequestService` – booking lifecycle + conflict checks└── guidelines/



Create a `.env` file in the project root with your Firebase credentials:- `scheduleService` – confirmed schedules and cancellation flow    └── Guidelines.md               # Development guidelines



```bash- `signupRequestService` – faculty onboarding workflow```

# Firebase Configuration

VITE_FIREBASE_API_KEY=your_api_key

VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain

VITE_FIREBASE_PROJECT_ID=your_project_idWhen you are ready to connect a real backend, implement these same contracts against your API and swap the import in `App.tsx`.## 🚀 Getting Started (Run Locally)

VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket

VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id

VITE_FIREBASE_APP_ID=your_app_id

VITE_FIREBASE_ADMIN_EMAILS=admin1@plv.edu.ph,admin2@plv.edu.ph---### Prerequisites

```

- **Node.js** 18 or higher ([Download here](https://nodejs.org/))

⚠️ **IMPORTANT**: 

- Never commit the `.env` file to Git (it's already in `.gitignore`)## 🧪 Smoke Test Checklist- **npm** (comes with Node.js) or **yarn** package manager

- Get these values from Firebase Console → Project Settings

- **Supabase Account** ([Sign up free](https://supabase.com/))

---

After installing:- **Git** (optional, for cloning)

## 📊 Database Collections



### Firestore Collections

- [ ] Sign in as admin and inspect the dashboard widgets---

#### `users`

User profiles and authentication data- [ ] Approve a pending signup request and share the generated password

- `email` (string, unique)

- `name` (string)- [ ] Submit a classroom booking as faculty, then approve it as admin### Step 1: Clone or Download the Repository

- `role` (string: 'admin' or 'faculty')

- `department` (string, optional)- [ ] Attempt to double-book a room at the same time (should be blocked)

- `status` (string: 'pending' or 'approved')

- `createdAt` (timestamp)- [ ] Cancel a existing schedule and confirm availability updates instantly#### Option A: Clone with Git

- `updatedAt` (timestamp)

```bash

#### `classrooms`

Classroom inventory---git clone https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git

- `name` (string, unique)

- `capacity` (number)cd "Digital Classroom Assignment for PLV CEIT Bldg (with backend)"

- `equipment` (array)

- `building` (string)## 🛠️ Customisation Tips```

- `floor` (number)

- `isAvailable` (boolean)

- `createdAt` (timestamp)

- **Change seed data:** edit `initializeDefaultData()` inside `localStorageService.ts`.#### Option B: Download ZIP

#### `bookingRequests`

Faculty booking requests pending approval- **Add new fields:** update the shared TypeScript interfaces in `App.tsx` and extend the form components accordingly.1. Download the ZIP file from GitHub

- `classroomId` (reference)

- `facultyId` (reference)- **Persist to files:** export/import helpers are included (`exportAllData`, `importAllData`) for moving data between browsers.2. Extract to your desired location

- `date` (date)

- `startTime` (string)3. Open terminal/command prompt in the extracted folder

- `endTime` (string)

- `purpose` (string)---

- `status` (string: 'pending', 'approved', 'rejected')

- `adminFeedback` (string, optional)---

- `requestDate` (timestamp)

- `reviewedAt` (timestamp, optional)## 🔭 Roadmap Ideas



#### `schedules`### Step 2: Install Dependencies

Confirmed/approved classroom schedules

- `classroomId` (reference)- Wire the services to a REST, GraphQL, or Supabase backend

- `facultyId` (reference)

- `date` (date)- Introduce role-based routing with React Router```bash

- `startTime` (string)

- `endTime` (string)- Add automated tests (unit + component) using Vitest and Testing Librarynpm install

- `purpose` (string)

- `createdAt` (timestamp)- Replace local password storage with hashed credentials or OAuth```



#### `signupRequests`

New faculty registration requests

- `email` (string, unique)---This will install all required packages including:

- `name` (string)

- `department` (string)- React, TypeScript, and Vite

- `status` (string: 'pending', 'approved', 'rejected')

- `adminFeedback` (string, optional)## 📄 License- Supabase client libraries

- `requestDate` (timestamp)

- `reviewedAt` (timestamp, optional)- UI components (Radix UI, Shadcn)



---Released under the ISC License. Feel free to adapt and extend for your institution.- Utilities (date-fns, Framer Motion, etc.)



## 🔐 Security Features



### Firestore Security Rules------

- Users can only access their own data

- Admins have full access to all data

- Anonymous users can submit signup requests

- Faculty can view classrooms and submit bookings_Removed Supabase dependencies and edge functions in October 2025. This README describes the streamlined local-storage edition._### Step 3: Set Up Supabase Backend



### Authentication

- Email/password authentication via Firebase Auth#### 3.1 Create a Supabase Project

- Secure password hashing (handled by Firebase)1. Go to [Supabase Dashboard](https://supabase.com/dashboard)

- JWT tokens for session management2. Click **"New Project"**

- Email verification for approved users3. Fill in project details:

- Password reset via email   - **Name**: PLV-CEIT-Classroom (or your choice)

   - **Database Password**: Choose a strong password (save this!)

### Data Validation   - **Region**: Select closest to your location

- Client-side validation with React Hook Form4. Click **"Create new project"** and wait ~2 minutes for setup

- Server-side validation via Firestore Security Rules

- Conflict detection for overlapping bookings#### 3.2 Get Your API Credentials

- Equipment and time slot validation1. In your Supabase project, go to **Settings** → **API**

2. Copy the following values:

---   - **Project URL** (e.g., `https://xxxxx.supabase.co`)

   - **anon public** key (starts with `eyJ...`)

## 🔧 Configuration   - **service_role** key (starts with `eyJ...`) - Click "Reveal" to see it



### School Hours#### 3.3 Create Environment File

The system is configured for PLV CEIT operating hours:1. In your project root, create a file named `.env`

- **Start**: 7:00 AM2. Copy the contents from `.env.example` and fill in your values:

- **End**: 8:00 PM

- **Time Format**: 12-hour (AM/PM)```bash

- **Time Slots**: 30-minute intervals# Supabase Configuration

VITE_SUPABASE_URL=https://xxxxx.supabase.co

### Equipment TypesVITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

- TV (Television)VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

- Projector```

- Whiteboard

- Computer⚠️ **IMPORTANT**: 

- Audio System- Never commit the `.env` file to Git (it's already in `.gitignore`)

- Air Conditioning- The service role key is very sensitive - keep it secret!



------



## 🎨 Design System### Step 4: Set Up the Database



The application uses an Apple-inspired design system featuring:#### 4.1 Run the Complete Setup Script

1. In Supabase Dashboard, go to **SQL Editor**

### Typography2. Click **"New query"**

- **Font Stack**: SF Pro-style system fonts3. Open `database/COMPLETE_SETUP.sql` from your project

- **Base Size**: 14px4. Copy ALL contents and paste into the SQL editor

- **Hierarchy**: Clear heading levels (h1-h6)5. Click **"Run"** (bottom right)

- **Line Height**: Optimized for readability6. Wait for "Success" message (may take 10-30 seconds)



### ColorsThis script will:

- **Primary**: Apple Blue (#007aff)- Create all necessary tables (users, classrooms, bookings, schedules)

- **Success**: Green (#34c759)- Set up Supabase Auth integration

- **Warning**: Orange (#ff9500)- Configure Row-Level Security (RLS) policies

- **Danger**: Red (#ff3b30)- Add sample data (classrooms and default admin user)

- **Neutral**: Gray scale palette

- **Background**: Light/neutral tones#### 4.2 Verify Setup

1. In Supabase, go to **Table Editor**

### Spacing2. You should see these tables:

- **Grid System**: 8px base unit   - `profiles` (user profiles)

- **Consistent padding/margins**   - `classrooms` (4 sample classrooms)

- **Responsive breakpoints**   - `booking_requests`

   - `schedules`

### Animations   - `signup_requests`

- **60fps smooth animations** via Framer Motion

- **Page transitions**---

- **Scroll-triggered effects**

- **Micro-interactions** on buttons and cards### Step 5: Run the Application

- **Loading states**

```bash

### Componentsnpm run dev

- **40+ Shadcn UI components**```

- **Consistent styling**

- **Accessible by default**The app will start at `http://localhost:5173` (or another port if 5173 is busy)

- **Keyboard navigation**

- **Screen reader support**---



---### Step 6: Log In



## 🔄 Application Workflows#### Default Administrator Account

- **Email**: `registrar@plv.edu.ph`

### Faculty Booking Workflow- **Password**: `admin123`

1. **Login** → Faculty logs in with credentials- **Role**: School Registrar (Admin)

2. **Search** → (Optional) Search for available classrooms by date/time/equipment

3. **Book** → Navigate to "Book Room" and fill in:#### Default Faculty Account

   - Select classroom- **Email**: `pgalarosa@plv.edu.ph`

   - Choose date- **Password**: `faculty123`

   - Select time slot (start & end)- **Name**: Paulo Galarosa

   - Enter purpose/reason- **Department**: Information Technology

4. **Submit** → Request sent to admin for approval

5. **Wait** → Monitor request status in "My Schedule"#### Create New Faculty Account

6. **Notified** → Receive toast notification when admin approves/rejects1. On login page, click **"Sign up as Faculty"**

7. **Confirmed** → Approved booking appears in confirmed schedules2. Fill in registration form

3. Wait for admin approval (login as admin to approve)

### Admin Approval Workflow4. Once approved, login with your credentials

1. **Login** → Admin logs in

2. **Review** → Go to "Approve Requests" tab---

3. **Check Conflicts** → System auto-detects scheduling conflicts

4. **Decision** → For each request:### 🎉 You're Ready!

   - **Approve**: Booking becomes confirmed schedule

   - **Reject**: Optionally provide feedback to facultyYour local instance is now running with:

5. **Feedback** → Faculty receives notification with admin's decision- ✅ Full backend database

- ✅ User authentication

### Faculty Signup Workflow- ✅ Real-time updates

1. **Register** → Click "Sign up as Faculty" on login page- ✅ Sample data to test with

2. **Fill Form** → Provide email, name, department

3. **Submit** → Request sent to admin---

4. **Admin Approves** → Admin reviews in "Signup Approvals"

5. **Account Created** → User account created in Firebase Auth## 🔧 Additional Configuration

6. **Login** → Faculty can now login with credentials

### Building for Production

### Password Reset Workflow

1. **Forgot Password** → Click "Forgot Password?" on login```bash

2. **Enter Email** → Provide registered email addressnpm run build

3. **Check Email** → Receive password reset link from Firebase```

4. **Reset** → Click link and set new password

5. **Login** → Login with new credentialsThis creates an optimized production build in the `dist/` folder.



---### Preview Production Build



## 🔐 Features Implementation Details```bash

npm run preview

### Conflict Detection```

The system prevents double-bookings through:

- **Real-time validation** against existing schedules### Environment Variables Explained

- **Checking pending requests** to avoid conflicts

- **Past time validation** (can't book in the past)| Variable | Purpose | Where to Find |

- **Self-exclusion** during approval (request won't conflict with itself)|----------|---------|---------------|

- **Time overlap detection** (checks if time ranges intersect)| `VITE_SUPABASE_URL` | Your Supabase project URL | Settings → API → Project URL |

| `VITE_SUPABASE_ANON_KEY` | Public API key (safe for client) | Settings → API → anon public |

### Real-time Updates| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Admin API key (keep secret!) | Settings → API → service_role (click Reveal) |

- **Firestore listeners** for live data changes

- **Toast notifications** for success/error feedback## � Database Schema

- **Admin feedback** displayed on request status

- **Automatic data refresh** when records change### Tables



### Responsive Design#### `profiles`

- **Mobile-first approach**User profiles linked to Supabase Auth

- **Tablet optimization**- `id` (UUID, primary key, links to auth.users)

- **Desktop layouts**- `email` (text, unique)

- **Touch-friendly** buttons and inputs- `name` (text)

- **Collapsible navigation** on mobile- `role` (text: 'admin' or 'faculty')

- **Adaptive card layouts**- `department` (text, optional)

- `created_at` (timestamp)

### Form Validation- `updated_at` (timestamp)

- **Required field checks**

- **Email format validation**#### `classrooms`

- **Password strength requirements**Classroom inventory

- **Date/time validity**- `id` (UUID, primary key)

- **Capacity limits**- `name` (text, unique)

- **Duplicate prevention**- `capacity` (integer)

- `equipment` (text array)

---- `building` (text)

- `floor` (integer)

## 📊 Reports & Analytics- `is_available` (boolean)

- `created_at` (timestamp)

### Available Reports

#### `booking_requests`

#### 1. Classroom Utilization ReportFaculty booking requests pending approval

- **Purpose**: Analyze classroom usage patterns- `id` (UUID, primary key)

- **Metrics**:- `classroom_id` (UUID, foreign key to classrooms)

  - Total bookings per classroom- `faculty_id` (UUID, foreign key to profiles)

  - Utilization percentage- `date` (date)

  - Peak usage times- `start_time` (time)

  - Equipment usage statistics- `end_time` (time)

- **Filters**: Date range, specific classrooms- `purpose` (text)

- **Export**: Table view with sorting- `status` ('pending', 'approved', 'rejected')

- `admin_feedback` (text, optional)

#### 2. Faculty Booking Report- `request_date` (timestamp)

- **Purpose**: Track individual faculty booking history- `reviewed_at` (timestamp, optional)

- **Metrics**:

  - Total bookings per faculty member#### `schedules`

  - Booking frequencyConfirmed/approved classroom schedules

  - Preferred classrooms- `id` (UUID, primary key)

  - Cancellation rate- `classroom_id` (UUID, foreign key to classrooms)

- **Filters**: Date range, department, faculty- `faculty_id` (UUID, foreign key to profiles)

- **Export**: Table view with search- `date` (date)

- `start_time` (time)

#### 3. Schedule Overview- `end_time` (time)

- **Purpose**: View all confirmed schedules- `purpose` (text)

- **Features**:- `created_at` (timestamp)

  - Chronological listing

  - Faculty and classroom details#### `signup_requests`

  - Time slot informationNew faculty registration requests

  - Purpose/reason display- `id` (UUID, primary key)

- **Filters**: Date, classroom, faculty- `email` (text, unique)

- **Actions**: Admin can cancel schedules- `name` (text)

- `department` (text)

---- `status` ('pending', 'approved', 'rejected')

- `admin_feedback` (text, optional)

## 🐛 Troubleshooting- `request_date` (timestamp)

- `reviewed_at` (timestamp, optional)

### Common Issues & Solutions

---

#### ❌ "Missing Firebase environment variables"

**Cause**: `.env` file not created or incorrect values  ## 🔐 Security Features

**Solution**:

1. Create `.env` file in project root### Row-Level Security (RLS)

2. Copy from `.env.example`All tables have RLS policies to ensure:

3. Fill in your actual Firebase credentials from Firebase Console- Users can only see their own data

4. Restart dev server (`Ctrl+C` then `npm run dev`)- Admins have full access to all data

- Anonymous users can submit signup requests

#### ❌ Firebase connection fails- Faculty can view classrooms and submit bookings

**Cause**: Wrong Firebase configuration or keys  

**Solution**:### Authentication

1. Verify credentials in Firebase Console → Project Settings- Email/password authentication via Supabase Auth

2. Ensure no extra spaces in `.env` file- Secure password hashing (handled by Supabase)

3. Check if Firebase project is active- JWT tokens for session management

- Email verification for approved users

#### ❌ Login fails with correct credentials- Password reset via email

**Cause**: User doesn't exist in Firebase Auth  

**Solution**:### Data Validation

1. Check Firebase Console → Authentication → Users- Client-side validation with React Hook Form

2. Create admin user manually if needed- Server-side validation via Supabase RLS

3. Verify user's email is in VITE_FIREBASE_ADMIN_EMAILS for admin access- Conflict detection for overlapping bookings

- Equipment and time slot validation

#### ❌ Signup requests not working

**Cause**: Firestore security rules not configured correctly  ---

**Solution**:

1. Check Firestore Security Rules in Firebase Console## 🔧 Configuration

2. Verify `signupRequests` collection allows anonymous writes

3. Refer to Firebase setup guide for correct rules### School Hours

The system is configured for PLV CEIT operating hours:

#### ❌ Port already in use- **Start**: 7:00 AM

**Cause**: Another app using port 5173  - **End**: 8:00 PM

**Solution**:- **Time Format**: 12-hour (AM/PM)

- Vite will auto-assign next available port- **Time Slots**: 30-minute intervals

- Or manually specify: `npm run dev -- --port 3000`

### Equipment Types

---- TV (Television)

- Projector

## 🚀 Deployment Guide- Whiteboard

- Computer

### Deploy to Vercel (Recommended)- Audio System

- Air Conditioning

1. **Push to GitHub**

```bash### Sample Classrooms (Pre-loaded)

git add .- **CEIT-101**: 50 capacity, TV + Projector + AC

git commit -m "Ready for deployment"- **CEIT-102**: 40 capacity, TV + Whiteboard

git push origin main- **CEIT-201**: 60 capacity, TV + Projector + AC + Audio

```- **CEIT-LAB1**: 30 capacity, Computers + Projector + AC



2. **Connect to Vercel**## 🎨 Design System

   - Go to [Vercel Dashboard](https://vercel.com)

   - Click "Add New Project"The application uses an Apple-inspired design system featuring:

   - Import your GitHub repository

   - Configure project:### Typography

     - **Framework Preset**: Vite- **Font Stack**: SF Pro-style system fonts

     - **Build Command**: `npm run build`- **Base Size**: 14px

     - **Output Directory**: `dist`- **Hierarchy**: Clear heading levels (h1-h6)

- **Line Height**: Optimized for readability

3. **Add Environment Variables**

   - In Vercel project settings → Environment Variables### Colors

   - Add all Firebase variables from your `.env`:- **Primary**: Apple Blue (#007aff)

     - `VITE_FIREBASE_API_KEY`- **Success**: Green (#34c759)

     - `VITE_FIREBASE_AUTH_DOMAIN`- **Warning**: Orange (#ff9500)

     - `VITE_FIREBASE_PROJECT_ID`- **Danger**: Red (#ff3b30)

     - `VITE_FIREBASE_STORAGE_BUCKET`- **Neutral**: Gray scale palette

     - `VITE_FIREBASE_MESSAGING_SENDER_ID`- **Background**: Light/neutral tones

     - `VITE_FIREBASE_APP_ID`

     - `VITE_FIREBASE_ADMIN_EMAILS`### Spacing

- **Grid System**: 8px base unit

4. **Deploy**- **Consistent padding/margins**

   - Click "Deploy"- **Responsive breakpoints**

   - Wait for build to complete

   - Your app is live! 🎉### Animations

- **60fps smooth animations** via Framer Motion

### Deploy to Netlify- **Page transitions**

- **Scroll-triggered effects**

1. **Build locally**- **Micro-interactions** on buttons and cards

```bash- **Loading states**

npm run build

```### Components

- **40+ Shadcn UI components**

2. **Deploy**- **Consistent styling**

   - Go to [Netlify Dashboard](https://netlify.com)- **Accessible by default**

   - Drag and drop `dist` folder- **Keyboard navigation**

   - Or connect GitHub repo- **Screen reader support**



3. **Configure**---

   - Add environment variables in Site Settings

   - Set build command: `npm run build`## 🔄 Application Workflows

   - Set publish directory: `dist`

### Faculty Booking Workflow

### Deploy to Your Own Server1. **Login** → Faculty logs in with credentials

2. **Search** → (Optional) Search for available classrooms by date/time/equipment

```bash3. **Book** → Navigate to "Book Room" and fill in:

# Build the project   - Select classroom

npm run build   - Choose date

   - Select time slot (start & end)

# Upload the dist/ folder to your server   - Enter purpose/reason

# Configure your web server (nginx/apache) to serve the files4. **Submit** → Request sent to admin for approval

# Set up environment variables on the server5. **Wait** → Monitor request status in "My Schedule"

```6. **Notified** → Receive toast notification when admin approves/rejects

7. **Confirmed** → Approved booking appears in confirmed schedules

### Important Deployment Notes

- ✅ Firebase keys are safe to expose in frontend (protected by security rules)### Admin Approval Workflow

- 🔒 Firestore Security Rules protect your database1. **Login** → Admin logs in

- 🌐 Configure authorized domains in Firebase Console → Authentication → Settings2. **Review** → Go to "Approve Requests" tab

3. **Check Conflicts** → System auto-detects scheduling conflicts

---4. **Decision** → For each request:

   - **Approve**: Booking becomes confirmed schedule

## 📝 Development Guidelines   - **Reject**: Optionally provide feedback to faculty

5. **Feedback** → Faculty receives notification with admin's decision

### Code Style

- **TypeScript**: Strict mode enabled### Faculty Signup Workflow

- **Component Structure**: Functional components with hooks1. **Register** → Click "Sign up as Faculty" on login page

- **Props**: Use TypeScript interfaces2. **Fill Form** → Provide email, name, department

3. **Submit** → Request sent to admin

### Git Workflow4. **Admin Approves** → Admin reviews in "Signup Approvals"

```bash5. **Account Created** → User account created in Supabase Auth

# Create feature branch6. **Login** → Faculty can now login with credentials

git checkout -b feature/your-feature-name

### Password Reset Workflow

# Make changes and commit1. **Forgot Password** → Click "Forgot Password?" on login

git add .2. **Enter Email** → Provide registered email address

git commit -m "Add feature description"3. **Check Email** → Receive password reset link from Supabase

4. **Reset** → Click link and set new password

# Push to GitHub5. **Login** → Login with new credentials

git push origin feature/your-feature-name

---

# Create Pull Request on GitHub

```## 🔐 Features Implementation Details



### Adding New Features### Conflict Detection

1. Create component in `components/` folderThe system prevents double-bookings through:

2. Add types in `App.tsx` or separate types file- **Real-time validation** against existing schedules

3. Update `App.tsx` for state management- **Checking pending requests** to avoid conflicts

4. Add Firestore collections/documents as needed- **Past time validation** (can't book in the past)

5. Update `firebaseService.ts` for API calls- **Self-exclusion** during approval (request won't conflict with itself)

6. Test thoroughly before deployment- **Time overlap detection** (checks if time ranges intersect)



---### Real-time Updates

- **Database subscriptions** for live data changes

## 🧪 Testing- **Toast notifications** for success/error feedback

- **Admin feedback** displayed on request status

### Manual Testing Checklist- **Automatic data refresh** when records change



#### Authentication### Responsive Design

- ✅ Login with valid credentials- **Mobile-first approach**

- ✅ Login fails with invalid credentials- **Tablet optimization**

- ✅ Logout clears session- **Desktop layouts**

- ✅ Password reset sends email- **Touch-friendly** buttons and inputs

- ✅ Signup form validation- **Collapsible navigation** on mobile

- **Adaptive card layouts**

#### Faculty Features

- ✅ Book a classroom### Form Validation

- ✅ Search for available rooms- **Required field checks**

- ✅ View own schedule- **Email format validation**

- ✅ View all schedules- **Password strength requirements**

- ✅ Update profile- **Date/time validity**

- ✅ Change password- **Capacity limits**

- **Duplicate prevention**

#### Admin Features

- ✅ Approve booking requests---

- ✅ Reject booking requests with feedback

- ✅ Approve signup requests## 📊 Reports & Analytics

- ✅ Add new classroom

- ✅ Edit classroom details### Available Reports

- ✅ Generate reports

- ✅ Cancel confirmed schedules#### 1. Classroom Utilization Report

- **Purpose**: Analyze classroom usage patterns

#### Conflict Detection- **Metrics**:

- ✅ Cannot book overlapping times  - Total bookings per classroom

- ✅ Cannot book past dates/times  - Utilization percentage

- ✅ Pending requests checked for conflicts  - Peak usage times

- ✅ Self-conflicts excluded during approval  - Equipment usage statistics

- **Filters**: Date range, specific classrooms

---- **Export**: Table view with sorting



## 📚 Additional Resources#### 2. Faculty Booking Report

- **Purpose**: Track individual faculty booking history

### Documentation- **Metrics**:

- [Firebase Documentation](https://firebase.google.com/docs)  - Total bookings per faculty member

- [React Documentation](https://react.dev/)  - Booking frequency

- [Vite Documentation](https://vitejs.dev/)  - Preferred classrooms

- [Tailwind CSS](https://tailwindcss.com/)  - Cancellation rate

- [Shadcn UI](https://ui.shadcn.com/)- **Filters**: Date range, department, faculty

- **Export**: Table view with search

### Tutorials

- [Firebase Auth Tutorial](https://firebase.google.com/docs/auth/web/start)#### 3. Schedule Overview

- [Firestore Tutorial](https://firebase.google.com/docs/firestore/quickstart)- **Purpose**: View all confirmed schedules

- [React + TypeScript Guide](https://react-typescript-cheatsheet.netlify.app/)- **Features**:

- [Tailwind CSS Tutorial](https://tailwindcss.com/docs/utility-first)  - Chronological listing

  - Faculty and classroom details

---  - Time slot information

  - Purpose/reason display

## 🤝 Contributing- **Filters**: Date, classroom, faculty

- **Actions**: Admin can cancel schedules

Contributions are welcome! To contribute:

---

1. Fork the repository

2. Create a feature branch## 🐛 Troubleshooting

3. Make your changes

4. Test thoroughly### Common Issues & Solutions

5. Submit a pull request with clear description

#### ❌ "Missing Supabase environment variables"

---**Cause**: `.env` file not created or incorrect values  

**Solution**:

## 📄 License1. Create `.env` file in project root

2. Copy from `.env.example`

This project is developed for PLV CEIT educational purposes.3. Fill in your actual Supabase credentials

4. Restart dev server (`Ctrl+C` then `npm run dev`)

---

#### ❌ Database connection fails

## 👨‍💻 Developer**Cause**: Wrong Supabase URL or keys  

**Solution**:

**Built by**: Deign  1. Verify credentials in Supabase Dashboard → Settings → API

**Repository**: [GitHub - Digital Classroom Assignment](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-)  2. Ensure no extra spaces in `.env` file

**Contact**: Available via GitHub Issues3. Check if Supabase project is active (not paused)



---#### ❌ Login fails with correct credentials

**Cause**: Database not set up or user doesn't exist  

## 🙏 Acknowledgments**Solution**:

1. Run `COMPLETE_SETUP.sql` in Supabase SQL Editor

- **PLV CEIT** - For the project requirements and support2. Check `profiles` table has users

- **Firebase** - For the excellent backend-as-a-service platform3. Try default admin: `registrar@plv.edu.ph` / `admin123`

- **Shadcn** - For the beautiful UI component library

- **React & Vite** - For the modern development experience#### ❌ "Service role key not found" warning

**Cause**: Missing `VITE_SUPABASE_SERVICE_ROLE_KEY` in `.env`  

---**Solution**:

1. Get service_role key from Supabase Dashboard

## 📞 Support2. Add to `.env` file

3. Restart dev server

For issues, questions, or contributions:4. Required for admin operations like creating users

- Open an issue on [GitHub](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/issues)

- Check existing documentation#### ❌ Signup requests not working

- Review Firebase Console for backend errors**Cause**: RLS policies not configured correctly  

**Solution**:

---1. Re-run `COMPLETE_SETUP.sql` script

2. Check `signup_requests` table has anonymous INSERT policy

**Last Updated**: October 3, 2025  3. Verify in Supabase → Authentication → Policies

**Version**: 2.0.0 (Firebase Edition)

#### ❌ Port already in use
**Cause**: Another app using port 5173  
**Solution**:
- Vite will auto-assign next available port
- Or manually specify: `npm run dev -- --port 3000`

---

## 🚀 Deployment Guide

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure project:
     - **Framework Preset**: Vite
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`

3. **Add Environment Variables**
   - In Vercel project settings → Environment Variables
   - Add all three variables from your `.env`:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `VITE_SUPABASE_SERVICE_ROLE_KEY`

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app is live! 🎉

### Deploy to Netlify

1. **Build locally**
```bash
npm run build
```

2. **Deploy**
   - Go to [Netlify Dashboard](https://netlify.com)
   - Drag and drop `dist` folder
   - Or connect GitHub repo

3. **Configure**
   - Add environment variables in Site Settings
   - Set build command: `npm run build`
   - Set publish directory: `dist`

### Deploy to Your Own Server

```bash
# Build the project
npm run build

# Upload the dist/ folder to your server
# Configure your web server (nginx/apache) to serve the files
# Set up environment variables on the server
```

### Important Deployment Notes
- ⚠️ **Never expose** `SERVICE_ROLE_KEY` to client
- ✅ Supabase keys are safe in frontend (Vite builds them in)
- 🔒 RLS policies protect your database
- 🌐 Enable CORS in Supabase if needed

---

## 📝 Development Guidelines

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: (Optional) Add for linting
- **Prettier**: (Optional) Add for formatting
- **Component Structure**: Functional components with hooks
- **Props**: Use TypeScript interfaces

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add feature description"

# Push to GitHub
git push origin feature/your-feature-name

# Create Pull Request on GitHub
```

### Adding New Features
1. Create component in `components/` folder
2. Add types in `App.tsx` or separate types file
3. Update `App.tsx` for state management
4. Add database tables/functions in Supabase
5. Update `supabaseService.ts` for API calls
6. Test thoroughly before deployment

### Database Migrations
- Make schema changes in Supabase Dashboard
- Export SQL from SQL Editor
- Save to `database/` folder for version control
- Document changes in commit messages

---

## 🧪 Testing

### Manual Testing Checklist

#### Authentication
- ✅ Login with valid credentials
- ✅ Login fails with invalid credentials
- ✅ Logout clears session
- ✅ Password reset sends email
- ✅ Signup form validation

#### Faculty Features
- ✅ Book a classroom
- ✅ Search for available rooms
- ✅ View own schedule
- ✅ View all schedules
- ✅ Update profile
- ✅ Change password

#### Admin Features
- ✅ Approve booking requests
- ✅ Reject booking requests with feedback
- ✅ Approve signup requests
- ✅ Add new classroom
- ✅ Edit classroom details
- ✅ Generate reports
- ✅ Cancel confirmed schedules

#### Conflict Detection
- ✅ Cannot book overlapping times
- ✅ Cannot book past dates/times
- ✅ Pending requests checked for conflicts
- ✅ Self-conflicts excluded during approval

---

## 📚 Additional Resources

### Documentation
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)

### Tutorials
- [Supabase Auth Tutorial](https://supabase.com/docs/guides/auth)
- [React + TypeScript Guide](https://react-typescript-cheatsheet.netlify.app/)
- [Tailwind CSS Tutorial](https://tailwindcss.com/docs/utility-first)

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request with clear description

---

## 📄 License

This project is developed for PLV CEIT educational purposes.

---

## 👨‍💻 Developer

**Built by**: Deign  
**Repository**: [GitHub - Digital Classroom Assignment](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-)  
**Contact**: Available via GitHub Issues

---

## 🙏 Acknowledgments

- **PLV CEIT** - For the project requirements and support
- **Supabase** - For the excellent backend-as-a-service platform
- **Shadcn** - For the beautiful UI component library
- **React & Vite** - For the modern development experience
- **Figma Make** - AI-powered web application builder used in initial development

---

## 📞 Support

For issues, questions, or contributions:
- Open an issue on [GitHub](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/issues)
- Check existing documentation
- Review Supabase logs for backend errors

---

**Last Updated**: October 2, 2025  
**Version**: 1.0.0 (Production-ready with Supabase backend)
