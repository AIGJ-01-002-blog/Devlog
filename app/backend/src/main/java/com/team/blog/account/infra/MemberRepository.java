package com.team.blog.account.infra;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.team.blog.account.domain.Member;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByHandle(String handle);

    boolean existsByHandle(String handle);

    @Query("select count(m) > 0 from Member m where lower(m.nickname) = lower(:nickname) and m.id <> :exceptId")
    boolean existsNicknameIgnoreCase(@Param("nickname") String nickname, @Param("exceptId") long exceptId);

    /** base, base_2, base_3 … 중 이미 쓰인 값 (주소 제안용, 한 번의 조회). */
    @Query(value = "SELECT handle FROM member WHERE handle = :base OR handle LIKE :likePattern ESCAPE '!'", nativeQuery = true)
    List<String> findHandlesLike(@Param("base") String base, @Param("likePattern") String likePattern);
}
