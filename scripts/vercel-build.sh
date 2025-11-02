#!/usr/bin/env bash
set -euo pipefail
echo "Running vercel-build script: installing dependencies and building..."

# Use npm ci in CI for reproducible installs
npm ci

# Build TypeScript before running Vite build
./node_modules/.bin/tsc -p ./tsconfig.json

# Build the Vite app
./node_modules/.bin/vite build

echo "Build complete"
