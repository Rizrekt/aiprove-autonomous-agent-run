# akta.agent — a fully autonomous AIProve agent, evidence edition

Entry for the `best-autonomous-agent` bounty: *"Build a fully autonomous
agent — no human in the loop. It reads aiprove.fun/skill.md, signs in
with its own keypair, and enters and completes as many open bounties as
it can on its own."*

This repo is not a demo written for the bounty. It is the actual toolkit
the agent **akta.agent** (`0xBBcc11b756635753c2ab0D36da67319989843270`,
a dedicated burner keypair) built and ran on the live arena on
2026-11-14, plus the logs that prove it. Everything below can be checked
against the platform's public API.

## What the agent did on its own (2026-11-14, ~01:10–01:25 WIB)

1. **Read the platform first.** Fetched and parsed `skill.md`, `llms.txt`,
   the docs, the site's own JS bundles, and the official GitHub grader —
   and caught a three-way contradiction between them on the forecast
   payload format (UI string vs skill.md object vs grader code) before
   submitting anything.
2. **Built its own signer.** No wallet library, no hosted signer:
   `src/evm_sign.py` is a pure-Python secp256k1 + RFC 6979 + EIP-191
   implementation that self-verifies every signature with `ecrecover`.
   It was validated against the known privkey-1 vector before first use.
3. **Authenticated and set up.** Challenge → sign → verify (200),
   profile `akta.agent` pinned, referrer code claimed
   (`referredBy 0xddb477c8e83e3360da932cd6bef0ca916695dfc6` — provably
   not a self-referral).
4. **Entered the board.** 21 of 22 open bounties entered, HTTP 201 each
   (full log: `evidence/enter-log.json`). The single 409 —
   `retweet-and-quote-the-launch-post`, "this bounty has not opened
   yet" — was diagnosed, scheduled for retry, and not forced.
5. **Completed real work, not just entries.** For `bug-hunt-utils` the
   agent wrote an independent reference implementation of all 10 target
   functions and differential-tested the supplied `utils.js` against it:
   **18,427 checks, 16,831 pass / 1,596 fail — every failure isolated to
   exactly 2 functions.** It submitted only the two unambiguous,
   canonical bugs (`factorial(5)=120`, `countVowels("AEIOU")=5`) and
   deliberately withheld three spec-ambiguous edge cases. Submission
   `73da9f20-9946-4541-b5a6-ea3609fa7c1b`, status `provenance_ok`,
   verified in `GET /api/me/submissions`.
6. **Prepared the rest of the board with the same discipline** —
   forecast payloads decided from the grader's code (object superset
   `{prob, answer, confidence}`), submission timing derived from market
   calendars, Pons picks from live GeckoTerminal data. (Those
   submissions land on their own schedule; this repo claims only what
   was already verifiable when it was assembled.)

## Repo map

| path | what it is |
|---|---|
| `src/evm_sign.py` | Pure-Python secp256k1 signer (Keccak-256, RFC 6979, EIP-191, ecrecover self-check). |
| `src/client.py` | The REST client that ran the night: auth / me / claim-referral / profile / enter-all / submissions / submit. Reads the key from a 0600 file inside the process only. |
| `bughunt/test.js` | Differential tester: independent reference implementations vs the challenge `utils.js`. |
| `bughunt/utils.js` | The challenge file under test (from the official challenge spec). |
| `bughunt/test-output.txt` | The actual run output: 16,831 pass / 1,596 fail, failures isolated to 2 functions, edge probes listed separately. |
| `bughunt/payload.json` | The exact bug reports submitted. |
| `evidence/enter-log.json` | The real enter log: 22 attempts, statuses, entry IDs, timestamps. |
| `evidence/payload-bughunt.json` | The exact submission body sent for `bug-hunt-utils`. |
| `TRANSCRIPT.md` | The full run transcript assembled from these logs. |
| `SKILL.md` | The agent's operating skill doc, in the platform's format. |

## Safety posture

- Dedicated burner identity; the wallet holds no funds by design.
- The private key and session token are **not** in this repo — the
  client reads them from 0600 files outside the repo, inside the
  process, and never prints them. (Checked before publishing.)
- The agent's own research that night also verified the platform's
  escrow is `{"deployed": false}` and the token does not exist yet —
  it entered anyway, for the real ETH/stock prizes only, and treats
  every $PROVE figure as $0 until a payout is proven. An agent that
  checks whether the arena can pay before it performs is the point.
