---
name: sdd-feature
description: Orchestrates a QuakeSignal feature from idea through an approved specification, plan, tasks, implementation, and validation. Use when the user requests end-to-end delivery through the SDD workflow.
disable-model-invocation: true
---

# Flujo integral de funcionalidad

Use this skill only when the user invokes the end-to-end workflow or clearly asks to take a feature through specification, implementation, and validation. Follow AGENTS.md, DESIGN.md, and sdd-workflow.

If the user asks for only one phase, perform that phase and stop. Do not turn a narrow planning or implementation request into the full workflow.

## 1. Discover scope and current state

- Read the applicable repository guidance, DESIGN.md, relevant code, project configuration, and existing SDD artifacts.
- Check the working tree and preserve unrelated changes.
- Find existing specs before choosing an ID. If the user did not supply one, create a unique sequential ID and a short slug. Never overwrite another feature's artifacts.
- Inspect the relevant phase skills: sdd-spec, sdd-clarify, sdd-plan, sdd-tasks, sdd-implement, and sdd-validate.
- Use the coordinator, planner, reviewer, and implementer profiles when delegation is available and useful. Give each role the necessary context. If delegation is unavailable, perform the roles sequentially.

## 2. Draft and review the specification

- Ask one question at a time, up to five total, only when a missing product decision would materially change the scope or behavior. Make and label reasonable assumptions for minor details.
- Create specs/<id>/spec.md with context, users, user stories, functional requirements, non-functional requirements, edge cases, out-of-scope items, acceptance criteria, and open questions.
- Keep the spec focused on user-visible behavior and value. Use stable requirement IDs and make acceptance criteria observable. Mark unresolved questions [NECESITA ACLARACIÓN].
- Set the status to borrador. Have the reviewer inspect ambiguity, contradictions, missing edge cases, and unverifiable criteria without making product decisions.
- Present the draft, review findings, assumptions, and open questions. Ask the user to approve the specification before moving on.
- Stop here and wait. Do not mark the spec approved or start technical planning based on silence or general positive feedback.

## 3. Build the plan and task list

Only continue after the user explicitly approves the specification.

- Mark the spec approved and read sdd-plan and sdd-tasks for their phase requirements.
- Inspect the actual project stack and create specs/<id>/plan.md and specs/<id>/tasks.md together.
- The plan must identify relevant modules or data flow, files or areas likely to change, technical decisions and rationale, risks, and verification mapped to requirements. Do not assume a framework, package manager, or command.
- Keep the task list to ten or fewer dependency-ordered tasks. Map each task to requirement IDs and include a verifiable Hecho cuando condition. Keep each task bounded enough to implement independently.
- Ask the reviewer to check consistency with the approved spec. Mark the plan and tasks pendientes de aprobación.
- Present both artifacts and ask for explicit approval before implementation.
- Stop here and wait. Do not begin implementation until approval.

## 4. Implement approved tasks

Only continue after the user explicitly approves the plan and tasks.

- Execute tasks in dependency order, one task at a time, using the implementer profile when delegation is available.
- Before each task, read its acceptance criteria and the relevant code. Keep changes within the approved task and respect the current repository conventions.
- Add and run scoped tests as part of this end-to-end workflow, using the real project test setup and commands. Do not invent scripts or claim checks passed when they were not run.
- Do not add dependencies without approval. Never commit unless the user explicitly asks.
- Mark a task complete only after its completion condition has evidence. Stop and report if a blocker, material scope change, or unresolved decision appears; otherwise continue to the next approved task.

## 5. Validate and report

- After the approved tasks are complete, have the reviewer validate each functional requirement against implementation and test evidence. Run the relevant verification commands that exist in the repository and report their actual results.
- If the reviewer finds a blocking issue, route that issue to the implementer for correction. Allow at most two correction passes per issue; then stop and report what remains.
- Never treat missing evidence or an unrun check as a pass. If the repository has no applicable test or verification command, say so and report the other evidence available.
- Mark tasks complete only when their completion conditions are met.
- Finish with a concise report: spec and plan paths, tasks completed, changed areas, verification results, remaining issues, and any decision needed from the user.

## Approval and stop conditions

The full workflow has two required user gates: approval of the draft specification, then approval of the plan and tasks. User approval authorizes the next phase only. Stop at either gate, on a blocker, or when the user changes scope. Never silently skip a gate.
