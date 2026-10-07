package com.team.blog.telegram.application;

import java.util.Map;

import com.team.blog.notification.application.NotificationQuery;

/**
 * 텔레그램으로 보내는 문구 (023). 서식 없는 글자만 보내므로 이스케이프가 필요 없다.
 * 알림 문구는 화면 알림(015)과 같은 정보만 쓴다: 볼 수 없는 글이면 제목·링크가 없다(FR-005).
 */
final class TelegramMessages {
    private static final Map<String, String> REASONS = Map.of("SPAM", "스팸·광고", "ABUSE", "욕설·혐오", "SEXUAL", "음란·선정",
            "PRIVACY", "개인정보 노출", "COPYRIGHT", "저작권 침해", "OTHER", "기타");

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
        String who = n.actor() == null ? "누군가가" : n.actor().withdrawn() ? "탈퇴한 사용자가" : n.actor().nickname() + "님이";
        if (n.othersCount() > 0) who = who.substring(0, who.length() - 1) + " 외 " + n.othersCount() + "명이";
        String title = n.post() != null && n.post().readable() ? ": 「" + n.post().title() + "」" : "";
        String text = switch (n.type()) {
            case COMMENT -> "💬 " + who + " 내 글에 댓글을 남겼어요" + title + quote(n.commentPreview());
            case REPLY -> "↩️ " + who + " 내 댓글에 답글을 남겼어요" + title + quote(n.commentPreview());
            case LIKE -> "❤️ " + who + " 내 글을 좋아해요" + title;
            case FOLLOW -> "👤 " + who + " 나를 팔로우했어요";
            case NEW_POST -> title.isEmpty() ? null : "📝 " + who + " 새 글을 올렸어요" + title;
            case REPORT_RESOLVED -> "ACTION_TAKEN".equals(n.result())
                    ? "🛡️ 신고하신 내용을 검토해 조치했어요. 알려 주셔서 고마워요."
                    : "🛡️ 신고하신 내용을 검토했지만 운영 정책 위반은 아니었어요.";
            case CONTENT_HIDDEN -> hidden(n);
        };
        if (text == null) return null;
        return n.link() == null ? text : text + "\n" + baseUrl + n.link();
    }

    private static String hidden(NotificationQuery.Item n) {
        NotificationQuery.Hidden h = n.hidden();
        String what = h != null && "COMMENT".equals(h.targetType()) ? "내 댓글이" : "내 글이";
        if (h == null || !h.stillHidden()) return "⚠️ " + what + " 운영 정책에 따라 숨겨졌었어요 (지금은 다시 보여요).";
        return "⚠️ " + what + " 운영 정책에 따라 숨겨졌어요 (사유: " + REASONS.getOrDefault(h.reason(), "기타") + ").";
    }

    private static String quote(String preview) {
        return preview == null || preview.isBlank() ? "" : "\n“" + preview + "”";
    }

    static String drafted(String title, String editUrl, String note) {
        return "📝 임시글로 저장했어요: 「" + title + "」\n" + editUrl + (note == null ? "" : "\n" + note);
    }
}
