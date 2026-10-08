#!/usr/bin/env bash
# 학교 실습 서버(여러 학생이 같이 쓰는 Ubuntu + Docker)에 블로그용 쿠버네티스를 만든다.
# sudo 없이 docker 그룹 권한만 쓴다: k3d(Docker 안의 k3s) 클러스터 하나 + ingress-nginx.
# 바깥에서 들어오는 포트는 열지 않는다. 쿠버네티스 API는 127.0.0.1에만 열고(GitHub 배포는 SSH 터널로 닿음),
# devlog.life는 클러스터 안 cloudflared(Cloudflare Tunnel)가 바깥으로 나가 연결한다.
# 여러 번 실행해도 된다. 보통은 GitHub Actions "학교 서버 준비"가 SSH로 이 파일을 실행한다.
#
# 필수 환경 변수: API_PORT(학교에서 받은 본인 포트 중 하나, 서버 127.0.0.1에만 열림)
# 선택 환경 변수: CLUSTER(devlog), K3D_VERSION, K3S_IMAGE,
#                 INGRESS_NGINX_VERSION, NODE_MEMORY(10g, 공용 서버라 상한을 둔다)
set -euo pipefail

CLUSTER="${CLUSTER:-devlog}"
API_PORT="${API_PORT:?API_PORT(학교에서 받은 본인 포트 중 하나)를 주세요}"
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

echo "== 1/5 k3d ${K3D_VERSION}, kubectl ${KUBECTL_VERSION} (홈 아래에 설치)"
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

echo "== 2/5 클러스터 ${CLUSTER} (API 127.0.0.1:${API_PORT}, 메모리 상한 ${NODE_MEMORY})"
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

echo "== 3/5 클러스터 DNS (서버가 쓰는 DNS로 바깥 주소 찾기)"
# 학교망은 8.8.8.8 같은 공용 DNS를 막는다. 노드 resolv.conf가 루프백이면 k3s가 8.8.8.8을 쓰므로
# 클러스터 안에서 바깥 주소를 못 찾는다(cloudflared "server misbehaving"). 서버의 실제 DNS를 kubelet에 직접 준다.
UPSTREAM=""
for f in /run/systemd/resolve/resolv.conf /etc/resolv.conf; do
  [ -r "$f" ] || continue
  UPSTREAM=$(awk '$1=="nameserver" && $2 !~ /^127\./ && $2 != "::1" {print $2}' "$f" | head -3)
  [ -n "$UPSTREAM" ] && break
done
if [ -z "$UPSTREAM" ] && command -v resolvectl >/dev/null; then
  UPSTREAM=$(resolvectl dns 2>/dev/null | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | grep -v '^127\.' | head -3 || true)
fi
[ -n "$UPSTREAM" ] || { echo "서버의 DNS 주소를 찾지 못했습니다(/etc/resolv.conf 확인)" >&2; exit 1; }
echo "서버 DNS: $(echo "$UPSTREAM" | tr '\n' ' ')"
NODE="k3d-${CLUSTER}-server-0"
want=$(awk '{print "nameserver " $0}' <<<"$UPSTREAM")
have=$(docker exec "$NODE" cat /etc/rancher/k3s/upstream-resolv.conf 2>/dev/null || true)
if [ "$want" != "$have" ] || ! docker exec "$NODE" sh -c 'test -f /etc/rancher/k3s/config.yaml.d/dns.yaml'; then
  # 노드 컨테이너 안 k3s 설정에 resolv-conf를 더하고 노드를 다시 띄운다(볼륨·데이터는 그대로)
  printf '%s\n' "$want" | docker exec -i "$NODE" sh -c 'cat > /etc/rancher/k3s/upstream-resolv.conf'
  docker exec "$NODE" sh -c 'mkdir -p /etc/rancher/k3s/config.yaml.d && echo "resolv-conf: /etc/rancher/k3s/upstream-resolv.conf" > /etc/rancher/k3s/config.yaml.d/dns.yaml'
  docker restart "$NODE" >/dev/null
  sleep 5
  for _ in $(seq 90); do kubectl get --raw /readyz >/dev/null 2>&1 && break; sleep 2; done
  kubectl wait --for=condition=Ready node --all --timeout=180s
  kubectl -n kube-system rollout restart deploy/coredns
fi
kubectl -n kube-system rollout status deploy/coredns --timeout=180s
# 확인: 클러스터 안 파드에서 Cloudflare Tunnel 주소를 찾는다
kubectl -n kube-system delete pod dns-check --ignore-not-found >/dev/null
kubectl -n kube-system run dns-check --image=busybox:1.36 --restart=Never --rm -i --quiet -- nslookup region1.v2.argotunnel.com

echo "== 4/5 ingress-nginx ${INGRESS_NGINX_VERSION}"
# baremetal 구성: 서비스 이름 ingress-nginx-controller. 바깥 요청은 Cloudflare Tunnel이 클러스터 안에서 넘겨 준다.
kubectl apply -f "https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v${INGRESS_NGINX_VERSION}/deploy/static/provider/baremetal/deploy.yaml" >/dev/null
kubectl -n ingress-nginx rollout status deploy/ingress-nginx-controller --timeout=300s

echo "== 5/5 완료"
echo "kubeconfig: $BASE/kubeconfig.yaml (API는 이 서버의 127.0.0.1:${API_PORT}에만 열림)"
docker ps --filter "name=k3d-${CLUSTER}" --format '{{.Names}} {{.Status}}'
