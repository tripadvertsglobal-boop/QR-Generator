# Daily SEO maintenance task

A Windows Scheduled Task that runs `claude -p` against this repo every morning
at 9:00, does technical-SEO maintenance, and **stops at a local commit on a
dated branch**. You review and push. Nothing here reaches production on its own.

## Install

```powershell
powershell -ExecutionPolicy Bypass -File scripts\seo\register-task.ps1
```

Run it once by hand first to see what it does:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\seo\run-daily-seo.ps1 -DryRun
```

Other commands:

| What | Command |
| --- | --- |
| Trigger a run now | `Start-ScheduledTask -TaskName QRGenerator-DailySEO` |
| Last result | `Get-ScheduledTaskInfo -TaskName QRGenerator-DailySEO` |
| Change the time | `... register-task.ps1 -At 07:30` |
| Remove | `... register-task.ps1 -Unregister` |

The task runs as your user, only while you are logged on, and catches up on the
next boot if the machine was off at 9:00.

## What a run does

1. Aborts if the working tree is dirty, or if today's branch already exists.
2. Branches `seo/auto-YYYY-MM-DD` off `origin/main`.
3. Hands `daily-seo.prompt.md` to Claude: research recent SEO changes, audit
   technical SEO, improve titles/descriptions and existing guide content.
4. Requires `npm test`, `npm run lint`, and `npm run typecheck` to pass.
5. Appends an entry to `SEO-LOG.md` and commits.
6. If nothing was worth changing, deletes the branch and leaves no trace.

Full transcripts land in `scripts/seo/logs/` (gitignored). `SEO-LOG.md` is the
committed, human-readable history.

## Why it cannot deploy

`run-daily-seo.ps1` passes an explicit `--allowedTools` list. `git push`,
`npm run deploy`, and `wrangler` are not on it, so an unattended run is unable
to ship even if it decides it should. This matters here because pushes to `main`
auto-deploy to live production against a live Stripe account.

Review and ship a run yourself:

```bash
git diff origin/main..seo/auto-YYYY-MM-DD
git push origin seo/auto-YYYY-MM-DD
```

## Deliberately out of scope

**New keyword-targeted pages.** Generating pages on a daily cron is the
doorway-page pattern Google's spam policies demote, and it fights the goal of
avoiding thin content. The job instead logs keyword opportunities to the
Opportunities section of `SEO-LOG.md` for a human to judge.

To change that, edit the "Do not create new pages" rule in
`daily-seo.prompt.md` — and add a rate limit if you do.

The prompt also fences the job out of `app/api/**`, billing, Stripe, Supabase,
auth, and `middleware.ts`.
