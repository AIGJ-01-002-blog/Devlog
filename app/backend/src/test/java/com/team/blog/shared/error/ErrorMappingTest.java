package com.team.blog.shared.error;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;

import com.team.blog.support.IntegrationTest;

/** spec 034: JSON을 받지 않겠다는 요청(크롤러 등)은 406이고 서버 오류 로그를 남기지 않는다. */
@ExtendWith(OutputCaptureExtension.class)
class ErrorMappingTest extends IntegrationTest {
    @Test
    void acceptMismatchIsNotAcceptableWithoutErrorLog(CapturedOutput output) throws Exception {
        browser().perform(get("/api/posts").accept("application/xml")).andExpect(status().isNotAcceptable());
        assertThat(output.getAll()).doesNotContain("GlobalExceptionHandler");
    }
}
