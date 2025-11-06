#!/usr/bin/env bash
# Clean and re-exec to remove potential CRLF characters (\r) that break bash on Linux
if [ -z "${VERCEL_CLEANED-}" ]; then
	TMP_SH="$(mktemp /tmp/vercel-build.XXXXXX.sh)"
	tr -d '\r' < "$0" > "$TMP_SH"
	chmod +x "$TMP_SH"
	export VERCEL_CLEANED=1
	exec bash "$TMP_SH" "$@"
fi

echo "Running vercel-build script: installing dependencies and building..."

# If running under bash, enable pipefail. Otherwise fall back to portable flags.
if [ -n "${BASH_VERSION-}" ]; then
	set -euo pipefail
else
	set -euo
fi

# Use npm ci in CI for reproducible installs
npm ci

# Build TypeScript before running Vite build
./node_modules/.bin/tsc -p ./tsconfig.json

# Build the Vite app
./node_modules/.bin/vite build

echo "Build complete"
