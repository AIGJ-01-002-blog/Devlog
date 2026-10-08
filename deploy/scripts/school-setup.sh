#!/usr/bin/env bash
# 학교 실습 서버(s2.java21.net, 여러 학생이 같이 쓰는 Ubuntu + Docker)에 블로그용 쿠버네티스를 만든다.
# sudo 없이 docker 그룹 권한만 쓴다: k3d(Docker 안의 k3s) 클러스터 하나 + ingress-nginx.
# 바깥에서 들어오는 포트는 열지 않는다. 쿠버네티스 API는 127.0.0.1에만 열고(GitHub 배포는 SSH 터널로 닿음),
# devlog.life는 클러스터 안 cloudflared(Cloudflare Tunnel)가 바깥으로 나가 연결한다.
# 여러 번 실행해도 된다. 보통은 GitHub Actions "학교 서버 준비"가 SSH로 이 파일을 실행한다.
#
# 선택 환경 변수: CLUSTER(devlog), API_PORT(8318, 본인 포트 범위 8310~8319 안), K3D_VERSION, K3S_IMAGE,
#                 INGRESS_NGINX_VERSION, NODE_MEMORY(10g, 공용 서버라 상한을 둔다)
set -euo pipefail

CLUSTER="${CLUSTER:-devlog}"
API_PORT="${API_PORT:-8318}"
K3D_VERSION="${K3D_VERSION:-v5.8.3}"
K3S_IMAGE="${K3S_IMAGE:-rancher/k3s:v1.33.4-k3s1}"
KUBECTL_VERSION="${KUBECTL_VERSION:-v1.33.4}"
INGRESS_NGINX_VERSION="${INGRESS_NGINX_VERSION:-1.13.3}"
NODE_MEMORY="${NODE_MEMORY:-10g}"
BASE="$HOME/devlog"
BIN="$HOME/.local/bin"
export PATH="$BIN:$PATH"

docker info >/dev/null 2>&1 || { echo "docker를 쓸 수 없습니다(docker 그룹 확인)" >&2; exit 1; }
mkdir -p "$BASE/storage" "$BIN"

echo "== 1/4 k3d ${K3D_VERSION}, kubectl ${KUBECTL_VERSION} (홈 아래에 설치)"
if ! command -v k3d >/dev/null || ! k3d version | grep -qF "$K3D_VERSION"; then
  curl -fsSL -o "$BIN/k3d.tmp" "https://github.com/k3d-io/k3d/releases/download/${K3D_VERSION}/k3d-linux-amd64"
  chmod +x "$BIN/k3d.tmp" && mv "$BIN/k3d.tmp" "$BIN/k3d"
fi
k3d version | head -1
# 서버에 깔린 kubectl은 버전이 맞지 않을 수 있어 클러스터와 같은 버전을 따로 둔다
if ! "$BIN/kubectl" version --client 2>/dev/null | grep -qF "$KUBECTL_VERSION"; then
  curl -fsSL -o "$BIN/kubectl.tmp" "https://dl.k8s.io/release/${KUBECTL_VERSION}/bin/linux/amd64/kubectl"
  chmod +x "$BIN/kubectl.tmp" && mv "$BIN/kubectl.tmp" "$BIN/kubectl"
fi

echo "== 2/4 클러스터 ${CLUSTER} (API 127.0.0.1:${API_PORT}, 메모리 상한 ${NODE_MEMORY})"
if ! k3d cluster list -o json | grep -q "\"name\":\"${CLUSTER}\""; then
  # 영구 볼륨(local-path)은 홈 아래 폴더에 둔다: 노드 컨테이너를 다시 만들어도 DB·사진이 남는다
  k3d cluster create "$CLUSTER" \
    --image "$K3S_IMAGE" \
    --api-port "127.0.0.1:${API_PORT}" \
    --no-lb \
    --servers 1 --agents 0 \
    --servers-memory "$NODE_MEMORY" \
    --k3s-arg "--disable=traefik@server:0" \
    --volume "$BASE/storage:/var/lib/rancher/k3s/storage@server:0" \
    --kubeconfig-update-default=false --kubeconfig-switch-context=false \
    --wait --timeout 300s
else
  k3d cluster start "$CLUSTER" >/dev/null 2>&1 || true
fi

umask 077
k3d kubeconfig get "$CLUSTER" | sed -E "s#https://(0\.0\.0\.0|localhost):#https://127.0.0.1:#" > "$BASE/kubeconfig.yaml"
export KUBECONFIG="$BASE/kubeconfig.yaml"
for _ in $(seq 60); do kubectl get nodes 2>/dev/null | grep -q ' Ready' && break; sleep 2; done
kubectl get nodes

echo "== 3/4 ingress-nginx ${INGRESS_NGINX_VERSION}"
# baremetal 구성: 서비스 이름 ingress-nginx-controller. 바깥 요청은 Cloudflare Tunnel이 클러스터 안에서 넘겨 준다.
kubectl apply -f "https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v${INGRESS_NGINX_VERSION}/deploy/static/provider/baremetal/deploy.yaml" >/dev/null
kubectl -n ingress-nginx rollout status deploy/ingress-nginx-controller --timeout=300s

echo "== 4/4 완료"
echo "kubeconfig: $BASE/kubeconfig.yaml (API는 이 서버의 127.0.0.1:${API_PORT}에만 열림)"
docker ps --filter "name=k3d-${CLUSTER}" --format '{{.Names}} {{.Status}}'
