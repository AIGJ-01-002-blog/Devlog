package com.team.blog.media;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

/**
 * 본문 사진 API (009).
 * <ul>
 *   <li>POST /api/images: 본문은 원본 다음에 썸네일을 이어 붙인 바이트, X-Thumbnail-Bytes가 썸네일 길이다.
 *       여러 부분(multipart) 파서를 켜지 않고 크기 상한을 먼저 확인한 뒤 정해진 만큼만 읽는다.</li>
 *   <li>GET /api/me/storage: 내 사진 저장 공간 사용량과 오늘 올린 장수 (FR-040)</li>
 * </ul>
 */
@RestController
public class ImageController {
    private final PostImages images;

    public ImageController(PostImages images) {
        this.images = images;
    }

    @PostMapping("/api/images")
    public ResponseEntity<PostImages.Uploaded> upload(@CurrentMember MemberPrincipal me,
                                                     @RequestHeader(name = "X-Thumbnail-Bytes", required = false) Integer thumbBytes,
                                                     HttpServletRequest request) throws IOException {
        if (thumbBytes == null || thumbBytes <= 0 || thumbBytes > PostImages.MAX_THUMB_BYTES) {
            throw ApiException.badRequest("THUMB_INVALID", "썸네일을 만들지 못했어요. 다른 사진으로 시도해 주세요.");
        }
        long declared = request.getContentLengthLong();
        long max = (long) PostImages.MAX_BYTES + thumbBytes;
        if (declared > max) throw tooLarge();
        byte[] body;
        try (InputStream in = request.getInputStream()) {
            body = in.readNBytes((int) max + 1);
        }
        if (body.length > max) throw tooLarge();
        if (body.length <= thumbBytes) throw ApiException.badRequest("IMAGE_TYPE", "jpg·png·gif·webp 사진만 올릴 수 있어요.");
        int split = body.length - thumbBytes;
        PostImages.Uploaded up = images.upload(me.id(), Arrays.copyOfRange(body, 0, split), Arrays.copyOfRange(body, split, body.length));
        return ResponseEntity.status(HttpStatus.CREATED).body(up);
    }

    @GetMapping("/api/me/storage")
    public ResponseEntity<PostImages.Usage> usage(@CurrentMember MemberPrincipal me) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(images.usage(me.id()));
    }

    private static ApiException tooLarge() {
        return new ApiException(HttpStatus.CONTENT_TOO_LARGE, "IMAGE_TOO_LARGE", "사진은 10MB까지 올릴 수 있어요.");
    }
}
