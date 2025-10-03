import { SpeedInsights as VercelSpeedInsights } from '@vercel/speed-insights/react';

/**
 * Enhanced Speed Insights component with proper configuration
 * Includes environment-based settings and error handling
 */
export function SpeedInsights() {
  // Only render Speed Insights in production or when explicitly enabled
  const shouldRender = import.meta.env.PROD || import.meta.env.VITE_ENABLE_SPEED_INSIGHTS === 'true';
  
  if (!shouldRender) {
    // In development, log that Speed Insights is disabled
    if (import.meta.env.DEV) {
      console.log('🚀 Speed Insights: Disabled in development mode');
    }
    return null;
  }

  try {
    return <VercelSpeedInsights />;
  } catch (error) {
    console.error('Speed Insights error:', error);
    return null;
  }
}

export default SpeedInsights;