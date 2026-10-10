# token-garden

Claude Code mods by Toptaab.

## Install

```
/plugin marketplace add Toptaab/token-garden
/plugin install token-garden@token-garden
/reload-plugins
```

## Develop

Run Claude Code against the working copy, from the repo root:

```
claude --plugin-dir ./plugins/token-garden
```

The mod loads straight from disk, hot-reloads on save, and overrides the installed version for that session.

## Mods

- **token-garden** — a live forecast of the context window and rate limits, in the band above the prompt.
