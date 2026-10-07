package com.team.blog.account.infra;

import java.util.List;
import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.team.blog.account.domain.Member;

public interface MemberRepository extends JpaRepository<Member, Long> {
    Optional<Member> findByHandle(String handle);

    /** 프로필 저장처럼 한 회원의 여러 칸을 함께 바꿀 때 회원 행을 잠근다 (005 FR-005·FR-015). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Member> findWithLockById(Long id);

    boolean existsByHandle(String handle);

    @Query("select count(m) > 0 from Member m where lower(m.nickname) = lower(:nickname) and m.id <> :exceptId")
    boolean existsNicknameIgnoreCase(@Param("nickname") String nickname, @Param("exceptId") long exceptId);

    /** base, base_2, base_3 … 중 이미 쓰인 값 (주소 제안용, 한 번의 조회). */
    @Query(value = "SELECT handle FROM member WHERE handle = :base OR handle LIKE :likePattern ESCAPE '!'", nativeQuery = true)
    List<String> findHandlesLike(@Param("base") String base, @Param("likePattern") String likePattern);
}
