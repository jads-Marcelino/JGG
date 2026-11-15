// Meridiano Studio · remote MCP server (Streamable HTTP, JSON responses)
// People add it as a connector in Claude or ChatGPT and sign in with their
// Studio e-mail (Supabase Auth OAuth 2.1). Every call runs as that person,
// so row-level security decides what the AI can read and propose.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "https://oqokqkrczmdnhfwiwwdv.supabase.co";
const SB_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "sb_publishable_JNIa1DnBITfMvGDDAkYBaA_7A22onL6";
const BASE = `${SB_URL}/functions/v1/mcp`;
const PRM = `${BASE}/.well-known/oauth-protected-resource`;
const STUDIO = "https://jads-marcelino.github.io/JGG/";
const VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26", "2024-11-05"];

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, accept, mcp-session-id, mcp-protocol-version, x-client-info, apikey",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", ...extra } });

// ---------- HTML helpers (same rules as the Studio front end) ----------
const ENT: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", mdash: "—", ndash: "–", hellip: "…", middot: "·" };
function plain(h: string): string {
  return String(h ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return isNaN(n) ? m : String.fromCodePoint(n); }
      return ENT[e] ?? m;
    });
}
const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
function fields(html: string): Record<string, string> {
  const m: Record<string, string> = {}; const r = /data-edit="([^"]+)"[^>]*>([\s\S]*?)<\/(?:p|h1|h2)>/g; let x;
  while ((x = r.exec(html || ""))) if (!(x[1] in m)) m[x[1]] = plain(x[2]);
  return m;
}
function setField(html: string, f: string, text: string): string | null {
  const k = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(data-edit="${k}"[^>]*>)([\\s\\S]*?)(</(?:p|h1|h2)>)`);
  if (!re.test(html)) return null;
  return html.replace(re, (_m, a, _b, c) => a + esc(text) + c);
}

// ---------- tools ----------
type Ctx = { sb: SupabaseClient; uid: string; email: string; client: string };
const TOOLS = [
  { name: "whoami", description: "The Meridiano Studio account this connector is signed in as.", inputSchema: { type: "object", properties: {} } },
  { name: "list_documents", description: "Presentations and texts shared with you: id, name, your role, AI setting, open proposals.", inputSchema: { type: "object", properties: {} } },
  { name: "read_document", description: "Read a presentation or text. Returns each slide/section with its editable fields as plain text (live draft: approved version plus open proposals) and whether you may propose changes.", inputSchema: { type: "object", properties: { document_id: { type: "string" } }, required: ["document_id"] } },
  { name: "propose_changes", description: "Propose new text for fields on one or more slides/sections. Everyone in the room sees it being written. Nothing becomes official until the owner approves. Use field names from read_document.", inputSchema: { type: "object", properties: { document_id: { type: "string" }, summary: { type: "string", description: "One line describing the change, shown to the team" }, changes: { type: "array", items: { type: "object", properties: { slide: { type: "integer", description: "1-based slide or section number" }, field: { type: "string" }, text: { type: "string", description: "New plain text" } }, required: ["slide", "field", "text"] } } }, required: ["document_id", "changes"] } },
  { name: "add_comment", description: "Leave a comment on a slide or section, visible to everyone with access.", inputSchema: { type: "object", properties: { document_id: { type: "string" }, slide: { type: "integer" }, text: { type: "string" }, field: { type: "string" } }, required: ["document_id", "slide", "text"] } },
  { name: "list_comments", description: "Comments on a document, with author, slide and replies.", inputSchema: { type: "object", properties: { document_id: { type: "string" }, include_resolved: { type: "boolean" } }, required: ["document_id"] } },
  { name: "list_proposals", description: "Proposals on a document (open, approved, rejected, withdrawn) with the changed fields.", inputSchema: { type: "object", properties: { document_id: { type: "string" }, status: { type: "string", enum: ["open", "approved", "rejected", "withdrawn"] } }, required: ["document_id"] } },
  { name: "approve_proposal", description: "Owner only: approve a proposal; it becomes a new published version.", inputSchema: { type: "object", properties: { proposal_id: { type: "string" } }, required: ["proposal_id"] } },
  { name: "reject_proposal", description: "Owner rejects a proposal, or its author withdraws it.", inputSchema: { type: "object", properties: { proposal_id: { type: "string" } }, required: ["proposal_id"] } },
  { name: "list_versions", description: "Approved versions: who proposed, who approved, when, which slides changed.", inputSchema: { type: "object", properties: { document_id: { type: "string" } }, required: ["document_id"] } },
  { name: "get_usage_metrics", description: "DAU, WAU, MAU and events by type for your activity and the documents you own.", inputSchema: { type: "object", properties: { window_days: { type: "integer" } } } },
];

function fail(msg: string): never { throw new Error(msg); }
const ok = <T>(r: { data: T; error: unknown }, what: string): T => {
  if (r.error) fail(`${what}: ${(r.error as { message?: string }).message ?? r.error}`);
  return r.data;
};

async function emails(c: Ctx, ids: string[]) {
  const u = [...new Set(ids.filter(Boolean))]; if (!u.length) return {} as Record<string, string>;
  const rows = ok(await c.sb.from("profiles").select("id,email,name").in("id", u), "profiles") as { id: string; email: string; name: string }[];
  return Object.fromEntries(rows.map((r) => [r.id, r.email]));
}
async function loadDoc(c: Ctx, id: string) {
  if (!id) fail("document_id is required");
  const d = (ok(await c.sb.from("documents").select("*").eq("id", id), "document") as Record<string, any>[])[0];
  if (!d) fail("Document not found, or it is not shared with " + c.email);
  const role = ok(await c.sb.rpc("doc_role", { d: id }), "role") as string;
  const order: string[] = d.slide_order?.length ? d.slide_order : Object.keys(d.files || {});
  return { d, role, order };
}
async function openProps(c: Ctx, id: string) {
  return ok(await c.sb.from("proposals").select("*").eq("doc_id", id).eq("status", "open").order("updated_at"), "proposals") as Record<string, any>[];
}
async function track(c: Ctx, tool: string, doc: string | null, meta: Record<string, unknown> = {}) {
  await c.sb.from("events").insert({ user_id: c.uid, email: c.email, type: "mcp_call", doc_id: doc, meta: { tool, client: c.client, ...meta } });
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function call(c: Ctx, name: string, a: Record<string, any>): Promise<unknown> {
  switch (name) {
    case "whoami":
      await track(c, name, null);
      return { email: c.email, user_id: c.uid, studio: STUDIO, note: "Proposals you make here appear live in the Studio room and wait for the owner's approval." };

    case "list_documents": {
      const docs = ok(await c.sb.from("documents").select("id,name,kind,owner,ai_mode,slide_order,updated_at").order("updated_at", { ascending: false }), "documents") as Record<string, any>[];
      const props = ok(await c.sb.from("proposals").select("doc_id").eq("status", "open"), "proposals") as { doc_id: string }[];
      const inv = ok(await c.sb.from("invites").select("doc_id,email,role"), "invites") as { doc_id: string; email: string; role: string }[];
      const em = await emails(c, docs.map((d) => d.owner));
      await track(c, name, null);
      return docs.map((d) => {
        const role = d.owner === c.uid ? "owner" : inv.find((i) => i.doc_id === d.id && i.email === c.email)?.role ?? "member";
        return { id: d.id, name: d.name, kind: d.kind === "doc" ? "text" : "presentation", owner: em[d.owner] ?? null, your_role: role, ai: d.ai_mode === "all" ? "everyone" : "owner only", units: (d.slide_order || []).length, open_proposals: props.filter((p) => p.doc_id === d.id).length, updated_at: d.updated_at, open_in_studio: `${STUDIO}#/room/${d.id}` };
      });
    }

    case "read_document": {
      const { d, role, order } = await loadDoc(c, a.document_id);
      const op = await openProps(c, d.id);
      const draft: Record<string, string> = { ...(d.files || {}) };
      for (const p of op) for (const k of Object.keys(p.files || {})) draft[k] = p.files[k];
      const vers = ok(await c.sb.from("versions").select("n").eq("doc_id", d.id), "versions") as { n: number }[];
      const aiOk = role === "owner" || (role === "editor" && d.ai_mode === "all");
      await track(c, name, d.id);
      return {
        id: d.id, name: d.name, kind: d.kind === "doc" ? "text" : "presentation", your_role: role,
        can_propose: aiOk, can_comment: !!role,
        rule: aiOk ? "Use propose_changes. The owner approves." : role === "editor" ? "The owner set AI to owner-only: leave comments with add_comment." : "You can comment only.",
        approved_version: vers.length,
        units: order.map((k, i) => {
          const A = fields(d.files?.[k] ?? ""), D = fields(draft[k] ?? "");
          const pending = Object.keys(D).filter((f) => D[f] !== A[f]);
          return { n: i + 1, key: k, fields: D, ...(pending.length ? { pending_fields: pending, approved_fields: Object.fromEntries(pending.map((f) => [f, A[f] ?? ""])) } : {}) };
        }),
      };
    }

    case "propose_changes": {
      const { d, role, order } = await loadDoc(c, a.document_id);
      if (role !== "owner" && role !== "editor") fail("Your role is commenter. Use add_comment to suggest the change.");
      if (role !== "owner" && d.ai_mode !== "all") fail("The owner set AI drafting to owner-only for this document. Use add_comment; the owner applies comments.");
      const changes = Array.isArray(a.changes) ? a.changes : [];
      if (!changes.length) fail("changes is empty");
      const op = await openProps(c, d.id);
      let mine = op.filter((p) => p.author === c.uid && p.via === "mcp").pop();
      const target: Record<string, string> = { ...(mine?.files || {}) };
      const errors: string[] = [];
      for (const ch of changes) {
        const k = order[(Number(ch.slide) || 0) - 1];
        if (!k) { errors.push(`slide ${ch.slide} does not exist`); continue; }
        const base = target[k] ?? d.files?.[k] ?? "";
        const nh = setField(base, String(ch.field), String(ch.text ?? ""));
        if (nh === null) { errors.push(`field "${ch.field}" is not on slide ${ch.slide}; fields: ${Object.keys(fields(base)).join(", ")}`); continue; }
        target[k] = nh;
      }
      if (errors.length && Object.keys(target).length === Object.keys(mine?.files || {}).length) fail(errors.join("; "));
      const prompt = String(a.summary || "Changes proposed from " + c.client).slice(0, 300);
      // write it in a few frames so the room sees the text being written
      const frames = 5; const start: Record<string, string> = { ...(mine?.files || {}) };
      const keys = Object.keys(target).filter((k) => target[k] !== start[k]);
      for (let f = 1; f <= frames; f++) {
        const files: Record<string, string> = { ...start };
        for (const k of keys) {
          const from = start[k] ?? d.files?.[k] ?? ""; const to = target[k];
          if (f === frames) { files[k] = to; continue; }
          const A = fields(from), B = fields(to); let h = from;
          for (const fld of Object.keys(B)) if (B[fld] !== A[fld]) { const part = B[fld].slice(0, Math.ceil(B[fld].length * f / frames)); h = setField(h, fld, part) ?? h; }
          files[k] = h;
        }
        if (!mine) {
          const ins = ok(await c.sb.from("proposals").insert({ doc_id: d.id, author: c.uid, via: "mcp", prompt, files, status: "open" }).select().single(), "saving proposal") as Record<string, any>;
          mine = ins;
        } else {
          ok(await c.sb.from("proposals").update({ files, prompt, updated_at: new Date().toISOString() }).eq("id", mine.id), "saving proposal");
        }
        if (f < frames) await sleep(180);
      }
      await track(c, name, d.id, { slides: keys.map((k) => order.indexOf(k) + 1) });
      return { ok: true, proposal_id: mine!.id, status: "open", slides_changed: keys.map((k) => order.indexOf(k) + 1), warnings: errors, next: role === "owner" ? "You own this document: approve with approve_proposal or in the Studio." : "Waiting for the owner's approval in the Studio." };
    }

    case "add_comment": {
      const { d, role, order } = await loadDoc(c, a.document_id);
      if (!role) fail("No access");
      const k = order[(Number(a.slide) || 1) - 1]; if (!k) fail(`slide ${a.slide} does not exist`);
      const text = String(a.text || "").trim(); if (!text) fail("text is empty");
      const r = ok(await c.sb.from("comments").insert({ doc_id: d.id, path: k, field: a.field || null, author: c.uid, body: text.slice(0, 4000) }).select("id").single(), "comment") as { id: string };
      await track(c, name, d.id);
      return { ok: true, comment_id: r.id };
    }

    case "list_comments": {
      const { d, order } = await loadDoc(c, a.document_id);
      const rows = ok(await c.sb.from("comments").select("*").eq("doc_id", d.id).order("created_at"), "comments") as Record<string, any>[];
      const em = await emails(c, rows.map((r) => r.author));
      await track(c, name, d.id);
      return rows.filter((r) => !r.parent_id && (a.include_resolved || !r.resolved)).map((r) => ({
        id: r.id, slide: order.indexOf(r.path) + 1, field: r.field, author: em[r.author], text: r.body, resolved: r.resolved, at: r.created_at,
        replies: rows.filter((x) => x.parent_id === r.id).map((x) => ({ author: em[x.author], text: x.body, at: x.created_at })),
      }));
    }

    case "list_proposals": {
      const { d, order } = await loadDoc(c, a.document_id);
      let q = c.sb.from("proposals").select("*").eq("doc_id", d.id).order("updated_at", { ascending: false });
      if (a.status) q = q.eq("status", a.status);
      const rows = ok(await q, "proposals") as Record<string, any>[];
      const em = await emails(c, rows.map((r) => r.author));
      await track(c, name, d.id);
      return rows.slice(0, 50).map((p) => ({
        id: p.id, author: em[p.author], via: p.via, summary: p.prompt, status: p.status, updated_at: p.updated_at,
        changes: Object.keys(p.files || {}).map((k) => { const A = fields(d.files?.[k] ?? ""), P = fields(p.files[k]); return { slide: order.indexOf(k) + 1, fields: Object.fromEntries(Object.keys(P).filter((f) => P[f] !== A[f]).map((f) => [f, { approved: A[f] ?? "", proposed: P[f] }])) }; }),
      }));
    }

    case "approve_proposal": {
      const n = ok(await c.sb.rpc("approve_proposal", { p_id: a.proposal_id }), "approving");
      await track(c, name, null, { proposal: a.proposal_id });
      return { ok: true, version: n, note: "Published as the new approved version." };
    }
    case "reject_proposal": {
      ok(await c.sb.rpc("reject_proposal", { p_id: a.proposal_id }), "rejecting");
      await track(c, name, null, { proposal: a.proposal_id });
      return { ok: true };
    }

    case "list_versions": {
      const { d, order } = await loadDoc(c, a.document_id);
      const rows = ok(await c.sb.from("versions").select("n,msg,proposed_by,approved_by,via,changed,created_at").eq("doc_id", d.id).order("n"), "versions") as Record<string, any>[];
      const em = await emails(c, rows.flatMap((r) => [r.proposed_by, r.approved_by]));
      await track(c, name, d.id);
      return rows.map((v) => ({ version: v.n, message: v.msg, proposed_by: em[v.proposed_by], via: v.via, approved_by: em[v.approved_by], at: v.created_at, slides_changed: (v.changed || []).map((k: string) => order.indexOf(k) + 1) }));
    }

    case "get_usage_metrics": {
      const days = Math.min(Math.max(Number(a.window_days) || 30, 1), 90);
      const since = new Date(Date.now() - Math.max(days, 30) * 864e5).toISOString();
      const ev = ok(await c.sb.from("events").select("ts,user_id,type").gte("ts", since), "events") as { ts: string; user_id: string; type: string }[];
      const now = Date.now();
      const act = (ms: number) => new Set(ev.filter((e) => now - Date.parse(e.ts) < ms).map((e) => e.user_id)).size;
      const by: Record<string, number> = {};
      ev.filter((e) => now - Date.parse(e.ts) < days * 864e5).forEach((e) => (by[e.type] = (by[e.type] || 0) + 1));
      await track(c, name, null);
      const mau = act(30 * 864e5), dau = act(864e5);
      return { window_days: days, dau, wau: act(7 * 864e5), mau, stickiness_dau_mau: mau ? +(dau / mau).toFixed(2) : 0, events_by_type: by, scope: "your activity and activity on documents you own" };
    }
  }
  fail("Unknown tool: " + name);
}

const INSTRUCTIONS = "Meridiano Studio is a shared editor for presentations and long texts. Workflow: list_documents → read_document → propose_changes (or add_comment). Every change is a proposal that the whole room sees live; only the document owner approves it into a version. Keep the Meridiano voice: precise, calm, no hype. Never invent numbers; write [number] when a figure is missing. Keep the language of the text unless asked to translate.";

async function rpc(c: Ctx, m: Record<string, any>) {
  const id = m.id;
  try {
    switch (m.method) {
      case "initialize": {
        const v = VERSIONS.includes(m.params?.protocolVersion) ? m.params.protocolVersion : "2025-06-18";
        c.client = m.params?.clientInfo?.name || c.client;
        await track(c, "initialize", null, { client_info: m.params?.clientInfo ?? null });
        return { jsonrpc: "2.0", id, result: { protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "meridiano-studio", title: "Meridiano Studio", version: "4.0.0" }, instructions: INSTRUCTIONS } };
      }
      case "ping": return { jsonrpc: "2.0", id, result: {} };
      case "tools/list": return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
      case "tools/call": {
        try {
          const out = await call(c, m.params?.name, m.params?.arguments || {});
          return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(out, null, 2) }], structuredContent: Array.isArray(out) ? { items: out } : out } };
        } catch (e) {
          return { jsonrpc: "2.0", id, result: { isError: true, content: [{ type: "text", text: (e as Error).message }] } };
        }
      }
      default: return { jsonrpc: "2.0", id, error: { code: -32601, message: "Method not found: " + m.method } };
    }
  } catch (e) {
    return { jsonrpc: "2.0", id, error: { code: -32603, message: (e as Error).message } };
  }
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (url.pathname.endsWith("/.well-known/oauth-protected-resource") || url.pathname.endsWith("/.well-known/oauth-protected-resource/mcp")) {
    return json({ resource: BASE, authorization_servers: [`${SB_URL}/auth/v1`], bearer_methods_supported: ["header"], scopes_supported: ["openid", "email", "profile"], resource_name: "Meridiano Studio", resource_documentation: STUDIO });
  }
  if (req.method === "GET") {
    if ((req.headers.get("accept") || "").includes("text/event-stream")) return new Response("No server-initiated stream", { status: 405, headers: { ...CORS, Allow: "POST" } });
    return json({ name: "Meridiano Studio MCP", endpoint: BASE, transport: "streamable-http", auth: "OAuth 2.1 (Supabase Auth)", studio: STUDIO });
  }
  if (req.method === "DELETE") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const unauth = (why: string) => json({ error: "unauthorized", error_description: why }, 401, { "WWW-Authenticate": `Bearer realm="meridiano-studio", resource_metadata="${PRM}", error="invalid_token", error_description="${why}"` });
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token.startsWith("sb_")) return unauth("Sign in with your Meridiano Studio account");
  const sb = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: u, error } = await sb.auth.getUser(token);
  if (error || !u?.user) return unauth("Token expired or invalid");
  let client = "connector";
  try { const p = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))); client = p.client_id ? "oauth:" + p.client_id : "session"; } catch { /* ignore */ }
  const ctx: Ctx = { sb, uid: u.user.id, email: (u.user.email || "").toLowerCase(), client };

  let body: any;
  try { body = await req.json(); } catch { return json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, 400); }
  const msgs = Array.isArray(body) ? body : [body];
  const out = [];
  for (const m of msgs) { if (m && m.id !== undefined && m.method) out.push(await rpc(ctx, m)); }
  if (!out.length) return new Response(null, { status: 202, headers: CORS });
  return json(Array.isArray(body) ? out : out[0]);
});
