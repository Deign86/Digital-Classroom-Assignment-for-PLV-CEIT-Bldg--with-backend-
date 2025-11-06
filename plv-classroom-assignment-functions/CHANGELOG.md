# Changelog — plv-classroom-assignment-functions

All notable changes for the `plv-classroom-assignment-functions` package.

## Unreleased

- Bump `firebase-functions` to ^5.1.0 to prepare for Firebase CLI / Extensions compatibility.
- Target Node.js runtime `20` in `package.json` (Cloud Functions runtime).
- No functional changes to existing exports; codebase builds and smoke-loads locally.

### Notes

- The `functions.config()` API is deprecated and will stop being deployable after March 2026. If your project uses it elsewhere, plan to migrate to dotenv or environment variables before that date.
- There are transitive `npm audit` warnings (4 critical) reported by `npm install`. These originate from indirect dependencies; I did not force-fix them to avoid breaking changes. Consider running `npm audit` and `npm audit fix` in the functions directory to triage.

### Testing

1. Build locally:

   npm --prefix ./plv-classroom-assignment-functions run build

2. Deploy (if you are logged in):

   firebase deploy --only functions:plv-classroom-assignment-functions

3. Verify in Firebase Console (us-central1):
   - Confirm runtime is Node 20 for updated functions.
   - Check scheduled function `expirePastPendingBookings` and confirm next run time.
