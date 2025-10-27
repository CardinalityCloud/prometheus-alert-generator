#!/bin/bash

# Build script for Prometheus Alert Generator
# Builds the React app and then Hugo site

set -euo pipefail  # Exit on error

echo "Building Prometheus Alert Generator..."
echo ""

for app in pag prc; do
    echo "Building React app: $app"
    pushd $app
    npm install
    npm run build
    popd
done

# Build Hugo site
echo "Building Hugo site..."
pushd hugo
npm install
npm run build:css
hugo
popd

echo ""
echo "Build complete!"
echo ""
echo "To preview:"
echo "  cd hugo && hugo server --disableFastRender"
