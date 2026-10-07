package com.team.blog.shared.mail;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.util.StringUtils;

import com.team.blog.shared.config.BlogProperties;

/** spring.mail.host(SMTP_HOST)에 값이 있으면 SMTP, 비어 있으면 보관함(개발·테스트). */
@Configuration
class MailConfig {
    @Bean
    Mailer mailer(ObjectProvider<JavaMailSender> sender, Environment env, BlogProperties props) {
        JavaMailSender s = sender.getIfAvailable();
        boolean smtp = s != null && StringUtils.hasText(env.getProperty("spring.mail.host"));
        // 비밀 파일에 MAIL_FROM이 빈 값으로 있어도 보낼 수 있게 기본 보내는 사람을 쓴다
        String from = StringUtils.hasText(props.auth().mailFrom()) ? props.auth().mailFrom() : "devlog <no-reply@devlog.local>";
        return smtp ? new SmtpMailer(s, from) : new OutboxMailer();
    }
}
