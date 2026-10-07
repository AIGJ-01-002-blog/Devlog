package com.team.blog.shared.error;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpMediaTypeNotAcceptableException;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.server.ResponseStatusException;

/** spec 034: 스프링이 정한 요청 쪽 오류는 500이 아니라 그 상태로, 끊긴 연결은 조용히 넘긴다. */
@ExtendWith(OutputCaptureExtension.class)
class GlobalExceptionHandlerTest {
    final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void notAcceptableKeepsItsStatusAndAcceptHeaderWithoutBody() {
        ResponseEntity<ErrorResponse> r = handler.handleUnknown(new HttpMediaTypeNotAcceptableException(List.of(MediaType.APPLICATION_JSON)));
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.NOT_ACCEPTABLE);
        assertThat(r.getHeaders().getAccept()).containsExactly(MediaType.APPLICATION_JSON);
        assertThat(r.getBody()).isNull();
    }

    @Test
    void frameworkClientErrorKeepsItsStatusAndNamesIt() {
        ResponseEntity<ErrorResponse> r = handler.handleUnknown(new ResponseStatusException(HttpStatus.CONTENT_TOO_LARGE));
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.CONTENT_TOO_LARGE);
        assertThat(r.getBody().code()).isEqualTo("CONTENT_TOO_LARGE");
    }

    @Test
    void unknownClientStatusFallsBackToBadRequestCode() {
        ResponseEntity<ErrorResponse> r = handler.handleUnknown(new ResponseStatusException(HttpStatus.valueOf(418)));
        assertThat(r.getStatusCode().value()).isEqualTo(418);
        assertThat(r.getBody().code()).isEqualTo("I_AM_A_TEAPOT");
        ResponseEntity<ErrorResponse> odd = handler.handleUnknown(new ResponseStatusException(org.springframework.http.HttpStatusCode.valueOf(499)));
        assertThat(odd.getStatusCode().value()).isEqualTo(499);
        assertThat(odd.getBody().code()).isEqualTo("BAD_REQUEST");
    }

    @Test
    void frameworkServerErrorStaysInternal() {
        ResponseEntity<ErrorResponse> r = handler.handleUnknown(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE));
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(r.getBody().code()).isEqualTo("INTERNAL_ERROR");
    }

    @Test
    void disconnectedClientGetsNothingAndNoErrorLog(CapturedOutput output) {
        assertThat(handler.handleUnknown(new AsyncRequestNotUsableException("Broken pipe"))).isNull();
        assertThat(output.getAll()).doesNotContain("GlobalExceptionHandler");
    }

    @Test
    void anythingElseIsInternal() {
        ResponseEntity<ErrorResponse> r = handler.handleUnknown(new IllegalStateException("boom"));
        assertThat(r.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(r.getBody().code()).isEqualTo("INTERNAL_ERROR");
    }
}
