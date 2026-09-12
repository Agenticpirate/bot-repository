CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_email TEXT NOT NULL,
  payment_key TEXT NOT NULL,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  published_at TEXT
);
