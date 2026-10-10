package com.team.blog.telegram.application;

import com.team.blog.notification.application.NotificationQuery;
import com.team.blog.notification.application.NotificationText;

/**
 * 텔레그램으로 보내는 문구 (023). 서식 없는 글자만 보내므로 이스케이프가 필요 없다.
 * 알림 문구는 디스코드(078)와 같이 NotificationText가 만든다(FR-005).
 */
final class TelegramMessages {
    static final String HELP = """
            블로그 메모 봇이에요.
            • 글자를 보내면 내 블로그 임시글로 저장해요. AI 기능에 동의했다면 AI가 제목을 붙이고 다듬어요.
            • 블로그 알림도 여기로 보내 드려요(설정에서 끌 수 있어요).
            • /stop 연결 끊기 · /help 도움말""";

    static final String NOT_LINKED = "아직 블로그 계정과 연결되지 않았어요. 블로그 설정 > 텔레그램에서 [연결하기]를 눌러 주세요.";
    static final String CODE_EXPIRED = "연결 코드가 만료됐거나 이미 쓰였어요. 블로그 설정에서 다시 연결해 주세요.";
    static final String UNLINKED = "연결을 끊었어요. 더는 알림을 보내지 않고 메모도 저장하지 않아요.";
    static final String TEXT_ONLY = "지금은 글자 메시지만 메모로 저장할 수 있어요.";
    static final String GROUP_CHAT = "개인 대화에서만 쓸 수 있어요.";

    private TelegramMessages() {}

    static String linked(String nickname) {
        return nickname + "님 블로그와 연결했어요.\n\n" + HELP;
    }

    /** @return 보낼 문구. 받는 사람에게 보여 줄 것이 없으면 null */
    static String notification(NotificationQuery.Item n, String baseUrl) {
        return NotificationText.of(n, baseUrl);
    }

    static String drafted(String title, String editUrl, String note) {
        return "📝 임시글로 저장했어요: 「" + title + "」\n" + editUrl + (note == null ? "" : "\n" + note);
    }
}
