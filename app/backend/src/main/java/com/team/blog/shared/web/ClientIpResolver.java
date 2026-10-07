package com.team.blog.shared.web;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.ArrayList;
import java.util.List;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.stereotype.Component;

import com.team.blog.shared.config.BlogProperties;

/**
 * 사용자 IP 판정 (docs/02 §5, 2026-10-07 회의 H4).
 * 로드 밸런서 내부 대역에서 온 요청만 X-Forwarded-For를 믿고, 그중 가장 오른쪽의 "신뢰 밖" 주소를 쓴다.
 * 그 밖의 출처가 보낸 X-Forwarded-*는 무시하므로 헤더를 위조해도 요청 제한을 우회할 수 없다.
 */
@Component
public class ClientIpResolver {
    private final List<Cidr> trusted;

    public ClientIpResolver(BlogProperties props) {
        List<Cidr> list = new ArrayList<>();
        for (String s : props.web().trustedProxies()) {
            if (s != null && !s.isBlank()) list.add(Cidr.parse(s.trim()));
        }
        this.trusted = List.copyOf(list);
    }

    public String resolve(HttpServletRequest request) {
        String remote = request.getRemoteAddr();
        if (!isTrusted(remote)) return remote;
        String xff = request.getHeader("X-Forwarded-For");
        if (xff == null || xff.isBlank()) return remote;
        String[] hops = xff.split(",");
        for (int i = hops.length - 1; i >= 0; i--) {
            String hop = hops[i].trim();
            if (hop.isEmpty()) continue;
            if (!isTrusted(hop)) return hop;
        }
        return remote;
    }

    private boolean isTrusted(String ip) {
        for (Cidr c : trusted) {
            if (c.contains(ip)) return true;
        }
        return false;
    }

    record Cidr(byte[] network, int prefix) {
        static Cidr parse(String s) {
            String[] parts = s.split("/");
            byte[] addr = toBytes(parts[0]);
            if (addr == null) throw new IllegalArgumentException("잘못된 신뢰 프록시 대역: " + s);
            int prefix = parts.length > 1 ? Integer.parseInt(parts[1]) : addr.length * 8;
            return new Cidr(addr, prefix);
        }

        boolean contains(String ip) {
            byte[] target = toBytes(ip);
            if (target == null || target.length != network.length) return false;
            int full = prefix / 8, rest = prefix % 8;
            for (int i = 0; i < full; i++) if (target[i] != network[i]) return false;
            if (rest == 0) return true;
            int mask = (0xFF << (8 - rest)) & 0xFF;
            return (target[full] & mask) == (network[full] & mask);
        }

        /** DNS 조회 없이 숫자 주소만 해석한다 (헤더 값으로 DNS 질의를 일으키지 않게). */
        static byte[] toBytes(String ip) {
            if (ip == null || ip.isBlank()) return null;
            String v = ip.trim();
            boolean v4 = v.matches("\\d{1,3}(\\.\\d{1,3}){3}");
            boolean v6 = v.contains(":") && v.matches("[0-9a-fA-F:.%]+");
            if (!v4 && !v6) return null;
            try {
                return InetAddress.getByName(v).getAddress();
            } catch (UnknownHostException e) {
                return null;
            }
        }
    }
}
