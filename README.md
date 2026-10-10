# token-garden

Claude Code mods by Toptaab.

## Install

```
/plugin marketplace add Toptaab/token-garden
/plugin install token-garden@token-garden
/reload-plugins
```

Or from a shell:

```
claude plugin marketplace add Toptaab/token-garden
claude plugin install token-garden@token-garden
```

Or paste this prompt into Claude Code:

```
Install the Claude Code plugin at https://github.com/Toptaab/token-garden
```

## Develop

Run Claude Code against the working copy, from the repo root:

```
claude --plugin-dir ./plugins/token-garden
```

The mod loads straight from disk, hot-reloads on save, and overrides the installed version for that session.

## Mods

- **token-garden** — a live forecast of the context window and rate limits, in the band above the prompt.
