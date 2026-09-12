import { Router } from "express";
import { db } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  res.json({ posts: db.prepare("SELECT * FROM posts ORDER BY published_at DESC").all() });
});

router.post("/", (req, res) => {
  const { title, body } = req.body;
  if (!title || !body) return res.status(400).json({ error: "title/body required" });
  db.prepare("INSERT INTO posts (title, body, published_at) VALUES (?, ?, datetime('now'))").run(title, body);
  res.status(201).json({ ok: true });
});

export default router;
