// dorae-shop-admin — 주문 관리 서버 (지인 개발자 제작, 2025-11)
// 실행: node server.js  (pm2 프로세스명: dorae-admin)
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const ORDERS_PATH = path.join(__dirname, 'orders.json');

// 상태 전이는 관리자 화면 버튼으로만 진행한다.
const NEXT_STATUS = {
  pending_payment: 'paid',
  paid: 'preparing',
  preparing: 'shipped',
  shipped: 'delivered',
};

function loadOrders() {
  return JSON.parse(fs.readFileSync(ORDERS_PATH, 'utf8'));
}

function saveOrders(orders) {
  fs.writeFileSync(ORDERS_PATH, JSON.stringify(orders, null, 2));
}

app.use(express.urlencoded({ extended: false }));

app.get('/admin/orders', (req, res) => {
  const orders = loadOrders();
  res.send(
    orders
      .map(
        (o) =>
          `${o.id} | ${o.customer} | ${o.items.map((i) => `${i.name}x${i.qty}`).join(', ')} | ` +
          `${o.total}원 | ${o.status}`
      )
      .join('\n')
  );
});

app.post('/admin/orders/:id/advance', (req, res) => {
  const orders = loadOrders();
  const order = orders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).send('no such order');
  const next = NEXT_STATUS[order.status];
  if (!next) return res.status(400).send(`cannot advance from ${order.status}`);
  order.status = next;
  saveOrders(orders);
  res.send(`${order.id} -> ${next}`);
});

app.listen(3600, () => console.log('dorae-shop-admin on :3600'));
