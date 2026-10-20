---
name: revisar-entrega
description: Reviews a QuakeSignal implementation or project deliverable against its requirements and available evidence. Use when the user requests a delivery review or evaluation.
disable-model-invocation: true
---

# Revisar entrega

Review the requested deliverable or `specs/<id>/` without modifying files.

1. Read the applicable spec, plan, tasks, `AGENTS.md`, `DESIGN.md`, and any rubric explicitly present or supplied by the user.
2. Inspect the relevant diff and repository history when available.
3. Run verification commands only when the user asked for verification. Discover commands from the actual project configuration; never assume a package manager or framework.
4. Map each requirement to evidence such as an implementation path, test, or observed behavior. Mark missing evidence as unverified rather than passing it.
5. Report findings by severity, include file and line references when available, and summarize checks with their actual results.

If no rubric is present, do not invent scores, weights, or course-specific criteria. Give an evidence-based review instead. Do not edit or commit files.
