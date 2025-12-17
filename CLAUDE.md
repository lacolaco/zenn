# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Zenn content repository for publishing articles. It includes a custom tool (`notion-sync`) that fetches blog posts from Notion and converts them to Zenn-compatible Markdown format.

## Package Manager

Uses `pnpm` (version 10.12.1). Never use npm or yarn.

## Node.js Version

Requires Node.js v22.x (specified in package.json engines field).

## Common Commands

### Format Code
```bash
pnpm format
```
Formats TypeScript files in the `tools` directory using Prettier.

### Preview Zenn Content
```bash
pnpm start
```
Launches Zenn CLI preview server.

### Fetch from Notion
```bash
pnpm notion-sync
```
Fetches blog posts from Notion database and generates/updates Markdown files in `articles/`.

Requires `.env` file with `NOTION_AUTH_TOKEN` set.

Options:
- `--force` or `-f`: Force update all posts even if unchanged
- `--dry-run` or `-D`: Preview changes without writing files
- `--verbose`: Show detailed logs
- `--mode <mode>`: Sync mode (`incremental` or `all`, default: `incremental`)

## Architecture

### Directory Structure

```
/
├── articles/          # Zenn articles (Markdown)
├── books/             # Zenn books (currently empty)
├── images/            # Article images (managed by notion-sync)
├── tools/             # Custom tooling
│   └── notion-sync/   # Notion to Zenn converter
│       ├── main.ts    # Entry point
│       └── test.ts    # Tests for output validation
└── tsconfig.json
```

### notion-sync Tool

**Purpose**: Syncs blog posts from Notion database to local Markdown files for Zenn using `@lacolaco/notion-sync`.

**Flow**:
1. Queries Notion database for pages with `distribution='zenn'`
2. Fetches page content (blocks) from Notion API
3. Converts Notion blocks to Markdown with Zenn-specific customizations
4. Downloads external images to `images/{slug}/` directory
5. Generates frontmatter with Zenn-specific metadata (title, emoji, topics, published status, etc.)
6. Writes to `articles/{slug}.md` (incremental sync by default)

**Key Customizations**:
- **Frontmatter**: Topics converted to lowercase, Asia/Tokyo timezone for `published_at`
- **Embed blocks**: Stackblitz URLs → `@[stackblitz](URL)` format
- **Metadata extraction**: Custom `icon`, `createdAtOverride`, `type` fields
- **Filter**: Only published articles synced

**Image Handling**:
- Images downloaded with deterministic hash-based filenames
- Stored as `/images/{slug}/{filename}.{hash}.{ext}` (2-tier structure)
- Large images (>2MB) auto-resized

**Change Detection**:
- Manifest-based incremental sync
- Skips unchanged posts automatically
- Use `--force` to regenerate all posts
- Use `--mode all` to sync all posts regardless of manifest

### TypeScript Configuration

- Root `tsconfig.json`: Base config with strict mode, ES2020 target, ESNext modules
- `tools/tsconfig.json`: Extends root, adds Node.js types, targets ES2020 lib (no DOM)
- Project uses ES modules (`"type": "module"` in package.json)

## Development Notes

- All TypeScript code in `tools/` uses ES module syntax (import/export)
- The project has no test suite
- Prettier is configured in `.prettierrc.json` (single quotes, trailing commas, 80 char width)
- Articles are written in Markdown and must include Zenn frontmatter (title, emoji, type, topics, published)

## Development Guidelines

### Impact Scope Pre-verification

**Apply when**: Code changes, renames, migrations, refactoring

Before executing changes, investigate full impact scope across 3 axes:

1. **Addition**: What to add/change (names, paths, configs)
2. **Deletion**: What to remove/deprecate (old names, obsolete configs, unused files)
3. **Dependency**: What depends on it (CI/CD, docs, type definitions, tool configs)

Investigation checklist:
- Use Grep to find all references to old/new names
- Check CI/CD workflows for hardcoded values
- Verify documentation (CLAUDE.md, README, etc.)
- Check type definitions and configuration files
- Identify obsolete files for deletion

Complete all changes in a single atomic operation after investigation.

**Ex**: Renaming `notion-fetch` → `notion-sync`:
- Grep for `notion-fetch` (finds workflow, docs, .prettierignore)
- Check env vars in code (finds NOTION_DATABASE_ID is unused)
- Plan: Update 5 locations + delete 2 items → Execute all at once
