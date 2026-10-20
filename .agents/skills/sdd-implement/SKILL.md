---
name: sdd-implement
description: Implements exactly one task from an approved SDD plan. Use when the user requests implementation of a specific task in `specs/<id>/tasks.md`.
disable-model-invocation: true
---

# SDD implementation

Follow `$sdd-workflow` and implement only the requested task from `specs/<id>/tasks.md`.

1. Read the task, approved spec and plan, `AGENTS.md`, `DESIGN.md`, and relevant existing code. If a required artifact or approval is missing, report that before proceeding.
2. Keep the change within the task's scope and follow existing project conventions.
3. Add or run tests only when the user asks for tests or implementation verification. When requested, use the actual project scripts and report results accurately.
4. Do not add dependencies without the user's approval.
5. Do not commit unless explicitly asked.
6. Stop after the single task and summarize changes, evidence, and any remaining blockers.
