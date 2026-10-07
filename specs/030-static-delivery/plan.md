# 구현 메모: 030 화면 파일 캐시와 응답 압축 (v1.16.3)

## 구조
| 파일 | 역할 |
|---|---|
| `config/WebConfig.java` `addResourceHandlers` | `/assets/**` → `classpath:/static/assets/`, 1년 `public, immutable` |
| `application.yml` `server.compression` | 1KB 이상 텍스트 응답 gzip |
| `StaticDeliveryTest` | 실제 Tomcat(임의 포트)에서 캐시 헤더, 404, gzip 확인 |

## 결정
- Spring Security는 응답에 `Cache-Control`이 없으면 `no-cache, no-store`를 붙인다. 리소스 핸들러가 먼저 `Cache-Control`을 정하면 Security가 덮지 않는다. 그래서 Security 설정은 그대로 두고 `/assets`에만 캐시를 준다.
- Vite가 `/assets` 파일 이름에 내용 해시를 붙이므로 `immutable`이 안전하다. 이름이 고정된 파일은 `/assets` 밖에 있어 영향이 없다.
- 압축은 ingress-nginx(기본 꺼짐)가 아니라 앱에서 켠다. 배포 설정을 클러스터마다 맞추지 않아도 되고 로컬·테스트에서 같은 동작을 확인할 수 있다.
- `text/event-stream`은 넣지 않는다(흘려보내는 응답은 압축하면 버퍼에 묶인다).
- 기능이 늘지 않은 성능 개선이라 Patch 버전이다.

## 확인
- `StaticDeliveryTest` 3개. `WebConfig` 변경을 빼고 돌리면 첫 테스트가 `no-cache, no-store, max-age=0, must-revalidate`로 실패하는 것을 확인했다.
- `./mvnw verify`
