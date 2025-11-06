PR: Upgrade firebase-functions to v5.x and target Node 20 runtime

Summary
-------
This branch upgrades the `plv-classroom-assignment-functions` package to request Node.js 20 runtime and bumps `firebase-functions` to the v5.x line (>=5.1.0).

What changed
------------
- `package.json`: engines.node set to `20` and `firebase-functions` updated to `^5.1.0`.
- `CHANGELOG.md` added with notes and test steps.

Why
---
- The Firebase CLI and console warned about the older functions SDK and Node 18 deprecation. This change brings the functions package in line with supported runtimes and prepares the code for extensions and future CLI behavior.

Testing notes
-------------
1. Build: `npm --prefix ./plv-classroom-assignment-functions run build`
2. Deploy: `firebase deploy --only functions:plv-classroom-assignment-functions`
3. Verify in Firebase Console (us-central1) that the functions are running Node 20 and scheduled job exists.

Risks & follow-ups
-------------------
- `functions.config()` is deprecated; migrate before March 2026.
- There are transitive `npm audit` warnings; consider triaging them separately.
