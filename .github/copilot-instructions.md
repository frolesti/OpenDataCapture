# Repository Validation Workflow

After modifying files:

1. Save all workspace files.
2. Run the narrowest executable validation available for the touched code.
3. Query the VS Code Problems panel for the full workspace and fix all new errors caused by the change.
4. If Problems reports stale TypeScript diagnostics or points to code that no longer exists, run `TypeScript: Restart TS Server`, then query Problems again.
5. Do not report completion until the post-edit Problems check is clean or any remaining pre-existing errors are explicitly identified.

Do not include unrelated user changes in commits or deployments.

## Proportionate validation

- Choose checks from the behavior actually changed, not a fixed full-suite checklist.
  Small layout, copy or field-control changes do not require a full web build.
  For styling, check the affected component and, when needed, its rendered layout
  or generated CSS. For validation logic, run focused cases for the changed rules.
- Only escalate to an application build or broader suite when a concrete failure,
  dependency/configuration change or cross-cutting integration risk warrants it.
  Generating clinical instrument bundles is separate from building the web app.
- Reuse existing diagnostics, applicable test results and running development/test
  sessions where available. Do not start a watcher solely for a one-off check.
  New test processes load installed dependencies again; do not reinstall packages
  unless manifests changed or a check reports a missing dependency.
- If a focused check produces no useful progress for two minutes, inspect it once.
  If dependency loading or filesystem I/O is blocking it, stop it and choose a
  narrower verification method. Do not repeatedly restart the same check, increase
  timeouts or start broader builds without evidence that this resolves the cause.
- Do not repeat successful checks unless subsequent edits affect what they cover.
  State any unverified behavior explicitly; never present a timeout as a pass.
- Documentation/instruction-only changes need no build or runtime tests. Preserve
  the post-edit workspace Problems check required above.

# Instrument Edition Workflow

When modifying a published instrument definition, especially files under `apps/playground/src/instruments/production-documents/`, do not assume the next edition number. Before committing, ask the user for the latest published edition, then increment `internal.edition` if the instrument definition changed. Mention the edition bump explicitly in the final summary.
