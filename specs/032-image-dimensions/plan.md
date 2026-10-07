# 구현 메모: 032 본문 사진 자리 먼저 잡기 (v1.16.5)

## 구조
| 파일 | 역할 |
|---|---|
| `shared/markdown/ImageOwnership` | 사진 키 → `OwnedImage(thumbKey, width, height)`. 썸네일 키만 돌려주던 것을 크기까지 |
| `media/JdbcImageOwnership` | 같은 한 번의 조회에서 `resource_image.width, height`도 읽는다 |
| `shared/markdown/ContentRenderer` | 렌더마다 사진 주소 → 크기 표로 `AttributeProvider`를 만들어 `width`·`height`를 적는다. 정화 규칙에 숫자만 허용. `RENDER_VERSION` 3 |
| `styles.css` `.markdown img` | `height: auto`(폭이 줄면 비율대로), `object-fit: contain`(80vh 제한에 걸려도 찌그러지지 않음) |

## 결정
- 크기는 이미 사진 주인 확인에 쓰던 조회에서 함께 읽어 추가 조회가 없다. 모듈 경계도 그대로(shared 인터페이스, media 구현).
- `HtmlRenderer`를 렌더마다 만든다. 렌더 결과는 Redis에 캐시되고(`RenderedHtmlCache`), 만드는 비용은 파싱에 비해 작다.
- GIF 첫 장면은 썸네일이라 원본 크기를 적으면 확대되어 보인다. 그래서 적지 않는다.
- 렌더 캐시 키에 `RENDER_VERSION`이 들어 있어 3으로 올리면 기존 글도 새로 그린다.
- 기능이 늘지 않은 성능 개선이라 Patch 버전이다.

## 확인
- `ContentRendererTest`: 크기를 아는 사진은 `width="1200" height="800"`, 모르는 사진은 없음. 공격 문자열 32개 그대로 통과.
- `./mvnw verify`, `vitest` 286개, `vite build`
