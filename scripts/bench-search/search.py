"""33-search.md 검색 실행 방식 참고 구현: 단계별 관련도(제목→태그→본문), 최근창 → 인덱스 후보 합치기, 커서.
run.sh가 글 10만 개를 넣은 PostgreSQL 컨테이너 이름을 PG 환경 변수로 넘긴다."""
import os, subprocess, re, sys, unicodedata, html
WINDOW, SIZE = int(os.environ.get('WINDOW', 3000)), 9
def sql(q):
    out = subprocess.run(["docker","exec",os.environ["PG"],"psql","-U","postgres","-qtA","-F","|","-c",q],capture_output=True,text=True)
    if out.returncode: raise SystemExit(out.stderr)
    return [l.split("|") for l in out.stdout.strip().split("\n") if l]
def ms(q):
    plan = subprocess.run(["docker","exec",os.environ["PG"],"psql","-U","postgres","-qtA","-c","explain (analyze) "+q],capture_output=True,text=True).stdout
    return float(re.search(r"Execution Time: ([\d.]+)", plan).group(1))
def lit(s): return "'" + s.replace("'", "''") + "'"
def like(t):   # %, _, \ 를 글자 그대로 찾도록 이스케이프
    return lit("%" + t.replace("\\","\\\\").replace("%","\\%").replace("_","\\_") + "%") + " ESCAPE '\\'"
def parse(q):
    q = unicodedata.normalize("NFC", q).strip()[:50]
    terms = [t for t in q.split() if len(t) >= 2][:5]          # 1글자 무시, 최대 5단어
    return terms, any(len(t) == 2 for t in terms)
def conds(terms, alias):
    T = lambda t: f"{alias}.title ILIKE {like(t)}"
    G = lambda t: f"EXISTS (SELECT 1 FROM post_tag pt JOIN tag g ON g.id = pt.tag_id WHERE pt.post_id = {alias}.id AND g.name ILIKE {like(t.lower())})"
    B = lambda t: f"{alias}.content_md ILIKE {like(t)}" if len(t) >= 3 else "FALSE"   # 2글자는 본문 제외
    title_all = " AND ".join(T(t) for t in terms)
    title_tag_all = " AND ".join(f"({T(t)} OR {G(t)})" for t in terms)
    any_all = " AND ".join(f"({T(t)} OR {G(t)} OR {B(t)})" for t in terms)
    return {1: title_all,
            2: f"NOT ({title_all}) AND {title_tag_all}",
            3: f"NOT ({title_tag_all}) AND {any_all}",
            0: any_all}                                       # 0 = 최신순
BASE = "p.status = 'PUBLISHED' AND p.visibility = 'PUBLIC' AND p.deleted_at IS NULL AND m.withdrawn_at IS NULL"
def driving(terms, ph):
    """인덱스로 찾을 수 있는 후보: 가장 긴 단어 하나로 제목 / 태그 / 본문을 따로 조회해 합친다"""
    t = max(terms, key=len)
    parts = [f"SELECT id FROM post WHERE title ILIKE {like(t)}"]
    if ph in (2, 3, 0):
        parts.append(f"SELECT pt.post_id FROM post_tag pt JOIN tag g ON g.id = pt.tag_id WHERE g.name ILIKE {like(t.lower())}")
    if ph in (3, 0) and len(t) >= 3:
        parts.append(f"SELECT id FROM post WHERE content_md ILIKE {like(t)}")
    return " UNION ".join(parts)
def fetch(cond, cur, limit, author=None, terms=None, ph=None):
    cc = f"AND (p.first_public_at, p.id) < ({lit(cur[0])}::timestamptz, {cur[1]})" if cur else ""
    au = f"AND p.author_id = {author}" if author else ""
    inner = f"SELECT p.id, p.title, p.content_md, p.first_public_at FROM post p JOIN member m ON m.id = p.author_id WHERE {BASE} {au} {cc} ORDER BY p.first_public_at DESC, p.id DESC"
    wcond = re.sub(r"\bp\.", "w.", cond)
    q1 = f"SELECT w.id, w.first_public_at FROM ({inner} LIMIT {WINDOW}) w WHERE {wcond} ORDER BY w.first_public_at DESC, w.id DESC LIMIT {limit}"
    rows, t = sql(q1), ms(q1); path = "최근창"
    if len(rows) < limit:
        window_full = len(sql(f"SELECT 1 FROM ({inner} LIMIT {WINDOW}) w OFFSET {WINDOW-1} LIMIT 1")) == 1
        if window_full:                                      # 모자라면 후보(인덱스)에서 전체
            q2 = (f"SELECT p.id, p.first_public_at FROM post p JOIN member m ON m.id = p.author_id "
                  f"WHERE p.id IN ({driving(terms, ph)}) AND {BASE} {au} {cc} AND {cond} "
                  f"ORDER BY p.first_public_at DESC, p.id DESC LIMIT {limit}")
            rows, t2 = sql(q2), ms(q2); t += t2; path = "최근창→인덱스"
    return rows, t, path
def search(q, sort="relevance", cursor=None, author=None):
    terms, two = parse(q)
    if not terms: return {"error": "두 글자 이상 입력해 주세요"}
    c = conds(terms, "p"); phases = [0] if sort == "latest" else [1, 2, 3]
    phase, cur = (cursor[0], cursor[1:]) if cursor else (phases[0], None)
    items, total_ms, paths = [], 0.0, []
    for ph in phases[phases.index(phase):]:
        need = SIZE - len(items)
        rows, t, path = fetch(c[ph], cur if ph == phase else None, need + 1, author, terms, ph)
        total_ms += t; paths.append(f"{ph}단계:{path}")
        items += [(ph, r[0], r[1]) for r in rows[:need]]
        if len(rows) > need:                                  # 이 단계에 더 있음
            last = items[-1]; return {"items": items, "next": (last[0], last[2], last[1]), "ms": total_ms, "paths": paths, "two": two}
    return {"items": items, "next": None, "ms": total_ms, "paths": paths, "two": two}
def run(q, sort="relevance", author=None, pages=5):
    print(f"\n[검색어 '{q}' · {'관련도순' if sort=='relevance' else '최신순'}{' · 블로그 안' if author else ''}]")
    cur, seen, worst = None, [], 0
    for n in range(1, pages+1):
        r = search(q, sort, cur, author)
        if "error" in r: print("  →", r["error"]); return
        worst = max(worst, r["ms"]); seen += [i[1] for i in r["items"]]
        print(f"  {n}페이지: " + " ".join(f"{i[1]}({i[0]})" for i in r["items"]) + f"   [{r['ms']:.1f}ms, {', '.join(r['paths'])}]")
        if n == 1 and r["two"]: print("    안내: 두 글자 단어는 제목·태그에서만 찾았어요")
        if not r["next"]: print("    → 끝"); break
        cur = r["next"]
    print(f"  본 글 {len(seen)}개, 중복 {len(seen)-len(set(seen))}개, 가장 느린 요청 {worst:.1f}ms")
    return seen
if __name__ == "__main__":
    P = F = 0
    def ok(c, name, got=""):
        global P, F
        P += bool(c); F += (not c); print(("PASS  " if c else "FAIL  ") + name + ("" if c else f"  → {got}"))
    seen = run("롬복")
    ok(seen == ["99990", "50000", "10", "99980", "60000", "20"], "2글자: 제목 3개 → 태그 3개, 본문에만 있는 글·비공개·휴지통·탈퇴자 글 제외", seen)
    seen = run("희귀어사전", pages=4)
    ok(seen[0] == "77777" and len(seen) == 21 and len(set(seen)) == 21, "드문 단어: 제목 1개 → 본문 20개, 중복 없음", seen)
    seen = run("트랜잭션 정리", pages=2); ok(len(seen) == 18 and len(set(seen)) == 18, "4글자 + 2글자: 2페이지 중복 없음")
    seen = run("REQUIRES_NEW", "latest", pages=2); ok(seen[:2] == ["100000", "99996"] and len(set(seen)) == 18, "최신순: 최신 글부터 중복 없음", seen[:3])
    for kw, want in [("100% 할인", ["99960"]), ("snake_case", ["99962"])]:
        got = [i[1] for i in search(kw)["items"]]; ok(got == want, f"'{kw}' → 글자 그대로 찾기", got)
    ok(search("a")["error"] == "두 글자 이상 입력해 주세요", "1글자만 입력하면 안내")
    worst = max(search(k)["ms"] for k in ["롬복", "희귀어사전", "트랜잭션 정리", "REQUIRES_NEW"])
    ok(worst < 500, f"가장 느린 첫 페이지 {worst:.0f}ms < 500ms (PERF-6)")
    print(f"\n결과: PASS {P} / FAIL {F}"); sys.exit(1 if F else 0)
