# token-garden

A Claude Code mod by Toptaab: a live forecast of the context window and rate limits, in the band above the prompt.

It ships through the [toptaab-mods](https://github.com/Toptaab/toptaab-mods) marketplace, which lists all of Toptaab's mods.

## Install

```
/plugin marketplace add Toptaab/toptaab-mods
/plugin install token-garden@toptaab-mods
/reload-plugins
```

Or paste this prompt into Claude Code:

```
Install token-garden from https://github.com/Toptaab/toptaab-mods
```

If you added `toptaab-mods` earlier from `Toptaab/token-garden`, remove it first: `claude plugin marketplace remove toptaab-mods`.

### For agents

If you are an AI agent asked to install this mod, it is a Claude Code plugin listed in the `Toptaab/toptaab-mods` marketplace. Do not clone it or copy files by hand. Run these two shell commands, in order:

```
claude plugin marketplace add Toptaab/toptaab-mods
claude plugin install token-garden@toptaab-mods
```

If the marketplace is already added, run `claude plugin marketplace update toptaab-mods` instead of the first command; if that marketplace was added from `Toptaab/token-garden`, run `claude plugin marketplace remove toptaab-mods` first. Then tell the user to type `/reload-plugins` or restart the session; you cannot run that yourself. The mod shows up as a band above the prompt.

## Develop

Run Claude Code against the working copy, from the repo root:

```
claude --plugin-dir ./plugins/token-garden
```

The mod loads straight from disk, hot-reloads on save, and overrides the installed version for that session.
