# Meridiano Studio · versions

| Version | Where | What |
|---|---|---|
| **v5 (current)** | [`/`](https://jads-marcelino.github.io/JGG/) | The AI works on whole slides: redesigns (layout and content), new slides, removals, reordering, a new deck version from the comments, and several options for the same slide (approving one closes the others). Each result is a version card with thumbnails and a full-screen preview (before/after) for the owner to approve. Works through the connector (`propose_slides`, `get_design_guide`) and inside the Studio with an API key. Shows **AI configured** / **Claude connected** once set up. Sources in `fonte/v5/`, database changes in `fonte/v5/schema_v5.sql`. |
| v4 | [`/v4/`](https://jads-marcelino.github.io/JGG/v4/) · commit `eb83340` | Responsive on phone, iPad and desktop (room with slide strip and bottom sheet). **AI Studio**: IDE-style editor with file explorer, HTML code, live preview, changes/diff, AI output and AI chat. AI tied to the sign-in e-mail in two ways: (1) **connector**: add the Studio inside Claude or ChatGPT and sign in with the Studio e-mail, so the person's own plan does the work (hosted MCP server on Supabase, OAuth 2.1); (2) **API key saved to the account**, readable only by its owner. Connector and AI proposals respect the owner's AI setting. Sources in `fonte/v4/`, database changes in `fonte/v4/schema_v4.sql`, MCP server in `fonte/v4/functions/mcp/index.ts`. |
| v3 | [`/v3/`](https://jads-marcelino.github.io/JGG/v3/) · commit `3eb79bc` | Real backend on Supabase: accounts by e-mail and password, access only for the e-mails the owner shares (no e-mail is sent; the owner sends the link), live sync across devices, proposals, comments, owner approval, versions, activity log for analytics and MCP. Database rules in `fonte/v3/schema.sql`. |
| v2 | [`/v2/`](https://jads-marcelino.github.io/JGG/v2/) | No Git for users. Live room, follow/present, proposals with owner-only approval, real AI (Claude or ChatGPT, same e-mail as sign-in), owner-only AI mode, texts (dissertation, article, memo), template library, HTML export, analytics (DAU/MAU) and embedded MCP. |
| v1 | [`/v1/`](https://jads-marcelino.github.io/JGG/v1/) · commit `4bb7d68` | GitHub-based flow: owner creates repo + .io, invites by e-mail, guest connects GitHub, commits, history, deploy. |

## Rollback

To v4 (text-only AI edits): `git checkout eb83340 -- index.html`, commit and push. v4 also stays online at `/v4/`; the v5 database changes are additive.

To v3 (same database, without AI Studio, connector or responsive layout): `git checkout 3eb79bc -- index.html` then commit and push. v3 also stays online at `/v3/`. The v4 database changes are additive, so v3 keeps working on them.

To v2 (local demo, no backend): `git checkout 5f59a78 -- index.html` then commit and push. v2 also stays online at `/v2/`.

## Rollback to v1

Option A, keep both online: v1 stays at `/v1/`.

Option B, make v1 the main page again:

```bash
git checkout 4bb7d68 -- index.html fonte/app.html fonte/mk.py
git commit -m "Rollback to v1" && git push
```

Sources: `fonte/v5/` (v5: `cp app_v3_src.html app.html && python3 patch_v4.py && python3 patch_v5.py && python3 build.py`), `fonte/v4/` (v4: `cp app_v3_src.html app.html && python3 patch_v4.py && python3 build.py`, then copy `index.html` to the root), `fonte/v3/` (v3: run `python3 fonte/v3/build.py`, then copy `fonte/v3/index.html` to the root), `fonte/v2/` and `fonte/v1/`.

`fonte/v3/test.html` runs the same app against a local in-browser database (`mock.js`) for testing without Supabase; `e2e.py` drives two people through it.
