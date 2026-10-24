# ADR-0003: Blank answers are sent to the mobile app

Date: 2026-10-24
Status: Accepted

## Context

The fill-in-the-blank game shows a word bank on each page holding only the correct answers for that page, shuffled. Notes must work offline once opened, and the score is shown after the whole note.

## Decision

`GET /api/notes/{id}` returns each blank's answer. The app builds the word bank and scores the game on the device. When the visitor is signed in, the result is uploaded as an attempt (score, total, client attempt ID).

## Alternatives considered

* **Hide answers and score on the server.** Rejected: the word bank already shows every answer, so hiding them protects nothing. It would also break offline play and add a round trip per attempt.

## Consequences

* The game works fully offline.
* Scores in `quiz_attempt` are self-reported by the client. That's fine: they are personal progress, not a competition or anything with value. If leaderboards are ever added, revisit this.
* Blanks with the same answer ("wanted", "wanted") accept either matching chip.
