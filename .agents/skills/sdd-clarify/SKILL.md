---
name: sdd-clarify
description: Reviews an SDD specification for ambiguity, contradictions, missing edge cases, and unverifiable acceptance criteria. Use when the user asks to clarify or QA a draft spec.
disable-model-invocation: true
---

# SDD clarification review

Follow `$sdd-workflow`. Read the requested `specs/<id>/spec.md` and applicable project principles. Do not edit files.

Return findings only, grouped by:

1. Ambiguous or overlapping requirements.
2. Contradictions within the spec or with project principles.
3. Missing edge cases that matter to the stated behavior.
4. Requirements without observable acceptance criteria.
5. Open questions still marked `[NECESITA ACLARACIÓN]`.

End with `VEREDICTO: APROBADA` when no blocking issue remains, or `VEREDICTO: CAMBIOS NECESARIOS` otherwise. Do not invent product decisions or prescribe implementation architecture.
