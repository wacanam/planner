#!/bin/bash

# Neon CLI Setup Guide
# This script helps you authenticate and configure Neon for the planner project

echo "========================================="
echo "Neon CLI Authentication & Setup"
echo "========================================="
echo ""

# Check if API key is set
if [ -z "$NEON_API_KEY" ]; then
  echo "⚠️  NEON_API_KEY environment variable not set."
  echo ""
  echo "To authenticate, choose one of the following methods:"
  echo ""
  echo "METHOD 1: Web Authentication (Recommended)"
  echo "  Run: pnpm exec neonctl auth"
  echo "  This will open your browser to authorize the CLI."
  echo ""
  echo "METHOD 2: API Key Authentication"
  echo "  1. Go to: https://console.neon.tech/app/settings/api-keys"
  echo "  2. Create a Personal API Key"
  echo "  3. Run: export NEON_API_KEY=<your-api-key>"
  echo ""
  exit 1
fi

echo "✅ NEON_API_KEY is set. Proceeding with authentication..."
echo ""

# Try to list projects to verify authentication
echo "Checking authentication..."
pnpm exec neonctl me --api-key "$NEON_API_KEY" > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "✅ Authentication successful!"
  echo ""
  
  # List projects
  echo "========================================="
  echo "Your Neon Projects:"
  echo "========================================="
  pnpm exec neonctl projects list --api-key "$NEON_API_KEY" --output table
  echo ""
  
  # Look for 'planner' project
  echo "========================================="
  echo "Looking for 'planner' project..."
  echo "========================================="
  PLANNER_PROJECT=$(pnpm exec neonctl projects list --api-key "$NEON_API_KEY" --output json | jq -r '.projects[] | select(.name | contains("planner")) | .id' | head -1)
  
  if [ -z "$PLANNER_PROJECT" ]; then
    echo "⚠️  No project named 'planner' found."
    echo ""
    echo "Next steps:"
    echo "1. Create a project in Neon Console: https://console.neon.tech/"
    echo "2. Name it 'planner' (or your preferred name)"
    echo "3. Run this script again"
  else
    echo "✅ Found planner project: $PLANNER_PROJECT"
    echo ""
    echo "========================================="
    echo "Planner Project Details:"
    echo "========================================="
    pnpm exec neonctl projects get "$PLANNER_PROJECT" --api-key "$NEON_API_KEY" --output table
    echo ""
    
    echo "========================================="
    echo "Planner Project Branches:"
    echo "========================================="
    pnpm exec neonctl branches list --project-id "$PLANNER_PROJECT" --api-key "$NEON_API_KEY" --output table
    echo ""
    
    echo "========================================="
    echo "Connection String (main branch):"
    echo "========================================="
    CONNECTION_STRING=$(pnpm exec neonctl connection-string --project-id "$PLANNER_PROJECT" --api-key "$NEON_API_KEY" --output json | jq -r '.connectionUri')
    
    if [ -n "$CONNECTION_STRING" ]; then
      echo "Add this to your .env.local:"
      echo "DATABASE_URL=$CONNECTION_STRING"
      echo ""
      echo "Or run:"
      echo "echo \"DATABASE_URL=$CONNECTION_STRING\" >> .env.local"
    fi
  fi
else
  echo "❌ Authentication failed. Please check your NEON_API_KEY."
  exit 1
fi
