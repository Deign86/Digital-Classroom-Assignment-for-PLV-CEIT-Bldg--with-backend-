import React from 'react';
import ThemeToggle from '../src/components/ThemeToggle';

export default function Footer() {
  return (
    <footer className="bg-white/80 backdrop-blur-xl border-t border-gray-100 py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="space-y-2 text-left">
          <p className="text-sm text-gray-600">
            © 2025 Pamantasan ng Lungsod ng Valenzuela
          </p>
          <p className="text-sm text-gray-500">
            College of Engineering and Information Technology
          </p>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </footer>
  );
}