package com.team.blog.portfolio.application;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.team.blog.account.application.MemberProfileQuery;
import com.team.blog.account.application.SocialLinks;
import com.team.blog.post.access.PostAccessPolicy;
import com.team.blog.post.infra.PostSql;
import com.team.blog.series.application.SeriesProjects;

/**
 * 포트폴리오 화면 /@handle/portfolio (072 3단계). 공개 글만 세고 보여 주므로 누구에게나 같은 화면이다.
 * 머리(이름·한 줄 소개·소셜 정보·쓴 글·프로젝트·받은 좋아요 수)와 프로젝트(포트폴리오에 보이기로 한 시리즈) 목록.
 */
@Service
public class PortfolioQuery {
    private final MemberProfileQuery members;
    private final SocialLinks socialLinks;
    private final SeriesProjects projects;
    private final JdbcTemplate jdbc;

    public PortfolioQuery(MemberProfileQuery members, SocialLinks socialLinks, SeriesProjects projects, JdbcTemplate jdbc) {
        this.members = members;
        this.socialLinks = socialLinks;
        this.projects = projects;
        this.jdbc = jdbc;
    }

    public record Portfolio(String handle, String nickname, String bio, String profileImageUrl, SocialLinks.Links socialLinks,
                            long postCount, long likeCount, List<SeriesProjects.Project> projects) {}

    public Optional<Portfolio> of(String handle) {
        return members.findActive(handle).map(m -> {
            long[] counts = jdbc.query("SELECT count(*), COALESCE(sum(s.like_count), 0) FROM post p JOIN member m ON m.id = p.author_id "
                    + PostSql.STAT_JOIN + " WHERE p.author_id = ? AND " + PostAccessPolicy.PUBLIC_LIST_CONDITION,
                    rs -> { rs.next(); return new long[] {rs.getLong(1), rs.getLong(2)}; }, m.id());
            return new Portfolio(m.handle(), m.nickname(), m.bio(), m.profileImageUrl(), socialLinks.of(m.id()), counts[0], counts[1],
                    projects.projects(m.id(), m.handle()));
        });
    }
}
