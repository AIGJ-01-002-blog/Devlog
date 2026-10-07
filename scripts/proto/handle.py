"""08-blog-address.md 블로그 주소 규칙 참고 구현 (§2 형식, §3 이메일로 주소 만들기)."""
import re
PREFIX={"LOCAL":"","GOOGLE":"go-","GITHUB":"gi-"}
RESERVED={"admin","administrator","root","system","api","login","logout","signup","settings","me","write",
          "search","tags","tag","notifications","manage","static","assets","images","help","support","about",
          "terms","privacy","blog","user","users","null","undefined","www","mail","official","devlog","teamblog"}
FULL=re.compile(r'^((go|gi)-)?[a-z0-9][a-z0-9_]{1,34}[a-z0-9]$')
import random
RANDOM6 = lambda: f"{random.randint(0, 999999):06d}"
def body_from_email(email):
    local=email.split("@")[0].split("+")[0].lower()
    local=re.sub(r"[.\-]","_",local)
    local=re.sub(r"[^a-z0-9_]","",local)
    local=re.sub(r"_+","_",local).strip("_")
    return local[:30].rstrip("_")
def suggest(email, provider, taken):
    body=body_from_email(email)
    if len(body)<3: body=None
    base=(PREFIX[provider]+body) if body else None
    if base and base not in taken and body not in RESERVED: return base
    if not base: return PREFIX[provider]+"user_"+RANDOM6()   # 난수 6자리
    n=2
    while f"{base}_{n}" in taken: n+=1
    return f"{base}_{n}"
