# studio-admin

쇼핑몰 운영 어드민. 주문 조회, 환불 처리, 공지 발행을 한 화면에서 처리한다.

## 접근

지금은 `OWNER_EMAIL` 환경변수와 이메일이 일치하는 계정(= 대표) 하나만 로그인 후 어드민 전체에 접근 가능.

```bash
OWNER_EMAIL=boss@studio.example npm start   # http://localhost:3000/admin
npm run migrate                              # migrations/ 순서 실행
```

## 메뉴

- `/admin/stats` — 매출·주문 통계 (읽기 전용)
- `/admin/orders` — 주문 목록/상세, 환불 버튼 → `POST /admin/refunds/:orderId`
- `/admin/posts` — 공지 작성/발행
