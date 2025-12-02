import React, { useEffect, useState } from 'react';
import { getAllLogos } from '../lib/logoService';
import { logger } from '../lib/logger';

interface LogoHeaderProps {
  /** Size preset for the logos */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Custom className for the container */
  className?: string;
  /** Show loading skeleton while logos are being fetched */
  showSkeleton?: boolean;
}

// Size mappings for responsive logo display
const sizeClasses = {
  sm: 'h-8 w-8 sm:h-10 sm:w-10',
  md: 'h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16',
  lg: 'h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24',
  xl: 'h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32',
} as const;

/**
 * LogoHeader Component
 * 
 * Displays PLV and CEIT institutional logos fetched from Firebase Storage.
 * Implements loading states, error handling, and responsive sizing.
 */
export default function LogoHeader({ 
  size = 'md', 
  className = '', 
  showSkeleton = true 
}: LogoHeaderProps) {
  const [logos, setLogos] = useState<{ plv: string | null; ceit: string | null }>({
    plv: null,
    ceit: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchLogos = async () => {
      try {
        setIsLoading(true);
        const fetchedLogos = await getAllLogos();
        logger.debug('Fetched logos:', fetchedLogos);
        setLogos(fetchedLogos);
        
        // Track if any logo failed to load
        if (!fetchedLogos.plv || !fetchedLogos.ceit) {
          logger.warn('One or more logos failed to load:', { plv: !!fetchedLogos.plv, ceit: !!fetchedLogos.ceit });
          setError(true);
          logger.warn('One or more logos failed to load from Firebase Storage');
        }
      } catch (err) {
        logger.error('Failed to fetch logos:', err);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogos();
  }, []);

  const sizeClass = sizeClasses[size];

  // Loading skeleton
  if (isLoading && showSkeleton) {
    return (
      <div className={`flex items-center gap-3 sm:gap-4 ${className}`}>
        <div className={`${sizeClass} bg-gray-200 rounded-full animate-pulse flex-shrink-0`} />
        <div className={`${sizeClass} bg-gray-200 rounded-full animate-pulse flex-shrink-0`} />
      </div>
    );
  }

  // Show at least one logo if available, or nothing if both failed
  if (!logos.plv && !logos.ceit) {
    logger.debug('Both logos failed to load, hiding component');
    return null;
  }

  return (
    <div className={`flex items-center gap-3 sm:gap-4 ${className}`}>
      {logos.plv && (
        <img
          src={logos.plv}
          alt="Pamantasan ng Lungsod ng Valenzuela Logo"
          className={`${sizeClass} object-contain flex-shrink-0`}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      )}
      {logos.ceit && (
        <img
          src={logos.ceit}
          alt="College of Engineering and Information Technology Logo"
          className={`${sizeClass} object-contain flex-shrink-0`}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      )}
    </div>
  );
}
