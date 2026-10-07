# 구현 메모: 018 AI 태그 추천 (v1.7.0)

## 구조
| 파일 | 역할 |
|---|---|
| `ai/application/AiTagService` | 순서: 기능 스위치 → 작성자 본인(404) → AI 동의(403) → 정리 후 100자(400) → ① 같은 내용 → ② 같은 글 비슷한 내용 → 개인 하루 20회(429) → 공급자 호출 → 태그 규칙으로 거르기 → 저장 |
| `ai/application/AiInput` | 마크다운 정리(제목·강조·목록·인용 기호 제거, 사진 통째로 제거, 링크는 글자만, 코드 블록은 언어 + 앞 5줄, 공백 하나로), 재사용 식별값(SHA-256), 3글자 유사도 |
| `ai/application/TagPrompt` | 고정 지시문 + 응답 JSON Schema `{"tags": [최대 5개]}` + 응답 검사 |
| `ai/application/ProviderState` | Redis: 외부 AI 오늘 호출 수·하루 한도 소진(초기화 시간대 날짜 열쇠)·60초 쉼·모르는 한도 초과 연속 수 |
| `ai/application/SuggestionStore` | Redis: `ai:tags:exact:{식별값}` 30일, `ai:tags:post:{글}` 7일 |
| `ai/infra/GeminiModel`, `OllamaModel` | HTTP 호출. Gemini 429는 본문의 할당량 이름(`PerDay`/`PerMinute`)으로 가른다 |
| `ai/web/AiTagController` | `GET /api/ai/tags/status`, `POST /api/posts/{id}/ai-tags` |
| `account/web/MeController` | `POST /api/me/agreements/ai` (동의), 기존 `DELETE`(철회) |
| 화면 `components/AiTagSuggest.tsx`, `lib/aiTags.ts` | 발행 창 태그 입력 아래 버튼·남은 횟수·동의 안내·제안 칩·[다시 추천] |

## 결정
- 공급자 설정은 환경 변수: `GEMINI_API_KEY`(비면 외부 AI 안 씀), `GEMINI_MODEL`(기본 gemini-2.5-flash-lite), `GEMINI_DAILY_LIMIT`(450), `OLLAMA_BASE_URL`(비면 자체 AI 안 씀), `OLLAMA_MODEL`, `OLLAMA_CONCURRENCY`(1), `AI_ENABLED`. 둘 다 비면 기능이 꺼지고 버튼이 숨는다.
- 외부 AI 하루 날짜는 `America/Los_Angeles`(무료 등급 초기화 기준, 설정값), 개인 하루 횟수는 한국 날짜.
- 개인 하루 횟수는 실제로 공급자를 부를 때 센다(실패도 센다). 자체 AI가 바빠 보내지 못했으면 돌려준다. 저장된 결과로 답하면 세지 않는다.
- 이미 붙인 태그는 지시문에 "제외"로 보내고, 응답할 때도 뺀다. 재사용 식별값에는 넣지 않는다.
- 자체 AI 동시 처리 수는 서버(파드)별 세마포어다. 파드를 늘리면 그만큼 늘어난다.
- 개인정보 처리방침 6항을 Gemini 전송·무료 등급 데이터 사용·보관 기간으로 바꿨다. 처리방침 버전은 올리지 않았다(AI는 따로 동의를 받으므로 전 회원 재동의를 걸지 않음). 다음 보고 질문.
- A-3(비공개 글은 자체 AI만)은 미결이라 넣지 않았다.

## 확인
- 통합 `AiTagTest` 6개(가짜 공급자 서버): 동의 전 전송 0건·동의 기록·철회, 정규화·중복·금칙어·규칙 위반·붙인 태그 제외, 보낸 본문에 사진·링크 주소·열쇠값·회원 정보 없음, 같은 내용·공백 차이·오타 재사용과 횟수 유지, [다시 추천], 많이 고치면 새로 묻기, 다른 사람 같은 글 재사용, 짧은 글·남의 글·형식 오류·모두 걸러짐, 하루 한도 → 같은 요청 자체 AI·이후 자체 AI, 자체 AI 결과를 외부 AI로 다시 만들기, 서버 오류 → 실패 + 60초 쉼, 모르는 한도 3번 → 소진, 개인 하루 한도
- 단위 `AiInputTest` 4개, 화면 `aiTags.test.ts` 2개
- 브라우저: 버튼·남은 횟수, 동의 안내와 취소, 짧은 글 안내, 제안 → 누른 것만 추가, 저장된 결과, 발행, 처리방침 문구
