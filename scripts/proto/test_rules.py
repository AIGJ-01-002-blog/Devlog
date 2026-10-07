#!/usr/bin/env python3
"""08 블로그 주소, 09 닉네임, 34 AI 캐시 규칙을 문서의 예시 그대로 확인한다. 실행: python3 scripts/proto/test_rules.py"""
import random, sys, unicodedata
sys.path.insert(0, __import__("os").path.dirname(__file__))
import handle, nickname, aicache
P = F = 0
def ok(cond, name, got=""):
    global P, F
    P += cond; F += (not cond); print(("PASS  " if cond else "FAIL  ") + name + ("" if cond else f"  → {got}"))

print("== 08 블로그 주소 (문서 §3 예시를 차례로 가입)")
handle.RANDOM6 = lambda: "483920"
taken = {"admin"}
for email, prov, want in [("kim755030@naver.com","LOCAL","kim755030"), ("kim755030@daum.net","LOCAL","kim755030_2"),
        ("kim755030@gmail.com","GOOGLE","go-kim755030"), ("kim755030@naver.com","GITHUB","gi-kim755030"),
        ("kim755030@gmail.com","LOCAL","kim755030_3"), ("gokim@naver.com","LOCAL","gokim"),
        ("Kim.Min-Seo+blog@naver.com","LOCAL","kim_min_seo"), ("_kim__min_@x.com","LOCAL","kim_min"),
        ("admin@x.com","LOCAL","admin_2"), ("ab@x.com","LOCAL","user_483920"), ("김민서@한국.kr","GOOGLE","go-user_483920"),
        ("12345678+octocat@users.noreply.github.com","GITHUB","gi-12345678")]:
    got = handle.suggest(email, prov, taken); taken.add(got)
    ok(got == want and bool(handle.FULL.match(got)), f"{prov:6} {email} → {want}", got)
for h, valid in [("go-kim",1),("GOkim",0),("kim-min",0),("xx-kim",0),("go-ki",0),("ab",0),("_kim",0),("kim_",0),("go-_kim",0),("gi-"+"a"*36,1),("gi-"+"a"*37,0)]:
    ok(bool(handle.FULL.match(h)) == bool(valid), f"형식 {h[:20]} → {'허용' if valid else '거부'}")

print("\n== 09 닉네임")
for raw, want in [("김민서","OK"),("Kim","DUPLICATE"),("kim","DUPLICATE"),("KIM2","OK"),("김","INVALID_FORMAT"),("가나다라마바사아자차카","INVALID_FORMAT"),
        ("ㅋㅋ","INVALID_FORMAT"),("김 민서","INVALID_FORMAT"),("12345","LETTER_REQUIRED"),("김민서😀","INVALID_FORMAT"),
        ("시1발왕","BANNED_WORD"),("병1신","BANNED_WORD"),("sh1t","BANNED_WORD"),("f4ck","BANNED_WORD"),("시발점","OK"),("시발역앞","OK"),
        ("관리자김","RESERVED"),("admin123","RESERVED"),("Official","RESERVED"),("운영팀장","RESERVED"),
        (unicodedata.normalize("NFD","김민서"),"OK")]:
    got = nickname.check(raw, ["Kim"])[1]; ok(got == want, f"{raw!r} → {want}", got)
for name, want in [("Kim Min-seo","KimMinseo"),("김민서 (Minseo)","김민서Minseo"),("Christopher Columbus","Christophe"),("A",""),("Kim","")]:
    got = nickname.prefill(name, ["Kim"]); ok(got == want, f"소셜 이름 {name!r} → {want!r}", got)

print("\n== 34 AI 캐시")
base = "# JPA N+1 문제 정리\n\n**지연 로딩**으로 연관 엔티티를 조회할 때 쿼리가 N번 더 실행되는 문제가 있다. 이번 글에서는 원인과 해결 방법을 정리한다.\n\n![d](https://cdn/a.webp)\n\n## 해결\n- fetch join\n- `@EntityGraph`\n- [문서](https://docs.example/hibernate) 참고\n\n트랜잭션 범위 안에서 조회를 마치는 것이 중요하다. 페이징과 함께 쓸 때 주의가 필요하다."
t0, _ = aicache.clean("제목", base); k0 = aicache.key(t0)
for name, md in [("공백·줄바꿈만 다름", base.replace("\n\n","\n\n\n")), ("이미지 주소만 바뀜", base.replace("a.webp","b.webp"))]:
    ok(aicache.key(aicache.clean("제목", md)[0]) == k0, f"① 같은 내용으로 판정: {name}")
ok(aicache.key(aicache.clean("제목", base.replace("정리한다","정리합니다"))[0]) != k0, "① 글자가 바뀌면 다른 키")
ok(aicache.clean("짧은 글", "안녕하세요. 오늘은 짧게 씁니다.")[1] is False, "100자 미만이면 LLM을 부르지 않음")
random.seed(1)
para = ["지연 로딩으로 연관 엔티티를 조회할 때 쿼리가 N번 더 실행되는 문제가 있다.", "fetch join과 EntityGraph로 해결할 수 있다.",
        "트랜잭션 범위 안에서 조회를 마치는 것이 중요하다.", "페이징과 fetch join을 함께 쓸 때는 메모리에서 페이징되는 문제를 주의한다.",
        "batch size 설정으로 IN 쿼리를 묶어 N+1을 완화할 수 있다.", "실행 계획과 로그로 실제 쿼리 수를 확인하는 습관이 필요하다."]
long = "\n\n".join(random.choice(para) + f" ({i}번째 문단)" for i in range(90)); tl, _ = aicache.clean("JPA", long)
J = lambda md: aicache.jaccard(tl, aicache.clean("JPA", md)[0])
ok(J(long.replace("중요하다","중요합니다",1)) >= 0.9, "② 긴 글 오타 수정 → 재사용 (≥ 0.9)")
ok(J(long + " 마지막으로 Querydsl을 쓸 때도 같은 원리가 적용된다.") >= 0.9, "② 긴 글 문장 1개 추가 → 재사용")
ok(J("\n\n".join(p if i % 10 else "레디스 캐시와 도커 배포 환경을 구성한 기록이다." for i, p in enumerate(long.split("\n\n")))) < 0.9, "② 문단 10% 교체 → LLM 호출 (< 0.9)")
ok(J("도커 컴포즈로 배포 환경을 구성했다. " * 200) < 0.1, "② 전혀 다른 글 → LLM 호출")

print(f"\n결과: PASS {P} / FAIL {F}"); sys.exit(1 if F else 0)
