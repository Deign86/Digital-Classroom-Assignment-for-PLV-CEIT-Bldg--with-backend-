@echo off
echo Starting Firebase Emulator Suite for Digital Classroom Development...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if npm is available
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not available
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Copy emulator environment file
if exist ".env.emulator" (
    copy ".env.emulator" ".env" >nul
    echo ✅ Using emulator environment configuration
) else (
    echo ⚠️  Warning: .env.emulator not found, using default configuration
)

echo 🚀 Starting Firebase Emulator Suite and development server...
echo.
echo 📱 Firebase Emulator UI will be available at: http://localhost:4000
echo 🌐 Development app will be available at: http://localhost:5173
echo 🔥 Firestore emulator at: http://localhost:8081
echo 🔐 Auth emulator at: http://localhost:9099
echo.
echo Press Ctrl+C to stop both servers
echo.

REM Start both emulator and dev server
npm run dev:emulator