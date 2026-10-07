package com.team.blog.notification.application;

/** 알림 하나가 새로 만들어졌다 (023). 같은 트랜잭션이 커밋된 뒤에 받아야 한다. */
public record NotificationCreated(long notificationId, long receiverId, NotificationType type) {}
