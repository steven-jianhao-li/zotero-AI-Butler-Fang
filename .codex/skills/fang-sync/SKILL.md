---
name: fang-sync
description: Sync and release the private zotero-AI-Butler-Fang edition from the public zotero-AI-Butler upstream. Use when working in this repository to pull upstream changes, preserve Fang branding/prompts/release settings, avoid GitHub tag pollution, publish Fang releases, or troubleshoot PowerShell/Windows encoding and release workflow issues.
---

# Fang Sync

Use this skill only in the `zotero-AI-Butler-Fang` repository.

## Repository Model

- `origin` is the private Fang repository: `git@github.com:steven-jianhao-li/zotero-AI-Butler-Fang.git`.
- `upstream` is the public main repository: `git@github.com:steven-jianhao-li/zotero-AI-Butler.git`.
- `upstream` push must stay disabled.
- Fang `dev` tracks upstream for pull/merge context, but pushes to `origin/dev`.
- Fetch upstream with `--no-tags`; never push public `v*` tags to Fang.

## Invariants To Preserve

After every sync or release, verify these Fang-specific settings:

- `package.json` repository, bugs, and homepage point to `zotero-AI-Butler-Fang`.
- `zotero-plugin.config.ts` contains:
  - `xpiName: "方班论文阅读神器"`
  - release tag template `Fang_v%s`
  - XPI download URL path `Fang_v{{version}}/{{xpiName}}.xpi`
- `.github/workflows/release.yml` triggers only `Fang_v*` tags, not `v*` tags.
- `scripts/release.mjs` exists and removes non-`Fang_v` local tags before release.
- Built XPI is `.scaffold/build/方班论文阅读神器.xpi`.
- Built update link points to `/releases/download/Fang_v<version>/方班论文阅读神器.xpi`.
- `src/defaults/prompts/deep-read.json` template name is `方班深度精读`.

## Sync Upstream

1. Ensure clean working tree:
   ```powershell
   git status --short
   ```
2. Fetch upstream without tags:
   ```powershell
   git fetch upstream --prune --no-tags
   ```
3. Inspect incoming commits:
   ```powershell
   git log --oneline --decorate HEAD..upstream/dev
   git rev-list --left-right --count HEAD...upstream/dev
   ```
4. If there are upstream commits, merge:
   ```powershell
   git merge upstream/dev
   ```
5. If `package.json` or `package-lock.json` conflict, usually keep Fang metadata and current Fang release version unless the user explicitly wants to reset to upstream version. Re-apply Fang repository fields if needed.
6. Validate Fang invariants and build:
   ```powershell
   npm run build
   ```
7. Push only the branch:
   ```powershell
   git push origin dev
   ```

## Release Fang Version

Run release only from the Fang repo root:

```powershell
cd D:\Users\admin\Desktop\zotero-AI-Butler开发\zotero-AI-Butler-Fang
npm run release
```

- Choose `patch`, `minor`, or `major` for official releases.
- Do not use `-fang` in `package.json` versions; SemVer treats that as prerelease.
- Fang identity is represented by GitHub tag names like `Fang_v4.1.5`, the private repo, branding, prompts, and update URLs.
- CI uploads the actual built XPI using `.scaffold/build/*.xpi`; this avoids `default.xpi` naming regressions.

## Tag Hygiene

If public `v*` tags appear in Fang origin, delete them immediately:

```powershell
$refs = git ls-remote --tags origin 'v*' | ForEach-Object { ($_ -split "`t")[1] } | Where-Object { $_ -and ($_ -notlike '*^{}') }
foreach ($ref in $refs) { git push origin ":$ref" }
```

Clean local non-Fang tags:

```powershell
git tag --list 'v*' | ForEach-Object { git tag -d $_ }
```

Keep these local settings:

```powershell
git config remote.upstream.tagOpt --no-tags
git config remote.origin.tagOpt --no-tags
git remote set-url --push upstream DISABLED
git config branch.dev.pushRemote origin
git config push.default current
```

The `release` tag in origin is allowed; it hosts `update.json` and must not trigger workflows.

## PowerShell And Encoding Pitfalls

- Do not use Bash heredocs such as `cmd <<'EOF'` in PowerShell; PowerShell parses `<` as redirection and fails.
- For patches, call `apply_patch` directly through the tool, or use separate tool calls, not PowerShell heredocs.
- Avoid PowerShell `>` redirection or default `Set-Content` for files containing Chinese; Windows PowerShell 5.1 may write UTF-16 or mojibake.
- To write Chinese text files, use explicit UTF-8 no BOM:
  ```powershell
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText((Resolve-Path path\to\existing-dir\file), $content, $utf8NoBom)
  ```
- Prefer `node -e "fs.writeFileSync(path, text, 'utf8')"` for JSON edits.
- When YAML needs Chinese paths, prefer glob patterns such as `.scaffold/build/*.xpi` to avoid CI/path encoding issues.

## Common Diagnostics

- GitHub Release asset named `default.xpi`: CI upload path did not use built XPI directly. Ensure workflow uses `softprops/action-gh-release` with `.scaffold/build/*.xpi`.
- Release workflow runs for `v4.x` or beta tags: Fang origin contains public `v*` tags, or workflow listens to `v*`. Delete those tags and keep only `Fang_v*` in workflow triggers.
- `npm run release` reports missing `package.json`: command was run from the parent workspace, not the Fang repo root.
- VSCode “Sync changes” can refer to a different opened repository. Confirm repository name and run `git rev-list --left-right --count HEAD...origin/dev` before clicking.