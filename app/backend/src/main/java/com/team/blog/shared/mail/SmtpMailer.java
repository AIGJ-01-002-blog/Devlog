package com.team.blog.shared.mail;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import jakarta.annotation.PreDestroy;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

/** SMTP 발송. 가상 스레드에서 보내 요청 응답이 메일 서버를 기다리지 않는다. 실패는 받는 사람을 가려 기록한다. */
public class SmtpMailer implements Mailer {
    private static final Logger log = LoggerFactory.getLogger(SmtpMailer.class);
    private final JavaMailSender sender;
    private final String from;
    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();

    public SmtpMailer(JavaMailSender sender, String from) {
        this.sender = sender;
        this.from = from;
    }

    @Override
    public void send(Mail mail) {
        executor.submit(() -> {
            try {
                SimpleMailMessage m = new SimpleMailMessage();
                m.setFrom(from);
                m.setTo(mail.to());
                m.setSubject(mail.subject());
                m.setText(mail.body());
                sender.send(m);
            } catch (RuntimeException e) {
                log.warn("메일 발송 실패: to={} subject={} error={}", OutboxMailer.mask(mail.to()), mail.subject(), e.toString());
            }
        });
    }

    @PreDestroy
    void close() {
        executor.close();
    }
}
