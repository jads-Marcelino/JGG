# Meridiano Studio · versions

| Version | Where | What |
|---|---|---|
| v9 (rolled back) | [`/v9/`](https://jads-marcelino.github.io/JGG/v9/) · commit `ae6ec44` | Rolled back on 15 Nov 2026: the assessment feature belongs to GJG, not to the Studio. **Assessments**: a new page that keeps every assessment result. Each guide (template *Discovery guide · Operación Sonrisa Panamá*, imported from the PDF) has an answer sheet; upload the file from each new assessment (PDF, Word, text, link or pasted notes) and the Studio reads it, matches answers to T1–T6 and D1–D5, sets the overall stage (the lowest triage stage) and creates a filled copy of the guide. Free-form notes or transcripts can go to Claude through the connector (`list_assessments`, `get_assessment`, `fill_assessment`). Results and uploaded files stay private to the owner (table `assessments`, private bucket `assessments`). PDF and Word readers in `/vendor/`. Sources in `fonte/v9/`. |
| **v8 (current)** | [`/`](https://jads-marcelino.github.io/JGG/) · commit `8cdf5e1` | Import a version from anywhere: the device (Files, iCloud, Google Drive, Dropbox, OneDrive), a shared link (Drive, Google Docs, Dropbox, OneDrive, GitHub or any public page, fetched by the `fetch-url` Edge Function), or the clipboard. "Copy import link" creates a link that opens the document and imports the file. The connector gains `send_html`, so Claude can send a whole HTML file as a version. Sources in `fonte/v8/`. |
| v7 | [`/v7/`](https://jads-marcelino.github.io/JGG/v7/) · commit `8cb3fa7` | New text templates: **Research article** in the journal layout of the Taylor & Francis Interact template (front matter, article history, abstract, keywords, numbered sections, numbered equations, booktabs table, author–date references); **Dissertation · ICMC-USP** with the ABNT structure (cover, title page, resumo, abstract, sumário, chapters, references) and page breaks; **Executive memo** as a clean one-pager (properties, TL;DR, context, recommendation, options table, next steps). Sources in `fonte/v7/`. |
| v6 | [`/v6/`](https://jads-marcelino.github.io/JGG/v6/) · commit `79488e9` | No demo AI. The AI panel has **Ask Claude**: write the request, choose the scope (this slide, all slides or specific ones) and Claude opens with it ready to run through the connector; or copy a prompt that makes Claude return an HTML file. **Upload from Claude**: upload or paste an HTML file (Studio format stays editable; any other Claude deck keeps its own design in a sandboxed frame), choose to replace the whole deck or map each uploaded slide to a slide to replace or add, and it becomes a version for approval. "Apply with AI" on a comment opens Claude with that comment. API-key generation stays available when a key is saved. Sources in `fonte/v6/`. |
| v5 | [`/v5/`](https://jads-marcelino.github.io/JGG/v5/) · commit `5b8c7ed` | The AI works on whole slides: redesigns (layout and content), new slides, removals, reordering, a new deck version from the comments, and several options for the same slide (approving one closes the others). Each result is a version card with thumbnails and a full-screen preview (before/after) for the owner to approve. Works through the connector (`propose_slides`, `get_design_guide`) and inside the Studio with an API key. Shows **AI configured** / **Claude connected** once set up. Sources in `fonte/v5/`, database changes in `fonte/v5/schema_v5.sql`. |
| v4 | [`/v4/`](https://jads-marcelino.github.io/JGG/v4/) · commit `eb83340` | Responsive on phone, iPad and desktop (room with slide strip and bottom sheet). **AI Studio**: IDE-style editor with file explorer, HTML code, live preview, changes/diff, AI output and AI chat. AI tied to the sign-in e-mail in two ways: (1) **connector**: add the Studio inside Claude or ChatGPT and sign in with the Studio e-mail, so the person's own plan does the work (hosted MCP server on Supabase, OAuth 2.1); (2) **API key saved to the account**, readable only by its owner. Connector and AI proposals respect the owner's AI setting. Sources in `fonte/v4/`, database changes in `fonte/v4/schema_v4.sql`, MCP server in `fonte/v4/functions/mcp/index.ts`. |
| v3 | [`/v3/`](https://jads-marcelino.github.io/JGG/v3/) · commit `3eb79bc` | Real backend on Supabase: accounts by e-mail and password, access only for the e-mails the owner shares (no e-mail is sent; the owner sends the link), live sync across devices, proposals, comments, owner approval, versions, activity log for analytics and MCP. Database rules in `fonte/v3/schema.sql`. |
| v2 | [`/v2/`](https://jads-marcelino.github.io/JGG/v2/) | No Git for users. Live room, follow/present, proposals with owner-only approval, real AI (Claude or ChatGPT, same e-mail as sign-in), owner-only AI mode, texts (dissertation, article, memo), template library, HTML export, analytics (DAU/MAU) and embedded MCP. |
| v1 | [`/v1/`](https://jads-marcelino.github.io/JGG/v1/) · commit `4bb7d68` | GitHub-based flow: owner creates repo + .io, invites by e-mail, guest connects GitHub, commits, history, deploy. |

## Rollback

To v7: `git checkout 8cb3fa7 -- index.html`, commit and push. v7 also stays online at `/v7/`.

To v6 (previous text templates): `git checkout 79488e9 -- index.html`, commit and push. v6 also stays online at `/v6/`.

To v5 (with the demo AI): `git checkout 5b8c7ed -- index.html`, commit and push. v5 also stays online at `/v5/`.

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

Sources: `fonte/v9/` (v9: same as v8 plus `python3 patch_v9.py` before `build.py`; copy `vendor/` next to `index.html`), `fonte/v8/` (v8: same as v7 plus `python3 patch_v8.py` before `build.py`), `fonte/v7/` (v7: same as v6 plus `python3 patch_v7.py` before `build.py`), `fonte/v6/` (v6: `cp app_v3_src.html app.html && python3 patch_v4.py && python3 patch_v5.py && python3 patch_v6.py && python3 build.py`), `fonte/v5/` (v5: `cp app_v3_src.html app.html && python3 patch_v4.py && python3 patch_v5.py && python3 build.py`), `fonte/v4/` (v4: `cp app_v3_src.html app.html && python3 patch_v4.py && python3 build.py`, then copy `index.html` to the root), `fonte/v3/` (v3: run `python3 fonte/v3/build.py`, then copy `fonte/v3/index.html` to the root), `fonte/v2/` and `fonte/v1/`.

`fonte/v3/test.html` runs the same app against a local in-browser database (`mock.js`) for testing without Supabase; `e2e.py` drives two people through it.
