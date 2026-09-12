# dorae-shop-admin

수공예 도자기 공방 '도래공방'의 주문 관리 서버. 지인 개발자가 만들어 준 것을 그대로 쓰고 있다.

- Node.js + Express 단일 파일(`server.js`). 빌드 스텝 없음.
- 주문 데이터는 `orders.json` 파일에 저장된다 (DB 없음).
- 결제는 **무통장입금만** 받는다. 입금 확인과 환불은 대표가 은행 앱에서 직접 처리하고,
  `ledger.csv`에 수기로 기록한다. PG/카드 결제 연동은 없다.
- 주문 상태: `pending_payment` → `paid` → `preparing` → `shipped` → `delivered`
  (상태 변경은 관리자 화면의 버튼으로 수동 진행)
- 사이트에 고객 로그인/마이페이지는 없다. 고객 연락은 전화/카카오톡 채널로 직접 받는다.
- 배포: 공방 PC에서 `git pull && pm2 restart dorae-admin`
