package com.team.blog.shared.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.LinkedHashMap;
import java.util.Map;

import jakarta.mail.MessagingException;
import jakarta.mail.SendFailedException;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

/** spec 041: SMTP 발송과 실패 기록. 실패 기록에 받는 사람 주소·메일 본문(링크 토큰)이 남지 않는다. */
@ExtendWith(OutputCaptureExtension.class)
class SmtpMailerTest {
    static final String TO = "minseo.reader@example.com";
    static final Mail MAIL = new Mail(TO, "이메일 인증", "https://devlog.local/verify?token=SECRET-TOKEN");

    @Test
    void 보내는_사람_받는_사람_제목_본문을_채워_보낸다() {
        JavaMailSender sender = mock(JavaMailSender.class);
        SmtpMailer mailer = new SmtpMailer(sender, "devlog <no-reply@devlog.local>");
        mailer.send(MAIL);
        mailer.close(); // 보내던 메일을 끝까지 기다린다

        ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(sent.capture());
        assertThat(sent.getValue().getFrom()).isEqualTo("devlog <no-reply@devlog.local>");
        assertThat(sent.getValue().getTo()).containsExactly(TO);
        assertThat(sent.getValue().getSubject()).isEqualTo("이메일 인증");
        assertThat(sent.getValue().getText()).isEqualTo(MAIL.body());
    }

    @Test
    void 메일_서버가_주소를_거절해도_기록에_주소가_남지_않는다(CapturedOutput out) {
        // SMTP 서버의 거절 응답에는 받는 사람 주소가 그대로 들어 있다 (예: 550 5.1.1 <주소> User unknown)
        SendFailedException rejected = new SendFailedException("Invalid Addresses",
                new MessagingException("550 5.1.1 <" + TO + ">: Recipient address rejected: User unknown"));
        Map<Object, Exception> failed = new LinkedHashMap<>();
        failed.put(new Object(), rejected);
        JavaMailSender sender = mock(JavaMailSender.class);
        doThrow(new MailSendException(failed)).when(sender).send(any(SimpleMailMessage.class));

        SmtpMailer mailer = new SmtpMailer(sender, "no-reply@devlog.local");
        mailer.send(MAIL);
        mailer.close();

        assertThat(out.getAll()).contains("메일 발송 실패", "m***@example.com", "이메일 인증", "MailSendException")
                .doesNotContain(TO).doesNotContain("SECRET-TOKEN");
    }

    @Test
    void 인증_실패도_요청을_막지_않고_종류만_기록한다(CapturedOutput out) {
        JavaMailSender sender = mock(JavaMailSender.class);
        doThrow(new MailAuthenticationException("535 5.7.8 Username and Password not accepted for " + TO))
                .when(sender).send(any(SimpleMailMessage.class));

        SmtpMailer mailer = new SmtpMailer(sender, "no-reply@devlog.local");
        mailer.send(MAIL); // 호출한 쪽으로 예외가 오지 않는다
        mailer.close();

        assertThat(out.getAll()).contains("MailAuthenticationException").doesNotContain(TO);
    }
}
