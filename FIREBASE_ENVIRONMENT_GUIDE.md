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
