# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Zenn content repository for publishing articles. It includes a custom tool (`notion-fetch`) that fetches blog posts from Notion and converts them to Zenn-compatible Markdown format.

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
pnpm notion-fetch
```
Fetches blog posts from Notion database and generates/updates Markdown files in `articles/`.

Requires `.env` file with `NOTION_AUTH_TOKEN` set.

Options:
- `--force` or `-f`: Force update all posts even if unchanged
- `--dry-run` or `-D`: Preview changes without writing files
- `--verbose`: Show detailed logs

## Architecture

### Directory Structure

```
/
├── articles/          # Zenn articles (Markdown)
├── books/             # Zenn books (currently empty)
├── images/            # Article images (managed by notion-fetch)
├── tools/             # Custom tooling
│   └── notion-fetch/  # Notion to Zenn converter
│       ├── main.ts              # Entry point
│       ├── notion/              # Notion API integration
│       ├── posts/               # Post processing logic
│       │   ├── factory.ts       # Post creation orchestration
│       │   ├── repository.ts    # File system operations
│       │   └── renderer/        # Markdown rendering
│       │       ├── frontmatter.ts
│       │       ├── markdown.ts
│       │       └── renderer.ts
│       └── env.d.ts
└── tsconfig.json
```

### notion-fetch Tool

**Purpose**: Syncs blog posts from Notion database to local Markdown files for Zenn.

**Flow**:
1. Queries Notion database via `@lacolaco/notion-db` for pages tagged with 'zenn'
2. Fetches page content (blocks) from Notion API
3. Converts Notion blocks to Markdown using custom renderers
4. Downloads external images to `images/{slug}/` directory
5. Generates frontmatter with Zenn-specific metadata (title, emoji, topics, published status, etc.)
6. Formats output with Prettier
7. Writes to `articles/{slug}.md` (skips if unchanged unless `--force`)

**Key Components**:
- `LocalPostFactory`: Orchestrates post creation, manages deferred image download tasks using RxJS
- `LocalPostsRepository`: Handles file I/O for Markdown posts
- `ImagesRepository`: Downloads and manages article images
- `renderPage()`: Converts Notion blocks to formatted Markdown with frontmatter

**Image Handling**:
- External images are downloaded asynchronously using RxJS `forkJoin`
- Stored in `images/{slug}/` subdirectories
- Old images are cleared on post update

**Change Detection**:
- Compares rendered Markdown with existing file content
- Skips writing if unchanged (saves I/O and avoids unnecessary git diffs)
- Use `--force` to bypass change detection

### TypeScript Configuration

- Root `tsconfig.json`: Base config with strict mode, ES2020 target, ESNext modules
- `tools/tsconfig.json`: Extends root, adds Node.js types, targets ES2020 lib (no DOM)
- Project uses ES modules (`"type": "module"` in package.json)

## Development Notes

- All TypeScript code in `tools/` uses ES module syntax (import/export)
- The project has no test suite
- Prettier is configured in `.prettierrc.json` (single quotes, trailing commas, 80 char width)
- Articles are written in Markdown and must include Zenn frontmatter (title, emoji, type, topics, published)
