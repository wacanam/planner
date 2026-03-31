# Neon CLI Setup Guide for Planner Project

Neon CLI (`neonctl`) has been installed locally in the planner project. Use these commands to authenticate and retrieve your project connection parameters.

## Quick Start

### Step 1: Authenticate with Neon

**Option A: Web Authentication (Recommended)**
```bash
pnpm neon:auth
```
This opens your browser to authorize the CLI. You'll be prompted to log in to your Neon account.

**Option B: API Key Authentication**
1. Get your API key from: https://console.neon.tech/app/settings/api-keys
2. Set the environment variable:
   ```bash
   export NEON_API_KEY=<your-api-key>
   ```

### Step 2: Run the Setup Script

```bash
pnpm neon:setup
```

This automated script will:
- ✅ Verify authentication
- ✅ List all your Neon projects
- ✅ Find the "planner" project
- ✅ Show project details and branches
- ✅ Retrieve the connection string for your main branch
- ✅ Display the `DATABASE_URL` to add to `.env.local`

## Available Neon Commands

All commands use the Neon CLI. Use these directly:

```bash
# Authentication
pnpm neon:auth                 # Authenticate via browser

# Project Management
pnpm neon:projects             # List all projects
neonctl projects list          # Alternative syntax
neonctl projects get <id>      # Get project details
neonctl projects create --name planner  # Create new project

# Branch Management
pnpm neon:branches             # List branches for current project
neonctl branches list          # List all branches
neonctl branches create --name dev  # Create new branch
neonctl branches get <branch>  # Get branch details

# Connection Strings
pnpm neon:cs                   # Get connection string for current project
neonctl connection-string      # For main branch
neonctl connection-string dev  # For specific branch
neonctl connection-string --role postgres  # For specific role

# User Info
neonctl me                     # Show current user info
```

## Setting Neon Context

To avoid specifying project ID with every command, set your project context:

```bash
neonctl set-context --project-id <your-project-id>
```

This creates a `.neon` file with your project context.

## Common Workflows

### 1. Get Connection String for .env.local

```bash
# Get the connection string
pnpm neon:cs --output json | jq -r '.connectionUri'

# Add to .env.local
echo "DATABASE_URL=$(pnpm neon:cs --output json | jq -r '.connectionUri')" >> .env.local
```

### 2. Create a Development Branch

```bash
# Create dev branch from main
neonctl branches create --name dev --parent main

# Get connection string for dev branch
neonctl connection-string dev
```

### 3. Create a Preview Branch (for testing)

```bash
# Create preview branch
neonctl branches create --name preview-feature-123 --parent main

# Set expiration to 7 days
neonctl branches set-expiration preview-feature-123 --expiration-time 7d

# Get connection string
neonctl connection-string preview-feature-123
```

### 4. List All Project Details

```bash
# JSON format for programmatic access
neonctl projects list --output json

# Table format for readability
neonctl projects list --output table

# YAML format
neonctl projects list --output yaml
```

## Troubleshooting

### Error: "No organization context set"

If you see this error, set your organization:
```bash
neonctl set-context --org-id <your-org-id> --project-id <your-project-id>
```

Find your organization ID in Neon Console: Settings > Organization Settings

### Error: "Invalid API key"

Verify your API key:
```bash
echo $NEON_API_KEY
```

If empty, create a new key at: https://console.neon.tech/app/settings/api-keys

### Error: "Project not found"

Ensure the project exists in Neon Console. Create one at: https://console.neon.tech

## Environment Variables

Set these for automation:

```bash
# Required for script-based authentication
export NEON_API_KEY=<your-api-key>

# Optional: Set default config directory
export NEON_CONFIG_DIR=~/.neon

# Optional: Disable analytics
export NEON_ANALYTICS=false
```

## Next Steps

1. **Authenticate:** Run `pnpm neon:auth`
2. **Create project:** Go to https://console.neon.tech and create a "planner" project
3. **Get connection string:** Run `pnpm neon:setup`
4. **Configure .env.local:** Copy the connection string from step 3
5. **Enable PostGIS:** Run `CREATE EXTENSION IF NOT EXISTS postgis;` in Neon SQL editor
6. **Verify connection:** Run `pnpm db:verify`
7. **Run migrations:** Run `pnpm db:migrate`

## Resources

- [Neon CLI Documentation](https://neon.com/docs/reference/neon-cli)
- [Neon Console](https://console.neon.tech)
- [Neon GitHub Repository](https://github.com/neondatabase/neonctl)
