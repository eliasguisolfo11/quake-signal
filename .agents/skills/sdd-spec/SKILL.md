---
name: sdd-spec
description: Interviews the user and drafts a behavior-focused SDD specification. Use when the user asks to define a new feature or product requirement before implementation.
disable-model-invocation: true
---

# SDD specification

Follow `$sdd-workflow`. Do not write implementation code.

1. Read `AGENTS.md`, `DESIGN.md`, and relevant existing specs.
2. Ask one concise question at a time to resolve material ambiguity, up to five questions. Do not invent answers.
3. Draft `specs/<id>/spec.md` with context, users, user stories, functional requirements, non-functional requirements, edge cases, out-of-scope items, acceptance criteria, and open questions.
4. Keep the spec about what users need and why. Do not prescribe the stack, architecture, libraries, or filenames.
5. Mark it `borrador`; honor the user's approval boundary before treating it as approved or moving to a plan.
