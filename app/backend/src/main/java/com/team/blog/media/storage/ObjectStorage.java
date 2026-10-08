package com.team.blog.media.storage;

import java.util.Arrays;
import java.util.Objects;
import java.util.Optional;

/**
 * 사진·첨부파일 원본 저장소. 운영은 MinIO(S3 API), 개발·테스트는 로컬 폴더다 (docs/23 §2).
 * 키는 한 번 쓰면 바꾸지 않는다(같은 키에 다른 내용을 덮어쓰지 않는다). 공개 주소는 ImageUrls가 만든다.
 */
public interface ObjectStorage {
    void put(String key, byte[] data, String contentType);

    /** 없는 키를 지워도 오류가 아니다 (정리 작업이 다시 돌아도 안전하게). */
    void delete(String key);

    /** 앱이 직접 내려줄 때만 쓴다(로컬 저장소). S3는 공개 주소로 바로 받으므로 비어 있다. */
    default Optional<StoredObject> get(String key) {
        return Optional.empty();
    }

    /** 배열 필드라 내용으로 비교하고, 문자열에는 크기만 남긴다 */
    record StoredObject(byte[] data, String contentType) {
        @Override public boolean equals(Object o) {
            return o instanceof StoredObject(byte[] bytes, String type) && Arrays.equals(data, bytes) && Objects.equals(contentType, type);
        }
        @Override public int hashCode() { return 31 * Arrays.hashCode(data) + Objects.hashCode(contentType); }
        @Override public String toString() { return "StoredObject[" + contentType + ", " + data.length + " bytes]"; }
    }
}
