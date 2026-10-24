---
name: session-continuity
description: Use at the start of work when the user references prior context you don't have ("continue where we left off," "are we ready for phase X," "what's the status"), or whenever you're about to ask the user to re-explain project state from scratch. Also use when finishing, blocking, or changing a phase of work, to keep .claude/PROJECT_STATE.md current.
---

## Why this exists

A Claude Code session has two kinds of memory, and they cover different failure modes:

* The machine-local memory store (`~/.claude/projects/.../memory/`) survives an editor switch on the *same computer*, because it's keyed to the project path, not the editor.
* It does **not** survive a different computer, a fresh remote/cloud session, or another agent's session. Those have no access to it or to this conversation. The only thing that reaches them is what's committed to the repo.

`.claude/PROJECT_STATE.md` covers that second case: one always-current status file, committed to git, that any session can read cold. The plan and its phases are in `docs/PLAN.md`; the state file says where we are in it.

## Rules

* Before asking the user to re-explain what's in progress, read `.claude/PROJECT_STATE.md` (and `docs/PLAN.md` §9 for the phase list). If they answer the question, use them.
* If `PROJECT_STATE.md` conflicts with what you can observe (git log, CI results, running containers on the VPS, the deployed schema, actual files), trust what you observe. Tell the user about the conflict and correct the file.
* If the user references a phase, initiative or decision that isn't in `PROJECT_STATE.md`, `docs/PLAN.md`, `docs/decisions/` or the repo, say so plainly and ask. Don't invent continuity.
* Update `PROJECT_STATE.md` whenever a phase completes, something becomes blocked, or the current initiative changes. Use Edit to replace the relevant section. The file is current state only, never an append-only log; `git log` is the log.
* Keep it per part where it helps: the backend, dashboard and mobile app can be at different points in the same phase.
* Don't let it grow into a second README or design doc. It answers "what's in flight now and what does the next session need to know", not "how does this work" (AGENTS.md, PLAN.md) or "what are the rules" (the skills).
* A stale status file is worse than none. Only write updates that are accurate.
* Machine-local facts (an SSH key or EAS login that only exists on one computer, a locally generated secret, a test phone that only one person has) go in the file too, flagged as machine-local, so another session knows they exist.

## State vs. runbooks

`PROJECT_STATE.md` answers "what's in flight now." It is not where "how do I roll back a bad deploy" or "how do I restore the Postgres volume" live. Those are procedures and belong under `docs/runbooks/`, findable during an incident. If a runbook doesn't exist yet, a one-line pointer in the key-facts section is fine; the steps themselves aren't. [[role-devops-sre]] relies on this when it says the rollback path must be known before it's needed.
