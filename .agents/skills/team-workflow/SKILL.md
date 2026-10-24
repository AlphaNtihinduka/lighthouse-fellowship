---
name: team-workflow
description: Use when asked to take a feature or change all the way from request to production ("ship this end to end", "run this through the full process"), or when the user asks how the team should work / who does what. Defines the Lighthouse Fellowship pipeline across backend, dashboard and mobile, the handoff contract between roles, and which role-skill and technical guardrail-skill apply at each stage.
---

## Why this exists

Lighthouse Fellowship is one person plus AI agents, not six people. This skill doesn't assume a team exists. It assumes the *work* still has six shapes (scoping, building, securing, testing, releasing, and occasionally deep DB work), and that skipping a shape is how bugs and privacy gaps reach the VPS or a visitor's phone. Solo, you (or Claude) still walk through each stage explicitly instead of jumping from "idea" to "merged."

There are three deliverables: `backend/` (Spring Boot), `dashboard/` (React + Vite) and `mobile/` (Expo). One change often touches more than one, because they share the note content format (`docs/PLAN.md` §4). Every stage below applies to all three parts the change touches.

## The pipeline

```
1. SCOPING            [[role-product-manager]]
   receives: a feature idea / bug report / feedback from the church
   produces: a scope note (in/out, acceptance criteria, affected parts and roles, priority)
   hands off to -> Engineer
                -> Security/Compliance (in parallel, only if visitor data/auth/public endpoint flagged)

2. IMPLEMENTATION     [[role-backend-platform-engineer]]
   requires: scope note from stage 1
   applies: lighthouse-feature-builder, lighthouse-auth-guardrails, lighthouse-domain-rules,
            postgres-jpa-migration-guard, db-migration-strategy (backend),
            dashboard-builder (dashboard), mobile-app-builder (mobile)
   produces: code diff + migration file(s) + updated docs/API.md + list of new/changed env vars
   hands off to -> QA/Test Engineer
                -> Security/Compliance (if not already engaged in stage 1)
   consults (on demand, not every change) -> [[role-dba-consultant]] for large/risky schema changes

3. SECURITY & PRIVACY REVIEW   [[role-security-compliance]]   (conditional, see trigger below)
   requires: PR/diff from stage 2
   applies: lighthouse-auth-guardrails, data-privacy-and-audit, rate-limiting-and-abuse-guard
   produces: sign-off, or a required-changes list
   hands off to -> QA/Test Engineer (on sign-off)
                -> back to Engineer (on required changes)

4. QA / TEST          [[role-qa-test-engineer]]
   requires: PR from stage 2 + security sign-off from stage 3 if that stage was triggered
   applies: lighthouse-testing-review
   produces: test results (backend, dashboard, mobile, real devices where relevant) + filled-out checklist
   hands off to -> DevOps/SRE (on green)
                -> back to Engineer (on red, with failure list)

5. RELEASE            [[role-devops-sre]]
   requires: green PR from stage 4
   applies: docker-vps-deployment, secrets-and-config-management
   produces: deploy report (what shipped, endpoints changed, env vars, rollback tag, build for testers)
   hands off to -> Product Manager (closes the loop, marks the scope note "shipped")
                -> Engineer (post-deploy watching per observability-and-logging)
```

## Trigger rule for stage 3 (Security & Privacy Review)

Don't run every change through security review; that's process theater for a copy fix. Trigger it when the diff touches: admin or visitor authentication/authorization, login codes, visitor emails or consent (see [[data-privacy-and-audit]]), a new or changed public endpoint, anything that could return an unpublished note publicly, or rate-limiting code. [[role-product-manager]]'s scope note should flag this up front so it isn't missed at stage 2.

## Handoff contract (applies at every arrow above)

Every handoff must include, explicitly, not just "it's done":
1. What's being handed off (PR link/diff, doc, checklist).
2. What the receiving stage needs to know that isn't obvious from the diff (e.g. "the mobile app must ship after the backend, it calls a new endpoint", "this migration needs a manual backfill").
3. What's still open/deferred, and to whom.

If a stage is skipped or merged (e.g. the engineer self-tests because QA is the same person), say so in the handoff instead of silently merging stages.

## When running this solo

State which stage you're in as you move through it ("Scoping this now", "Moving to implementation", "Security review: this touches visitor emails, checking data-privacy-and-audit first"). The discipline of not skipping stages matters more than who does them.

## Non-obvious decisions get an ADR

If a stage makes a call that isn't obvious from the code or the scope note (library choice, a change to the JSONB block format, a deviation from an existing pattern, "we're deferring X because Y"), write a short ADR in `docs/decisions/NNNN-title.md`: context, decision, alternatives, consequences. A few paragraphs. ADRs 0001–0003 (one repo, JSONB blocks, answers sent to the app) set the pattern. Most PRs don't need one.

## When a release causes an incident

If stage 5 breaks the VPS deploy or a tester's build, the pipeline re-enters: [[role-devops-sre]] writes a short blameless postmortem, [[role-product-manager]] logs any priority change, and [[role-backend-platform-engineer]] takes the follow-up fix through scoping again rather than hotfixing straight to main.

## As the project grows

This is written for one person walking through six shapes of work. If people join (or the app reaches the stores at phase 6), Security and DBA move from on-demand consults to standing reviewers, handoffs become real PR assignments, and ADRs get a named reviewer. Don't build that structure early, but don't keep "it's just me" as a permanent excuse.
