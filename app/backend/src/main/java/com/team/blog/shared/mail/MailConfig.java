package com.team.blog.shared.mail;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.util.StringUtils;

import com.team.blog.shared.config.BlogProperties;

/**
 * spring.mail.host(SMTP_HOST)와 비밀번호(SMTP_PASSWORD)가 모두 있으면 SMTP, 아니면 보관함(개발·테스트).
 * 비밀번호가 아직 등록되지 않은 운영에서 인증 실패로 메일이 조용히 사라지지 않게 보관함으로 두고 경고를 남긴다.
 */
@Configuration
class MailConfig {
    private static final Logger log = LoggerFactory.getLogger(MailConfig.class);

    @Bean
    Mailer mailer(ObjectProvider<JavaMailSender> sender, Environment env, BlogProperties props) {
        JavaMailSender s = sender.getIfAvailable();
        boolean host = StringUtils.hasText(env.getProperty("spring.mail.host"));
        boolean password = StringUtils.hasText(env.getProperty("spring.mail.password"));
        if (host && !password) {
            log.warn("SMTP_HOST는 있지만 SMTP_PASSWORD가 비어 있어 메일을 보내지 않고 보관함에 둡니다");
        }
        boolean smtp = s != null && host && password;
        // 비밀 파일에 MAIL_FROM이 빈 값으로 있어도 보낼 수 있게 기본 보내는 사람을 쓴다
        String from = StringUtils.hasText(props.auth().mailFrom()) ? props.auth().mailFrom() : "devlog <no-reply@devlog.local>";
        return smtp ? new SmtpMailer(s, from) : new OutboxMailer();
    }
}
