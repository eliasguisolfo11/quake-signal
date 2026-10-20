---
name: sdd-constitution
description: Drafts measurable project principles for QuakeSignal based on its actual codebase and product constraints. Use when the user asks to establish project rules or a constitution.
disable-model-invocation: true
---

# SDD constitution

Inspect `AGENTS.md`, `DESIGN.md`, and the actual repository stack. Draft six concise, testable project principles in `docs/constitution.md` only when the user requests this workflow.

The principles should cover relevant concerns such as truthful use of public seismic data, accessible map and event-list behavior, consistency of event details, safe handling of external APIs, and maintainable implementation. Tailor them to the codebase; do not assume NestJS, TypeScript, pnpm, Vitest, oxlint, or any specific test command.

Include a verification table populated from commands that actually exist in the project. Present the complete draft and honor the user's requested approval boundary before treating it as accepted.
