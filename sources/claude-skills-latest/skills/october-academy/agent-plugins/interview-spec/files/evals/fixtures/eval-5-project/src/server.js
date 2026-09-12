import express from "express";
import { requireOwner } from "./auth.js";
import statsRouter from "./routes/stats.js";
import ordersRouter from "./routes/orders.js";
import refundsRouter from "./routes/refunds.js";
import postsRouter from "./routes/posts.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// 어드민 전체가 단일 게이트 뒤에 있다 — 메뉴별 구분 없음.
app.use("/admin", requireOwner);
app.use("/admin/stats", statsRouter);
app.use("/admin/orders", ordersRouter);
app.use("/admin/refunds", refundsRouter);
app.use("/admin/posts", postsRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`studio-admin on :${PORT}`));
