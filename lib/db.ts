import { Database } from "bun:sqlite";

export const db = new Database("data/app.db", { create: true });

// Enable WAL mode for better concurrent read performance
db.run("PRAGMA journal_mode = WAL;");

// Create the notes table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS notes (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    title      TEXT,
    content    TEXT NOT NULL,
    is_public  BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id)
  )
`);

db.run(`CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)`);
db.run(`CREATE INDEX IF NOT EXISTS idx_notes_public  ON notes(is_public)`);
