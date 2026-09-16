# Repository Validation Workflow

After modifying files:

1. Save all workspace files.
2. Run the narrowest executable validation available for the touched code.
3. Query the VS Code Problems panel for the full workspace and fix all new errors caused by the change.
4. If Problems reports stale TypeScript diagnostics or points to code that no longer exists, run `TypeScript: Restart TS Server`, then query Problems again.
5. Do not report completion until the post-edit Problems check is clean or any remaining pre-existing errors are explicitly identified.

Do not include unrelated user changes in commits or deployments.

# Instrument Edition Workflow

When modifying a published instrument definition, especially files under `apps/playground/src/instruments/production-documents/`, do not assume the next edition number. Before committing, ask the user for the latest published edition, then increment `internal.edition` if the instrument definition changed. Mention the edition bump explicitly in the final summary.
