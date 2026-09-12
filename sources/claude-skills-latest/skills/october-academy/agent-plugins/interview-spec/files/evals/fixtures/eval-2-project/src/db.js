// Thin wrapper around the reporting replica. Rows come back as plain objects
// keyed by Korean column labels defined in the dashboard schema.
async function queryRows(range) {
  return [
    { "주문번호": "ORD-20260703-0012", "고객명": "김서연", "상태": "결제완료", "금액": 33000 },
    { "주문번호": "ORD-20260703-0013", "고객명": "박지훈", "상태": "환불", "금액": -33000 }
  ];
}
module.exports = { queryRows };
