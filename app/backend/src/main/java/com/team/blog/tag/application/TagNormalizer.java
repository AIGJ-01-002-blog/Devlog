package com.team.blog.tag.application;

import java.text.Normalizer;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.team.blog.account.application.WordFilter;
import com.team.blog.shared.text.TextCleaner;

/**
 * 태그 정규화와 검사 (docs/22 §2, spec 010 FR-001~FR-005). 발행·자동완성 검색어·태그 주소·블로그 필터가 모두 이 규칙 하나를 쓴다.
 * 순서: NFKC(전각 → 반각) → 보이지 않는 글자 제거·앞뒤 공백 → 맨 앞 # 제거 → 지역과 무관한 소문자 → 공백 묶음은 - 하나 →
 * 연달은 -는 하나, 양끝 - 제거 → 형식 검사 → 금칙어. 허용되지 않는 문자는 지우지 않고 거부한다(T-4).
 * DB의 ck_tag_name과 같은 규칙이다.
 */
@Component
public class TagNormalizer {
    public static final int MAX_LENGTH = 30;
    private static final Pattern LEADING_HASH = Pattern.compile("^#+");
    private static final Pattern SPACES = Pattern.compile("[\\s\\p{Z}]+");
    private static final Pattern DASHES = Pattern.compile("-{2,}");
    private static final Pattern EDGE_DASHES = Pattern.compile("^-+|-+$");
    private static final Pattern ALLOWED = Pattern.compile("^[가-힣a-z0-9._+#-]+$");
    private static final Pattern HAS_WORD = Pattern.compile("[가-힣a-z0-9]");

    private final WordFilter wordFilter;

    public TagNormalizer(WordFilter wordFilter) {
        this.wordFilter = wordFilter;
    }

    public enum Code {
        INVALID_TAG("한글·영문·숫자와 - _ . + #만 쓸 수 있고, 한글·영문·숫자가 1자 이상 있어야 해요."),
        TAG_TOO_LONG("태그는 " + MAX_LENGTH + "자까지 쓸 수 있어요."),
        TAG_BANNED_WORD("쓸 수 없는 단어가 들어 있어요.");

        private final String message;

        Code(String message) {
            this.message = message;
        }

        public String message() {
            return message;
        }
    }

    /** 검사 결과. name은 정규화한 모양(거부돼도 화면 안내용으로 채운다), code는 통과면 null. */
    public record Verdict(String name, Code code) {
        public boolean ok() {
            return code == null;
        }
    }

    /** ①~⑦ 정리만 한다. 검사하지 않는다. */
    public static String clean(String raw) {
        if (raw == null) return "";
        String s = TextCleaner.cleanLine(Normalizer.normalize(raw, Normalizer.Form.NFKC));
        s = LEADING_HASH.matcher(s).replaceFirst("").strip();
        s = s.toLowerCase(Locale.ROOT);
        s = SPACES.matcher(s).replaceAll("-");
        s = DASHES.matcher(s).replaceAll("-");
        return EDGE_DASHES.matcher(s).replaceAll("");
    }

    /** ⑧ 형식 검사 (금칙어 제외). 자동완성 검색어와 주소에도 쓴다. */
    public static Code formatError(String cleaned) {
        if (cleaned.isEmpty() || !ALLOWED.matcher(cleaned).matches() || !HAS_WORD.matcher(cleaned).find()) return Code.INVALID_TAG;
        if (cleaned.codePointCount(0, cleaned.length()) > MAX_LENGTH) return Code.TAG_TOO_LONG;
        return null;
    }

    /** 발행할 태그 하나를 검사한다 (①~⑨). */
    public Verdict check(String raw) {
        String name = clean(raw);
        Code format = formatError(name);
        if (format != null) return new Verdict(name, format);
        if (wordFilter.containsBanned(name)) return new Verdict(name, Code.TAG_BANNED_WORD);
        return new Verdict(name, null);
    }

    /** 주소·필터용: 형식에 맞으면 정규화한 이름. 금칙어 태그는 만들어질 수 없으므로 따로 거르지 않는다. */
    public static Optional<String> canonical(String raw) {
        String name = clean(raw);
        return formatError(name) == null ? Optional.of(name) : Optional.empty();
    }
}
