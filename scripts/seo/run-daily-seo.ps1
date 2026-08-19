<#
.SYNOPSIS
  Unattended daily SEO maintenance run. Registered as a Windows Scheduled Task
  by register-task.ps1; see scripts/seo/README.md.

.DESCRIPTION
  Creates a dated branch, hands daily-seo.prompt.md to `claude -p`, and stops at
  a local commit. Push and deploy are withheld at the tool-allowlist level, not
  just by instruction, so a misbehaving run cannot reach production.
#>
[CmdletBinding()]
param(
  # Preview the run without invoking Claude or touching branches.
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$PromptFile = Join-Path $PSScriptRoot "daily-seo.prompt.md"
$LogDir = Join-Path $PSScriptRoot "logs"
$Stamp = Get-Date -Format "yyyy-MM-dd"
$LogFile = Join-Path $LogDir "$Stamp.log"
$Branch = "seo/auto-$Stamp"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

function Write-Log {
  param([string]$Message)
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Add-Content -Path $LogFile -Value $line -Encoding utf8
  Write-Output $line
}

# The Scheduled Task environment does not inherit the interactive PATH, so
# resolve both executables to absolute paths and fail loudly if either is gone.
function Resolve-Exe {
  param([string]$Name, [string[]]$Fallbacks)
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  foreach ($path in $Fallbacks) { if (Test-Path $path) { return $path } }
  throw "Could not locate $Name. Checked PATH and: $($Fallbacks -join ', ')"
}

Write-Log "=== daily SEO run starting ==="

try {
  $Git = Resolve-Exe -Name "git" -Fallbacks @(
    "C:\Program Files\Git\cmd\git.exe",
    "C:\Program Files (x86)\Git\cmd\git.exe"
  )
  $Claude = Resolve-Exe -Name "claude" -Fallbacks @(
    "$env:USERPROFILE\.local\bin\claude.exe"
  )
  Write-Log "git:    $Git"
  Write-Log "claude: $Claude"
} catch {
  Write-Log "ABORT: $_"
  exit 1
}

if (-not (Test-Path $PromptFile)) {
  Write-Log "ABORT: prompt file missing at $PromptFile"
  exit 1
}

Set-Location $RepoRoot

# Guard 1: never run on top of uncommitted work. Branching would drag the
# user's work-in-progress onto the SEO branch and mix it into the commit.
$dirty = & $Git status --porcelain
if ($LASTEXITCODE -ne 0) { Write-Log "ABORT: git status failed"; exit 1 }
if ($dirty) {
  Write-Log "SKIP: working tree is dirty; not running on top of uncommitted work."
  Write-Log ($dirty | Out-String).Trim()
  exit 0
}

# Guard 2: one run per day. A second run would either collide with the branch
# or stack a second unreviewed commit onto it.
$exists = & $Git rev-parse --verify --quiet "refs/heads/$Branch"
if ($exists) {
  Write-Log "SKIP: branch $Branch already exists; today's run is already done."
  exit 0
}

$startBranch = (& $Git rev-parse --abbrev-ref HEAD).Trim()
Write-Log "starting branch: $startBranch"

if ($DryRun) {
  Write-Log "DRY RUN: would create $Branch off origin/main and invoke Claude. Stopping."
  exit 0
}

# Base the work on the latest main. Fetch is read-only and the repo is public,
# so this needs no credentials; if it fails (offline), fall back to local main.
$base = "origin/main"
& $Git fetch origin main --quiet
if ($LASTEXITCODE -ne 0) {
  Write-Log "WARN: fetch failed; basing on local main instead of origin/main."
  $base = "main"
}

# This directory is tracked, so checking out a base branch that predates it
# DELETES it from the working tree mid-run — including the prompt this script is
# about to read, and the script itself. Refuse to run until the tooling is on
# the base branch rather than strip the working tree every morning.
& $Git cat-file -e "${base}:scripts/seo/run-daily-seo.ps1" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Log "SKIP: $base does not contain scripts/seo/, so branching from it would"
  Write-Log "      delete this tooling from the working tree. Merge the SEO tooling"
  Write-Log "      into main and push it, then this job can run:"
  Write-Log "        git checkout main; git merge seo-daily-task; git push origin main"
  exit 0
}

# Read the prompt BEFORE switching branches, so the run does not depend on the
# file surviving the checkout.
$prompt = Get-Content $PromptFile -Raw

& $Git checkout -b $Branch $base --quiet
if ($LASTEXITCODE -ne 0) { Write-Log "ABORT: could not create $Branch from $base"; exit 1 }
Write-Log "created $Branch from $base"

# The allowlist is the real safety boundary. Bash is granted only for the
# verification commands and local git; `git push`, `npm run deploy`, and
# wrangler are absent, so an unattended run physically cannot ship.
$allowedTools = @(
  "Read", "Edit", "Write", "Glob", "Grep", "TodoWrite", "WebSearch", "WebFetch",
  "Bash(npm test)", "Bash(npm test:*)",
  "Bash(npm run test:*)", "Bash(npm run lint:*)", "Bash(npm run typecheck:*)",
  "Bash(git status:*)", "Bash(git diff:*)", "Bash(git log:*)",
  "Bash(git rev-parse:*)", "Bash(git add:*)", "Bash(git commit:*)"
) -join " "

Write-Log "invoking Claude (this typically takes several minutes)..."
Add-Content -Path $LogFile -Value "`n----- claude transcript -----" -Encoding utf8

$prompt | & $Claude -p --permission-mode acceptEdits --allowedTools $allowedTools 2>&1 |
  Tee-Object -FilePath $LogFile -Append

$claudeExit = $LASTEXITCODE
Add-Content -Path $LogFile -Value "----- end transcript -----`n" -Encoding utf8
Write-Log "claude exited with code $claudeExit"

# Report what actually landed, rather than trusting the run's own account of it.
$commits = & $Git rev-list --count "$base..HEAD"
$leftover = & $Git status --porcelain

if ([int]$commits -gt 0) {
  Write-Log "RESULT: $commits commit(s) on $Branch, awaiting your review."
  & $Git log --oneline "$base..HEAD" | ForEach-Object { Write-Log "  $_" }
  if ($leftover) {
    Write-Log "NOTE: uncommitted changes also left behind on the branch:"
    Write-Log ($leftover | Out-String).Trim()
  }
  Write-Log "review with: git diff $base..$Branch    then: git push origin $Branch"
} elseif ($leftover) {
  # Uncommitted changes with no commit means the run failed mid-flight, most
  # likely on the test gate. Keep the branch so the evidence survives.
  Write-Log "RESULT: no commit, but uncommitted changes remain on $Branch. Left in place for inspection."
  Write-Log ($leftover | Out-String).Trim()
} else {
  # Nothing happened, so leave no branch behind to clean up later.
  Write-Log "RESULT: no changes this run. Removing empty branch and restoring $startBranch."
  & $Git checkout $startBranch --quiet
  & $Git branch -D $Branch --quiet
}

Write-Log "=== daily SEO run finished ==="
exit 0
