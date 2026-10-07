"""09-nickname.md 닉네임 규칙 참고 구현 (§2 형식, §3 검사 순서, §4 금칙어, §5 예약어, §7 소셜 이름 미리 채우기).
금칙어 목록은 테스트용 일부다. 실제 목록은 팀이 검토한 공개 목록을 쓴다."""
import re, unicodedata
CHARS=re.compile(r'^[가-힣a-zA-Z0-9]{2,10}$'); HAS_LETTER=re.compile(r'[가-힣a-zA-Z]')
BANNED=["시발","씨발","병신","개새끼","fuck","fack","shit"]          # 테스트용 일부. 실제 목록은 공개 목록을 팀이 검토
EXCEPT=["시발점","시발역"]
RESERVED=["관리자","운영자","운영진","운영팀","고객센터","공식","매니저","스태프",
          "admin","administrator","official","staff","manager","system","root"]
LEET=str.maketrans({"0":"o","1":"i","3":"e","4":"a","5":"s","7":"t"})
def normalize(raw): return unicodedata.normalize("NFC", raw.strip())
def variants(n):
    low=n.lower(); v={low, re.sub(r"[0-9]","",low), low.translate(LEET), low.replace("1","l")}
    return v
def contains(words, n, exceptions=()):
    for v in variants(n):
        for e in exceptions: v=v.replace(e, "\0")
        if any(w in v for w in words): return True
    return False
def check(raw, taken=()):
    n=normalize(raw)
    if not CHARS.match(n): return n, "INVALID_FORMAT"
    if not HAS_LETTER.search(n): return n, "LETTER_REQUIRED"
    if contains(RESERVED, n): return n, "RESERVED"
    if contains(BANNED, n, EXCEPT): return n, "BANNED_WORD"
    if n.lower() in {t.lower() for t in taken}: return n, "DUPLICATE"
    return n, "OK"
def prefill(social_name, taken=()):
    s=re.sub(r"[^가-힣a-zA-Z0-9]","",normalize(social_name))[:10]
    return s if check(s,taken)[1]=="OK" else ""
