import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React and core libs
          'react-vendor': ['react', 'react-dom'],
          // Firebase split into sub-packages to reduce single huge vendor chunk
          'firebase-core': ['firebase/app'],
          'firebase-auth': ['firebase/auth'],
          'firebase-firestore': ['firebase/firestore'],
          'firebase-functions': ['firebase/functions'],
          // Radix/UI and UI libraries
          'radix-vendor': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip'
          ],
          'phosphor-icons': ['@phosphor-icons/react'],
          'lucide-react': ['lucide-react'],
          'analytics-sonner': ['@vercel/analytics', 'sonner'],
          'utils-vendor': ['date-fns', 'clsx', 'class-variance-authority', 'tailwind-merge']
        }
      }
    },
    // Temporarily raise the warning threshold to accommodate large icon package.
    // NOTE: For best performance, consider replacing '@phosphor-icons/react' with
    // individual icon imports, a lighter icon set, or dynamic imports so tree-shaking
    // can remove unused icons. This will allow keeping chunkSizeWarningLimit low.
    chunkSizeWarningLimit: 6000
  }
})
