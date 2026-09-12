import { Router } from "express";
import { db } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const rows = db
    .prepare("SELECT id, customer_email, amount, status, created_at FROM orders ORDER BY created_at DESC LIMIT 100")
    .all();
  res.json({ orders: rows });
});

router.get("/:id", (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.id);
  if (!order) return res.status(404).json({ error: "no such order" });
  res.json({ order });
});

export default router;
