// TODO(5월, 대표 요청): users.role 컬럼 기반 권한으로 교체.
// 002 마이그레이션으로 컬럼은 만들어뒀지만 아직 코드 어디서도 안 읽는다.
// 지금은 대표 계정 하나가 어드민 전부를 쓴다.
export function requireOwner(req, res, next) {
  const email = req.session?.user?.email;
  if (!email || email !== process.env.OWNER_EMAIL) {
    return res.status(403).send("어드민 권한이 없습니다.");
  }
  next();
}
