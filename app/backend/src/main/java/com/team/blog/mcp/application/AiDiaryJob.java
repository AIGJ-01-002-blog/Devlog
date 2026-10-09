package com.team.blog.mcp.application;

import java.time.Duration;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.team.blog.shared.scheduling.JobLock;

/** AI 일기 (061·071). 매시 정각(KST)에 그 시각을 고른 회원의 메모를 일기로 묶는다. 서버가 여러 대여도 한 대만 돈다. */
@Component
public class AiDiaryJob {
    private final AiJournal journal;
    private final JobLock lock;

    public AiDiaryJob(AiJournal journal, JobLock lock) {
        this.journal = journal;
        this.lock = lock;
    }

    @Scheduled(cron = "${blog.mcp.ai-diary-cron:0 0 * * * *}", zone = "Asia/Seoul")
    public void scheduled() {
        lock.runExclusively("ai-diary", Duration.ofMinutes(30), journal::compileDiaries);
    }
}
