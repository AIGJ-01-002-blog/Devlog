package com.team.blog.account.domain;

/** 회원의 기본 공개 범위 (docs/06 §5). 글의 공개 범위와 값이 같다. FRIENDS는 수락된 친구에게만 (V4). */
public enum Visibility { PUBLIC, FRIENDS, PRIVATE }
