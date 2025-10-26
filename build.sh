#!/bin/bash

# Build script for Prometheus Alert Generator
# Builds the React app and then Hugo site

set -e  # Exit on error

echo "Building Prometheus Alert Generator..."
echo ""

# Build React app
echo "Step 1: Building React app..."
cd app
npm run build
cd ..
echo "✓ React app built to hugo/static/app/"
echo ""

# Build Hugo site
echo "Step 2: Building Hugo site..."
cd hugo
hugo
cd ..
echo "✓ Hugo site built to hugo/public/"
echo ""

echo "Build complete!"
echo ""
echo "To preview:"
echo "  cd hugo && hugo server"
echo ""
echo "React app is available at: http://localhost:1313/app/"
echo "Blog is available at: http://localhost:1313/blog/"
echo "FAQ is available at: http://localhost:1313/faq/"
