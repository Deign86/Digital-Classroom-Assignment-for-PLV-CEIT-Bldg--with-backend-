# Digital Classroom Assignment System (Local Edition)# PLV CEIT Digital Classroom Assignment Program



A classroom booking and management experience for Pamantasan ng Lungsod ng Valenzuela – CEIT that now runs entirely in the browser using `localStorage`. This build is perfect for demonstrations, rapid UI iteration, or as a starting point before wiring up a real backend.A comprehensive web-based classroom booking and management system for Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology. Features full backend integration with Supabase for real-time data persistence, user authentication, and multi-user support.



---## 🎯 Overview



## ✨ HighlightsThis application provides a streamlined solution for managing classroom assignments and bookings at PLV CEIT. It features role-based access control with separate dashboards for administrators and faculty members, real-time conflict detection, comprehensive reporting capabilities, and secure authentication powered by Supabase.



- **Local-first experience** – all data lives in the browser, with sensible seed data for instant demos.## ✨ Key Features

- **Role-aware dashboards** – rich admin tooling plus a focused faculty view.

- **Conflict-aware scheduling** – prevents double-bookings with the same validation logic used in the original backend.### For Administrators (Registrar)

- **Polished UI toolkit** – built with React 19, TypeScript, Tailwind CSS 4, Radix UI, Framer Motion, and Sonner toasts.- **Classroom Management**: Add, edit, and manage classroom inventory with real-time database updates

- **Request Approval**: Review and approve/reject booking and signup requests with admin feedback

---- **Conflict Detection**: Automatic detection of scheduling conflicts across all bookings

- **Comprehensive Reports**: Generate utilization and booking reports with filtering

## 🧱 Technology Stack- **User Management**: Approve new faculty signup requests and manage user accounts

- **Profile Management**: Update profile information and change password securely

| Layer        | Tools |

|--------------|-------|### For Faculty

| Framework    | React 19 + TypeScript |- **User Registration**: Self-service signup with admin approval workflow

| Build Tool   | Vite 7 |- **Room Booking**: Request classrooms with date and time selection

| Styling      | Tailwind CSS 4 + CSS Modules |- **Availability Search**: Search for available classrooms by date, time, and equipment

| UI Library   | Radix UI primitives, Shadcn-inspired components |- **Schedule Viewing**: View personal and all classroom schedules in real-time

| Animation    | Framer Motion |- **Request Tracking**: Monitor status of booking requests with admin feedback

| Notifications| Sonner |- **Profile Settings**: Update personal information and manage account settings

- **Password Reset**: Secure password reset via email

> _No external database or authentication service is required in this edition._

### Authentication & Security

---- **Supabase Auth**: Secure authentication with email/password

- **Password Reset**: Email-based password recovery

## 🚀 Getting Started- **Row-Level Security (RLS)**: Database-level access control

- **Anonymous Signup**: Public access for new faculty registration

1. **Install prerequisites**- **Auto-confirmed Emails**: Admin-approved users are auto-verified

   - Node.js 18 or newer

   - npm 9+ (ships with Node)## 🏗️ Technical Stack



2. **Install dependencies**### Frontend

   ```bash- **Framework**: React 19 with TypeScript

   npm install- **Styling**: Tailwind CSS v4 with Apple-style design system

   ```- **UI Components**: Shadcn/ui component library (Radix UI primitives)

- **Icons**: Lucide React

3. **Start the development server**- **Toast Notifications**: Sonner

   ```bash- **Date Handling**: date-fns

   npm run dev- **Animations**: Framer Motion

   ```- **Forms**: React Hook Form

- **Build Tool**: Vite 7

4. Visit [http://localhost:5173](http://localhost:5173) and sign in with one of the default accounts below.- **State Management**: React Hooks (useState, useEffect, useMemo, useCallback)



---### Backend

- **Database**: Supabase (PostgreSQL)

## 🔐 Default Accounts- **Authentication**: Supabase Auth

- **Real-time**: Supabase Realtime subscriptions

| Role   | Email                | Password      |- **Storage**: Supabase for secure data persistence

|--------|----------------------|---------------|- **API**: Supabase auto-generated REST API

| Admin  | `admin@plv.edu.ph`   | `admin123456` |

| Faculty| `faculty@plv.edu.ph` | `faculty123`  |## 📁 Project Structure



You can create additional faculty accounts through the signup request flow. Approved accounts receive the password you set during approval.```

├── App.tsx                          # Main application entry point with Supabase integration

---├── main.tsx                         # React entry point

├── index.html                       # HTML template

## 📦 Data & Persistence├── vite.config.ts                   # Vite configuration

├── tsconfig.json                    # TypeScript configuration

- All records (users, classrooms, requests, schedules) are saved inside browser `localStorage` with keys that begin with `classroom_`.├── package.json                     # Dependencies and scripts

- The first load seeds:├── .env.example                     # Environment variables template

  - 1 admin + 1 faculty account├── components/

  - 3 sample classrooms (Room 101, Room 102, Lab 201)│   ├── AdminDashboard.tsx          # Admin dashboard container

- Data persists per browser profile. Open a private window to start with a clean slate.│   ├── AdminReports.tsx            # Reporting functionality

│   ├── ClassroomManagement.tsx     # Classroom CRUD operations

### Resetting Everything│   ├── ErrorBoundary.tsx           # Error handling wrapper

│   ├── FacultyDashboard.tsx        # Faculty dashboard container

Use whichever method you prefer:│   ├── FacultySchedule.tsx         # Faculty schedule viewer

│   ├── Footer.tsx                  # Application footer

- **In-app utility** – open DevTools console and run:│   ├── LoginForm.tsx               # Authentication form

  ```ts│   ├── PasswordResetDialog.tsx     # Password reset modal

  import { clearAllData } from './lib/localStorageService';│   ├── PasswordResetPage.tsx       # Password reset page

  clearAllData();│   ├── ProfileSettings.tsx         # User profile management

  ```│   ├── RequestApproval.tsx         # Booking request approval

- **Browser tools** – DevTools → Application/Storage tab → Clear localStorage.│   ├── RoomBooking.tsx             # Room booking form

- **Manual tweak** – remove specific `classroom_*` keys to keep selected data.│   ├── RoomSearch.tsx              # Availability search

│   ├── ScheduleViewer.tsx          # Schedule display

The app will reseed default data on the next reload if no records are present.│   ├── SignupApproval.tsx          # Faculty signup approval

│   ├── animations/

---│   │   └── AppleMotion.tsx         # Animation utilities

│   ├── figma/

## 🧩 Code Map│   │   └── ImageWithFallback.tsx   # Image component with fallback

│   └── ui/                         # Shadcn UI components (40+ components)

```├── database/

├── App.tsx                     # Root component and state orchestration│   ├── COMPLETE_SETUP.sql          # Complete database setup script

├── components/                 # Dashboards, dialogs, and UI building blocks│   ├── schema.sql                  # Database schema

│   ├── AdminDashboard.tsx      # Administrative workspace│   ├── schema_supabase_auth.sql    # Auth schema setup

│   ├── FacultyDashboard.tsx    # Faculty scheduling portal│   ├── supabase_auth_setup.sql     # Auth configuration

│   ├── LoginForm.tsx           # Auth entry point (local handlers)│   ├── fix_rls_anonymous_access.sql # RLS fixes

│   └── ...                     # Supporting components│   └── reset_auth_setup.sql        # Reset script

├── lib/localStorageService.ts  # Central data layer & auth/session helpers├── hooks/

├── utils/                      # Time utilities and animation helpers│   └── useScrollTrigger.ts         # Scroll-based animations

├── styles/globals.css          # Global Tailwind + custom styles├── lib/

└── vite.config.ts              # Vite configuration│   ├── supabaseClient.ts           # Supabase client configuration

```│   ├── supabaseAuth.ts             # Authentication service

│   └── supabaseService.ts          # Database service functions

Key service contracts exposed from `lib/localStorageService.ts`:├── utils/

│   ├── animation.ts                # Animation helpers

- `authService` – sign in/out, password updates, auth listeners│   └── timeUtils.ts                # Time formatting utilities

- `userService` – CRUD for admin/faculty records├── styles/

- `classroomService` – classroom inventory management│   └── globals.css                 # Global styles and design tokens

- `bookingRequestService` – booking lifecycle + conflict checks└── guidelines/

- `scheduleService` – confirmed schedules and cancellation flow    └── Guidelines.md               # Development guidelines

- `signupRequestService` – faculty onboarding workflow```



When you are ready to connect a real backend, implement these same contracts against your API and swap the import in `App.tsx`.## 🚀 Getting Started (Run Locally)



---### Prerequisites

- **Node.js** 18 or higher ([Download here](https://nodejs.org/))

## 🧪 Smoke Test Checklist- **npm** (comes with Node.js) or **yarn** package manager

- **Supabase Account** ([Sign up free](https://supabase.com/))

After installing:- **Git** (optional, for cloning)



- [ ] Sign in as admin and inspect the dashboard widgets---

- [ ] Approve a pending signup request and share the generated password

- [ ] Submit a classroom booking as faculty, then approve it as admin### Step 1: Clone or Download the Repository

- [ ] Attempt to double-book a room at the same time (should be blocked)

- [ ] Cancel a existing schedule and confirm availability updates instantly#### Option A: Clone with Git

```bash

---git clone https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git

cd "Digital Classroom Assignment for PLV CEIT Bldg (with backend)"

## 🛠️ Customisation Tips```



- **Change seed data:** edit `initializeDefaultData()` inside `localStorageService.ts`.#### Option B: Download ZIP

- **Add new fields:** update the shared TypeScript interfaces in `App.tsx` and extend the form components accordingly.1. Download the ZIP file from GitHub

- **Persist to files:** export/import helpers are included (`exportAllData`, `importAllData`) for moving data between browsers.2. Extract to your desired location

3. Open terminal/command prompt in the extracted folder

---

---

## 🔭 Roadmap Ideas

### Step 2: Install Dependencies

- Wire the services to a REST, GraphQL, or Supabase backend

- Introduce role-based routing with React Router```bash

- Add automated tests (unit + component) using Vitest and Testing Librarynpm install

- Replace local password storage with hashed credentials or OAuth```



---This will install all required packages including:

- React, TypeScript, and Vite

## 📄 License- Supabase client libraries

- UI components (Radix UI, Shadcn)

Released under the ISC License. Feel free to adapt and extend for your institution.- Utilities (date-fns, Framer Motion, etc.)



------



_Removed Supabase dependencies and edge functions in October 2025. This README describes the streamlined local-storage edition._### Step 3: Set Up Supabase Backend


#### 3.1 Create a Supabase Project
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: PLV-CEIT-Classroom (or your choice)
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Select closest to your location
4. Click **"Create new project"** and wait ~2 minutes for setup

#### 3.2 Get Your API Credentials
1. In your Supabase project, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - Click "Reveal" to see it

#### 3.3 Create Environment File
1. In your project root, create a file named `.env`
2. Copy the contents from `.env.example` and fill in your values:

```bash
# Supabase Configuration
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **IMPORTANT**: 
- Never commit the `.env` file to Git (it's already in `.gitignore`)
- The service role key is very sensitive - keep it secret!

---

### Step 4: Set Up the Database

#### 4.1 Run the Complete Setup Script
1. In Supabase Dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Open `database/COMPLETE_SETUP.sql` from your project
4. Copy ALL contents and paste into the SQL editor
5. Click **"Run"** (bottom right)
6. Wait for "Success" message (may take 10-30 seconds)

This script will:
- Create all necessary tables (users, classrooms, bookings, schedules)
- Set up Supabase Auth integration
- Configure Row-Level Security (RLS) policies
- Add sample data (classrooms and default admin user)

#### 4.2 Verify Setup
1. In Supabase, go to **Table Editor**
2. You should see these tables:
   - `profiles` (user profiles)
   - `classrooms` (4 sample classrooms)
   - `booking_requests`
   - `schedules`
   - `signup_requests`

---

### Step 5: Run the Application

```bash
npm run dev
```

The app will start at `http://localhost:5173` (or another port if 5173 is busy)

---

### Step 6: Log In

#### Default Administrator Account
- **Email**: `registrar@plv.edu.ph`
- **Password**: `admin123`
- **Role**: School Registrar (Admin)

#### Default Faculty Account
- **Email**: `pgalarosa@plv.edu.ph`
- **Password**: `faculty123`
- **Name**: Paulo Galarosa
- **Department**: Information Technology

#### Create New Faculty Account
1. On login page, click **"Sign up as Faculty"**
2. Fill in registration form
3. Wait for admin approval (login as admin to approve)
4. Once approved, login with your credentials

---

### 🎉 You're Ready!

Your local instance is now running with:
- ✅ Full backend database
- ✅ User authentication
- ✅ Real-time updates
- ✅ Sample data to test with

---

## 🔧 Additional Configuration

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

### Preview Production Build

```bash
npm run preview
```

### Environment Variables Explained

| Variable | Purpose | Where to Find |
|----------|---------|---------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Public API key (safe for client) | Settings → API → anon public |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | Admin API key (keep secret!) | Settings → API → service_role (click Reveal) |

## � Database Schema

### Tables

#### `profiles`
User profiles linked to Supabase Auth
- `id` (UUID, primary key, links to auth.users)
- `email` (text, unique)
- `name` (text)
- `role` (text: 'admin' or 'faculty')
- `department` (text, optional)
- `created_at` (timestamp)
- `updated_at` (timestamp)

#### `classrooms`
Classroom inventory
- `id` (UUID, primary key)
- `name` (text, unique)
- `capacity` (integer)
- `equipment` (text array)
- `building` (text)
- `floor` (integer)
- `is_available` (boolean)
- `created_at` (timestamp)

#### `booking_requests`
Faculty booking requests pending approval
- `id` (UUID, primary key)
- `classroom_id` (UUID, foreign key to classrooms)
- `faculty_id` (UUID, foreign key to profiles)
- `date` (date)
- `start_time` (time)
- `end_time` (time)
- `purpose` (text)
- `status` ('pending', 'approved', 'rejected')
- `admin_feedback` (text, optional)
- `request_date` (timestamp)
- `reviewed_at` (timestamp, optional)

#### `schedules`
Confirmed/approved classroom schedules
- `id` (UUID, primary key)
- `classroom_id` (UUID, foreign key to classrooms)
- `faculty_id` (UUID, foreign key to profiles)
- `date` (date)
- `start_time` (time)
- `end_time` (time)
- `purpose` (text)
- `created_at` (timestamp)

#### `signup_requests`
New faculty registration requests
- `id` (UUID, primary key)
- `email` (text, unique)
- `name` (text)
- `department` (text)
- `status` ('pending', 'approved', 'rejected')
- `admin_feedback` (text, optional)
- `request_date` (timestamp)
- `reviewed_at` (timestamp, optional)

---

## 🔐 Security Features

### Row-Level Security (RLS)
All tables have RLS policies to ensure:
- Users can only see their own data
- Admins have full access to all data
- Anonymous users can submit signup requests
- Faculty can view classrooms and submit bookings

### Authentication
- Email/password authentication via Supabase Auth
- Secure password hashing (handled by Supabase)
- JWT tokens for session management
- Email verification for approved users
- Password reset via email

### Data Validation
- Client-side validation with React Hook Form
- Server-side validation via Supabase RLS
- Conflict detection for overlapping bookings
- Equipment and time slot validation

---

## 🔧 Configuration

### School Hours
The system is configured for PLV CEIT operating hours:
- **Start**: 7:00 AM
- **End**: 8:00 PM
- **Time Format**: 12-hour (AM/PM)
- **Time Slots**: 30-minute intervals

### Equipment Types
- TV (Television)
- Projector
- Whiteboard
- Computer
- Audio System
- Air Conditioning

### Sample Classrooms (Pre-loaded)
- **CEIT-101**: 50 capacity, TV + Projector + AC
- **CEIT-102**: 40 capacity, TV + Whiteboard
- **CEIT-201**: 60 capacity, TV + Projector + AC + Audio
- **CEIT-LAB1**: 30 capacity, Computers + Projector + AC

## 🎨 Design System

The application uses an Apple-inspired design system featuring:

### Typography
- **Font Stack**: SF Pro-style system fonts
- **Base Size**: 14px
- **Hierarchy**: Clear heading levels (h1-h6)
- **Line Height**: Optimized for readability

### Colors
- **Primary**: Apple Blue (#007aff)
- **Success**: Green (#34c759)
- **Warning**: Orange (#ff9500)
- **Danger**: Red (#ff3b30)
- **Neutral**: Gray scale palette
- **Background**: Light/neutral tones

### Spacing
- **Grid System**: 8px base unit
- **Consistent padding/margins**
- **Responsive breakpoints**

### Animations
- **60fps smooth animations** via Framer Motion
- **Page transitions**
- **Scroll-triggered effects**
- **Micro-interactions** on buttons and cards
- **Loading states**

### Components
- **40+ Shadcn UI components**
- **Consistent styling**
- **Accessible by default**
- **Keyboard navigation**
- **Screen reader support**

---

## 🔄 Application Workflows

### Faculty Booking Workflow
1. **Login** → Faculty logs in with credentials
2. **Search** → (Optional) Search for available classrooms by date/time/equipment
3. **Book** → Navigate to "Book Room" and fill in:
   - Select classroom
   - Choose date
   - Select time slot (start & end)
   - Enter purpose/reason
4. **Submit** → Request sent to admin for approval
5. **Wait** → Monitor request status in "My Schedule"
6. **Notified** → Receive toast notification when admin approves/rejects
7. **Confirmed** → Approved booking appears in confirmed schedules

### Admin Approval Workflow
1. **Login** → Admin logs in
2. **Review** → Go to "Approve Requests" tab
3. **Check Conflicts** → System auto-detects scheduling conflicts
4. **Decision** → For each request:
   - **Approve**: Booking becomes confirmed schedule
   - **Reject**: Optionally provide feedback to faculty
5. **Feedback** → Faculty receives notification with admin's decision

### Faculty Signup Workflow
1. **Register** → Click "Sign up as Faculty" on login page
2. **Fill Form** → Provide email, name, department
3. **Submit** → Request sent to admin
4. **Admin Approves** → Admin reviews in "Signup Approvals"
5. **Account Created** → User account created in Supabase Auth
6. **Login** → Faculty can now login with credentials

### Password Reset Workflow
1. **Forgot Password** → Click "Forgot Password?" on login
2. **Enter Email** → Provide registered email address
3. **Check Email** → Receive password reset link from Supabase
4. **Reset** → Click link and set new password
5. **Login** → Login with new credentials

---

## 🔐 Features Implementation Details

### Conflict Detection
The system prevents double-bookings through:
- **Real-time validation** against existing schedules
- **Checking pending requests** to avoid conflicts
- **Past time validation** (can't book in the past)
- **Self-exclusion** during approval (request won't conflict with itself)
- **Time overlap detection** (checks if time ranges intersect)

### Real-time Updates
- **Database subscriptions** for live data changes
- **Toast notifications** for success/error feedback
- **Admin feedback** displayed on request status
- **Automatic data refresh** when records change

### Responsive Design
- **Mobile-first approach**
- **Tablet optimization**
- **Desktop layouts**
- **Touch-friendly** buttons and inputs
- **Collapsible navigation** on mobile
- **Adaptive card layouts**

### Form Validation
- **Required field checks**
- **Email format validation**
- **Password strength requirements**
- **Date/time validity**
- **Capacity limits**
- **Duplicate prevention**

---

## 📊 Reports & Analytics

### Available Reports

#### 1. Classroom Utilization Report
- **Purpose**: Analyze classroom usage patterns
- **Metrics**:
  - Total bookings per classroom
  - Utilization percentage
  - Peak usage times
  - Equipment usage statistics
- **Filters**: Date range, specific classrooms
- **Export**: Table view with sorting

#### 2. Faculty Booking Report
- **Purpose**: Track individual faculty booking history
- **Metrics**:
  - Total bookings per faculty member
  - Booking frequency
  - Preferred classrooms
  - Cancellation rate
- **Filters**: Date range, department, faculty
- **Export**: Table view with search

#### 3. Schedule Overview
- **Purpose**: View all confirmed schedules
- **Features**:
  - Chronological listing
  - Faculty and classroom details
  - Time slot information
  - Purpose/reason display
- **Filters**: Date, classroom, faculty
- **Actions**: Admin can cancel schedules

---

## 🐛 Troubleshooting

### Common Issues & Solutions

#### ❌ "Missing Supabase environment variables"
**Cause**: `.env` file not created or incorrect values  
**Solution**:
1. Create `.env` file in project root
2. Copy from `.env.example`
3. Fill in your actual Supabase credentials
4. Restart dev server (`Ctrl+C` then `npm run dev`)

#### ❌ Database connection fails
**Cause**: Wrong Supabase URL or keys  
**Solution**:
1. Verify credentials in Supabase Dashboard → Settings → API
2. Ensure no extra spaces in `.env` file
3. Check if Supabase project is active (not paused)

#### ❌ Login fails with correct credentials
**Cause**: Database not set up or user doesn't exist  
**Solution**:
1. Run `COMPLETE_SETUP.sql` in Supabase SQL Editor
2. Check `profiles` table has users
3. Try default admin: `registrar@plv.edu.ph` / `admin123`

#### ❌ "Service role key not found" warning
**Cause**: Missing `VITE_SUPABASE_SERVICE_ROLE_KEY` in `.env`  
**Solution**:
1. Get service_role key from Supabase Dashboard
2. Add to `.env` file
3. Restart dev server
4. Required for admin operations like creating users

#### ❌ Signup requests not working
**Cause**: RLS policies not configured correctly  
**Solution**:
1. Re-run `COMPLETE_SETUP.sql` script
2. Check `signup_requests` table has anonymous INSERT policy
3. Verify in Supabase → Authentication → Policies

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
