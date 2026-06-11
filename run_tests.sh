#!/bin/bash
# Nexus HQ — Run Test Suite
# Runs the vitest unit tests.

echo "Running Nexus HQ Unit Tests..."
npm run test -- --no-cache
