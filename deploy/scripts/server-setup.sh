#!/usr/bin/env bash
# 새 Ubuntu 서버(Oracle Cloud 무료 Ampere VM 기준)에 블로그를 돌릴 k3s 한 대짜리 클러스터를 만든다.
# 서버에 SSH로 들어가 저장소 없이 이 파일만 받아 실행한다:
#   curl -fsSL https://raw.githubusercontent.com/AIGJ-01-002-blog/Devlog/main/deploy/scripts/server-setup.sh | sudo bash
# 끝나면 GitHub Secret KUBECONFIG에 넣을 접속 파일을 /root/kubeconfig-github.yaml로 만든다(화면에는 찍지 않는다).
#
# 하는 일: 방화벽(Oracle Ubuntu 기본 iptables의 REJECT 규칙이 파드 통신을 막음) 정리 → k3s 설치(traefik 끔)
#          → ingress-nginx 설치 → 외부 접속용 kubeconfig 작성. 여러 번 실행해도 된다.
# 선택 환경 변수: K3S_VERSION, INGRESS_NGINX_VERSION, PUBLIC_IP(자동 감지 실패 시)
set -euo pipefail

K3S_VERSION="${K3S_VERSION:-v1.33.4+k3s1}"
INGRESS_NGINX_VERSION="${INGRESS_NGINX_VERSION:-1.13.3}"

[ "$(id -u)" -eq 0 ] || { echo "sudo로 실행해 주세요" >&2; exit 1; }

echo "== 1/4 방화벽 정리"
# Oracle Ubuntu 이미지는 INPUT·FORWARD 끝에 REJECT가 있어 k3s 파드끼리 통신이 막힌다. 그 규칙만 지운다.
for chain in INPUT FORWARD; do
  while iptables -C "$chain" -j REJECT --reject-with icmp-host-prohibited 2>/dev/null; do
    iptables -D "$chain" -j REJECT --reject-with icmp-host-prohibited
  done
done
# GitHub Actions가 배포할 때 쓰는 쿠버네티스 API(6443). Oracle 콘솔 보안 목록에서도 열어야 한다(안내 문서 참고).
iptables -C INPUT -p tcp --dport 6443 -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport 6443 -j ACCEPT
if command -v netfilter-persistent >/dev/null; then netfilter-persistent save >/dev/null; fi

echo "== 2/4 k3s ${K3S_VERSION} 설치"
if [ -z "${PUBLIC_IP:-}" ]; then
  PUBLIC_IP="$(curl -fsS --max-time 5 https://ifconfig.me || true)"
fi
[ -n "$PUBLIC_IP" ] || { echo "공인 IP를 찾지 못했습니다. PUBLIC_IP=<서버 공인 IP> 로 다시 실행해 주세요" >&2; exit 1; }
if ! command -v k3s >/dev/null || ! k3s --version | grep -qF "$K3S_VERSION"; then
  curl -sfL https://get.k3s.io | INSTALL_K3S_VERSION="$K3S_VERSION" sh -s - server \
    --disable traefik --tls-san "$PUBLIC_IP" --write-kubeconfig-mode 600
fi
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
for _ in $(seq 60); do kubectl get nodes 2>/dev/null | grep -q ' Ready' && break; sleep 2; done
kubectl get nodes

echo "== 3/4 ingress-nginx ${INGRESS_NGINX_VERSION} 설치"
# baremetal 구성: 서비스 이름 ingress-nginx-controller. 바깥 요청은 Cloudflare Tunnel이 클러스터 안에서 넘겨 준다.
kubectl apply -f "https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v${INGRESS_NGINX_VERSION}/deploy/static/provider/baremetal/deploy.yaml"
kubectl -n ingress-nginx rollout status deploy/ingress-nginx-controller --timeout=300s

echo "== 4/4 GitHub Actions용 접속 파일"
out=/root/kubeconfig-github.yaml
umask 077
sed "s#https://127.0.0.1:6443#https://${PUBLIC_IP}:6443#" /etc/rancher/k3s/k3s.yaml > "$out"
echo
echo "완료. 다음 명령으로 내용을 복사해 GitHub Secret KUBECONFIG에 붙여 넣으세요(다른 곳에는 붙이지 마세요):"
echo "  sudo cat $out"
