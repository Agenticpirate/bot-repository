# 데이터 소스 / 벤치마크 매트릭스

`trend-scout`는 `insane-search`가 사용하는 source family를 기준으로 "트렌드 seed로 쓸 수 있는가"를 먼저 벤치마킹하고, 자동 발견 가능한 소스만 기본 수집 큐에 넣는다.

## 기본 수집으로 편입한 소스

| Source family | 상태 | trend-scout 구현 | 비고 |
|---|---|---|---|
| Reddit JSON | 편입 | 서브레딧 hot/top | Mobile UA 필요 |
| Hacker News Firebase | 편입 | top/best 조합 | 안정적 |
| Lobsters JSON | 편입 | `hottest.json` | 고품질 개발자 담론 |
| dev.to API | 편입 | tag/top article | 반응수 기반 |
| GitHub Search | 편입 | `gh search repos` 우선, REST 폴백 | 신규 런치 추적 |
| Stack Exchange API | 편입 | Stack Overflow 태그 샘플링 | source family 대표 샘플 |
| npm Registry | 편입 | 검색 API + 주간 다운로드 재정규화 | 패키지 런치/급상승 보강 |
| Bluesky public API | 편입 | 공개 author feed | 검색 403이라 curated handle 기반 |
| Mastodon public API | 편입 | 공개 tag timeline | 인스턴스/태그별 품질 편차 있음 |
| arXiv API | 편입 | 최신 AI 카테고리 | 논문성 시그널 |
| V2EX API | 편입 | `openai`, `python`, `programmer` node | 중국권 개발자 흐름 |
| RSS | 편입 | GeekNews, Yozm, Google News | 고정 피드 |
| Naver search/blog | 편입 | 블로그 검색 + 모바일 본문 | 한국 블로그 수집 핵심 |
| 한국 커뮤니티 HTML | 편입 | Clien, Ruliweb, Ppomppu, DCInside | 직접 HTML 파싱 |
| FMKorea | 편입 | Naver search fallback | 본 사이트 direct probe는 430 |

## 벤치마크 후 "lookup/enrichment only"로 분류한 소스

이 소스들은 공개 조회는 되지만, "무엇이 지금 뜨는가"를 자율적으로 발견하는 피드 성격이 약하거나, 먼저 URL/식별자가 있어야 의미가 있다.

| Source family | 상태 | 이유 |
|---|---|---|
| PyPI | 보류 | 패키지 검색 discovery가 약함. known package lookup은 잘 됨 |
| CrossRef | 보류 | 공개 검색은 되지만 builder/AI trend seed로는 노이즈가 큼 |
| Wikipedia | 보류 | 요약/검색은 가능하지만 트렌드 소스가 아님 |
| OpenLibrary | 보류 | 도서 lookup 용도 |
| Wayback Machine | 보류 | URL 있어야 가치가 생기는 아카이브 보강 계층 |
| X syndication / oEmbed | 보류 | 개별 URL 해석엔 좋지만 trend discovery feed가 없음 |
| yt-dlp media extractors | 보류 | 개별 URL/채널 수집엔 좋지만 기본 trend seed로는 과함 |

## transport / 우회 계층

아래는 source family라기보다 `insane-search`의 접근 전략이다. `trend-scout` 기본 큐에는 직접 넣지 않았다.

| Layer | 상태 | 이유 |
|---|---|---|
| Jina Reader | 문서화만 | URL이 먼저 있을 때만 의미가 있음 |
| `curl_cffi` TLS impersonation | 문서화만 | blocked source 우회용, 기본 트렌드 seed는 아님 |
| Playwright | 문서화만 | 실제 브라우저 fallback. 비용 큼 |

## 한국 소스 벤치마크 요약

| 사이트 | 결과 | 전략 |
|---|---|---|
| Naver Blog | 성공 | Naver 검색 → `m.blog.naver.com` 변환 |
| Clien | 성공 | 게시판 HTML 파싱 |
| Ruliweb | 성공 | 보드 HTML 파싱 |
| Ppomppu | 성공 | `euc-kr/cp949` 디코딩 포함 |
| DCInside | 성공 | HIT gallery 직접 파싱 |
| FMKorea | direct 실패 | Naver 검색 fallback으로 우회 |
| Yozm IT | 성공 | RSS 직접 사용 |
| GeekNews | 성공 | RSS 직접 사용 |

## 실무 해석

- `trend-scout` 기본 큐는 "autonomous discovery 가능"한 소스만 넣는다.
- URL이 먼저 필요한 계층은 `insane-search`처럼 보강용으로만 취급한다.
- 한국 커뮤니티는 direct HTML 파싱 또는 Naver search fallback이 가장 안정적이었다.
