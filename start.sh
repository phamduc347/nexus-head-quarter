#!/bin/bash
# Nexus HQ - Start Dev Server and Open Browser
# This script starts the Vite development server and automatically opens the browser.

# Navigate to the script's directory to ensure relative paths work
cd "$(dirname "$0")"

# Start Vite and pass the --open flag
npm run dev -- --open
