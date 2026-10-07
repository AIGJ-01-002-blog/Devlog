# 구현 메모: 023 텔레그램 연결 (v1.12.0)

## 구조
| 파일 | 역할 |
|---|---|
| `V7__member_telegram.sql` | `member_telegram(member_id PK→member, chat_id UNIQUE, notify, linked_at)`. 회원 하나에 대화 하나, 대화 하나에 회원 하나(FR-003). 회원 행과 같은 생명주기라 따로 두는 1:0..1 테이블 |
| `telegram/application/TelegramProperties` | `blog.telegram.*`: 토큰이 비면 `available()=false`라 모든 기능이 꺼진다(FR-001). `toString`은 토큰을 숨긴다 |
| `telegram/infra/HttpTelegramApi` | getMe(봇 이름 캐시), getUpdates(롱 폴링 25초, message만), sendMessage(일반 글자, 미리보기 끔). 403·"chat not found"는 GONE. 토큰이 들어갈 수 있는 주소·응답은 로그에 남기지 않는다(FR-007) |
| `telegram/application/TelegramLinks` | 1회용 코드(Redis `tg:link:{code}`, 10분, 새로 만들면 이전 코드 무효)와 연결·끊기·알림 켜기. 코드는 `getAndDelete`로 한 번만 쓴다(FR-002) |
| `telegram/application/TelegramNotifier` | `NotificationCreated`(새 알림 행이 생길 때만)를 커밋 뒤 별도 실행기(`telegramExecutor`, 2스레드)에서 보낸다(FR-004). 문구는 `NotificationQuery.find`로 알림 화면과 같은 판정을 거친 값으로 만든다(FR-005). 봇을 차단하면 연결을 지운다 |
| `telegram/application/TelegramBot` | 1초마다 `JobLock("telegram-poll")`을 잡은 서버 한 대만 받는다(FR-009). 오프셋은 Redis `tg:offset`. 개인 대화만 받고 `/start 코드`, `/stop`, 그 밖의 명령은 도움말, 일반 글은 메모 |
| `ai/application/MemoDraftService` | 메모 → `{title, contentMd}`. AI 동의가 없거나 AI가 꺼졌거나 실패하면 메모 그대로(첫 줄이 제목). 외부 AI 하루 한도는 태그 추천과 같은 `ProviderState`로 센다(FR-006). 지어내지 말라는 시스템 지시 |
| `TelegramWithdrawalPurgeStep` | 탈퇴 정리 때 연결을 지운다(FR-008). 유예 기간에는 남겨 두되 정지·탈퇴 상태면 메모를 받지 않는다 |
| 화면 `lib/telegram.ts`, 설정의 `TelegramSection` | 서버에 봇이 없으면 숨김. [연결하기] → [텔레그램 열기] 주소와 남은 시간, 연결될 때까지 3초마다 상태를 다시 읽고 주소가 끝나면 멈춘다. 연결되면 알림 켜기·끄기와 [연결 끊기] |

## 결정
- **연결 대상은 기본이 관리자만**(`TELEGRAM_AUDIENCE=ADMINS`). 열린 질문 "민서님 전용으로 시작할까요, 회원 누구나?"의 기본값을 따른다. 운영에서 민서님 계정만 관리자로 두면 민서님 전용이 된다. `MEMBERS`로 바꾸면 회원 누구나 연결하고, 다시 줄이면 남은 연결로도 알림·메모를 쓰지 않는다. 대상이 아니면 설정 화면에 항목이 보이지 않는다
- **웹훅 대신 롱 폴링**. 학교 클러스터에 공개 https 주소를 따로 열지 않아도 되고, 서버가 여러 대여도 잠금으로 한 대만 받는다. 같은 봇에 웹훅이 걸려 있으면 getUpdates가 막히므로 웹훅은 쓰지 않는다
- **봇 토큰**: 배포는 `APP_TELEGRAM_BOT_TOKEN` Secret이 있으면 그것을, 없으면 배포 알림용 `TELEGRAM_BOT_TOKEN`을 앱에도 넣는다. 배포 알림은 sendMessage만 하므로 같은 봇을 써도 충돌하지 않는다. 사용자용 봇을 나누려면 Secret 하나만 추가하면 된다
- **보내는 알림은 새 알림 행만**. 같은 글의 좋아요처럼 기존 알림에 묶이는 것은 다시 보내지 않아 텔레그램이 시끄럽지 않다. 015에서 끈 종류는 행이 생기지 않으니 텔레그램도 가지 않는다
- **메모 한도**: 회원당 하루 20개, 4000자. AI 사용은 회원당 하루 한도(018 `userDailyLimit`)도 함께 센다
- 메모로 만든 글은 항상 임시글이다. 답장에 편집 주소(`/write/{id}`)를 준다

## 확인
- 서버 `TelegramAudienceTest`(기본값이면 일반 회원은 숨김·403, 관리자는 연결, 관리자에서 내려오면 다시 숨김)
- 서버 `TelegramTest` 8개(테스트 설정은 MEMBERS)(연결·코드 재사용 거부·새 코드가 이전 코드 무효, 대화 하나에 계정 하나, 알림 보내기와 끄기, 봇 차단 시 연결 해제, AI 동의 없는 메모, AI 다듬기와 실패 시 원문 저장, 인증 전·정지 계정 거부, 비로그인 401). 가짜 텔레그램 서버(`FakeTelegram`)로 확인
- 화면 `telegram.test.ts` (연결 주소 남은 시간)
