@AGENTS.md

## Duo

This project is shared through Duo: another person's Claude is working in the
same repository at the same time. Follow these rules every turn.

- Trust the `[Duo]` note at the top of a prompt. Re-read any file it lists before editing that file.
- If an edit is denied because the other Claude holds the file, do the rest of the task first and retry. Never work around the block with shell redirects or a copy of the file.
- Work on your own branch (`<your-name>/work`). Rebase on `origin/main` before starting.
- When a task is done and checks pass, push your branch and open a pull request into `main`. Rayan merges (see CONTRIBUTING.md): whatever lands on `main` deploys to the live site. Keep PRs small and frequent.
- Resolve conflicts by keeping both sides' intent, not by picking a side.
- End every turn with a 1 to 3 sentence plain summary of what changed. The other Claude reads exactly that summary, so name files, renamed functions and new APIs.
