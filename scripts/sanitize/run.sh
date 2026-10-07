#!/usr/bin/env bash
# 12 문서의 본문 정화 파이프라인을 실제 라이브러리로 실행해 검증한다. (Java 21 필요, Docker 불필요)
# 라이브러리는 Maven Central에서 lib/ 로 받는다 (처음 한 번, 약 1MB). lib/ 는 커밋하지 않는다.
set -euo pipefail
cd "$(dirname "$0")"
CM=0.30.0; OWASP=20260924.2; AUTOLINK=0.12.0
MC=https://repo1.maven.org/maven2
JARS=(
  "org/commonmark/commonmark/$CM/commonmark-$CM.jar"
  "org/commonmark/commonmark-ext-gfm-tables/$CM/commonmark-ext-gfm-tables-$CM.jar"
  "org/commonmark/commonmark-ext-gfm-strikethrough/$CM/commonmark-ext-gfm-strikethrough-$CM.jar"
  "org/commonmark/commonmark-ext-task-list-items/$CM/commonmark-ext-task-list-items-$CM.jar"
  "org/commonmark/commonmark-ext-autolink/$CM/commonmark-ext-autolink-$CM.jar"
  "org/commonmark/commonmark-ext-heading-anchor/$CM/commonmark-ext-heading-anchor-$CM.jar"
  "org/nibor/autolink/autolink/$AUTOLINK/autolink-$AUTOLINK.jar"
  "com/googlecode/owasp-java-html-sanitizer/owasp-java-html-sanitizer/$OWASP/owasp-java-html-sanitizer-$OWASP.jar"
)
mkdir -p lib
for j in "${JARS[@]}"; do f="lib/$(basename "$j")"; [ -s "$f" ] || curl -fsSL "$MC/$j" -o "$f"; done
java -cp "lib/*" Pipeline.java
