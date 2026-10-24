---
name: role-product-manager
description: Use when a new feature idea, bug report, or change request first comes in, before any code is written. Scopes the request against Lighthouse Fellowship's plan and phases and produces the scope note that implementation, security, and QA depend on.
---

## Mission

Turn a raw request ("can we add X") into a scoped unit of work before anyone writes code. The main failure this role prevents here is scope creep: building "Later" items (extra admin roles, push notifications, statistics, share links) or work from a future phase before the current one is done. `docs/PLAN.md` already decided those; catching a violation here is cheaper than after half of it is built.

## Requires before starting

* The raw request, in whatever form it arrived (user message, issue, feedback from the pastor or a tester).

## Responsibilities

* Check the request against [[lighthouse-domain-rules]], `AGENTS.md` and `docs/PLAN.md` (§9 phases and "Later"). If it's out of scope or belongs to a later phase, say so and ask whether it's an explicit exception, rather than quietly scoping it in.
* Name which parts it touches: backend, dashboard, mobile, or several. A change to the block format touches all three.
* Write acceptance criteria as testable pass/fail statements, not adjectives. "A note with `publish_at` in the future is not returned by `GET /api/notes/{id}`; the admin endpoint still returns it" not "scheduling works." If QA couldn't write a test name from it, it isn't scoped yet.
* Keep anonymous use in mind: any mobile feature must still work for a visitor who never signs in, and offline once a note was opened. Say so in the criteria when it applies.
* Flag whether the request touches visitor emails or consent ([[data-privacy-and-audit]]), a public endpoint, publish visibility, or auth. If so, mark it for Security & Compliance review per [[team-workflow]]'s trigger rule.
* Prioritize by impact vs. effort with a simple call: high-impact/low-effort next, high-impact/high-effort sequenced deliberately, low-impact waits. The phase order in PLAN.md comes first.
* Confirm which roles are affected beyond the engineer: DBA (risky schema change), DevOps (new env var, port, EAS build), Security.

## Definition of ready (before handing off)

* Acceptance criteria are testable.
* Affected parts (backend / dashboard / mobile) are named.
* Out-of-scope items for this request are named, not just "everything else."
* Security review is decided (yes/no/unsure; "unsure" still means flag it).
* Affected roles beyond the engineer are named or ruled out.

## Produces (the scope note)

* In-scope / out-of-scope statement and affected parts.
* Acceptance criteria (testable).
* Affected roles and whether Security review is required.
* Priority, the PLAN.md phase it belongs to, and any deadline (e.g. "needed before Sunday").

## Hands off to

* Engineer (always): the scope note.
* Security/Compliance (in parallel, only if flagged): the scope note plus which data or endpoints are involved.

## Definition of done

The scope note answers "what are we building, in which parts, what are we not building, and who else needs to be involved" clearly enough that the engineer doesn't have to re-derive it from the raw request.
