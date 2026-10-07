# 구현 메모: 009 사진·GIF 올리기 (v0.9.0)

## 구조
| 파일 | 역할 |
|---|---|
| `media/PostImages` | 업로드 검사와 기록. 분당·하루 장수를 먼저 세고(실패도 1장), 형식·해상도·사진 정보·GIF 장면 수를 검사한 뒤 회원 행을 잠근 트랜잭션에서 저장 공간을 확인하고 `resource`·`resource_image`를 넣는다. 파일은 기록 뒤 올리고 실패하면 기록을 지운다 |
| `media/ImageController` | `POST /api/images`(본문 = 원본 바이트 + 썸네일 바이트, 헤더 `X-Thumbnail-Bytes`), `GET /api/me/storage` |
| `media/ImageInspector.gifFrames` | GIF 블록을 훑어 장면 수를 센다. 한도 + 1에서 멈추고 손상되면 -1 |
| `media/PostImageCleanupJob` | 매일 03:40. 글 연결이 없고 올린 사람의 글·임시 저장 본문에도 없는 사진을 24시간(연결된 적 없음)·7일(연결이 끊김) 뒤 지운다. 행마다 `FOR UPDATE SKIP LOCKED` 트랜잭션, 파일 먼저 지우고 행을 지운다 |
| `shared/markdown/ContentRenderer` | GIF는 `<a href=원본><img src=썸네일></a>`로 그린다(정화 허용 목록 그대로). `RENDER_VERSION` 2 |
| 화면 `lib/postImages.ts`, `lib/useImageUploads.ts`, `lib/gifPlayer.ts` | 줄이기·썸네일 만들기, 대기 표시 바꾸기, 이 기기 보관과 다시 올리기, 대체 글, GIF 재생 |
| `WritePage`, `PostPage`, `SettingsPage`, `PostCard` | 사진 버튼·붙여 넣기·끌어 놓기, 대기·오류 안내, 발행 창 대체 글, 저장 공간 막대 |

## 결정
- 저장소로 바로 올리기(서명된 주소) 대신 서버 경유로 받는다. 학교 MinIO가 http만 열려 있어 https 화면에서 바로 올릴 수 없다. 검사 규칙은 같다.
- 사진 정보 제거는 브라우저가 캔버스로 다시 그려서 하고, 서버는 남아 있으면 거부만 한다. GIF는 다시 그리면 움직임이 사라지므로 그대로 받는다.
- 저장 공간은 정리 대기 사진과 프로필 사진까지 포함한다. 정리가 실제로 지울 때 줄어든다.
- 임시 저장 본문에만 있는 사진도 지우지 않는다. 연결 테이블만 보면 발행 전 사진이 지워진다.
- GIF는 첫 장면(썸네일)으로 보이고 누르면 재생한다. 스크립트가 없으면 링크로 원본이 열린다.

## 확인
- 통합 테스트 `PostImageTest` 8개: 업로드와 카드 썸네일, 형식·손상·크기 거부, 남의 사진 연결 안 함, GIF 표시, GIF 장면 수, 저장 공간 동시 업로드, 하루 장수, 정리 조건(임시 저장 본문 보호 포함)
- 화면 단위 테스트 `postImages.test.ts` 11개
- 브라우저: 큰 사진 → 1920×1329로 줄어 올라감, 오프라인 보관과 발행 막기 → 연결 뒤 올라감, GIF 재생, 대체 글, 카드 썸네일, 저장 공간 막대
