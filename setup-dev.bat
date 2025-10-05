@echo off
echo Setting up Firebase Emulator Development Environment...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js detected: 
node --version

echo.
echo 📦 Installing project dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo 🔧 Setting up Firebase CLI globally...
npm install -g firebase-tools

if %errorlevel% neq 0 (
    echo ❌ Failed to install Firebase CLI
    echo You may need to run this as administrator
    pause
    exit /b 1
)

echo.
echo ⚙️  Configuring environment for emulator mode...
if exist ".env.emulator" (
    copy ".env.emulator" ".env" >nul
    echo ✅ Environment configured for emulator mode
) else (
    echo ⚠️  Warning: .env.emulator not found
)

echo.
echo 🎉 Setup complete! 
echo.
echo 📋 Next steps:
echo    1. Update .env file with your Firebase project configuration
echo    2. Run 'start-emulator.bat' to start development
echo    3. Visit http://localhost:4000 for Firebase Emulator UI
echo    4. Visit http://localhost:5173 for your app
echo.
pause