import { Router } from "express";
import { db } from "../db.js";
import { requestPgRefund } from "../pg.js";

const router = Router();

// 되돌릴 수 없는 동작: PG사 환불 API 실호출.
router.post("/:orderId", async (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(req.params.orderId);
  if (!order) return res.status(404).json({ error: "no such order" });
  if (order.status === "refunded") return res.status(409).json({ error: "already refunded" });

  await requestPgRefund(order.paymentKey, order.amount, req.body.reason || "고객 요청");
  db.prepare("UPDATE orders SET status = 'refunded' WHERE id = ?").run(order.id);
  res.json({ ok: true });
});

export default router;
