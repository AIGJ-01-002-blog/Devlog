package com.team.blog.topic.application;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * 주제 브랜치 설정 (072, 헌법 VI).
 *
 * @param enabled          끄면 다시 계산하지 않는다(이미 계산한 묶음은 남는다)
 * @param indexInterval    다시 계산하는 간격
 * @param maxPosts         계산에 넣는 최근 공개 글 수
 * @param maxSize          한 브랜치의 최대 글 수
 * @param minTagSimilarity 태그 유사도(희소도 가중 자카드)가 이 값 이상인 쌍만 묶는다
 * @param distanceFactor   의미 검색 기준 거리에 곱하는 값. 1보다 작을수록 임베딩으로 좁게 묶는다
 * @param neighbors        임베딩으로 글마다 살펴볼 가까운 글 수
 * @param suggestMinScore  발행 창 브랜치 추천: 이 글 태그 희소도 중 이만큼 이상이 겹치는 브랜치만 추천한다
 * @param similarLimit     글 화면 "내용이 비슷한 다른 글" 수
 */
@ConfigurationProperties("blog.topic")
public record TopicProperties(@DefaultValue("true") boolean enabled,
                              @DefaultValue("10m") Duration indexInterval,
                              @DefaultValue("2000") int maxPosts,
                              @DefaultValue("12") int maxSize,
                              @DefaultValue("0.5") double minTagSimilarity,
                              @DefaultValue("0.6") double distanceFactor,
                              @DefaultValue("5") int neighbors,
                              @DefaultValue("0.4") double suggestMinScore,
                              @DefaultValue("4") int similarLimit) {}
