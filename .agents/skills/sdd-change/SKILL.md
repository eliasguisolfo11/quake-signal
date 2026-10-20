---
name: sdd-change
description: Changes a requirement in an existing SDD spec and updates its plan and tasks. Use when the user requests a new or modified requirement after a spec exists.
disable-model-invocation: true
---

# SDD change

Follow `$sdd-workflow`.

1. Locate `specs/<id>/spec.md` and read its plan and tasks if present. If the spec does not exist, explain that `$sdd-spec` is the right starting point.
2. Update only the affected requirement, its acceptance criteria, and edge cases. Keep the spec focused on behavior and mark it `borrador` until approved.
3. Describe the impact on `plan.md` and `tasks.md`; update those artifacts when the user asked for the change to be recorded.
4. Mark affected completed tasks as pending only when the changed requirement invalidates their completion.
5. Do not change implementation code as part of this requirements-change workflow. Stop at the approval boundary requested by the user.
