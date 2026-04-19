# Technical Specification — Note Taking Web App

## 1. System Overview

A full-stack note-taking web application where authenticated users can:

- Create, edit, delete notes
- View all their notes
- Share notes via public link (read-only)

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Runtime | Bun |
| Language | TypeScript |
| Styling | TailwindCSS |
| Editor | TipTap |
| Auth | better-auth (email + password) |
| Database | SQLite (via Bun) |
| Storage Format | JSON (TipTap document) |

---

## 2. Architecture

### 2.1 High-Level Architecture

- **Frontend & Backend:** Next.js (App Router)
  - Server components for data fetching
  - Client components for TipTap editor and interactive UI
  - Route Handlers (`app/api/.../route.ts`) for JSON APIs
- **Runtime:** Bun (for dev & production)
- **Database:** Single SQLite file (e.g., `data/app.db`) accessed via Bun's built-in SQLite client
- **Auth:** better-auth integrated into Next.js (middleware + server helpers)

### 2.2 Application Layers

**Presentation layer**
- Next.js pages and components
- TailwindCSS for styling
- TipTap editor component

**API layer**
- REST-like JSON endpoints for notes CRUD & sharing

**Data access layer**
- Raw SQL queries executed via Bun's SQLite client
- A small helper module for DB access

---

## 3. Database Schema

### Auth Tables (managed by better-auth)

better-auth manages its own tables via the CLI (`bunx --bun auth@latest migrate`). Do not create these manually.

```sql
CREATE TABLE user (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  image       TEXT,
  created_at  DATETIME NOT NULL,
  updated_at  DATETIME NOT NULL
);

CREATE TABLE session (
  id          TEXT PRIMARY KEY,
  expires_at  DATETIME NOT NULL,
  token       TEXT UNIQUE NOT NULL,
  created_at  DATETIME NOT NULL,
  updated_at  DATETIME NOT NULL,
  ip_address  TEXT,
  user_agent  TEXT,
  user_id     TEXT NOT NULL REFERENCES user(id)
);

CREATE TABLE account (
  id                        TEXT PRIMARY KEY,
  account_id                TEXT NOT NULL,
  provider_id               TEXT NOT NULL,
  user_id                   TEXT NOT NULL REFERENCES user(id),
  access_token              TEXT,
  refresh_token             TEXT,
  id_token                  TEXT,
  access_token_expires_at   DATETIME,
  refresh_token_expires_at  DATETIME,
  scope                     TEXT,
  password                  TEXT,
  created_at                DATETIME NOT NULL,
  updated_at                DATETIME NOT NULL
);

CREATE TABLE verification (
  id          TEXT PRIMARY KEY,
  identifier  TEXT NOT NULL,
  value       TEXT NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME,
  updated_at  DATETIME
);
```

### Notes Table

```sql
CREATE TABLE notes (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL,
  title      TEXT,
  content    TEXT NOT NULL, -- JSON string (TipTap document)
  is_public  BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES user(id)
);
```

### Indexes

```sql
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_public  ON notes(is_public);
```

---

## 4. Authentication

### Strategy

- Email + password only
- Session-based auth (HTTP-only cookies via better-auth)

### Features

- Register
- Login
- Logout
- Email verification
- Password reset

### better-auth Setup (Bun SQLite)

```ts
// lib/auth.ts
import { betterAuth } from "better-auth";
import { Database } from "bun:sqlite";

export const auth = betterAuth({
  database: new Database("data/app.db"),
});
```

> Run `bunx --bun auth@latest migrate` to generate and apply the auth schema.

---

## 5. Data Model (TypeScript)

```ts
export type Note = {
  id:        string
  userId:    string
  title:     string | null
  content:   any      // TipTap JSON
  isPublic:  boolean
  createdAt: string
  updatedAt: string
}
```

---

## 6. Routing Structure

| Route | Description |
|---|---|
| `/login` | Login page |
| `/register` | Registration page |
| `/dashboard` | List all user notes |
| `/note/[id]` | Edit a note |
| `/public/[id]` | Public read-only note view |

---

## 7. Core Features

### 7.1 Notes CRUD

**Create Note**

Creates an empty note with default content:

```json
{
  "type": "doc",
  "content": []
}
```

**Read Notes**

- Fetch all notes for the logged-in user
- Sorted by `updated_at DESC`

**Update Note**

- Auto-save debounced (~1 second)

**Delete Note**

- Permanent delete (no trash)

### 7.2 Public Sharing

- Toggle `isPublic` flag on a note
- Public URL: `/public/:id`

Rules:
- Public notes are read-only
- Not indexed or listed anywhere
- Accessible via direct link only

---

## 8. Editor (TipTap)

### Enabled Features

- Bold, Italic
- Headings (h1, h2, h3)
- Paragraph
- Bullet list
- Code (inline + block)
- Horizontal rule
- Undo / Redo

### Behavior

- Auto-save on change (debounced)
- No collaboration

---

## 9. Server Actions

```ts
createNote()
// → INSERT note with default empty content

updateNote(id, content, title)
// → UPDATE notes SET content, title, updated_at

deleteNote(id)
// → DELETE FROM notes WHERE id = ? AND user_id = ?

togglePublic(id)
// → UPDATE notes SET is_public = NOT is_public WHERE id = ? AND user_id = ?
```

---

## 10. UI Structure

### Dashboard Page

- List of notes sorted by last updated
- "New Note" button
- Each item shows:
  - Title
  - Last updated timestamp
  - Public badge (if shared)

### Editor Page

```
[ Title Input   ]
[ Toolbar       ]
[ TipTap Editor ]
[ Share Toggle  ]
[ Delete Button ]
```

### Public Page

- Clean read-only view
- Renders TipTap content as HTML

---

## 11. Folder Structure

```
/app
  /dashboard
  /note/[id]
  /public/[id]
  /login
  /register

/components
  Editor.tsx
  Toolbar.tsx
  NoteList.tsx

/lib
  db.ts
  auth.ts
  notes.ts

/server
  /actions
    notes.ts

/styles
```

---

## 12. Database Layer (Bun SQLite)

```ts
// lib/db.ts
import { Database } from "bun:sqlite";

export const db = new Database("data/app.db");
```

Always use prepared statements:

```ts
const stmt = db.prepare("SELECT * FROM notes WHERE user_id = ?");
stmt.all(userId);
```

---

## 13. Security Considerations

- Always filter by `user_id` for private routes
- Validate ownership before update or delete
- Public route: only check `is_public = true`, no auth required
- Sanitize TipTap output before rendering to prevent XSS

---

## 14. Implementation Order

1. Setup project (Next.js + Bun + Tailwind)
2. Setup SQLite + run `bunx --bun auth@latest migrate`
3. Implement auth (better-auth)
4. Build dashboard (list notes)
5. Create note flow
6. Editor integration (TipTap)
7. Auto-save logic
8. Public sharing
9. Polish UI
