"""34-ai-tag-suggest.md 입력 정리(§4)와 캐시 판정(§5) 참고 구현."""
import re, hashlib, unicodedata
def clean(title, md, limit=8000):
    def code(m):
        lang = (m.group(1) or "").strip(); lines = m.group(2).strip("\n").split("\n")[:5]
        return f" [code {lang}] " + " ".join(lines) + " "
    s = re.sub(r"```([^\n]*)\n(.*?)```", code, md, flags=re.S)          # ③ 코드 블록: 언어 + 앞 5줄
    s = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", s)                           # ② 이미지 제거
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)                        # ② 링크는 글자만
    s = re.sub(r"(?m)^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+", "", s)           # ① 줄 앞 기호
    s = re.sub(r"(\*\*|__|\*|_|~~|`)", "", s)                             # ① 강조 기호
    s = unicodedata.normalize("NFC", re.sub(r"\s+", " ", s)).strip()      # ④ 공백
    text = (unicodedata.normalize("NFC", title.strip()) + "\n" + s)[:limit] # ⑤ 자르기
    return text, len(s) >= 100                                            # ⑥ 100자 미만이면 호출 안 함
def key(text, v=1): return f"ai:tag:v{v}:" + hashlib.sha256(text.encode()).hexdigest()[:16]
def simhash(text, bits=64):
    toks = re.findall(r"\w+", text.lower()); grams = [" ".join(toks[i:i+2]) for i in range(len(toks)-1)] or toks
    v = [0]*bits
    for g in grams:
        h = int.from_bytes(hashlib.md5(g.encode()).digest()[:8], "big")
        for b in range(bits): v[b] += 1 if h >> b & 1 else -1
    return sum(1 << b for b in range(bits) if v[b] > 0)
def dist(a, b): return bin(a ^ b).count("1")

def shingles(t, n=3):
    t = t.lower(); return {t[i:i+n] for i in range(max(1, len(t)-n+1))}
def jaccard(a, b):
    A, B = shingles(a), shingles(b); return len(A & B) / len(A | B)
