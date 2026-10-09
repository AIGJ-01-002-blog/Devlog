package com.team.blog.portfolio.web;

import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.team.blog.portfolio.application.PortfolioQuery;
import com.team.blog.shared.error.NotFoundException;

/** 포트폴리오 (072 3단계). 공개 정보만 담겨 누구에게나 같다. */
@RestController
public class PortfolioController {
    private final PortfolioQuery portfolios;

    public PortfolioController(PortfolioQuery portfolios) {
        this.portfolios = portfolios;
    }

    @GetMapping("/api/members/{handle}/portfolio")
    public ResponseEntity<PortfolioQuery.Portfolio> portfolio(@PathVariable String handle) {
        return ResponseEntity.ok().cacheControl(CacheControl.noCache())
                .body(portfolios.of(handle).orElseThrow(NotFoundException::new));
    }
}
