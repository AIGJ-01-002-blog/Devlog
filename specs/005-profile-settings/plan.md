# 구현 메모: 005 프로필·설정 (v0.5.0)

## API
| 요청 | 하는 일 |
|---|---|
| `GET /api/me/settings` | 설정 화면 전체: 주소·닉네임(다음 변경 가능일)·소개·사진, 이메일·인증 여부·로그인 수단·비밀번호 유무, 직전 로그인, 기본 공개 범위, AI 동의 여부, 약관 버전 |
| `PATCH /api/me/profile` | `nickname`·`bio`·`profileImageId` 중 보낸 칸만 바꾼다. `profileImageId: null` = 기본 이미지. 전부 검사 후 한 트랜잭션(회원 행 잠금) |
| `POST /api/me/profile-image` | 본문 = 256×256 사진 그대로(`Content-Type: image/webp` 등), 1MB까지. 201 `{id, url}`. 연결은 하지 않는다 |
| `PATCH /api/me/settings` | `defaultVisibility` (`PUBLIC`·`PRIVATE`) |
| `DELETE /api/me/agreements/ai` | AI 동의 기록 삭제 (204, 없어도 204) |
| `GET /media/{키}` | 로컬 저장소일 때만 사진을 내려준다 (1년 캐시, nosniff) |

## 결정
- 프로필 사진 = 저장 키가 `profiles/`로 시작하는 256×256 `resource_image`. 용도 컬럼 없이 키 접두어로 구분한다(V3 정규화: 사진·첨부 공통 리소스, 연결은 `member_profile_image`). 본문 정화는 `images/` 키만 받으므로 프로필 사진을 글에 넣을 수 없다.
- 서버는 사진을 디코딩하지 않고 머리(PNG IHDR, JPEG SOF, GIF, WebP VP8/VP8L/VP8X)만 읽어 형식·크기를 검사한다. 선언된 Content-Type은 믿지 않는다. EXIF·XMP가 남아 있으면 거부한다(브라우저 캔버스로 다시 그리면 남지 않는다).
- 저장소에 먼저 쓰고 DB 기록이 실패하면 파일을 지운다. 정리 배치는 반대로 DB 행을 먼저 지우고(`DELETE … RETURNING`) 파일을 지운다. 어느 쪽이든 DB가 없는 파일을 가리키지 않는다.
- 정리 배치: 매시 17분(KST), JobLock으로 한 서버만. 연결이 없고 `created_at` 24시간 지난 사진, `detached_at` 7일 지난 사진.
- S3 클라이언트는 AWS SDK v2 + JDK URLConnection(Apache·Netty 제외), 경로 방식, 체크섬은 필요할 때만(옛 MinIO가 트레일러 체크섬을 모를 수 있음).
- 직전 로그인 방식은 지금 로그인 수단과 같다(회원당 로그인 수단이 하나). 계정 연결이 생기면 identity별 마지막 로그인으로 바꾼다.
- 소셜 사진 복사는 이메일을 따로 받는 가입(인증 전)에서는 하지 않는다(인증 전 업로드 금지, FR-017).

## 남은 일
- 운영 사진 주소: 사이트가 https인데 학교 MinIO는 http만 열려 있어(2026-10-07 실측) 브라우저가 사진을 막을 수 있다 → 일일 보고 질문.
