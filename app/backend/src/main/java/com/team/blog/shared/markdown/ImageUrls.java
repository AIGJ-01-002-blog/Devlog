package com.team.blog.shared.markdown;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 우리 저장소 사진 주소 판별과 저장 키 추출을 한곳에서 한다 (docs/12 §6, docs/23 §2-4).
 * 주소가 공개 주소(또는 옛 주소) + "/" 로 시작하고, 나머지가 저장 키 모양일 때만 우리 사진이다.
 */
@Component
public class ImageUrls {
    public static final Pattern KEY = Pattern.compile("^images/\\d{4}/\\d{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(_thumb)?\\.(webp|jpg|png|gif)$");
    private final String publicBaseUrl;
    private final List<String> bases;

    public ImageUrls(@Value("${blog.image.public-base-url:http://localhost:9000/blog-images}") String publicBaseUrl,
                     @Value("${blog.image.legacy-base-urls:}") List<String> legacy) {
        this.publicBaseUrl = strip(publicBaseUrl);
        List<String> all = new ArrayList<>();
        all.add(this.publicBaseUrl);
        for (String l : legacy) if (l != null && !l.isBlank()) all.add(strip(l));
        this.bases = List.copyOf(all);
    }

    /** @return 우리 사진이면 저장 키, 아니면 null */
    public String keyOf(String url) {
        if (url == null) return null;
        for (String base : bases) {
            String prefix = base + "/";
            if (url.startsWith(prefix)) {
                String key = url.substring(prefix.length());
                int q = key.indexOf('?');
                if (q >= 0) key = key.substring(0, q);
                return KEY.matcher(key).matches() ? key : null;
            }
        }
        return null;
    }

    public String urlOf(String key) {
        return key == null ? null : publicBaseUrl + "/" + key;
    }

    public String publicBaseUrl() {
        return publicBaseUrl;
    }

    private static String strip(String s) {
        String v = s.strip();
        while (v.endsWith("/")) v = v.substring(0, v.length() - 1);
        return v;
    }
}
