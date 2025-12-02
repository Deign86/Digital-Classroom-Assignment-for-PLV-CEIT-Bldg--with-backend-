/**
 * iOS/Safari detection and PWA installation status utilities.
 * 
 * iOS 16.4+ supports Web Push ONLY for Home Screen web apps (installed PWAs).
 * This module provides detection utilities to:
 * 1. Identify iOS/iPadOS devices
 * 2. Check if the app is running in standalone mode (installed from home screen)
 * 3. Provide appropriate user guidance for enabling push notifications
 */

import { logger } from './logger';

/**
 * Detect if running on iOS or iPadOS.
 * Note: iPads running iPadOS 13+ report as "Macintosh" in user agent,
 * so we also check for touch capability with Mac platform.
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent || '';
  const platform = navigator.platform || '';

  // Direct iOS detection
  if (/iPad|iPhone|iPod/.test(ua)) {
    return true;
  }

  // iPadOS 13+ detection: reports as Mac but has touch
  if (platform === 'MacIntel' && navigator.maxTouchPoints > 1) {
    return true;
  }

  // Check for iPad in platform (older versions)
  if (/iPad/.test(platform)) {
    return true;
  }

  return false;
}

/**
 * Detect if running on Safari browser (including iOS Safari).
 * This is important because only Safari supports "Add to Home Screen" on iOS.
 */
export function isSafariBrowser(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent || '';
  
  // Safari detection: contains Safari but not Chrome/Chromium-based browsers
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|EdgiOS|FxiOS|OPiOS/.test(ua);
  
  return isSafari;
}

/**
 * Check if the PWA is running in standalone mode (installed to home screen).
 * On iOS, this is REQUIRED for Web Push to work.
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check navigator.standalone (Safari/iOS specific)
  // @ts-ignore - standalone is a non-standard property
  if ('standalone' in navigator && navigator.standalone === true) {
    return true;
  }

  // Check display-mode media query (works on most browsers)
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Check for fullscreen mode as well (also valid for PWAs)
  if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }

  return false;
}

/**
 * Determine the iOS version if running on iOS.
 * Returns null if not iOS or version cannot be determined.
 */
export function getIOSVersion(): { major: number; minor: number; patch: number } | null {
  if (!isIOSDevice()) {
    return null;
  }

  const ua = navigator.userAgent || '';
  
  // Try to extract version from user agent
  // Format: "OS X_Y_Z" or "OS X_Y" (spaces may be underscores)
  const match = ua.match(/OS (\d+)[_.](\d+)(?:[_.](\d+))?/);
  if (match) {
    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: match[3] ? parseInt(match[3], 10) : 0
    };
  }

  return null;
}

/**
 * Check if the iOS version supports Web Push (16.4+).
 * Returns true for non-iOS devices (they have different requirements).
 */
export function isIOSVersionSupportingWebPush(): boolean {
  if (!isIOSDevice()) {
    // Not iOS - assume supported (desktop Safari, Chrome, etc. have their own checks)
    return true;
  }

  const version = getIOSVersion();
  if (!version) {
    // Cannot determine version - assume it might be supported
    logger.warn('[iosDetection] Could not determine iOS version');
    return true;
  }

  // iOS 16.4+ supports Web Push
  if (version.major > 16) {
    return true;
  }
  if (version.major === 16 && version.minor >= 4) {
    return true;
  }

  return false;
}

/**
 * Comprehensive check for iOS Web Push support.
 * Returns an object describing the current state and what action is needed.
 */
export interface IOSWebPushStatus {
  /** Whether the device is iOS/iPadOS */
  isIOS: boolean;
  /** Whether Safari browser is being used (required for iOS PWA) */
  isSafari: boolean;
  /** Whether the app is installed as a PWA (running standalone) */
  isInstalled: boolean;
  /** Whether the iOS version supports Web Push (16.4+) */
  versionSupported: boolean;
  /** Whether Web Push can work in the current context */
  canUsePush: boolean;
  /** User-facing message explaining the current state */
  message: string;
  /** What action the user needs to take, if any */
  action: 'none' | 'install' | 'upgrade-ios' | 'use-safari' | 'unsupported';
}

export function getIOSWebPushStatus(): IOSWebPushStatus {
  const isIOS = isIOSDevice();
  const isSafari = isSafariBrowser();
  const isInstalled = isStandaloneMode();
  const versionSupported = isIOSVersionSupportingWebPush();

  // Non-iOS devices - standard Web Push rules apply
  if (!isIOS) {
    return {
      isIOS: false,
      isSafari,
      isInstalled,
      versionSupported: true,
      canUsePush: true, // Will be checked by browser's own support detection
      message: '',
      action: 'none'
    };
  }

  // iOS but version too old
  if (!versionSupported) {
    const version = getIOSVersion();
    return {
      isIOS: true,
      isSafari,
      isInstalled,
      versionSupported: false,
      canUsePush: false,
      message: `Your iOS version (${version?.major}.${version?.minor}) does not support push notifications. Please update to iOS 16.4 or later.`,
      action: 'upgrade-ios'
    };
  }

  // iOS with supported version, but not using Safari
  if (!isSafari) {
    return {
      isIOS: true,
      isSafari: false,
      isInstalled,
      versionSupported: true,
      canUsePush: false,
      message: 'To enable push notifications on iOS, please open this app in Safari and add it to your Home Screen.',
      action: 'use-safari'
    };
  }

  // iOS Safari with supported version, but not installed
  if (!isInstalled) {
    return {
      isIOS: true,
      isSafari: true,
      isInstalled: false,
      versionSupported: true,
      canUsePush: false,
      message: 'To enable push notifications, add this app to your Home Screen. Tap the Share button, then "Add to Home Screen".',
      action: 'install'
    };
  }

  // iOS Safari, installed as PWA, version supports push - good to go!
  return {
    isIOS: true,
    isSafari: true,
    isInstalled: true,
    versionSupported: true,
    canUsePush: true,
    message: '',
    action: 'none'
  };
}

/**
 * Log the current iOS Web Push status for debugging.
 */
export function logIOSWebPushStatus(): void {
  const status = getIOSWebPushStatus();
  logger.log('[iosDetection] iOS Web Push Status:', {
    isIOS: status.isIOS,
    isSafari: status.isSafari,
    isInstalled: status.isInstalled,
    versionSupported: status.versionSupported,
    canUsePush: status.canUsePush,
    action: status.action,
    message: status.message || '(none)',
    iosVersion: getIOSVersion(),
    userAgent: navigator.userAgent
  });
}

// Expose for debugging in development
if (import.meta.env.DEV) {
  (window as any).iosDetection = {
    isIOSDevice,
    isSafariBrowser,
    isStandaloneMode,
    getIOSVersion,
    isIOSVersionSupportingWebPush,
    getIOSWebPushStatus,
    logIOSWebPushStatus
  };
}
