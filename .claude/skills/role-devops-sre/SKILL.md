---
name: role-devops-sre
description: Use to take a QA-approved PR to the VPS and to testers' phones: merge, GitHub Actions CI, SSH deploy, EAS builds, deploy verification and the deploy report. Also use for standalone infra/pipeline/secrets changes that don't come from a feature PR.
---

## Mission

Own the last mile: nothing reaches the VPS or a tester's phone without going through the pipeline, and every release leaves a record of what changed and how to roll it back.

## Requires before starting

* A green PR with the filled-out checklist from [[role-qa-test-engineer]].
* For infra-only changes: a clear statement of what's changing and why.

## Responsibilities

* CI (`.github/workflows/ci.yml`) builds and tests all three parts. Don't merge on red and don't skip the test gate.
* Deploy (`.github/workflows/deploy.yml`) builds the images, pushes them tagged with the commit SHA, and deploys over SSH to the shared VPS. Apply [[docker-vps-deployment]]: backend on host port 8099 (container 8081), dashboard on 8100, Postgres not published to the host, database host `postgres`. The VPS also runs SponsorDirect and other apps (8084, 8085, 8087, 8088, 8089), so check `ss -tlnp` and free memory before the first deploy or any port change, and never touch the other apps' containers or volumes.
* Mobile: EAS builds an Android APK for testers now. iPhone testing is Expo Go until the Apple Developer account exists. Play Store and App Store releases come at phase 6. Test builds may use plain HTTP to the VPS IP; release builds must use HTTPS.
* Apply [[secrets-and-config-management]]: a new or changed env var goes in `.env.example` as a placeholder and is set in the VPS `.env`, GitHub Secrets or EAS secrets before deploy, not after something breaks.
* Verify the deploy (`/actuator/health`, a `curl` on the changed endpoint, the dashboard loads, a tester build opens a note). A workflow that finished is not verification.
* Order matters across parts: deploy the backend before handing out a mobile build that needs it, and remember older app builds keep calling the API.
* There is no staging environment: every merge to `main` goes straight to the VPS. That is why the checks above aren't optional.
* Know the rollback path before you need it: the previous image tag is pullable and redeploying it is a tested procedure (keep it in `docs/runbooks/`). Try it on a quiet day after a risky deploy. A bad Flyway migration isn't undone by rolling back the image; see [[db-migration-strategy]].

## Produces (the deploy report)

* What shipped, endpoints changed, env vars set, the image tag deployed (for rollback), the EAS build link if one was made, and confirmation that verification passed.

## If the deploy goes bad

* Roll back first (previous image tag), diagnose after.
* Write a short blameless postmortem: what happened, how it was detected ("a tester told us" is a finding), what fixed it, one or two concrete follow-ups. This feeds [[team-workflow]]'s incident loop.
* "On-call" is whoever deployed, watching logs for the first hour and reachable. Say who that is for this deploy. Avoid deploying on Sunday morning, when the church is using the notes.

## Hands off to

* Product Manager: the deploy report, closing the scope note.
* Engineer: what to watch after deploy per [[observability-and-logging]] (which `docker logs` lines to look for in the first hour).

## Definition of done

The change is live and verified working, the previous image tag is known and rollback-capable, testers have the right build if mobile changed, and the deploy report exists.
