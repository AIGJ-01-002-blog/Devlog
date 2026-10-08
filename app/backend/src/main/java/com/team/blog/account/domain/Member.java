package com.team.blog.account.domain;

import java.time.Duration;
import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import com.team.blog.shared.error.ApiException;

/** 회원 = 한 사람 = 한 블로그. 블로그 주소(handle)는 가입 후 바뀌지 않는다 (docs/08 §6). */
@Entity
@Table(name = "member")
public class Member {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, updatable = false, length = 23)
    private String handle;

    @Column(length = 10)
    private String nickname;

    private Instant nicknameChangedAt;

    @Column(length = 200)
    private String bio;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role = Role.USER;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MemberStatus status = MemberStatus.ACTIVE;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Visibility defaultVisibility = Visibility.PUBLIC;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    private Instant withdrawnAt;
    private Instant lastActiveAt;

    @Column(nullable = false)
    private boolean lastActiveVisible = true;

    private Instant deletedAt;

    protected Member() {}

    public static Member join(String handle, String nickname, Instant now) {
        Member m = new Member();
        m.handle = handle;
        m.nickname = nickname;
        m.createdAt = now;
        m.updatedAt = now;
        return m;
    }

    /**
     * 닉네임 변경 (docs/09 §8). 같은 값이면 아무것도 바꾸지 않고 30일 제한도 시작하지 않는다.
     * 가입 때 정한 닉네임은 변경으로 세지 않는다(nicknameChangedAt = null).
     * @return 실제로 바뀌었으면 true
     */
    public boolean changeNickname(String newNickname, Instant now, Duration cooldown) {
        if (newNickname.equals(nickname)) return false;
        if (nicknameChangedAt != null && nicknameChangedAt.plus(cooldown).isAfter(now)) {
            throw new ApiException(org.springframework.http.HttpStatus.CONFLICT, "NICKNAME_CHANGE_TOO_SOON",
                    "닉네임은 바꾼 뒤 30일 동안 다시 바꿀 수 없어요.", java.util.List.of(),
                    java.util.Map.of("nextChangeableAt", nicknameChangedAt.plus(cooldown).toString()));
        }
        this.nickname = newNickname;
        this.nicknameChangedAt = now;
        this.updatedAt = now;
        return true;
    }

    public void changeBio(String bio, Instant now) {
        this.bio = bio;
        this.updatedAt = now;
    }

    public void changeDefaultVisibility(Visibility visibility, Instant now) {
        this.defaultVisibility = visibility;
        this.updatedAt = now;
    }

    public void changeLastActiveVisible(boolean visible, Instant now) {
        this.lastActiveVisible = visible;
        this.updatedAt = now;
    }

    public void suspend(Instant now) {
        this.status = MemberStatus.SUSPENDED;
        this.updatedAt = now;
    }

    public void reactivate(Instant now) {
        this.status = MemberStatus.ACTIVE;
        this.updatedAt = now;
    }

    public void withdraw(Instant now) {
        this.status = MemberStatus.WITHDRAWN;
        this.withdrawnAt = now;
        this.updatedAt = now;
    }

    public void restore(Instant now) {
        this.status = MemberStatus.ACTIVE;
        this.withdrawnAt = null;
        this.updatedAt = now;
    }

    /** 탈퇴 30일 뒤 익명 처리 (docs/13 D-8~D-10): 닉네임 해제, 소개·활동 비움, handle은 보존. */
    public void anonymize(Instant now) {
        this.nickname = null;
        this.nicknameChangedAt = null;
        this.bio = null;
        this.lastActiveAt = null;
        this.deletedAt = now;
        this.updatedAt = now;
    }

    public void changeRole(Role role, Instant now) {
        this.role = role;
        this.updatedAt = now;
    }

    public Long getId() { return id; }
    public String getHandle() { return handle; }
    public String getNickname() { return nickname; }
    public Instant getNicknameChangedAt() { return nicknameChangedAt; }
    public String getBio() { return bio; }
    public Role getRole() { return role; }
    public MemberStatus getStatus() { return status; }
    public Visibility getDefaultVisibility() { return defaultVisibility; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public Instant getWithdrawnAt() { return withdrawnAt; }
    public Instant getLastActiveAt() { return lastActiveAt; }
    public boolean isLastActiveVisible() { return lastActiveVisible; }
    public Instant getDeletedAt() { return deletedAt; }
}
