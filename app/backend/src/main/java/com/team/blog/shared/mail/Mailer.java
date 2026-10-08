package com.team.blog.shared.mail;

/**
 * 메일 발송 (docs/07 L-9, 004 FR-033). 요청을 붙잡지 않도록 구현은 비동기로 보내고, 실패는 기록만 한다.
 * 운영은 SMTP(spring.mail.host), 개발·테스트는 보내지 않고 메모리에 보관한다.
 */
public interface Mailer {
    void send(Mail mail);

    /** 실제로 받는 사람에게 보내는지 (보관함이면 false). 가입 인증번호를 요구할지 정할 때 쓴다 (spec 065). */
    default boolean delivers() {
        return false;
    }
}
