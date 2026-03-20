---
title: "Developer Workflow Use Cases"
date: 2026-03-20
stage: 02-design
role: rdpi-architect
workflow: b0.4
---

# Developer Workflow Use Cases

## UC-1: Pull Request CI Checks

**Actor**: Developer (contributor or maintainer)

**Trigger**: `pull_request` event targeting `main` branch.

**Steps**:
1. Developer creates a feature branch, makes changes, pushes to GitHub
2. Developer opens a Pull Request targeting `main`
3. GitHub triggers CI workflow (`ci.yml`)
4. CI runs: checkout → setup-node (22.x) → `npm ci` → `ts-check` → `format:check` → `lint` → `test`
5. Check results appear as status checks on the PR

**Expected result**: PR shows green checkmark (all checks pass) or red X (one or more checks fail) with details of which step failed.

**Edge cases**:
- **PR from fork**: CI runs with read-only permissions; no access to secrets or environments. All checks function normally (no secrets needed for CI).
- **Push to existing PR**: CI re-triggers on each new push; previous run is superseded.
- **`npm ci` fails**: All subsequent steps are skipped. Common cause: `package-lock.json` out of sync with `package.json` — developer must run `npm install` locally and commit the updated lockfile.
- **Format check fails**: Developer must run `npm run format` locally and push the formatted code.
- **Lint fails**: Developer must fix lint errors (or run `npm run lint:fix` for auto-fixable issues).

## UC-2: Post-Merge Validation on Main

**Actor**: Developer (anyone who merges to main)

**Trigger**: `push` event on `main` branch (merge commit or direct push).

**Steps**:
1. Developer merges an approved PR into `main` (or pushes directly)
2. GitHub triggers CI workflow (`ci.yml`)
3. CI runs the same checks as UC-1 against the merge commit
4. Results visible on the commit status in the repository

**Expected result**: Green checkmark on the merge commit. If any check fails, the main branch is in a broken state — requires immediate fix.

**Edge cases**:
- **Merge conflict resolution introduces errors**: The PR passed CI individually, but the merge commit may have new issues. This flow catches them.
- **Direct push to main**: Same CI checks run. No publish triggered (no tag push).
- **Concurrent merges**: Each merge commit triggers its own CI run independently.

## UC-3: Release a New Version

**Actor**: Maintainer (with push access to `main`)

**Trigger**: Tag push `v*` → CI workflow → `workflow_run` → Publish workflow.

**Prerequisites**:
- All changes are merged to `main` and CI passes (UC-2)
- OIDC trusted publishing is configured on npm (see UC-4 for first-time setup)
- GitHub Environment `npm` exists

**Steps**:
1. Maintainer ensures `main` is up-to-date: `git pull origin main`
2. Maintainer bumps version: `npm version patch` (or `minor` / `major`)
   - This updates `version` in `package.json` and `package-lock.json`
   - Creates a git commit: `v<new-version>`
   - Creates a git tag: `v<new-version>`
3. Maintainer pushes: `git push --follow-tags`
   - Pushes the version commit to `main`
   - Pushes the `v*` tag
4. Tag push triggers CI workflow (all checks run against tagged commit)
5. CI completes → `workflow_run` triggers Publish workflow
6. Publish workflow validates: CI passed + tag push
7. Publish runs: checkout (tagged commit) → `npm ci` → `npm run build` → `npm publish --provenance --access public`
8. Package is published to npm with provenance badge

**Expected result**: New version available on npm registry at `@fozy-labs/js-configs@<new-version>` with provenance attestation.

**Edge cases**:
- **CI fails on tag push**: Publish workflow fires but skips (condition: `conclusion == 'success'` is false). Package is NOT published. Maintainer must fix the issue, delete the tag (`git tag -d v<version> && git push --delete origin v<version>`), reset the version commit, fix, and re-release.
- **npm publish fails (version already exists)**: npm returns `403`. This can happen if a previous partial run succeeded at publishing but failed at a later step. Resolution: bump to a new version.
- **OIDC token failure**: Publish step fails without partial publish (npm publish is atomic). Typically caused by misconfigured trusted publisher settings on npm — verify repo, workflow name, and environment match exactly.
- **Forgetting `--follow-tags`**: Only the commit pushes, not the tag. No publish triggers. Fix: `git push --tags` to push the tag separately.
- **Running `npm version` on wrong branch**: Tag points to a commit not on `main`. CI will still run and publish will proceed (no branch filter on tags). Maintainer discipline required — always release from `main`.
- **Concurrent releases**: npm won't allow two publishes of the same version. Second one fails with 403. Not a practical concern for this project.

**Full command sequence**:
```
git pull origin main
npm version patch    # or minor / major
git push --follow-tags
```

## UC-4: First Package Publish (One-Time Setup)

**Actor**: Maintainer (package owner)

**Trigger**: Manual — performed once before CI-based publishing can work.

**Prerequisites**:
- npm account exists with access to `@fozy-labs` scope
- GitHub repository `fozy-labs/js-configs` exists
- Workflow files (`ci.yml`, `publish.yml`) are committed to the repository

**Steps**:
1. **Create npm granular access token**:
   - npmjs.com → Access Tokens → Generate New Token → Granular Access Token
   - Scope: read and write
   - Packages: `@fozy-labs/js-configs` (or all `@fozy-labs` packages)
   - Expiration: short (e.g., 7 days — only needed for first publish)

2. **Publish manually**:
   ```
   git clone https://github.com/fozy-labs/js-configs.git
   cd js-configs
   npm ci
   npm run build
   npm publish --access public
   ```
   (using the granular token for authentication — via `npm login` or `.npmrc`)

3. **Configure trusted publisher on npm**:
   - npmjs.com → `@fozy-labs/js-configs` → Settings → Trusted Publishers
   - Add GitHub Actions: repository `fozy-labs/js-configs`, workflow `publish.yml`, environment `npm`

4. **Create GitHub Environment**:
   - GitHub → Repository Settings → Environments → New environment → Name: `npm`

5. **Revoke granular token**:
   - npmjs.com → Access Tokens → Delete the token created in step 1

**Expected result**: Package exists on npm; trusted publishing configured; subsequent versions published automatically via CI (UC-3).

**Edge cases**:
- **Forgot `--access public`**: npm returns error for scoped package. Mitigated by `publishConfig.access: "public"` in `package.json` [ref: [codebase analysis §4](../01-research/01-codebase-analysis.md#4-package-metadata)].
- **npm org doesn't exist**: Must create `@fozy-labs` org on npmjs.com first.
- **Trusted publisher config mismatch**: Environment name, workflow filename, or repository must match exactly (case-sensitive). Mismatch causes OIDC auth failure in subsequent CI publishes [ref: [external research, Pitfalls §2](../01-research/02-external-research.md#pitfalls)].
- **Forgot to create GitHub Environment**: Publish workflow runs but OIDC token won't include the environment claim — npm rejects the token if environment is required in trusted publisher config.
