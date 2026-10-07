package com.team.blog.media;

import java.io.IOException;
import java.io.InputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.post.access.Viewer;
import com.team.blog.shared.error.ApiException;
import com.team.blog.shared.security.CurrentMember;
import com.team.blog.shared.security.MemberPrincipal;

/**
 * 글 첨부파일 API (022).
 * <ul>
 *   <li>POST /api/files: 본문은 파일 바이트 그대로, X-File-Name은 원래 이름(URL 인코딩). 사진처럼 크기 상한을 먼저 확인하고 그만큼만 읽는다.</li>
 *   <li>GET /api/posts/{id}/files: 첨부 목록 (글 상세와 같은 읽기 판정)</li>
 *   <li>PUT /api/posts/{id}/files: 첨부 목록과 순서 저장 (작성자)</li>
 *   <li>GET /api/posts/{id}/files/{fileId}: 내려받기. 항상 attachment, 내용 추측 금지, 캐시하지 않는다 (FR-012)</li>
 * </ul>
 */
@RestController
public class FileController {
    private final PostFiles files;

    public FileController(PostFiles files) {
        this.files = files;
    }

    public record FileIds(List<Long> fileIds) {}

    @PostMapping("/api/files")
    public ResponseEntity<PostFiles.Attachment> upload(@CurrentMember MemberPrincipal me,
                                                      @RequestHeader(name = "X-File-Name", required = false) String encodedName,
                                                      HttpServletRequest request) throws IOException {
        if (encodedName == null || encodedName.isBlank()) throw ApiException.badRequest("FILE_NAME", "파일 이름을 확인해 주세요.");
        String name;
        try {
            name = URLDecoder.decode(encodedName, StandardCharsets.UTF_8);
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("FILE_NAME", "파일 이름을 확인해 주세요.");
        }
        if (request.getContentLengthLong() > PostFiles.MAX_BYTES) throw tooLarge();
        byte[] body;
        try (InputStream in = request.getInputStream()) {
            body = in.readNBytes(PostFiles.MAX_BYTES + 1);
        }
        if (body.length > PostFiles.MAX_BYTES) throw tooLarge();
        return ResponseEntity.status(HttpStatus.CREATED).body(files.upload(me.id(), name, body));
    }

    @GetMapping("/api/posts/{postId}/files")
    public ResponseEntity<List<PostFiles.Attachment>> list(@CurrentMember(required = false) MemberPrincipal me, @PathVariable long postId) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore().cachePrivate()).body(files.list(postId, Viewer.of(me)));
    }

    @PutMapping("/api/posts/{postId}/files")
    public List<PostFiles.Attachment> set(@CurrentMember MemberPrincipal me, @PathVariable long postId, @RequestBody FileIds body) {
        return files.set(me.id(), postId, body == null ? null : body.fileIds());
    }

    @GetMapping("/api/posts/{postId}/files/{fileId}")
    public ResponseEntity<byte[]> download(@CurrentMember(required = false) MemberPrincipal me, @PathVariable long postId,
                                           @PathVariable long fileId) {
        PostFiles.Download d = files.download(postId, fileId, Viewer.of(me));
        HttpHeaders h = new HttpHeaders();
        // 형식과 관계없이 내려받기만 한다: 브라우저가 열거나 내용을 추측하지 않게 (FR-012)
        h.setContentType(MediaType.APPLICATION_OCTET_STREAM);
        h.setContentDisposition(ContentDisposition.attachment().filename(d.name(), StandardCharsets.UTF_8).build());
        h.set("X-Content-Type-Options", "nosniff");
        h.setCacheControl(CacheControl.noStore().cachePrivate());
        h.setContentLength(d.data().length);
        return new ResponseEntity<>(d.data(), h, HttpStatus.OK);
    }

    private static ApiException tooLarge() {
        return new ApiException(HttpStatus.CONTENT_TOO_LARGE, "FILE_TOO_LARGE", PostFiles.TYPE_MESSAGE);
    }
}
