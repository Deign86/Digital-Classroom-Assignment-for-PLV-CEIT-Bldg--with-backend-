/**
 * Logo Service - Firebase Storage integration for institutional logos
 * 
 * This service fetches logo URLs from Firebase Storage for display throughout
 * the application. Logos are stored at predefined paths and cached for performance.
 * 
 * Expected storage paths:
 * - logos/plv-logo.png (Pamantasan ng Lungsod ng Valenzuela official logo)
 * - logos/ceit-logo.png (College of Engineering and Information Technology logo)
 */

import { getDownloadURL, ref } from 'firebase/storage';
import { getFirebaseStorage } from './firebaseConfig';
import { logger } from './logger';

// Cache logo URLs to avoid repeated Firebase Storage calls
const logoCache: Map<string, string> = new Map();

// LocalStorage key for persistent cache
const LOGO_CACHE_KEY = 'plv-ceit-logo-cache';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// Load cached URLs from localStorage on module initialization
const loadCacheFromStorage = (): void => {
  try {
    const cached = localStorage.getItem(LOGO_CACHE_KEY);
    if (cached) {
      const { urls, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      
      // Only use cache if it's less than 7 days old
      if (age < CACHE_EXPIRY_MS) {
        Object.entries(urls).forEach(([key, url]) => {
          logoCache.set(key, url as string);
        });
        logger.log('Logos loaded from localStorage cache');
      } else {
        localStorage.removeItem(LOGO_CACHE_KEY);
        logger.log('Expired logo cache cleared');
      }
    }
  } catch (error) {
    logger.warn('Failed to load logo cache from localStorage:', error);
  }
};

// Save cached URLs to localStorage
const saveCacheToStorage = (): void => {
  try {
    const urls: Record<string, string> = {};
    logoCache.forEach((url, key) => {
      urls[key] = url;
    });
    localStorage.setItem(LOGO_CACHE_KEY, JSON.stringify({
      urls,
      timestamp: Date.now()
    }));
    logger.log('Logos saved to localStorage cache');
  } catch (error) {
    logger.warn('Failed to save logo cache to localStorage:', error);
  }
};

// Initialize cache from localStorage
loadCacheFromStorage();

// Logo storage paths in Firebase Storage
// Using WebP format for better performance (30-80% smaller than PNG)
const LOGO_PATHS = {
  plv: 'logos/plv-logo.webp',
  ceit: 'logos/ceit-logo.webp',
} as const;

export type LogoType = keyof typeof LOGO_PATHS;

/**
 * Fetch logo URL from Firebase Storage with caching
 * @param logoType - Type of logo to fetch ('plv' or 'ceit')
 * @returns Promise resolving to the logo URL, or null if not found
 */
export const getLogoUrl = async (logoType: LogoType): Promise<string | null> => {
  try {
    // Check cache first
    const cached = logoCache.get(logoType);
    if (cached) {
      return cached;
    }

    // Fetch from Firebase Storage
    const storage = getFirebaseStorage();
    const logoPath = LOGO_PATHS[logoType];
    const logoRef = ref(storage, logoPath);
    const url = await getDownloadURL(logoRef);

    // Cache the result in memory and localStorage
    logoCache.set(logoType, url);
    saveCacheToStorage();
    logger.log(`Logo URL fetched and cached for ${logoType}:`, logoPath);

    return url;
  } catch (error) {
    logger.warn(`Failed to fetch logo for ${logoType}:`, error);
    return null;
  }
};

/**
 * Fetch both PLV and CEIT logo URLs in parallel
 * @returns Promise resolving to object containing both logo URLs
 */
export const getAllLogos = async (): Promise<{
  plv: string | null;
  ceit: string | null;
}> => {
  const [plv, ceit] = await Promise.all([
    getLogoUrl('plv'),
    getLogoUrl('ceit'),
  ]);

  return { plv, ceit };
};

/**
 * Clear logo cache (useful for testing or if logos are updated)
 */
export const clearLogoCache = (): void => {
  logoCache.clear();
  try {
    localStorage.removeItem(LOGO_CACHE_KEY);
  } catch (error) {
    logger.warn('Failed to clear localStorage cache:', error);
  }
  logger.log('Logo cache cleared');
};

/**
 * Preload logos to improve initial render performance
 * Call this during app initialization
 */
export const preloadLogos = async (): Promise<void> => {
  try {
    await getAllLogos();
    logger.log('Logos preloaded successfully');
  } catch (error) {
    logger.warn('Failed to preload logos:', error);
  }
};
