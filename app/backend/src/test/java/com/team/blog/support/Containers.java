package com.team.blog.support;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/** 테스트 전체가 함께 쓰는 실제 PostgreSQL·Redis (헌법 V: H2 대신 Testcontainers). */
public final class Containers {
    public static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(DockerImageName.parse("postgres:16-alpine"))
            .withDatabaseName("blog").withUsername("blog").withPassword("blog");
    @SuppressWarnings("resource")
    public static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

    static {
        POSTGRES.start();
        REDIS.start();
    }

    private Containers() {}
}
