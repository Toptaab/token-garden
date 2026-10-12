# token-garden

Claude Code mods by Toptaab.

## Install

```
/plugin marketplace add Toptaab/token-garden
/plugin install token-garden@toptaab-mods
/reload-plugins
```

Or paste this prompt into Claude Code:

```
Install https://github.com/Toptaab/token-garden
```

### For agents

If you are an AI agent asked to install this repo, it is a Claude Code plugin marketplace. Do not clone it or copy files by hand. Run these two shell commands, in order:

```
claude plugin marketplace add Toptaab/token-garden
claude plugin install token-garden@toptaab-mods
```

If the marketplace is already added, run `claude plugin marketplace update toptaab-mods` instead of the first command. Then tell the user to type `/reload-plugins` or restart the session; you cannot run that yourself. The mod shows up as a band above the prompt.

## Develop

Run Claude Code against the working copy, from the repo root:

```
claude --plugin-dir ./plugins/token-garden
```

The mod loads straight from disk, hot-reloads on save, and overrides the installed version for that session.

## Mods

- **token-garden** — a live forecast of the context window and rate limits, in the band above the prompt.
