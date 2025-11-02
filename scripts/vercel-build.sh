#!/usr/bin/env bash
# Ensure we run with bash when available. Some environments may run a shell
# that doesn't support the `pipefail` option; guard against that.
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
#!/usr/bin/env bash
# Ensure we run with bash when available. Some environments may run a shell
# that doesn't support the `pipefail` option; guard against that.
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
