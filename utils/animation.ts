// Apple-style animation utilities and constants

// Apple's signature easing curves
export const appleEasing = {
  // Primary easing for most interactions
  ease: [0.25, 0.1, 0.25, 1.0] as const,
  // For subtle, gentle animations
  easeOut: [0.16, 1, 0.3, 1] as const,
  // For more pronounced entrances
  easeIn: [0.4, 0, 1, 1] as const,
  // For bouncy, playful interactions
  spring: [0.68, -0.55, 0.265, 1.55] as const,
  // For smooth, natural movements
  natural: [0.4, 0.0, 0.2, 1] as const,
  // For quick, snappy interactions
  snappy: [0.4, 0.0, 0.6, 1] as const,
};

// Animation durations following Apple's design principles
export const appleDuration = {
  instant: 0.1,
  fast: 0.2,
  normal: 0.3,
  slow: 0.5,
  slower: 0.8,
  slowest: 1.2,
};

// Common animation variants
export const fadeInUp = {
  initial: { 
    opacity: 0, 
    y: 60,
    scale: 0.95,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: appleDuration.slow,
      ease: appleEasing.easeOut,
    },
  },
  exit: { 
    opacity: 0, 
    y: -30,
    scale: 1.05,
    transition: {
      duration: appleDuration.fast,
      ease: appleEasing.easeIn,
    },
  },
};

export const fadeInLeft = {
  initial: { 
    opacity: 0, 
    x: -60,
    scale: 0.95,
  },
  animate: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: {
      duration: appleDuration.slow,
      ease: appleEasing.easeOut,
    },
  },
  exit: { 
    opacity: 0, 
    x: 60,
    scale: 1.05,
    transition: {
      duration: appleDuration.fast,
      ease: appleEasing.easeIn,
    },
  },
};

export const fadeInRight = {
  initial: { 
    opacity: 0, 
    x: 60,
    scale: 0.95,
  },
  animate: { 
    opacity: 1, 
    x: 0,
    scale: 1,
    transition: {
      duration: appleDuration.slow,
      ease: appleEasing.easeOut,
    },
  },
  exit: { 
    opacity: 0, 
    x: -60,
    scale: 1.05,
    transition: {
      duration: appleDuration.fast,
      ease: appleEasing.easeIn,
    },
  },
};

export const scaleIn = {
  initial: { 
    opacity: 0, 
    scale: 0.8,
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: appleDuration.normal,
      ease: appleEasing.spring,
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.9,
    transition: {
      duration: appleDuration.fast,
      ease: appleEasing.easeIn,
    },
  },
};

// Stagger animation for multiple elements
export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

export const staggerItem = {
  initial: { 
    opacity: 0, 
    y: 30,
  },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: appleDuration.normal,
      ease: appleEasing.easeOut,
    },
  },
};

// Hover animations
export const hoverScale = {
  scale: 1.02,
  transition: {
    duration: appleDuration.fast,
    ease: appleEasing.natural,
  },
};

export const hoverLift = {
  y: -2,
  scale: 1.01,
  transition: {
    duration: appleDuration.fast,
    ease: appleEasing.natural,
  },
};

export const tapScale = {
  scale: 0.98,
  transition: {
    duration: appleDuration.instant,
    ease: appleEasing.snappy,
  },
};

// Parallax scroll animations
export const parallaxSlow = {
  y: [0, -100],
  transition: {
    duration: appleDuration.slowest,
    ease: appleEasing.natural,
  },
};

export const parallaxFast = {
  y: [0, -200],
  transition: {
    duration: appleDuration.slow,
    ease: appleEasing.natural,
  },
};