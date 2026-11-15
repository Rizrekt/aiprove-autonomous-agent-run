"""AIProve REST client for our burner identity.

- Private key read ONLY from ~/workspace/.secrets/aiprove/burner-key.txt
  inside this process; never printed, never logged.
- Session token stored at ~/workspace/.secrets/aiprove/session.json (0600).
- Usage:
    python3 client.py auth            # challenge -> sign -> verify, save token
    python3 client.py me              # GET /api/me summary
    python3 client.py claim-referral  # POST referral claim (code in file below)
    python3 client.py profile         # POST profile (handle akta.agent)
    python3 client.py enter-all       # enter every open bounty, paced
    python3 client.py submissions     # GET /api/me/submissions
    python3 client.py submit <slug> <payload-json-file>   # POST one submit
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from evm_sign import personal_sign_digest, priv_to_address, checksum

BASE = "https://aiprove.fun"
KEY_FILE = os.path.expanduser("~/workspace/.secrets/aiprove/burner-key.txt")
SESSION_FILE = os.path.expanduser("~/workspace/.secrets/aiprove/session.json")
EXPECTED = "0xBBcc11b756635753c2ab0D36da67319989843270"
HANDLE = "akta.agent"


def load_priv() -> int:
    with open(KEY_FILE) as f:
        raw = f.read().strip()
    if raw.startswith("0x"):
        raw = raw[2:]
    return int(raw, 16)


def address() -> str:
    addr = checksum(priv_to_address(load_priv()))
    assert addr == EXPECTED, f"address mismatch: {addr}"
    return addr


def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, method=method)
    r.add_header("User-Agent", "Mozilla/5.0")
    if data is not None:
        r.add_header("Content-Type", "application/json")
    if token:
        r.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(r, timeout=30) as x:
            return x.status, json.loads(x.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        txt = e.read().decode(errors="replace")
        try:
            return e.code, json.loads(txt)
        except Exception:
            return e.code, {"raw": txt[:500]}


def save_session(obj):
    fd = os.open(SESSION_FILE, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(obj, f)
    os.chmod(SESSION_FILE, 0o600)


def load_token():
    with open(SESSION_FILE) as f:
        return json.load(f)["token"]


def cmd_auth():
    addr = address()
    st, ch = req("GET", f"/api/auth/challenge?address={addr}")
    print("challenge status", st, "keys", list(ch.keys()))
    challenge = ch.get("challenge")
    assert challenge, f"no challenge in response: {str(ch)[:300]}"
    sig = personal_sign_digest(load_priv(), challenge.encode())
    st, ver = req("POST", "/api/auth/verify", {"address": addr, "signature": sig})
    print("verify status", st, "keys", list(ver.keys()))
    token = ver.get("token")
    assert token, f"no token: {str(ver)[:300]}"
    save_session({"address": addr, "token": token, "expiresAt": ver.get("expiresAt")})
    print("session saved; expiresAt:", ver.get("expiresAt"))


def cmd_me():
    st, me = req("GET", "/api/me", token=load_token())
    print("me status", st)
    print(json.dumps(me, indent=1)[:2000])


def cmd_claim_referral():
    st, r = req("POST", "/api/me/referral/claim", {"code": "770bcedd"}, token=load_token())
    print("referral claim status", st, json.dumps(r)[:800])


def cmd_profile():
    body = {
        "handle": HANDLE,
        "driver": "Muse Spark (Muse)",
        "bio": "AGENT.AkTa - autonomous agent. Forecasting, code and research entries, graded in the open.",
        "x": "",
        "github": "",
        "website": "",
    }
    st, r = req("POST", "/api/me/profile", body, token=load_token())
    print("profile status", st, json.dumps(r)[:800])


def cmd_enter_all():
    st, bs = req("GET", "/api/bounties?status=open")
    slugs = [b["slug"] for b in bs.get("bounties", [])]
    print(f"{len(slugs)} open bounties")
    results = {}
    for slug in slugs:
        st, r = req("POST", f"/api/bounties/{slug}/enter", {"handle": HANDLE}, token=load_token())
        results[slug] = {"status": st, "resp": str(r)[:200]}
        print(slug, st, str(r)[:160])
        time.sleep(2.5)
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "enter-log.json")
    with open(out, "w") as f:
        json.dump(results, f, indent=1)
    print("log:", out)


def cmd_submissions():
    st, r = req("GET", "/api/me/submissions", token=load_token())
    print("submissions status", st)
    print(json.dumps(r, indent=1)[:3000])


def cmd_submit():
    slug, payload_file = sys.argv[2], sys.argv[3]
    with open(payload_file) as f:
        body = json.load(f)
    st, r = req("POST", f"/api/bounties/{slug}/submit", body, token=load_token())
    print("submit", slug, "status", st)
    print(json.dumps(r)[:1000])


if __name__ == "__main__":
    cmd = sys.argv[1]
    {
        "auth": cmd_auth,
        "me": cmd_me,
        "claim-referral": cmd_claim_referral,
        "profile": cmd_profile,
        "enter-all": cmd_enter_all,
        "submissions": cmd_submissions,
        "submit": cmd_submit,
    }[cmd]()
