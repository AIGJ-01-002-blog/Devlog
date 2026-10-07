package com.team.blog.account.application;

import java.time.Clock;
import java.time.Instant;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import com.team.blog.account.domain.Member;
import com.team.blog.account.infra.MemberRepository;
import com.team.blog.shared.config.BlogProperties;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.time.Times;

/** 닉네임 변경 (docs/09 §8). */
@Service
public class NicknameService {
    private final MemberRepository members;
    private final NicknamePolicy policy;
    private final TransactionTemplate tx;
    private final BlogProperties props;
    private final Clock clock;

    public NicknameService(MemberRepository members, NicknamePolicy policy, TransactionTemplate tx, BlogProperties props, Clock clock) {
        this.members = members;
        this.policy = policy;
        this.tx = tx;
        this.props = props;
        this.clock = clock;
    }

    public record Result(String nickname, Instant nextChangeableAt) {}

    public Result change(long memberId, String raw) {
        String nickname = NicknamePolicy.normalize(raw);
        NicknamePolicy.Code code = policy.check(nickname, memberId);
        if (code == NicknamePolicy.Code.NICKNAME_DUPLICATE) throw ApiException.conflict("NICKNAME_TAKEN", code.message());
        if (code != null) throw ApiException.badRequest(code.name(), code.message());
        try {
            return tx.execute(s -> {
                Member m = members.findById(memberId).orElseThrow();
                Instant now = Times.now(clock);
                m.changeNickname(nickname, now, props.nickname().changeCooldown());
                members.flush();
                Instant next = m.getNicknameChangedAt() == null ? null : m.getNicknameChangedAt().plus(props.nickname().changeCooldown());
                return new Result(m.getNickname(), next);
            });
        } catch (DataIntegrityViolationException e) {
            throw ApiException.conflict("NICKNAME_TAKEN", "방금 다른 분이 이 닉네임을 사용했어요.");
        }
    }
}
