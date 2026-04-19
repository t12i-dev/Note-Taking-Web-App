# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Status

This project is in the **pre-implementation phase**. `SPEC.md` is the authoritative source for all requirements, architecture, and implementation decisions. Read it before making any structural choices.

The following dependencies are already installed (`package.json`):
- `better-auth` — auth library
- `@tiptap/starter-kit` + TipTap extensions — rich text editor
- `bun` — runtime
- `zod` — validation

Next.js and TailwindCSS still need to be added.

## Commands

> These assume a complete Next.js + Bun setup. Scaffold the project first with `bunx create-next-app@latest`.

```bash
bun run dev        # start dev server
bun run build      # production build
bun run start      # run production build
bunx --bun auth@latest migrate   # apply better-auth schema to SQLite
```

The `--bun` flag is required for the better-auth CLI to avoid type errors with `bun:sqlite`.

## Architecture

### Runtime & Database

- **Runtime:** Bun (not Node.js) — use `bun:sqlite` for database access, not `better-sqlite3`
- **Database file:** `data/app.db` (single SQLite file)
- `lib/db.ts` exports a shared `Database` instance; all queries use prepared statements

### Auth (better-auth)

- `lib/auth.ts` configures `betterAuth({ database: new Database("data/app.db") })`
- better-auth owns four tables: `user`, `session`, `account`, `verification` — never write migrations for these manually, use the CLI
- The notes table's `user_id` foreign key references `user(id)` (not `users`)
- Auth is session-based via HTTP-only cookies; Next.js middleware enforces it on protected routes

### Notes Data Flow

- Server Actions in `server/actions/notes.ts` handle all CRUD — they validate `user_id` ownership on every mutating query
- `content` column stores TipTap document JSON as a string; parse/stringify at the DB boundary
- Auto-save is debounced ~1s on the client inside `components/Editor.tsx`

### Public Sharing

- `is_public` flag on a note enables the `/public/[id]` route — no auth required, read-only
- Public notes must not appear in any listing; the only entry point is the direct URL
- Sanitize TipTap JSON → HTML output on the public page to prevent XSS
