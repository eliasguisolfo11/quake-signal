---
name: sdd-workflow
description: Shared specification-driven development conventions for QuakeSignal. Use with the SDD skills to draft requirements, plans, task lists, or validate implementation.
disable-model-invocation: true
---

# SDD workflow

Use this skill as the shared reference for `$sdd-spec`, `$sdd-clarify`, `$sdd-plan`, `$sdd-tasks`, `$sdd-implement`, `$sdd-change`, `$sdd-validate`, and `$sdd-status`.

## Artifacts

For an item named `<id>`, use `specs/<id>/`:

- `spec.md`: context, users, user stories, functional requirements in EARS where useful, non-functional requirements, edge cases, out-of-scope items, acceptance criteria, and open questions.
- `plan.md`: the selected technical approach, affected files, data flow, decisions and rationale, risks, and relevant validation approach. Base it on the actual repository stack.
- `tasks.md`: no more than 10 dependency-ordered tasks. Each task maps to one or more requirements and has an observable completion condition.

Do not assume these folders or files already exist. Create them only as part of an SDD workflow the user requested.

## Phase boundaries

1. Draft the spec from user-visible behavior and value. Do not prescribe implementation details in it.
2. Clarify ambiguity and review the spec before marking it approved.
3. Create a technical plan only after the spec is approved.
4. Create tasks from the approved plan and seek approval when the user has requested that gate.
5. Implement one planned task at a time when asked. Do not silently expand scope.
6. Validate requirements against concrete evidence when the user asks for validation.

Honor approval gates requested by the user. For a direct implementation request, use the request's scope and do not add artificial pauses.

## Quality rules

- Do not invent requirements, source guarantees, API fields, or project scripts.
- Inspect the repository and its current conventions before writing technical plans or selecting commands.
- Keep requirements independently understandable and verifiable. Mark unresolved product decisions `[NECESITA ACLARACIÓN]`.
- Do not claim a requirement is implemented or a check passed without evidence.
- Do not create or run tests unless the user asks for tests or implementation verification. If asked, use the repository's real test setup.
- Never commit unless the user explicitly asks.

## End-to-end entry point

sdd-feature coordinates the phase skills from a feature idea through specification, planning, implementation, and validation. Its approval gates are part of that full workflow; individual phase skills can still be used on their own.
