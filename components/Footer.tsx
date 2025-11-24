import React, { useEffect, useState } from 'react';
import { getAllLogos } from '../lib/logoService';
import { logger } from '../lib/logger';

export default function Footer() {
  const [logos, setLogos] = useState<{ plv: string | null; ceit: string | null }>({
    plv: null,
    ceit: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        setIsLoading(true);
        const fetchedLogos = await getAllLogos();
        setLogos(fetchedLogos);
        
        if (!fetchedLogos.plv || !fetchedLogos.ceit) {
          logger.warn('One or more footer logos failed to load from Firebase Storage');
        }
      } catch (err) {
        logger.error('Failed to fetch footer logos:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogos();
  }, []);

  return (
    <footer className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-gray-800 py-6 mt-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-center gap-4 sm:gap-6 md:gap-8">
          {/* PLV Logo - Left */}
          <div className="flex-shrink-0">
            {isLoading ? (
              <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            ) : logos.plv ? (
              <img
                src={logos.plv}
                alt="Pamantasan ng Lungsod ng Valenzuela Logo"
                className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain transition-transform hover:scale-110"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
            ) : null}
          </div>

          {/* Text - Center */}
          <div className="text-center space-y-1 sm:space-y-2">
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
              © 2025 Pamantasan ng Lungsod ng Valenzuela
            </p>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              College of Engineering and Information Technology
            </p>
          </div>

          {/* CEIT Logo - Right */}
          <div className="flex-shrink-0">
            {isLoading ? (
              <div className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            ) : logos.ceit ? (
              <img
                src={logos.ceit}
                alt="College of Engineering and Information Technology Logo"
                className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 object-contain transition-transform hover:scale-110"
                loading="lazy"
                decoding="async"
                fetchPriority="low"
              />
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}