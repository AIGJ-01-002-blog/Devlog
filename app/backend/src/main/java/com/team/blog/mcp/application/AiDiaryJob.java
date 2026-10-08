package com.team.blog.mcp.application;

import java.time.Duration;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.team.blog.shared.scheduling.JobLock;

/** 자정 일기 (061). 매일 00:00(KST)에 전날까지 AI가 남긴 메모를 일기 임시글로 묶는다. 서버가 여러 대여도 한 대만 돈다. */
@Component
public class AiDiaryJob {
    private final AiJournal journal;
    private final JobLock lock;

    public AiDiaryJob(AiJournal journal, JobLock lock) {
        this.journal = journal;
        this.lock = lock;
    }

    @Scheduled(cron = "${blog.mcp.ai-diary-cron:0 0 0 * * *}", zone = "Asia/Seoul")
    public void scheduled() {
        lock.runExclusively("ai-diary", Duration.ofMinutes(30), journal::compileDiaries);
    }
}
