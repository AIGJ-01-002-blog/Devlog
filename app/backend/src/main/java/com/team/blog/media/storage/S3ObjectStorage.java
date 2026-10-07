package com.team.blog.media.storage;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/** MinIO·S3 저장소. 키마다 내용이 바뀌지 않으므로 오래 캐시해도 된다. */
class S3ObjectStorage implements ObjectStorage {
    private static final String CACHE_CONTROL = "public, max-age=31536000, immutable";
    private final S3Client s3;
    private final String bucket;

    S3ObjectStorage(S3Client s3, String bucket) {
        this.s3 = s3;
        this.bucket = bucket;
    }

    @Override
    public void put(String key, byte[] data, String contentType) {
        s3.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType)
                .cacheControl(CACHE_CONTROL).contentLength((long) data.length).build(), RequestBody.fromBytes(data));
    }

    @Override
    public void delete(String key) {
        s3.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }
}
