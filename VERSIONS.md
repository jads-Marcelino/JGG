# Meridiano Studio · versions

| Version | Where | What |
|---|---|---|
| **v3 (current)** | [`/`](https://jads-marcelino.github.io/JGG/) | Real backend on Supabase: accounts by e-mail and password, access only for the e-mails the owner shares (no e-mail is sent; the owner sends the link), live sync across devices, proposals, comments, owner approval, versions, activity log for analytics and MCP. Database rules in `fonte/v3/schema.sql`. |
| v2 | [`/v2/`](https://jads-marcelino.github.io/JGG/v2/) | No Git for users. Live room, follow/present, proposals with owner-only approval, real AI (Claude or ChatGPT, same e-mail as sign-in), owner-only AI mode, texts (dissertation, article, memo), template library, HTML export, analytics (DAU/MAU) and embedded MCP. |
| v1 | [`/v1/`](https://jads-marcelino.github.io/JGG/v1/) · commit `4bb7d68` | GitHub-based flow: owner creates repo + .io, invites by e-mail, guest connects GitHub, commits, history, deploy. |

## Rollback

To v2 (local demo, no backend): `git checkout 5f59a78 -- index.html` then commit and push. v2 also stays online at `/v2/`.

## Rollback to v1

Option A, keep both online: v1 stays at `/v1/`.

Option B, make v1 the main page again:

```bash
git checkout 4bb7d68 -- index.html fonte/app.html fonte/mk.py
git commit -m "Rollback to v1" && git push
```

Sources: `fonte/v3/` (v3: run `python3 fonte/v3/build.py`, then copy `fonte/v3/index.html` to the root), `fonte/v2/` and `fonte/v1/`.

`fonte/v3/test.html` runs the same app against a local in-browser database (`mock.js`) for testing without Supabase; `e2e.py` drives two people through it.
