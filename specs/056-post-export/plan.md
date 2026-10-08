# 구현 메모: 056 내 글 내보내기 (v1.30.0)

| 파일 | 바뀜 |
|---|---|
| `export/application/PostExporter` | 글·태그·시리즈 조회, 머리말, 파일 이름, zip 쓰기 |
| `export/web/ExportController` | 글 수, zip 스트리밍(`StreamingResponseBody`), 요청 제한 |
| 화면 | `components/ExportSection`(설정), `pages/SettingsPage`, `pages/WithdrawPage`(안내 링크) |
| 테스트 | `ExportTest` 2개 |

## 결정
- **스키마 변경 없음**: 읽기만 한다. 글·태그·시리즈 세 번 조회로 끝난다.
- **스트리밍**: 글 수에 비례해 커지므로 메모리에 모으지 않고 바로 응답에 쓴다.
- **화면은 fetch → Blob**: `<a download>`는 429·오류를 보여 줄 수 없어 직접 받아 저장한다.
- **사진은 주소만**: 묶으면 파일이 커지고 저장소 비용이 든다. 블로그를 떠나도 공개 글의 사진 주소는 살아 있다. 사진까지 받기는 다음 판단으로 남긴다.
