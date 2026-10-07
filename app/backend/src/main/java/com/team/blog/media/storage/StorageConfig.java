package com.team.blog.media.storage;

import java.net.URI;
import java.nio.file.Path;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.checksums.RequestChecksumCalculation;
import software.amazon.awssdk.core.checksums.ResponseChecksumValidation;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

/**
 * S3_ENDPOINT가 있으면 MinIO(S3 API), 없으면 로컬 폴더를 쓴다 (메일과 같은 방식: 설정이 없어도 앱은 뜬다).
 * 체크섬은 꼭 필요할 때만 보낸다: 학교 MinIO 버전이 새 SDK 기본값(CRC 트레일러)을 모를 수 있다.
 */
@Configuration
public class StorageConfig {
    private static final Logger log = LoggerFactory.getLogger(StorageConfig.class);

    @Bean
    ObjectStorage objectStorage(@Value("${blog.storage.s3.endpoint:}") String endpoint,
                                @Value("${blog.storage.s3.region:us-east-1}") String region,
                                @Value("${blog.storage.s3.bucket:blog-images}") String bucket,
                                @Value("${blog.storage.s3.access-key:}") String accessKey,
                                @Value("${blog.storage.s3.secret-key:}") String secretKey,
                                @Value("${blog.storage.local-dir:${java.io.tmpdir}/blog-media}") String localDir) {
        if (endpoint == null || endpoint.isBlank()) {
            log.info("S3_ENDPOINT가 없어 로컬 폴더에 사진을 저장합니다: {}", localDir);
            return new LocalObjectStorage(Path.of(localDir));
        }
        S3Client client = S3Client.builder()
                .endpointOverride(URI.create(endpoint.strip()))
                .region(Region.of(region))
                .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)))
                .forcePathStyle(true)
                .requestChecksumCalculation(RequestChecksumCalculation.WHEN_REQUIRED)
                .responseChecksumValidation(ResponseChecksumValidation.WHEN_REQUIRED)
                .httpClient(UrlConnectionHttpClient.builder()
                        .connectionTimeout(Duration.ofSeconds(3))
                        .socketTimeout(Duration.ofSeconds(15))
                        .build())
                .build();
        return new S3ObjectStorage(client, bucket);
    }
}
