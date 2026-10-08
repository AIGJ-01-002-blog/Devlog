package com.team.blog.shared.jdbc;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcOperations;
import org.springframework.jdbc.core.RowMapper;

/**
 * 첫 열 하나만 읽는 조회. {@code queryForList(sql, Long.class, ...)}와 같지만,
 * Spring 7이 그 반환 원소에 붙인 @Nullable을 정적 분석(SonarQube)이 "목록이 null일 수 있다"로 읽어 행 매퍼로 대신한다.
 * 값이 SQL NULL이면 원소도 null이다.
 */
public final class Columns {
    private static final RowMapper<Long> LONG = (rs, i) -> rs.getObject(1, Long.class);
    private static final RowMapper<String> STRING = (rs, i) -> rs.getString(1);

    private Columns() {}

    public static List<Long> longs(JdbcOperations jdbc, String sql, Object... args) {
        return jdbc.query(sql, LONG, args);
    }

    public static List<String> strings(JdbcOperations jdbc, String sql, Object... args) {
        return jdbc.query(sql, STRING, args);
    }

    /** 첫 행의 값. 행이 없거나 값이 NULL이면 비어 있다 */
    public static Optional<Long> firstLong(JdbcOperations jdbc, String sql, Object... args) {
        List<Long> rows = longs(jdbc, sql, args);
        return rows.isEmpty() ? Optional.empty() : Optional.ofNullable(rows.getFirst());
    }

    /** 첫 행의 값. 행이 없거나 값이 NULL이면 비어 있다 */
    public static Optional<String> firstString(JdbcOperations jdbc, String sql, Object... args) {
        List<String> rows = strings(jdbc, sql, args);
        return rows.isEmpty() ? Optional.empty() : Optional.ofNullable(rows.getFirst());
    }
}
