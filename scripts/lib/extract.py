#!/usr/bin/env python3
"""문서(docs/*.md)에서 코드 블록을 꺼낸다. 검증 스크립트가 SQL·Lua를 복사해 두지 않고 문서를 그대로 실행하기 위한 도구.

사용법:
  extract.py ddl <문서>                  CREATE/ALTER로 시작하는 ```sql 블록 (예: 03-erd.md의 DDL)
  extract.py block <문서> <언어> <찾을 글자>  <찾을 글자>가 들어 있는 첫 번째 ```<언어> 블록
  extract.py proposals <docs 폴더>        담당자 문서(20~49)의 "## ERD 변경 제안" 절(앞에 번호가 붙어도 됨) 안의 ```sql 블록 전부.
                                         첫 줄이 "-- V1 반영됨"인 블록은 이미 erd/V1__common_schema.sql에 들어 있어 건너뛴다
"""
import pathlib
import re
import sys

FENCE = re.compile(r"```(\w+)\n(.*?)```", re.S)


def blocks(text, lang):
    return [body for l, body in FENCE.findall(text) if l == lang]


def is_ddl(sql):
    return re.search(r"(?im)^\s*(CREATE|ALTER)\s", sql) is not None


def main():
    mode = sys.argv[1]
    if mode == "ddl":
        text = pathlib.Path(sys.argv[2]).read_text(encoding="utf-8")
        print("\n".join(b for b in blocks(text, "sql") if is_ddl(b)))
    elif mode == "block":
        text = pathlib.Path(sys.argv[2]).read_text(encoding="utf-8")
        found = [b for b in blocks(text, sys.argv[3]) if sys.argv[4] in b]
        if not found:
            sys.exit(f"{sys.argv[2]}: '{sys.argv[4]}'가 들어 있는 {sys.argv[3]} 블록이 없습니다")
        print(found[0])
    elif mode == "proposals":
        for path in sorted(pathlib.Path(sys.argv[2]).glob("[2-4][0-9]-*.md")):
            text = path.read_text(encoding="utf-8")
            m = re.search(r"(?ms)^#{2,3} (?:\d+(?:\.\d+)*\.?\s*)?ERD 변경 제안\s*$(.*?)(?=^#{2,3} |\Z)", text)
            if not m:
                continue
            for b in blocks(m.group(1), "sql"):
                if b.lstrip().startswith("-- V1 반영됨"):
                    continue
                if is_ddl(b):
                    print(f"-- from {path.name}\n{b}")
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
