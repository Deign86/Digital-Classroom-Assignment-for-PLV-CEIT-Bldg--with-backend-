# 🚀 Firebase Emulator Development Branch

This branch (`firebase-emulator-dev`) is specifically configured for **local development using Firebase Emulator Suite**. It provides a complete local Firebase environment that developers can use for prototyping, testing, and development without affecting production data.

## 🎯 Quick Start

### For Windows Users (Recommended)
```bash
# 1. Clone this branch
git clone -b firebase-emulator-dev https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git
cd "Digital Classroom Assignment for PLV CEIT Bldg (with backend)"

# 2. Run the setup script
setup-dev.bat

# 3. Start development environment
start-emulator.bat
```

### For Manual Setup
```bash
# 1. Clone and navigate
git clone -b firebase-emulator-dev https://github.com/Deign86/Digital-Classroom-Assignment-for-PLV-CEIT-Bldg--with-backend-.git
cd "Digital Classroom Assignment for PLV CEIT Bldg (with backend)"

# 2. Install dependencies
npm install

# 3. Install Firebase CLI globally
npm install -g firebase-tools

# 4. Configure environment
cp .env.emulator .env

# 5. Start emulator and dev server
npm run dev:emulator
```

## 🌐 Access Points

After running `start-emulator.bat` or `npm run dev:emulator`, you'll have access to:

- **📱 Main App**: http://localhost:5173
- **🔥 Firebase Emulator UI**: http://localhost:4000
- **🗄️ Firestore Emulator**: http://localhost:8081
- **🔐 Auth Emulator**: http://localhost:9099
- **📁 Storage Emulator**: http://localhost:9199
- **⚡ Functions Emulator**: http://localhost:5001

## 🛠️ Development Features

### Pre-configured Emulator Suite
- **Authentication**: Test user registration, login, password reset
- **Firestore**: Full database with sample data
- **Storage**: File upload/download testing
- **Hosting**: Local web server
- **Functions**: Cloud functions emulation

### Sample Data Included
The emulator comes pre-seeded with:
- **3 Test Users**: Admin and Faculty accounts
- **3 Classrooms**: CEIT rooms with different equipment
- **2 Sample Bookings**: Approved and pending reservations

### Test Accounts
```
Admin Account:
  Email: admin@plv.edu.ph
  Password: (any - emulator accepts any password)

Faculty Accounts:
  Email: faculty1@plv.edu.ph, faculty2@plv.edu.ph
  Password: (any - emulator accepts any password)
```

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server only |
| `npm run dev:emulator` | Start both emulator suite and dev server |
| `npm run emulator` | Start Firebase emulator suite only |
| `npm run emulator:ui` | Start emulator with UI dashboard |
| `npm run seed` | Populate emulator with sample data |
| `npm run emulator:reset` | Reset emulator data |

## 🔧 Configuration

### Environment Variables
The branch uses `.env.emulator` for development configuration:

```env
# Emulator Configuration
VITE_FIREBASE_USE_EMULATOR=true
VITE_FIREBASE_AUTH_EMULATOR_URL=http://localhost:9099
VITE_FIREBASE_FIRESTORE_EMULATOR_HOST=localhost:8080

# Add your Firebase project details here
VITE_FIREBASE_API_KEY=your-api-key-here
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

### Firebase Project Setup
1. Copy `.env.emulator` to `.env`
2. Update the Firebase configuration with your project details
3. The emulator will work with any valid Firebase project configuration

## 📁 Project Structure

```
├── firebase.json              # Emulator configuration
├── firestore.rules           # Security rules
├── firestore.indexes.json    # Database indexes
├── .env.emulator            # Emulator environment vars
├── .env.production          # Production environment vars
├── start-emulator.bat       # Windows startup script
├── setup-dev.bat           # Windows setup script
├── scripts/
│   └── seed-emulator.js     # Sample data seeder
└── emulator-data/          # Persistent emulator data (auto-created)
```

## 🚨 Important Notes

### Data Persistence
- Emulator data is saved to `emulator-data/` folder
- Data persists between restarts
- Use `npm run emulator:reset` to clear all data

### Network Access
- Emulator UI accessible at http://localhost:4000
- All services run on localhost only
- No internet connection required for development

### Production vs Development
- This branch is configured for **EMULATOR ONLY**
- Never deploy this branch to production
- Use `stable-build-v2.1` for production deployments

## 🐛 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Kill processes on emulator ports
npx kill-port 4000 5173 8080 9099
```

**2. Emulator Won't Start**
```bash
# Clear emulator cache
firebase emulators:exec --project demo-project "echo 'cleared'"
```

**3. Missing Dependencies**
```bash
# Reinstall everything
rm -rf node_modules package-lock.json
npm install
```

**4. Firebase CLI Issues**
```bash
# Reinstall Firebase CLI
npm uninstall -g firebase-tools
npm install -g firebase-tools@latest
```

### Getting Help

1. **Check Firebase Emulator UI**: http://localhost:4000
2. **View Logs**: Check terminal output for detailed error messages
3. **Reset Environment**: Use `setup-dev.bat` to reconfigure
4. **Clear Data**: Use `npm run emulator:reset` for fresh start

## 📚 Additional Resources

- [Firebase Emulator Suite Documentation](https://firebase.google.com/docs/emulator-suite)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Auth Emulator](https://firebase.google.com/docs/emulator-suite/connect_auth)

## 🔄 Branch Management

### Staying Updated
```bash
# Fetch latest changes from main development branch
git fetch origin stable-build-v2.1
git merge origin/stable-build-v2.1
```

### Contributing Back
```bash
# Create feature branch from emulator branch
git checkout -b feature/your-feature-name
# Make changes, commit, and create PR to stable-build-v2.1
```

---

**Happy Coding! 🎉**

This emulator environment gives you a complete Firebase backend running locally, perfect for rapid prototyping and development without worrying about production data or costs.