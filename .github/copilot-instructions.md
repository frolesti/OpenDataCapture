# Repository Validation Workflow

After modifying files:

1. Save all workspace files.
2. Run the narrowest executable validation available for the touched code.
3. Query the VS Code Problems panel for the full workspace and fix all new errors caused by the change.
4. If Problems reports stale TypeScript diagnostics or points to code that no longer exists, run `TypeScript: Restart TS Server`, then query Problems again.
5. Do not report completion until the post-edit Problems check is clean or any remaining pre-existing errors are explicitly identified.

Do not include unrelated user changes in commits or deployments.
