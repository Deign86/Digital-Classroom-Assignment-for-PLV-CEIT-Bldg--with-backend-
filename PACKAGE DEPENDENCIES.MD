# Complete Package Dependencies List

This file contains all npm packages needed to run the PLV CEIT Digital Classroom application.

## 📦 Core Dependencies

Copy this entire section to install all required packages:

```bash
npm install lucide-react date-fns sonner@2.0.3 clsx tailwind-merge class-variance-authority
```

### Individual Package Purposes

- **lucide-react**: Icon library for all UI icons
- **date-fns**: Date manipulation and formatting
- **sonner@2.0.3**: Toast notification system (specific version required)
- **clsx**: Utility for constructing className strings
- **tailwind-merge**: Merge Tailwind CSS classes without conflicts
- **class-variance-authority**: Create variant-based component APIs

## 🎨 Radix UI Dependencies (for Shadcn Components)

```bash
npm install @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip
```

### Radix UI Packages Breakdown

| Package | Used In Component |
|---------|-------------------|
| @radix-ui/react-accordion | Accordion.tsx |
| @radix-ui/react-alert-dialog | AlertDialog.tsx |
| @radix-ui/react-avatar | Avatar.tsx |
| @radix-ui/react-checkbox | Checkbox.tsx |
| @radix-ui/react-collapsible | Collapsible.tsx |
| @radix-ui/react-dialog | Dialog.tsx |
| @radix-ui/react-dropdown-menu | DropdownMenu.tsx |
| @radix-ui/react-hover-card | HoverCard.tsx |
| @radix-ui/react-label | Label.tsx |
| @radix-ui/react-menubar | Menubar.tsx |
| @radix-ui/react-navigation-menu | NavigationMenu.tsx |
| @radix-ui/react-popover | Popover.tsx, Calendar.tsx |
| @radix-ui/react-progress | Progress.tsx |
| @radix-ui/react-radio-group | RadioGroup.tsx |
| @radix-ui/react-scroll-area | ScrollArea.tsx |
| @radix-ui/react-select | Select.tsx |
| @radix-ui/react-separator | Separator.tsx |
| @radix-ui/react-slot | Button.tsx (Slot component) |
| @radix-ui/react-switch | Switch.tsx |
| @radix-ui/react-tabs | Tabs.tsx, EnhancedTabs.tsx |
| @radix-ui/react-toast | Sonner.tsx |
| @radix-ui/react-toggle | Toggle.tsx |
| @radix-ui/react-toggle-group | ToggleGroup.tsx |
| @radix-ui/react-tooltip | Tooltip.tsx |

## 📅 Calendar Dependencies

```bash
npm install react-day-picker
```

- **react-day-picker**: Date picker component used in Calendar.tsx

## 🎨 Tailwind CSS (v4)

```bash
npm install -D tailwindcss@next @tailwindcss/vite@next
```

- **tailwindcss@next**: Tailwind CSS version 4 (beta)
- **@tailwindcss/vite@next**: Vite plugin for Tailwind v4

## ⚛️ React & TypeScript (Base)

These come with `create vite` but listed for reference:

```bash
npm install react react-dom
npm install -D @types/react @types/react-dom
```

## 🛠️ Development Dependencies

```bash
npm install -D @vitejs/plugin-react vite typescript
```

- **@vitejs/plugin-react**: React plugin for Vite
- **vite**: Build tool
- **typescript**: TypeScript compiler

## 📋 Complete package.json

Here's what your `package.json` should look like:

```json
{
  "name": "plv-classroom-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "lucide-react": "^0.294.0",
    "date-fns": "^3.0.0",
    "sonner": "2.0.3",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.2.0",
    "class-variance-authority": "^0.7.0",
    "react-day-picker": "^8.10.0",
    "@radix-ui/react-accordion": "^1.1.2",
    "@radix-ui/react-alert-dialog": "^1.0.5",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-checkbox": "^1.0.4",
    "@radix-ui/react-collapsible": "^1.0.3",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-hover-card": "^1.0.7",
    "@radix-ui/react-label": "^2.0.2",
    "@radix-ui/react-menubar": "^1.0.4",
    "@radix-ui/react-navigation-menu": "^1.1.4",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-radio-group": "^1.1.3",
    "@radix-ui/react-scroll-area": "^1.0.5",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-separator": "^1.0.3",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-slot": "^1.0.2",
    "@radix-ui/react-switch": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-toggle": "^1.0.3",
    "@radix-ui/react-toggle-group": "^1.0.4",
    "@radix-ui/react-tooltip": "^1.0.7"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "tailwindcss": "^4.0.0-alpha.25",
    "@tailwindcss/vite": "^4.0.0-alpha.25",
    "typescript": "^5.2.2",
    "vite": "^5.0.8"
  }
}
```

## 🚀 Installation Commands

### One Command Install (All at Once)

```bash
# Create project
npm create vite@latest plv-classroom-app -- --template react-ts
cd plv-classroom-app

# Install all dependencies
npm install lucide-react date-fns sonner@2.0.3 clsx tailwind-merge class-variance-authority react-day-picker @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip

# Install dev dependencies
npm install -D tailwindcss@next @tailwindcss/vite@next
```

### Verify Installation

After installation, check that everything is installed:

```bash
npm list --depth=0
```

You should see all the packages listed above.

## 🔧 Version Notes

### Important Version Constraints

1. **Sonner must be version 2.0.3** - Do not upgrade to newer versions without testing
   ```bash
   npm install sonner@2.0.3
   ```

2. **Tailwind CSS v4** - Uses the alpha/next version
   ```bash
   npm install -D tailwindcss@next @tailwindcss/vite@next
   ```

3. **React 18+** - Required for latest features
   ```bash
   npm install react@^18.2.0 react-dom@^18.2.0
   ```

## 🐛 Troubleshooting

### Peer Dependency Warnings

If you see peer dependency warnings, they're usually safe to ignore. If you want to fix them:

```bash
npm install --legacy-peer-deps
```

### Missing Dependencies Error

If you get "Cannot find module" errors:

1. Check the error message for the package name
2. Install it: `npm install [package-name]`
3. Common missing packages:
   - `npm install @types/node` (for path resolution)
   - `npm install @radix-ui/react-slot` (for Button component)

### Tailwind Not Working

Make sure you have both packages:
```bash
npm install -D tailwindcss@next @tailwindcss/vite@next
```

And that `vite.config.ts` includes the Tailwind plugin.

## 📦 Optional Dependencies

### For Enhanced Development Experience

```bash
# ESLint for code quality
npm install -D eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser

# Prettier for code formatting  
npm install -D prettier prettier-plugin-tailwindcss

# Type checking
npm install -D @types/node
```

### For Deployment

```bash
# Vercel CLI
npm install -g vercel

# Netlify CLI
npm install -g netlify-cli

# GitHub Pages deployment
npm install -D gh-pages
```

## 🔄 Updating Dependencies

To update all dependencies to their latest compatible versions:

```bash
# Check for updates
npm outdated

# Update all (careful - test after!)
npm update

# Update specific package
npm update lucide-react
```

**Warning**: Do NOT update sonner beyond 2.0.3 without testing, as the import syntax may change.

## 📊 Bundle Size

Expected production bundle sizes:
- **Total JS**: ~300-400 KB (gzipped)
- **CSS**: ~20-30 KB (gzipped)
- **Initial Load**: Fast on 3G networks

The largest dependencies:
1. React + React DOM (~130 KB)
2. Radix UI components (~100 KB)
3. Date libraries (~40 KB)
4. Icons (~30 KB)

All are necessary for the application functionality.

---

## ✅ Quick Checklist

Before running the app, ensure you have:

- [ ] Node.js 18+ installed
- [ ] All core dependencies installed
- [ ] All Radix UI packages installed
- [ ] Tailwind CSS v4 installed
- [ ] react-day-picker installed
- [ ] sonner@2.0.3 (exact version) installed

Then run:
```bash
npm run dev
```

Your app should now be running! 🎉
