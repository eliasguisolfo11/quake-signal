---
name: sdd-validate
description: Validates an SDD implementation requirement by requirement against its spec and available evidence. Use when the user asks to verify or validate `specs/<id>/`.
disable-model-invocation: true
---

# SDD validation

Follow `$sdd-workflow`. Do not modify files. Read the spec, plan, tasks, project principles, and relevant diff or history.

When the user asks to run verification, discover and run only relevant commands that exist in the repository. Otherwise, use existing evidence without running checks.

For each functional requirement, report its implementation evidence, relevant test or check and actual result. Mark requirements without evidence as unverified. Also note incomplete tasks, mismatches with the spec, and missing artifacts.

Start with `VEREDICTO: APROBADO` only when every in-scope requirement has sufficient evidence and no blocking issue remains. Otherwise start with `VEREDICTO: CAMBIOS NECESARIOS`. Never treat an unrun check as passed.

When this skill is used by sdd-feature, treat the end-to-end request as authorization to validate implementation and run relevant verification commands that already exist in the repository.
