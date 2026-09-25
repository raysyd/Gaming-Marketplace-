# Contributing to Sidegrade

## Using Claude on this repo

You don't need special repo access for Claude — it commits and pushes as
**you**, using your own GitHub login. Being a collaborator on
`raysyd/Gaming-Marketplace-` is enough. You do need your own Claude plan
(Pro, Max, or a Team seat).

### Option A — Claude Code on your machine (recommended)

1. Install it: `npm install -g @anthropic-ai/claude-code`, or install the
   **Claude Code** extension in VS Code.
2. Clone the repo:
   ```
   git clone https://github.com/raysyd/Gaming-Marketplace-.git
   ```
3. Make sure git can push as you — do one `git push` and sign in to GitHub
   when prompted (or run `gh auth login` if you use the GitHub CLI).
4. In the project folder, run `claude` (or open the Claude panel in VS Code)
   and log in with your Claude account.
5. Ask for your change, then tell it to "commit and push to a new branch".

### Option B — in the browser (claude.ai/code)

1. Go to [claude.ai/code](https://claude.ai/code) and connect your GitHub
   account when asked.
2. Pick `raysyd/Gaming-Marketplace-` and describe the change. It works on a
   branch and can open a pull request.

## Ground rules

- **Work on a branch, never directly on `main`.** Open a pull request and
  Rayan merges it — whatever lands on `main` deploys to the live site
  (https://sidegrade.vercel.app).
- **Never commit secrets.** No API keys, no `.env` / `.env.local` files. This
  repo is public.
- Every branch you push gets its own Vercel preview URL — use it to test
  before asking for a merge.
