import { Router } from "express";
import { db } from "../db.js";

const router = Router();

router.get("/", (req, res) => {
  const daily = db
    .prepare(
      "SELECT date(created_at) AS day, COUNT(*) AS orders, SUM(amount) AS revenue FROM orders GROUP BY day ORDER BY day DESC LIMIT 30"
    )
    .all();
  res.json({ daily });
});

export default router;
