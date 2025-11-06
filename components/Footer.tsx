import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-card/80 backdrop-blur-xl border-t border-border py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4 text-center">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            © 2025 Pamantasan ng Lungsod ng Valenzuela
          </p>
          <p className="text-sm text-muted-foreground">
            College of Engineering and Information Technology
          </p>
        </div>
      </div>
    </footer>
  );
}