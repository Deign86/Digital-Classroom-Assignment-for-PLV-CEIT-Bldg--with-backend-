#!/usr/bin/env bash
set -euo pipefail
echo "Running vercel-build script: installing dependencies and building..."
npm ci
./node_modules/.bin/tsc -p ./tsconfig.json
./node_modules/.bin/vite build
echo "Build complete"
