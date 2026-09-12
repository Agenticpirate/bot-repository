// PG사 환불 API 래퍼. 실계정 키는 환경변수로만.
export async function requestPgRefund(paymentKey, amount, reason) {
  const res = await fetch("https://api.tosspayments.com/v1/payments/" + paymentKey + "/cancel", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(process.env.PG_SECRET_KEY + ":").toString("base64"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cancelReason: reason, cancelAmount: amount }),
  });
  if (!res.ok) throw new Error(`PG refund failed: ${res.status} ${await res.text()}`);
  return res.json();
}
