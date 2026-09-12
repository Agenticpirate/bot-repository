import Database from "better-sqlite3";

export const db = new Database(process.env.DB_PATH || "./data/studio.db");
db.pragma("journal_mode = WAL");
