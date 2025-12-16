# Environment-Specific Firebase Configuration Guide

## For Production Branch (main/master):
Use the new project: plv-classroom-assigment

## For Development/Other Branches:
You have options:

### Option A: Use the same new project for all branches
- Update .firebaserc on all branches to: "plv-classroom-assigment"
- Each developer maintains their own .env file

### Option B: Keep old project for development
- Keep .firebaserc as "plv-ceit-classroom" on dev branches
- Use different .env files per environment

### Option C: Create separate Firebase projects
- Production: plv-classroom-assigment
- Development: plv-classroom-dev (create new project)
- Staging: plv-classroom-staging (create new project)

## Recommended: Option A (same project, different environments)

## Vercel build-time image sync

- To serve images from Vercel instead of Firebase Storage (faster static delivery), provide a service account and bucket name as build env vars and enable the fetcher:
	- `FIREBASE_SERVICE_ACCOUNT` — service account JSON (or set `GOOGLE_APPLICATION_CREDENTIALS` to a path)
	- `FIREBASE_STORAGE_BUCKET` — your storage bucket (e.g. `plv-classroom-assigment.firebasestorage.app`)
	- The project includes `scripts/fetch-images-from-storage.js` which downloads files from the `logos/` prefix into `public/images/logos/` during the Vercel build.

	On Vercel set `VERCEL_BUILDER` envs accordingly and the `vercel-build` script will run the fetcher before the build.
