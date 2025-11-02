#!/usr/bin/env bash
# Small bootstrap to make the script robust against CRLF (\r) line endings
# When the file was committed on Windows with CRLF, the Linux bash on Vercel
# can see stray \r bytes and fail. We rewrite the script to a cleaned temp
# file and exec it. This is safe and idempotent because we set VERCEL_CLEANED.
if [ -z "${VERCEL_CLEANED-}" ]; then
	TMP_SH="$(mktemp /tmp/vercel-build.XXXXXX.sh)"
	# remove CR characters and write to tmp
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
