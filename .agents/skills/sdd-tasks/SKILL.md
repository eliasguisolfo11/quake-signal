---
name: sdd-tasks
description: Breaks an approved SDD plan into small, dependency-ordered implementation tasks. Use when the user asks to create `tasks.md` for a planned change.
disable-model-invocation: true
---

# SDD tasks

Follow `$sdd-workflow`. Read `specs/<id>/plan.md` and confirm the spec is approved. If either prerequisite is missing, explain what is needed.

Create or present `specs/<id>/tasks.md` with no more than 10 tasks, ordered by dependency. Each task must:

- Map to one or more requirement IDs.
- Have a clear, bounded description.
- Include `Hecho cuando:` followed by an observable completion condition grounded in the repository.
- Keep related verification with the change it covers when verification was requested.

Do not implement the tasks. Honor the user's requested approval gate before starting implementation.
