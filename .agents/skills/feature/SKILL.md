---
name: feature
description: Plans a QuakeSignal feature before implementation. Use when the user asks to scope or plan a new feature without starting the code changes.
disable-model-invocation: true
---

# Feature planning

Treat the request as planning-only.

1. Read `AGENTS.md`, `DESIGN.md`, and the relevant current code and documentation.
2. Check whether an approved spec already covers the requested behavior.
3. Present the implementation outline, files or areas likely to change, edge cases, and decisions that need the user's input.
4. If the request changes an approved requirement, recommend `$sdd-change`; if no spec exists and the user wants a formal SDD flow, recommend `$sdd-spec`.
5. Do not edit files or implement the feature in this planning flow.

Do not assume a stack, active spec, `MEMORY.md`, or constitution file that is absent from the repository.
