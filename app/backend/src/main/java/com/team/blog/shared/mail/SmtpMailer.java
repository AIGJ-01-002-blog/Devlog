package com.team.blog.shared.mail;

import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

import jakarta.annotation.PreDestroy;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

/**
 * SMTP 발송. 별도 스레드에서 보내 요청 응답이 메일 서버를 기다리지 않는다.
 * JavaMail은 synchronized 안에서 소켓을 기다려 가상 스레드를 운반 스레드에 묶어 버리므로 작은 플랫폼 스레드 풀을 쓴다. 실패는 받는 사람을 가려 기록한다.
 * 예외 메시지는 기록하지 않는다: SMTP 거절 응답("550 <주소> User unknown")에 받는 사람 주소가 그대로 들어 있다 (spec 041).
 */
public class SmtpMailer implements Mailer {
    private static final Logger log = LoggerFactory.getLogger(SmtpMailer.class);
    private final JavaMailSender sender;
    private final String from;
    /** 메일 서버가 막혀도 기다리는 메일이 끝없이 쌓이지 않게 하는 상한. 넘치면 보내지 않고 기록만 한다 */
    static final int QUEUE_LIMIT = 1000;
    private final ThreadPoolExecutor executor = new ThreadPoolExecutor(2, 2, 0, TimeUnit.MILLISECONDS,
            new ArrayBlockingQueue<>(QUEUE_LIMIT), Thread.ofPlatform().name("smtp-", 0).daemon().factory(),
            new ThreadPoolExecutor.AbortPolicy());

    public SmtpMailer(JavaMailSender sender, String from) {
        this.sender = sender;
        this.from = from;
    }

    @Override
    public void send(Mail mail) {
        try {
            executor.execute(() -> deliver(mail));
        } catch (RejectedExecutionException e) {
            log.warn("메일 발송 대기열이 가득 차 보내지 못함: to={} subject={}", OutboxMailer.mask(mail.to()), mail.subject());
        }
    }

    private void deliver(Mail mail) {
        try {
            SimpleMailMessage m = new SimpleMailMessage();
            m.setFrom(from);
            m.setTo(mail.to());
            m.setSubject(mail.subject());
            m.setText(mail.body());
            sender.send(m);
        } catch (RuntimeException e) {
            log.warn("메일 발송 실패: to={} subject={} error={}", OutboxMailer.mask(mail.to()), mail.subject(), failure(e));
        }
    }

    /** 예외 종류와 맨 안쪽 원인 종류만. 메시지에는 주소가 들어 있을 수 있다. */
    static String failure(Throwable e) {
        Throwable root = e;
        while (root.getCause() != null && root.getCause() != root) root = root.getCause();
        String kind = e.getClass().getSimpleName();
        return root == e ? kind : kind + " (" + root.getClass().getSimpleName() + ")";
    }

    @PreDestroy
    void close() {
        executor.close();
    }
}
