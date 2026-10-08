package com.team.blog.shared.error;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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

    /** 헤더 값에 제어 문자가 섞인 요청(줄바꿈이 붙은 토큰 등)은 500이 아니라 400이고, 헤더 값을 로그에 남기지 않는다. */
    @Test
    void rejectedHeaderIsBadRequestWithoutErrorLog(CapturedOutput output) throws Exception {
        browser().perform(post("/api/mcp").header("Authorization", "Bearer dvl_secretvalue\u0007").content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("BAD_REQUEST"));
        assertThat(output.getAll()).doesNotContain("GlobalExceptionHandler").doesNotContain("dvl_secretvalue");
    }
}
