# Troubleshooting DSH UML Studio

[← Back to README](../README.md) · [Tiếng Việt](../README.vi.md)

This guide collects installation and runtime diagnostics for the **experimental** `dsh-uml` plugin. It does not imply that live profile/browser acceptance has been completed.

## Windows: `Package unavailable` / `Not running`

If Plugin Manager lists `dsh-uml` but reports `cannot resolve profile bundle "dsh-uml"`, DSH knows the bundle entry but cannot resolve the package in the `web` profile. This is an **installation/build/profile resolution problem**, not yet a PlantUML rendering problem.

### 1. Check the DSH executable you're actually running

Open PowerShell:

~~~powershell
dsh --version
Get-Command dsh | Select-Object Source
node -v
~~~

Requirements:

- DSH `>=0.2.2-0 <0.3.0`
- Node.js `>=24.9.0`
- For Better Sidebar `0.32.1`: DSH `0.2.2-rc.2+` in the 0.2.2 line

If `dsh --version` still shows `0.2.1-rc.x`, **upgrade the executable actually on your PATH before installing this plugin**. Updating a GitHub checkout alone does not change an installed executable. Do **not** use `allow-version --accept-risk` to bypass a real compatibility mismatch.

### 2. Sync source without discarding local changes

~~~powershell
cd 'C:\path\to\dsh-uml'
git status -sb
git fetch origin
git log --oneline --left-right HEAD...origin/main
~~~

**Only if** your worktree is clean and your local branch has no unique commits, fast-forward:

~~~powershell
git merge --ff-only origin/main
~~~

If the branches have diverged, or if there are uncommitted changes, inspect the diff and merge deliberately. Do not use `git reset --hard` or `git clean` as a shortcut.

### 3. Build and reinstall into the correct profile

Replace the local path below with the location of your clone:

~~~powershell
$plugin = 'C:\path\to\dsh-uml'
cd $plugin
pnpm install
pnpm check

Test-Path (Join-Path $plugin 'lib\index.js')
Test-Path (Join-Path $plugin 'lib\client.js')

dsh plugin --profile web add .
dsh plugin --profile web install

$profile = Join-Path $env:USERPROFILE '.dsh\profiles\web'
Test-Path (Join-Path $profile 'node_modules\dsh-uml\package.json')
dsh web --dump-config | Select-String 'dsh-uml'
~~~

All **three** `Test-Path` commands should return `True`. If `pnpm check` fails, **stop before `add .`** and fix the failed typecheck, test, or build.

The `add .` command registers a local `link:` package. `install` makes the dependency available in the profile. If the profile still lacks `node_modules\dsh-uml`, inspect the output of `dsh plugin --profile web install` and the profile's `package.json`. Avoid hand-editing or deleting `cordis.patch.yml`.

### 4. Restart and verify

Fully restart `dsh web`, then hard-refresh the browser.

1. Open the **UML Studio** native tab in the right sidebar **without** Better Sidebar.
2. If Better Sidebar is installed, try opening [`examples/login-sequence.puml`](../examples/login-sequence.puml) from its Files view.
3. Confirm whether rendering and file actions behave independently of plugin discovery.

### Additional PowerShell checks

~~~powershell
Get-Content (Join-Path $profile 'package.json') | Select-String 'dsh-uml'
Get-Item (Join-Path $profile 'node_modules\dsh-uml') -ErrorAction SilentlyContinue |
  Format-List FullName,LinkType,Target
~~~

A `Package unavailable` error is distinct from an `engines.dsh` version incompatibility or a TypeScript `TS5097` error. Diagnose the exact failing step rather than applying one fix to every error.

## Studio renders nothing or displays an error

- First try the built-in sample with **Split** or **Preview** mode.
- Check that the source has a matching `@start...` and `@end...` pair.
- Remove external `!include`, `!includeurl`, `!include_sprites`, or `!import` statements; the MVP intentionally blocks them.
- Keep source under **100,000 characters**. Check the message below the editor for render failures.
- Test a simple sequence diagram before diagnosing complex Graphviz-dependent diagrams.

Browser rendering uses local PlantUML TeaVM and Viz.js; it does not call a remote rendering server. A large client engine may take longer to load on first use.

## A file does not save in Better Sidebar

- Ensure the file was opened via the **file-backed Better Sidebar integration**, not imported into the standalone native Studio.
- Verify the originating DSH session is still available and the file is editable.
- If the file has changed on disk, saving can reject a stale modification time. Reload after resolving conflicting edits; **do not discard an unsaved draft blindly**.
- Native Studio exports downloads; it does not automatically persist imported browser files back to a workspace path.

## Getting help

When reporting a problem, include: the exact error text, `dsh --version`, `node -v`, whether Better Sidebar is installed, which DSH profile is active, and reproducible steps. Avoid sharing credentials, private workspace file contents, or unredacted logs.

See [development and live acceptance](development.md) for the pending test matrix.
