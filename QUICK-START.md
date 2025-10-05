# 🚀 Quick Start - Firebase Emulator Dev Branch

## One-Click Setup for Windows

### Step 1: Clone the Repository
```bash
git clone -b firebase-emulator-dev https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git
```

### Step 2: Navigate to Project
```bash
cd "Digital Classroom Assignment for PLV CEIT Bldg (with backend)"
```

### Step 3: Run Setup (Windows)
```bash
setup-dev.bat
```

### Step 4: Start Development
```bash
start-emulator.bat
```

## What You Get

✅ **Complete Firebase Backend Locally**
- Authentication system
- Firestore database with sample data  
- File storage
- Real-time capabilities

✅ **Pre-configured Test Data**
- Admin account: `admin@plv.edu.ph`
- Faculty accounts: `faculty1@plv.edu.ph`, `faculty2@plv.edu.ph`
- Sample classrooms and bookings

✅ **Development Tools**
- Firebase Emulator UI at http://localhost:4000
- Your app at http://localhost:5173
- Hot reload and debugging

## Manual Setup (Cross-Platform)

If batch files don't work or you're on Mac/Linux:

```bash
# Install dependencies
npm install

# Install Firebase CLI
npm install -g firebase-tools

# Configure environment
cp .env.emulator .env

# Start everything
npm run dev:emulator
```

## 🎯 Access Points

- **Main App**: http://localhost:5173
- **Firebase Emulator UI**: http://localhost:4000
- **Database Admin**: http://localhost:8081
- **Auth Testing**: http://localhost:9099

## 🆘 Need Help?

See the full [README-EMULATOR.md](./README-EMULATOR.md) for detailed instructions and troubleshooting.

---

**Ready to develop! 🎉**