---
name: sdd-status
description: Reports the current phase, approvals, task progress, and next action for an SDD item. Use when the user asks for the status of `specs/<id>/`.
disable-model-invocation: true
---

# SDD status

Read-only. Follow `$sdd-workflow` and inspect the requested spec folder, `AGENTS.md`, project configuration, and recent Git history when available.

Report, in order:

1. Current SDD phase.
2. Which artifacts or phases are approved and which are waiting on a decision.
3. Completed and pending tasks, including the next task if one is ready.
4. Verification status only when evidence already exists or the user asks to run checks.
5. The exact next action.

Do not modify files or claim that a check ran when it did not.
