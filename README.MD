# PLV CEIT Digital Classroom Assignment Program

A comprehensive web-based classroom booking and management system for Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology.

## 🎯 Overview

This application provides a streamlined solution for managing classroom assignments and bookings at PLV CEIT. It features role-based access control with separate dashboards for administrators and faculty members, real-time conflict detection, and comprehensive reporting capabilities.

## ✨ Key Features

### For Administrators (Registrar)
- **Classroom Management**: Add, edit, and manage classroom inventory
- **Request Approval**: Review and approve/reject booking and signup requests
- **Conflict Detection**: Automatic detection of scheduling conflicts
- **Comprehensive Reports**: Generate utilization and booking reports
- **User Management**: Approve new faculty signup requests

### For Faculty
- **Room Booking**: Request classrooms with date and time selection
- **Availability Search**: Search for available classrooms by date, time, and equipment
- **Schedule Viewing**: View personal and all classroom schedules
- **Request Tracking**: Monitor status of booking requests with admin feedback

## 🏗️ Technical Stack

- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS v4 with Apple-style design system
- **UI Components**: Shadcn/ui component library
- **Icons**: Lucide React
- **Toast Notifications**: Sonner
- **Date Handling**: date-fns
- **Build Tool**: Vite
- **State Management**: React Hooks (useState, useEffect, useMemo, useCallback)

## 📁 Project Structure

```
├── App.tsx                          # Main application entry point
├── components/
│   ├── AdminDashboard.tsx          # Admin dashboard container
│   ├── AdminReports.tsx            # Reporting functionality
│   ├── ClassroomManagement.tsx     # Classroom CRUD operations
│   ├── ErrorBoundary.tsx           # Error handling wrapper
│   ├── FacultyDashboard.tsx        # Faculty dashboard container
│   ├── FacultySchedule.tsx         # Faculty schedule viewer
│   ├── Footer.tsx                  # Application footer
│   ├── LoginForm.tsx               # Authentication form
│   ├── RequestApproval.tsx         # Booking request approval
│   ├── RoomBooking.tsx             # Room booking form
│   ├── RoomSearch.tsx              # Availability search
│   ├── ScheduleViewer.tsx          # Schedule display
│   ├── SignupApproval.tsx          # Faculty signup approval
│   ├── animations/
│   │   └── AppleMotion.tsx         # Animation utilities
│   └── ui/                         # Shadcn UI components
├── hooks/
│   └── useScrollTrigger.ts         # Scroll-based animations
├── utils/
│   ├── animations.ts               # Animation helpers
│   └── timeUtils.ts                # Time formatting utilities
├── styles/
│   └── globals.css                 # Global styles and design tokens
└── guidelines/
    └── Guidelines.md               # Development guidelines
```

## 🚀 Getting Started (To Run Locally)

### Prerequisites
- Node.js 18 or higher
- npm or yarn package manager

### Installation Steps

1. **Create a new React + Vite project:**
```bash
npm create vite@latest plv-classroom -- --template react-ts
cd plv-classroom
```

2. **Install dependencies:**
```bash
npm install
npm install lucide-react date-fns sonner@2.0.3
npm install -D tailwindcss@next @tailwindcss/vite@next
```

3. **Copy all files from Figma Make:**
   - Copy the entire `/components` directory
   - Copy `/App.tsx`
   - Copy `/styles/globals.css`
   - Copy `/utils` directory
   - Copy `/hooks` directory

4. **Configure Vite:**

Create/update `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

5. **Update imports in your components:**

Replace relative imports like `'./components/ui/button'` with `'@/components/ui/button'` if needed.

6. **Import global styles:**

In your `main.tsx`:
```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

7. **Run the development server:**
```bash
npm run dev
```

## 👥 Default Users

### Administrator
- **Email**: registrar@plv.edu.ph
- **Password**: admin123
- **Role**: School Registrar

### Faculty
- **Email**: pgalarosa@plv.edu.ph
- **Password**: faculty123
- **Name**: Paulo Galarosa
- **Department**: Information Technology

## 🔧 Configuration

### School Hours
The system is configured for PLV CEIT operating hours:
- **Start**: 7:00 AM
- **End**: 8:00 PM
- **Time Format**: 12-hour (AM/PM)

### Equipment Terms
- All references use "TV" instead of "Smart Board" to match PLV CEIT's actual equipment

### Mock Data
The application includes pre-configured classrooms:
- CEIT-101 (50 capacity)
- CEIT-102 (40 capacity) 
- CEIT-201 (60 capacity)
- CEIT-LAB1 (30 capacity)

## 🎨 Design System

The application uses an Apple-inspired design system with:
- **Typography**: SF Pro-style font stack
- **Colors**: Apple blue (#007aff) as primary
- **Spacing**: Consistent 8px grid
- **Animations**: Smooth, 60fps animations
- **Responsiveness**: Mobile-first approach

## 🔐 Features Implementation

### Conflict Detection
The system prevents double-bookings by:
- Checking existing confirmed schedules
- Checking pending booking requests
- Validating against past times
- Excluding self-conflicts during approval

### Real-time Notifications
- Success/error toast notifications
- Admin feedback on requests
- Status updates

### Responsive Design
- Mobile-optimized navigation
- Adaptive layouts for all screen sizes
- Touch-friendly interactions

## 📊 Reports Available

1. **Classroom Utilization Report**: Shows booking statistics per classroom
2. **Faculty Booking Report**: Displays booking history per faculty member
3. **Time-based Reports**: Filter by date ranges

## 🔄 Workflow

### Faculty Booking Process
1. Faculty logs in
2. Searches for available rooms or navigates to booking
3. Selects classroom, date, time, and purpose
4. Submits request
5. Receives notification when admin approves/rejects

### Admin Approval Process
1. Admin logs in
2. Reviews pending requests
3. Checks for conflicts (system auto-detects)
4. Approves or rejects with optional feedback
5. Approved bookings become confirmed schedules

## 🐛 Known Issues & Solutions

### Issue: Initialization timeout
**Status**: ✅ Resolved
**Solution**: Optimized initialization logic with proper error handling

### Issue: False conflict detection
**Status**: ✅ Resolved  
**Solution**: Added `excludeRequestId` parameter to prevent self-conflicts

## 🚀 Deployment Options

### Option 1: Vercel (Recommended)
```bash
npm run build
# Deploy the `dist` folder to Vercel
```

### Option 2: Netlify
```bash
npm run build
# Deploy the `dist` folder to Netlify
```

### Option 3: GitHub Pages
Add to `vite.config.ts`:
```typescript
base: '/plv-classroom/'
```

## 📝 Future Enhancements

To connect to a real backend (Supabase recommended):
1. Set up Supabase project
2. Create tables for users, classrooms, bookings, schedules
3. Replace mock data with Supabase queries
4. Add real-time subscriptions for live updates
5. Implement row-level security (RLS)

## 📄 License

This project is developed for PLV CEIT educational purposes.

## 👨‍💻 Development

Built with Figma Make - AI-powered web application builder.

---

**Note**: This application currently runs entirely in the frontend with mock data. For production use, integrate with a backend service like Supabase for data persistence and multi-user support.
