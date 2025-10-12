// Basic configuration for Vercel Speed Insights
// This file is used by the `speed-insights` CLI and GitHub Action.

module.exports = {
  // The URL to measure. In CI you'll set VERCEL_URL via workflow or repo variable.
  url: process.env.TARGET_URL || process.env.VERCEL_URL || 'https://digital-classroom-assignment-for-plv.vercel.app/',

  // Lighthouse options
  lighthouse: {
    // emulatedFormFactor: 'mobile', // 'mobile' or 'desktop' - you can parametrize in workflow
    settings: {
      emulatedFormFactor: 'mobile',
      throttlingMethod: 'provided',
    },
  },

  // Locations to run from, optionally override in CI
  runs: [
    { name: 'mobile', formFactor: 'mobile' },
    { name: 'desktop', formFactor: 'desktop' }
  ],

  // Output settings
  output: {
    json: true,
    html: true,
    reportFolder: 'speed-insights-reports'
  }
};
