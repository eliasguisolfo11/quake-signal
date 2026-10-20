---
name: sdd-plan
description: Produces a technical implementation plan from an approved SDD specification. Use when the user requests a plan for `specs/<id>/`.
disable-model-invocation: true
---

# SDD plan

Follow `$sdd-workflow`. Read the requested spec and inspect the repository before choosing a technical approach. If the spec is missing or not approved, do not present the plan as ready to implement.

Create or present `specs/<id>/plan.md` with:

- Relevant modules, components, services, or data flow based on the actual stack.
- Files or areas to create or change, with the reason for each.
- Technical decisions and trade-offs grounded in the current codebase.
- A validation approach mapped to affected requirements, without inventing scripts.
- Risks, edge cases, data-source limitations, and accessibility considerations where relevant.

Do not write implementation code. Honor the approval boundary requested by the user before proceeding to tasks or implementation.
