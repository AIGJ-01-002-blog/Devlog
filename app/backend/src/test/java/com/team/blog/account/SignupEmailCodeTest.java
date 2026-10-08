package com.team.blog.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.TestPropertySource;

import com.team.blog.shared.mail.Mail;
import com.team.blog.shared.mail.Mailer;
import com.team.blog.shared.mail.OutboxMailer;
import com.team.blog.support.Browser;
import com.team.blog.support.IntegrationTest;

/** spec 065 가입 화면 아이디(이메일) 확인과 인증번호 인증. */
@TestPropertySource(properties = "blog.auth.signup-email-code=on")
class SignupEmailCodeTest extends IntegrationTest {
    private static final String PASSWORD = "Blog!pass77";
    private static final Pattern CODE = Pattern.compile("인증번호: (\\d{6})");

    @Autowired Mailer mailer;

    private String lastCode(String email) {
        for (Mail m : ((OutboxMailer) mailer).recent()) {
            if (!m.to().equals(email)) continue;
            Matcher matcher = CODE.matcher(m.body());
            if (matcher.find()) return matcher.group(1);
        }
        throw new AssertionError("인증번호 메일이 없다: " + email);
    }

    private Map<String, Object> form(String email, String body) {
        Map<String, Object> m = new HashMap<>();
        m.put("email", email);
        m.put("handleBody", body);
        m.put("password", PASSWORD);
        m.put("passwordConfirm", PASSWORD);
        m.put("nickname", "코드" + body.substring(body.length() - 6));
        m.put("agreeTerms", true);
        m.put("agreePrivacy", true);
        return m;
    }

    @Test
    void 인증번호를_맞혀야_가입되고_가입하면_바로_인증된_상태다() throws Exception {
        String email = uniqueLogin("code") + "@example.com";
        String body = email.substring(0, email.indexOf('@')).replaceAll("[^a-z0-9]", "");
        mvc.perform(get("/api/auth/providers")).andExpect(jsonPath("$.emailCode").value(true));
        mvc.perform(get("/api/emails/availability").param("email", email)).andExpect(jsonPath("$.available").value(true));

        Browser b = browser();
        // 인증 전에는 가입할 수 없다
        var r = b.perform(asJson(post("/api/auth/signup/email"), form(email, body))).andExpect(status().isBadRequest()).andReturn();
        assertThat(read(r).path("errors").findValuesAsString("code")).contains("EMAIL_NOT_VERIFIED");

        b.perform(asJson(post("/api/auth/signup/email-code"), Map.of("email", " " + email.toUpperCase())))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.expiresInSeconds").value(600));
        String code = lastCode(email);
        String wrong = code.equals("000000") ? "111111" : "000000";
        b.perform(asJson(post("/api/auth/signup/email-code/verify"), Map.of("email", email, "code", wrong)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("CODE_MISMATCH"));
        b.perform(asJson(post("/api/auth/signup/email-code/verify"), Map.of("email", email, "code", code)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.verified").value(true));

        // 다른 브라우저(세션)는 이 인증을 쓸 수 없다
        r = browser().perform(asJson(post("/api/auth/signup/email"), form(email, body + "x"))).andExpect(status().isBadRequest()).andReturn();
        assertThat(read(r).path("errors").findValuesAsString("code")).contains("EMAIL_NOT_VERIFIED");

        int before = (int) ((OutboxMailer) mailer).recent().stream().filter(m -> m.to().equals(email)).count();
        b.perform(asJson(post("/api/auth/signup/email"), form(email, body))).andExpect(status().isCreated());
        b.perform(get("/api/auth/me")).andExpect(jsonPath("$.emailVerified").value(true));
        // 이미 인증했으니 링크 메일은 보내지 않는다
        assertThat(((OutboxMailer) mailer).recent().stream().filter(m -> m.to().equals(email)).count()).isEqualTo(before);

        // 이제 가입된 이메일: 확인과 보내기 모두 알려 준다
        mvc.perform(get("/api/emails/availability").param("email", email))
                .andExpect(jsonPath("$.available").value(false)).andExpect(jsonPath("$.code").value("TAKEN"));
        browser().perform(asJson(post("/api/auth/signup/email-code"), Map.of("email", email)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
    }

    @Test
    void 형식이_틀린_이메일은_보내지_않고_1분에_한_번만_보내며_5번_틀리면_번호를_버린다() throws Exception {
        mvc.perform(get("/api/emails/availability").param("email", "not-mail")).andExpect(jsonPath("$.code").value("INVALID"));
        browser().perform(asJson(post("/api/auth/signup/email-code"), Map.of("email", "not-mail")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("EMAIL_INVALID"));

        String email = uniqueLogin("codetry") + "@example.com";
        Browser b = browser();
        b.perform(asJson(post("/api/auth/signup/email-code"), Map.of("email", email))).andExpect(status().isAccepted());
        b.perform(asJson(post("/api/auth/signup/email-code"), Map.of("email", email))).andExpect(status().isTooManyRequests());
        String code = lastCode(email);
        String wrong = code.equals("000000") ? "111111" : "000000";
        for (String expected : List.of("CODE_MISMATCH", "CODE_MISMATCH", "CODE_MISMATCH", "CODE_MISMATCH", "CODE_TOO_MANY_TRIES")) {
            b.perform(asJson(post("/api/auth/signup/email-code/verify"), Map.of("email", email, "code", wrong)))
                    .andExpect(jsonPath("$.code").value(expected));
        }
        b.perform(asJson(post("/api/auth/signup/email-code/verify"), Map.of("email", email, "code", code)))
                .andExpect(status().isGone()).andExpect(jsonPath("$.code").value("CODE_EXPIRED"));
    }
}
