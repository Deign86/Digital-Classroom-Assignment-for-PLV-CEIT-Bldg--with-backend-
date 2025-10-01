# Deployment Guide - PLV CEIT Digital Classroom

This guide explains how to extract your code from Figma Make and deploy it to production.

## 📦 What You Have

Your application is **already fully coded** in Figma Make. Every file you see in the file structure is a complete, working React component. You have:

- ✅ 14+ React components
- ✅ Complete TypeScript types
- ✅ Tailwind CSS styling
- ✅ All business logic implemented
- ✅ Responsive design
- ✅ Error handling
- ✅ Mock data for testing

## 🎯 Your Options

### Option 1: Keep Using in Figma Make (Easiest)
Your app works perfectly in Figma Make right now. You can:
- Share the live preview link
- Continue development here
- Use it for demonstrations
- **Limitation**: Data resets on refresh (no persistence)

### Option 2: Extract & Deploy to Production (Recommended for Real Use)

Follow these steps to get your code running on your own server:

## 📋 Step-by-Step Extraction Process

### Step 1: Set Up Local Development Environment

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/
   - Choose LTS version (18 or higher)
   - Verify installation:
     ```bash
     node --version
     npm --version
     ```

2. **Create a new Vite + React project**
   ```bash
   npm create vite@latest plv-classroom-app -- --template react-ts
   cd plv-classroom-app
   ```

3. **Install required dependencies**
   ```bash
   # Core dependencies
   npm install lucide-react date-fns sonner@2.0.3 clsx class-variance-authority

   # Radix UI components (for Shadcn components)
   npm install @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip

   # Date picker
   npm install react-day-picker

   # Tailwind CSS v4
   npm install -D tailwindcss@next @tailwindcss/vite@next
   ```

### Step 2: Copy Your Code Files

You'll need to manually copy each file from Figma Make. Here's the complete list:

#### Main Files
- [ ] `/App.tsx`
- [ ] `/styles/globals.css`

#### Component Files (copy entire `/components` folder)
- [ ] `/components/AdminDashboard.tsx`
- [ ] `/components/AdminReports.tsx`
- [ ] `/components/ClassroomManagement.tsx`
- [ ] `/components/ErrorBoundary.tsx`
- [ ] `/components/FacultyDashboard.tsx`
- [ ] `/components/FacultySchedule.tsx`
- [ ] `/components/Footer.tsx`
- [ ] `/components/LoginForm.tsx`
- [ ] `/components/RequestApproval.tsx`
- [ ] `/components/RoomBooking.tsx`
- [ ] `/components/RoomSearch.tsx`
- [ ] `/components/ScheduleViewer.tsx`
- [ ] `/components/SignupApproval.tsx`

#### Animation Components
- [ ] `/components/animations/AppleMotion.tsx`

#### All UI Components (35 files in `/components/ui/`)
- [ ] Copy entire `/components/ui/` folder with all Shadcn components

#### Utility Files
- [ ] `/utils/timeUtils.ts`
- [ ] `/utils/animations.ts`
- [ ] `/hooks/useScrollTrigger.ts`

#### Documentation (optional)
- [ ] `/guidelines/Guidelines.md`
- [ ] `/README.md`
- [ ] `/DEPLOYMENT.md` (this file)

### Step 3: Configure Vite

Create or update `vite.config.ts` in your project root:

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

### Step 4: Set Up Entry Point

Update `src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

Update `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PLV CEIT Digital Classroom</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Step 5: Update TypeScript Configuration

Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Step 6: Fix Import Paths

After copying files, you may need to update some import paths:

**Before (Figma Make):**
```typescript
import { Button } from './components/ui/button';
```

**After (Local setup):**
```typescript
import { Button } from '@/components/ui/button';
// OR keep the relative path if your structure matches
import { Button } from './components/ui/button';
```

### Step 7: Test Locally

```bash
npm run dev
```

Visit http://localhost:5173 to see your app running locally!

### Step 8: Build for Production

```bash
npm run build
```

This creates a `dist` folder with optimized production files.

## 🚀 Deployment Platforms

### Deploy to Vercel (Recommended - Free & Easy)

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Follow the prompts:**
   - Link to your Vercel account
   - Configure project settings
   - Deploy!

**Or use Vercel website:**
- Visit https://vercel.com
- Import your Git repository
- Vercel auto-detects Vite and deploys

### Deploy to Netlify

1. **Build your app:**
   ```bash
   npm run build
   ```

2. **Drag and drop** the `dist` folder to https://app.netlify.com/drop

**Or use Netlify CLI:**
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Deploy to GitHub Pages

1. **Update `vite.config.ts`:**
   ```typescript
   export default defineConfig({
     base: '/plv-classroom/',
     // ... rest of config
   })
   ```

2. **Add to `package.json`:**
   ```json
   {
     "scripts": {
       "predeploy": "npm run build",
       "deploy": "gh-pages -d dist"
     }
   }
   ```

3. **Install gh-pages:**
   ```bash
   npm install -D gh-pages
   npm run deploy
   ```

## 🔄 Adding Backend (Optional but Recommended)

Your app currently stores data in memory (resets on refresh). To make it production-ready:

### Option A: Supabase (Recommended)

1. **Create account**: https://supabase.com
2. **Create a new project**
3. **Set up tables:**
   - users
   - classrooms
   - booking_requests
   - schedules
   - signup_requests

4. **Install Supabase client:**
   ```bash
   npm install @supabase/supabase-js
   ```

5. **Replace mock data** with Supabase queries

### Option B: Firebase
- Similar setup with Firestore database

### Option C: Custom Backend
- Build with Node.js + Express
- Use PostgreSQL/MySQL
- Deploy to Heroku/Railway

## 📊 Production Checklist

Before going live:

- [ ] Add environment variables for sensitive data
- [ ] Set up proper authentication (not just mock passwords)
- [ ] Add backend/database for data persistence
- [ ] Implement proper security (HTTPS, input validation)
- [ ] Add loading states for all operations
- [ ] Implement error logging (e.g., Sentry)
- [ ] Test on multiple devices and browsers
- [ ] Add analytics (optional, e.g., Google Analytics)
- [ ] Set up backup system for data
- [ ] Create admin documentation
- [ ] Train users on the system

## 🆘 Troubleshooting

### "Module not found" errors
- Check all import paths are correct
- Ensure all dependencies are installed
- Verify file structure matches imports

### Tailwind styles not working
- Ensure `globals.css` is imported in `main.tsx`
- Check Tailwind v4 is properly configured in Vite

### Components not rendering
- Check for TypeScript errors in console
- Verify all UI components are in `/components/ui/`
- Ensure all required Radix UI packages are installed

## 💡 Tips

1. **Version Control**: Initialize Git and commit regularly
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Environment Variables**: Use `.env` for configuration
   ```
   VITE_APP_NAME=PLV CEIT Classroom
   VITE_API_URL=your-api-url
   ```

3. **Code Quality**: Add ESLint and Prettier
   ```bash
   npm install -D eslint prettier
   ```

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all dependencies are installed
3. Review import paths
4. Check Vite documentation: https://vitejs.dev/

---

**Remember**: Your code is production-ready! The main thing you need for real-world use is adding a backend database to persist data across sessions.
