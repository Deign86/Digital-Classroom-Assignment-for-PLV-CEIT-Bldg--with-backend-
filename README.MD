# Digital Classroom Assignment System

> 📌 **Firebase Edition** — This application uses Firebase Authentication and Firestore for all backend services.

A comprehensive web-based classroom booking and management system for Pamantasan ng Lungsod ng Valenzuela - College of Engineering and Information Technology. Features role-based dashboards, real-time conflict detection, comprehensive reporting, and secure Firebase authentication.

## 🎯 Features

### For Administrators (Registrar)
- **Classroom Management**: Add, edit, and manage classroom inventory
- **Request Approval**: Review and approve/reject booking and signup requests
- **Conflict Detection**: Automatic scheduling conflict detection
- **Reports**: Generate utilization and booking reports
- **User Management**: Approve faculty signups and manage accounts

### For Faculty
- **Room Booking**: Request classrooms with date and time selection
- **Availability Search**: Search available classrooms by date, time, equipment
- **Schedule Viewing**: View personal and all classroom schedules
- **Request Tracking**: Monitor booking request status
- **Profile Settings**: Update personal information and account settings

## 🗂️ Technology Stack

### Frontend
- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4
- Shadcn/ui (Radix UI)
- Framer Motion
- Sonner (toasts)
- React Hook Form
- date-fns

### Backend
- Firebase Authentication
- Firebase Firestore
- Real-time listeners
- Firebase SDK

## 📁 Project Structure

```
├── App.tsx                          # Main application with Firebase integration
├── main.tsx                         # React entry point
├── index.html                       # HTML template
├── vite.config.ts                   # Vite configuration
├── package.json                     # Dependencies
├── .env.example                     # Environment variables template
├── components/
│   ├── AdminDashboard.tsx          # Admin dashboard
│   ├── AdminReports.tsx            # Reporting
│   ├── ClassroomManagement.tsx     # Classroom CRUD
│   ├── FacultyDashboard.tsx        # Faculty dashboard
│   ├── LoginForm.tsx               # Authentication
│   ├── RoomBooking.tsx             # Booking form
│   ├── SignupApproval.tsx          # Signup approvals
│   └── ui/                         # UI components
├── lib/
│   ├── firebaseConfig.ts           # Firebase configuration
│   └── firebaseService.ts          # Firebase services
├── hooks/
│   └── useScrollTrigger.ts
├── utils/
│   ├── animation.ts
│   └── timeUtils.ts
├── styles/
│   └── globals.css
└── guidelines/
    └── FirebaseDashboardSetup.md   # Detailed Firebase setup
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)
- Firebase Account ([Sign up](https://firebase.google.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git
   cd "Digital Classroom Assignment for PLV CEIT Bldg (with backend)"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Copy `.env.example` to `.env`
   - Add your Firebase configuration:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_ADMIN_EMAILS=admin@plv.edu.ph
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:5173`

5. **Build for production**
   ```bash
   npm run build
   ```

## 🔧 Firebase Setup

For detailed Firebase setup instructions, see: [`guidelines/FirebaseDashboardSetup.md`](guidelines/FirebaseDashboardSetup.md)

### Quick Setup Steps:
1. Create a Firebase project
2. Enable Authentication (Email/Password)
3. Create Firestore database
4. Configure security rules
5. Create initial admin user
6. Add environment variables

## 🔐 Authentication Overview

- Email/password accounts managed by **Firebase Auth**
- Faculty sign up through public request form (status: `pending`)
- Admin approval required before faculty can sign in
- Configure admin emails via `VITE_FIREBASE_ADMIN_EMAILS` environment variable
- Create initial admin user in Firebase Auth before first run

## 📊 Database Collections (Firestore)

### `users`
- email, name, role, department, status, timestamps

### `classrooms`
- name, capacity, equipment, building, floor, isAvailable

### `bookingRequests`
- classroomId, facultyId, date, startTime, endTime, purpose, status, adminFeedback

### `schedules`
- classroomId, facultyId, date, startTime, endTime, purpose

### `signupRequests`
- email, name, department, status, adminFeedback

## 📈 Application Workflows

### Faculty Booking Workflow
1. **Login** → Faculty logs in with credentials
2. **Search** → (Optional) Search for available classrooms
3. **Book** → Fill in booking form (classroom, date, time, purpose)
4. **Submit** → Request sent to admin
5. **Wait** → Monitor request status
6. **Notified** → Receive notification when admin approves/rejects
7. **Confirmed** → Approved booking appears in schedules

### Admin Approval Workflow
1. **Login** → Admin logs in
2. **Review** → Go to "Approve Requests" tab
3. **Check Conflicts** → System auto-detects conflicts
4. **Decision** → Approve or reject with optional feedback
5. **Feedback** → Faculty receives notification

### Faculty Signup Workflow
1. **Register** → Click "Sign up as Faculty" on login page
2. **Fill Form** → Provide email, name, department
3. **Submit** → Request sent to admin
4. **Admin Approves** → Admin reviews in "Signup Approvals"
5. **Account Created** → User account created in Firebase Auth
6. **Login** → Faculty can now login

## 🎨 Design System

### School Hours
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

### Design Features
- Apple-inspired design system
- 60fps smooth animations via Framer Motion
- 40+ Shadcn UI components
- Mobile-first responsive design
- Accessible by default with keyboard navigation

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Import your GitHub repository
   - Configure build settings

3. **Add Environment Variables**
   - Add all Firebase environment variables to Vercel project settings

4. **Deploy**
   - Vercel will automatically build and deploy your app

### Important Notes
- The project is configured for Vercel deployment
- Add environment variables to your Vercel project
- Firebase keys are safe to use in frontend builds

## 🔧 Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint (if configured)
```

### Code Style
- TypeScript with strict mode
- Functional components with hooks
- Clean component architecture
- Responsive design patterns

## 🐛 Troubleshooting

### Common Issues

#### Missing Firebase Environment Variables
**Cause**: Missing or incorrect Firebase configuration  
**Solution**: 
1. Check your `.env` file has all required variables
2. Verify Firebase project configuration
3. Restart development server

#### Authentication Issues
**Cause**: Firebase Auth not properly configured  
**Solution**:
1. Check Firebase Auth is enabled in console
2. Verify admin emails are configured
3. Create initial admin user in Firebase Auth

#### Build Errors
**Cause**: Missing dependencies or configuration  
**Solution**:
1. Run `npm install` to ensure all dependencies
2. Check Node.js version (18+ required)
3. Verify TypeScript configuration

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Shadcn UI](https://ui.shadcn.com/)

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request with clear description

## 📄 License

This project is developed for PLV CEIT educational purposes.

## 👨‍💻 Developer

**Built by**: Deign  
**Repository**: [GitHub - Digital Classroom Assignment](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-)  
**Contact**: Available via GitHub Issues

## 🙏 Acknowledgments

- **PLV CEIT** - For the project requirements and support
- **Firebase** - For the excellent backend-as-a-service platform
- **Shadcn** - For the beautiful UI component library
- **React & Vite** - For the modern development experience

## 📞 Support

For issues, questions, or contributions:
- Open an issue on [GitHub](https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-/issues)
- Check existing documentation
- Review Firebase Console for backend errors

---

**Last Updated**: October 3, 2025  
**Version**: 2.0.0 (Firebase Edition)