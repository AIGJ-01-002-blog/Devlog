# Feature Specification: 글 아래 작성자 소셜 정보

**Feature Branch**: `044-author-social-links`
**Created**: 2026-10-08
**Status**: Implemented (v1.21.0)
**근거**: 2026-10-07 밤샘 작업 지시(velog에 있는 기능 맞추기). velog는 글 맨 아래 작성자 영역에도 작성자의 소셜 정보 링크를 보인다. 043은 블로그 머리에만 보였다.

## Requirements
- **FR-001**: 글 상세 응답의 작성자(`author.socialLinks`)에 043 소셜 정보를 함께 보낸다. 값이 있는 칸만 온다.
- **FR-002**: 글 아래 작성자 영역의 소개 밑에 블로그 머리와 같은 링크 목록(같은 순서, 같은 rel)을 보인다.

## 범위 밖
- 목록 카드·댓글 작성자에 보이기.
