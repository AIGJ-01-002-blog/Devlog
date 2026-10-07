# 구현 메모: 022 첨부파일 (v1.11.0)

## 구조
| 파일 | 역할 |
|---|---|
| `media/FileInspector.java` | 형식 검사(FR-002): 확장자 8종 목록과 실제 내용이 모두 맞아야 한다. pdf는 `%PDF-`, zip은 `PK`, docx·xlsx·pptx는 압축 끝 중앙 목록에서 `[Content_Types].xml`과 `word/`·`xl/`·`ppt/`를 이름으로만 확인(내용을 풀지 않아 압축 폭탄 비용이 없다), txt·md·csv는 NUL 바이트·실행 파일 머리가 없어야 한다. 사진이면 "본문에 넣어 주세요" |
| `media/PostFiles.java` | 올리기·목록·연결·내려받기. 리소스 테이블 하나(`resource` kind=FILE) + `resource_file.original_name` + 글 연결 `post_file(position)`. 의도적 중복 없음 |
| `media/FileController.java` | `POST /api/files`(본문=파일 바이트, `X-File-Name`=URL 인코딩 이름), `GET·PUT /api/posts/{id}/files`, `GET /api/posts/{id}/files/{fileId}`(내려받기) |
| `PostImageCleanupJob` | 사진과 같은 기간으로 첨부도 정리(FR-014): 어느 글에도 연결되지 않으면 올린 지 24시간, 끊기면 7일 |
| `AccountStateFilter` | 인증 전 회원은 `POST /api/files`, `PUT /api/posts/{id}/files` 불가(FR-001) |
| `LocalMediaController`, MinIO 버킷 정책 | `files/`는 공개 주소로 열리지 않는다. 공개 읽기는 `images/*`·`profiles/*`만 |
| 화면 `lib/files.ts`, `AttachmentEditor`, `AttachmentList` | 편집 화면 본문 아래 첨부 목록(올리기·↑↓ 순서·빼기, 하나씩 차례로 저장, 실패하면 서버 목록으로 되돌림), 글 본문 아래 📎 목록 |

## 결정 (spec과 다른 점 포함)
- **올리기는 서버를 거친다 (FR-003과 다름)**. 사진(009)과 같은 이유: 학교 저장소가 http만 열려 있어 https 화면에서 저장소로 바로 올릴 수 없다. 대신 크기 상한(20MB)을 먼저 보고 그만큼만 읽는다. 인그레스 본문 상한은 21m(이전 2m는 10MB 사진도 막고 있었다)
- **내려받기도 앱이 준다 (FR-013과 다름)**. 서명 주소 대신 글 상세와 같은 읽기 판정(docs/42)을 통과하면 앱이 저장소에서 읽어 준다. 공개 주소가 없으니 비공개·친구 공개로 바꾸는 즉시 막히고, 주소가 새어도 쓸 수 없다. 응답은 항상 `application/octet-stream` + `Content-Disposition: attachment; filename*=UTF-8''…`(RFC 5987) + `nosniff` + `no-store`
- **첨부 목록은 바꿀 때마다 바로 저장한다(FR-007)**. 본문처럼 작업본을 따로 두지 않아 발행한 글이면 독자에게도 바로 바뀐다(편집 화면에 안내). 이렇게 하면 올린 파일이 연결되지 않은 채 하루 뒤 정리되는 일이 없고, 발행 API를 바꾸지 않는다
- 저장 공간 1GB와 1분 20건은 사진과 합쳐 센다(FR-006). 하루 200장 제한은 사진에만 있다
- 이름: 경로·제어 문자·앞쪽 점을 지우고 255자를 넘으면 확장자를 살려 줄인다. 저장 경로는 `files/연/월/UUID.확장자`로 서버가 정한다

## 확인
- 서버 `FileTest` 5개(올리기→순서→발행→비회원 목록·내려받기 헤더·다른 글 번호 거부·공개 주소 없음·발행 뒤 바로 바뀜, 비공개 전환, 형식·사진·빈 파일·20MB 초과·이름 없음·비로그인, 남의 파일·사진 번호·21개·중복, 정리 기간), `FileInspectorTest` 4개
- 화면 `files.test.ts` (확인 규칙, 크기 표시, 순서 이동)
- 브라우저: 두 파일 한 번에 올리기, 내용이 틀린 pdf 거부 문구, ↑ 순서 저장, 비회원 목록·내려받기(파일 내용과 이름 헤더), 다크 375px 넘침 없음, 비공개 전환 뒤 404. 검증용 headless Chromium은 `filename*`를 읽지 않아(ASCII도 같음) 헤더 값으로 확인했다
