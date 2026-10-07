package com.team.blog.post.infra;

import java.util.Optional;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import com.team.blog.post.domain.Post;

public interface PostRepository extends JpaRepository<Post, Long> {

    /** 작성자 본인의 삭제되지 않은 글을 행 잠금으로 읽는다 (docs/05 §7 ③, J-4). 남의 글이면 비어 있다 → 404. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Post p where p.id = :id and p.authorId = :authorId and p.deletedAt is null")
    Optional<Post> findOwnForUpdate(long id, long authorId);

    @Query("select p from Post p where p.id = :id and p.authorId = :authorId and p.deletedAt is null")
    Optional<Post> findOwn(long id, long authorId);
}
