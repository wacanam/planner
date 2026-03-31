# CI/CD Setup Guide

This guide explains how to configure GitHub Actions workflows for the Planner project.

## Required Setup

### 1. Add GitHub Secrets

Go to: **Settings → Secrets and variables → Actions**

Add this secret:

| Secret Name | Value | How to get it |
|---|---|---|
| `NEON_API_KEY` | Your Neon API key | https://console.neon.tech/app/settings/api-keys |

### 2. Add GitHub Variables

Go to: **Settings → Secrets and variables → Actions**

Add this variable:

| Variable Name | Value | How to get it |
|---|---|---|
| `NEON_PROJECT_ID` | Your Neon project ID | https://console.neon.tech/app/projects |

**Example:**
- `NEON_PROJECT_ID` = `purple-sound-99622853`
- `NEON_API_KEY` = (Keep secret!)

## Workflows Explained

### 1. Neon Branch Management (`.github/workflows/neon-branch.yml`)

**When it runs:**
- ✅ Pull Request created/reopened/updated
- ✅ Pull Request closed

**What it does:**

#### On PR Open/Update
1. Creates isolated Neon database branch
   - Branch name: `preview/pr-<PR-NUMBER>-<BRANCH-NAME>`
   - Expires after 2 weeks
2. Installs dependencies
3. Runs TypeORM migrations on preview branch
4. Posts schema diff comment to PR

#### On PR Close
1. Automatically deletes Neon preview branch

**Benefits:**
- Each PR gets its own isolated database
- Migrations tested before merge
- Schema changes documented in PR
- Automatic cleanup when PR closes

### 2. Build & Test (`.github/workflows/build-test.yml`)

**When it runs:**
- ✅ Push to `main` or `develop`
- ✅ Pull Request to `main` or `develop`

**What it does:**
1. Installs dependencies
2. Runs Biome linter
3. Type checks with TypeScript
4. Builds Next.js application

**Fails if:**
- ❌ Linting errors
- ❌ TypeScript errors
- ❌ Build fails

## Usage

### Creating a PR

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes
3. Push to GitHub: `git push origin feature/my-feature`
4. Open Pull Request to `develop`

**GitHub Actions will automatically:**
- Create preview Neon branch
- Run migrations on preview database
- Run linter & type checks
- Build the application
- Post schema diff comment

### Merging a PR

1. Review PR (check CI status must pass ✅)
2. Check schema diff comment
3. Approve and merge to `develop`
4. Preview Neon branch auto-deletes

### Deploying to Production

1. Create PR from `develop` → `main`
2. Let CI/CD run (all checks must pass)
3. Merge to `main`
4. **Vercel automatically deploys** to production
5. Schema changes go live

## Troubleshooting

### "Secret not found: NEON_API_KEY"

1. Go to **Settings → Secrets and variables → Actions**
2. Verify `NEON_API_KEY` is added
3. Verify `NEON_PROJECT_ID` is added

### "Build failed in GitHub Actions but works locally"

Common causes:
- `.env.local` not in git (correct! Don't commit it)
- Missing environment variable in Vercel/GitHub
- Different Node version (should be 20)

**Fix:**
1. Add `DATABASE_URL` to Vercel environment variables
2. Add `NEON_API_KEY` to GitHub secrets

### "Migration failed on preview branch"

1. Check migration syntax in `.ts` file
2. Verify entities are registered in `cli-data-source.ts`
3. Check Neon branch was created successfully

**Debug:**
```bash
# Run locally to test
pnpm db:migrate
```

## Environment Variables

### GitHub Actions (automatically available)
- `GITHUB_TOKEN` - For GitHub API access
- `GITHUB_REF` - Current branch name
- `GITHUB_EVENT_NUMBER` - PR number

### Required in Secrets
- `NEON_API_KEY` - Neon authentication

### Required in Variables
- `NEON_PROJECT_ID` - Neon project ID

### Required in Vercel Dashboard
- `DATABASE_URL` - Production database connection string

## Monitoring

### View Workflow Runs

Go to: **Actions → All workflows**

See all runs, logs, and artifacts.

### Check a Specific PR

1. Go to PR
2. Scroll to "Checks" section
3. Click "Details" to see workflow logs

### Understanding Status

| Status | Meaning |
|--------|---------|
| ✅ Success | All checks passed, safe to merge |
| ⏳ In Progress | Waiting for checks to complete |
| ❌ Failed | Fix errors before merging |
| ⊘ Skipped | Workflow didn't run (normal) |

## Tips

1. **Keep migrations small** - Easier to debug if something fails
2. **Test locally first** - Run `pnpm db:migrate` before pushing
3. **Check PR comments** - Schema diff comment shows database changes
4. **Monitor build times** - Next.js builds should take ~30s
5. **Use descriptive branch names** - Shows up in Neon preview branch name

## Example PR Workflow

```
1. git checkout -b feature/add-users-table
2. Create src/entities/User.ts
3. Add User to cli-data-source.ts
4. pnpm db:generate -- --name CreateUsersTable
5. git add . && git commit -m "Add users table"
6. git push origin feature/add-users-table
7. Open PR on GitHub

   → GitHub Actions creates preview/pr-123-add-users-table
   → Migrations run automatically
   → Schema diff posted to PR
   → You can see exact changes

8. Review passes
9. Merge to develop
   → Preview branch auto-deletes
   → Build & Test workflow runs
   → Everything deployed ✅
```

## Next Steps

1. ✅ Add `NEON_API_KEY` secret
2. ✅ Add `NEON_PROJECT_ID` variable
3. ✅ Add `DATABASE_URL` to Vercel
4. ✅ Create a test PR to verify workflows run
5. Start development! 🚀
