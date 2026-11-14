# Meridiano Studio · versions

| Version | Where | What |
|---|---|---|
| **v2 (current)** | [`/`](https://jads-marcelino.github.io/JGG/) | No Git for users. Live room, follow/present, proposals with owner-only approval, real AI (Claude or ChatGPT, same e-mail as sign-in), owner-only AI mode, texts (dissertation, article, memo), template library, HTML export, analytics (DAU/MAU) and embedded MCP. |
| v1 | [`/v1/`](https://jads-marcelino.github.io/JGG/v1/) · tag `v1` | GitHub-based flow: owner creates repo + .io, invites by e-mail, guest connects GitHub, commits, history, deploy. |

## Rollback to v1

Option A, keep both online: v1 stays at `/v1/`.

Option B, make v1 the main page again:

```bash
git checkout v1 -- index.html fonte/app.html fonte/mk.py
git commit -m "Rollback to v1" && git push
```

Sources: `fonte/app.html` (v2) and `fonte/v1/` (v1). Run `python3 fonte/mk.py` to rebuild `index.html` (embeds the fonts).
