## Summary
<!-- 무엇이 바뀌었는지 한두 줄 -->

## Why
<!-- 왜 필요한지, 관련 spec 번호(예: spec 002) -->

## 검증
- [ ] 백엔드 `./mvnw verify` 통과 (커버리지 줄 40% 이상)
- [ ] 화면 `npm run typecheck && npm test` 통과
- [ ] 배포 구성을 바꿨다면 `kustomize build deploy/k8s/overlays/local` 확인
- [ ] 비밀값을 커밋하지 않음 (`deploy/scripts/check-no-secrets.sh`)

## 참고
<!-- 스크린샷, 남은 일, 리뷰어가 볼 곳 -->
