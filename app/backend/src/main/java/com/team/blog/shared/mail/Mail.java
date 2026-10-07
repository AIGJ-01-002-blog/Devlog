package com.team.blog.shared.mail;

/** 보낼 메일 한 통. 본문은 일반 텍스트다(링크 포함). */
public record Mail(String to, String subject, String body) {}
