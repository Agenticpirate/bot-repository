# pulseboard

구독 결제 지표를 하루 한 번 수집해서 로컬 JSON에 쌓고, 브라우저로 보는 초미니 대시보드.

## 실행

빌드 스텝 없음 — 그대로 실행한다:

```bash
node src/index.js   # http://localhost:8787
npm test            # node --test
```

번들러/트랜스파일러를 쓰지 않는 것이 의도적인 선택이다. 서버(라즈베리파이)에서
`git pull && systemctl restart pulseboard`로 배포하므로 산출물 디렉터리가 생기면 안 된다.

## 구조

- `src/index.js` — HTTP 서버 (node:http, 의존성 없음)
- `src/lib/` — 수집·파싱 로직 (JSDoc 타입 주석 붙이는 중)
- `src/vendor/` — 수정 금지 (외부에서 복사해온 파일)
