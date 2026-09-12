-- 5월: 권한 개편 준비로 컬럼만 먼저 추가. 아직 코드에서 안 읽는다 (src/auth.js TODO 참고).
ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'member';
