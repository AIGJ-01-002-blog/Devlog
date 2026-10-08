package com.team.blog.support;

import org.testcontainers.containers.GenericContainer;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

/** 테스트 전체가 함께 쓰는 실제 PostgreSQL·Redis (헌법 V: H2 대신 Testcontainers). DB는 운영과 같은 pgvector 이미지다(054). */
public final class Containers {
    public static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(DockerImageName.parse("pgvector/pgvector:0.8.7-pg17-bookworm").asCompatibleSubstituteFor("postgres"))
            .withDatabaseName("blog").withUsername("blog").withPassword("blog");
    @SuppressWarnings("resource")
    public static final GenericContainer<?> REDIS = new GenericContainer<>(DockerImageName.parse("redis:7-alpine")).withExposedPorts(6379);

    static {
        POSTGRES.start();
        REDIS.start();
    }

    private Containers() {}
}
