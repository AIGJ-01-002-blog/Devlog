#!/usr/bin/env bash
# 학교 서버 클러스터 상태를 읽기 전용으로 본다. 아무것도 바꾸지 않는다.
# 실행: Actions → 클러스터 상태 (서버에서 bash -s로 돈다. k3d 노드 안의 kubectl을 쓴다)
set -u
CLUSTER="${CLUSTER:-devlog}"
NODE="k3d-${CLUSTER}-server-0"
k() { docker exec "$NODE" kubectl "$@"; }

echo "== 노드"; k get nodes -o wide
echo "== blog 파드"; k -n blog get pods -o wide
echo "== 자원 사용(파드)"; k -n blog top pods 2>&1 || true
echo "== 자원 사용(노드)"; k top nodes 2>&1 || true
echo "== PVC"; k -n blog get pvc
echo "== 배포된 앱 이미지"; k -n blog get deploy blog-app -o jsonpath='{.spec.template.spec.containers[0].image}{"\n"}'

echo "== ollama-embed 파드"
k -n blog get pod -l app.kubernetes.io/name=ollama-embed -o wide
k -n blog describe pod -l app.kubernetes.io/name=ollama-embed | sed -n '/^Conditions:/,/^Volumes:/p;/^Events:/,$p'
echo "== ollama-embed 로그 (끝 30줄)"
k -n blog logs statefulset/ollama-embed --tail=30 2>&1 || true
echo "== ollama-embed 안의 모델"
k -n blog exec statefulset/ollama-embed -- ollama list 2>&1 || true

echo "== 앱 로그의 임베딩 관련 줄"
k -n blog logs deploy/blog-app --all-containers --tail=2000 2>&1 | grep -E "임베딩|[Ee]mbed" | tail -20 || true
