# QuakeSignal

## Project context

QuakeSignal helps people explore public seismic-event data. Read `DESIGN.md` before changing the interface. Keep the map, event list, and selected-event detail consistent, and make the data source and update time clear.

Never imply that a feed is live unless its provider guarantees that. Do not infer alerts, damage, or safety from magnitude alone. Distinguish missing values from zero and cite the source for event details.

## Architecture

- Apply SOLID principles pragmatically to every change. Give each module and UI component one clear responsibility, keep contracts focused, and let high-level behavior depend on typed feature-level interfaces rather than provider-specific details.
- Keep integrations such as USGS and the map provider behind focused adapters. Reuse existing domain rules and extend them through cohesive modules; avoid abstractions that do not solve a current need.
- Prefer composition for page-level UI: page coordinators connect focused controls, data hooks, and presentation components without absorbing their internal responsibilities.

## Working agreements

- Inspect the current repository before choosing frameworks, dependencies, file paths, or verification commands. Do not assume the NestJS, pnpm, Vitest, or oxlint setup from the source project.
- When using the SDD workflow, keep artifacts in `specs/<id>/`: `spec.md`, `plan.md`, and `tasks.md`. Keep the spec about behavior and user value; put technical decisions in the plan.
- Preserve explicit approval boundaries when the user starts an SDD flow. For direct requests, follow the scope the user authorized and do not invent approval pauses.
- Do not commit changes unless the user asks for a commit.
- Report verification accurately: distinguish checks that ran from checks that were not requested or could not run.

## Codex resources

- Project workflows are available as skills in `.agents/skills/` and can be invoked by name, such as `$sdd-spec` or `$sdd-validate`.
- Role profiles live in `.codex/agents/` and can be selected when Codex delegates work.
- `.opencode/` is the unmodified upstream source snapshot; use the Codex resources for this repository.

- Use sdd-feature as the end-to-end entry point for a feature. It pauses for approval of the draft spec and then the plan and tasks; after approval it implements tasks in order and validates against the repository's real checks.
