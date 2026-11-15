// Meridiano Studio · fetch an HTML file from a shared link (Drive, Docs, Dropbox, OneDrive, GitHub or any public page).
// Browsers cannot read most of these links directly (CORS), so the Studio asks this function, as the signed-in person.
import { createClient } from "npm:@supabase/supabase-js@2";

const SB_URL = Deno.env.get("SUPABASE_URL") ?? "https://oqokqkrczmdnhfwiwwdv.supabase.co";
const SB_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "sb_publishable_JNIa1DnBITfMvGDDAkYBaA_7A22onL6";
const MAX = 3_000_000;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info" };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

// turn share links into direct downloads
function direct(raw: string): string {
  const u = new URL(raw.trim());
  const h = u.hostname.toLowerCase();
  let m;
  if (h === "drive.google.com") {
    if ((m = u.pathname.match(/\/file\/d\/([^/]+)/))) return `https://drive.google.com/uc?export=download&id=${m[1]}`;
    const id = u.searchParams.get("id"); if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  }
  if (h === "docs.google.com" && (m = u.pathname.match(/\/document\/d\/([^/]+)/))) return `https://docs.google.com/document/d/${m[1]}/export?format=html`;
  if (h.endsWith("dropbox.com")) { u.searchParams.set("dl", "1"); return u.toString(); }
  if (h === "github.com" && (m = u.pathname.match(/^\/([^/]+)\/([^/]+)\/blob\/(.+)$/))) return `https://raw.githubusercontent.com/${m[1]}/${m[2]}/${m[3]}`;
  if (h === "gist.github.com" && !u.pathname.endsWith("/raw")) return raw.replace(/\/?$/, "/raw");
  if ((h === "1drv.ms" || h.endsWith("onedrive.live.com") || h.endsWith("sharepoint.com")) && !u.searchParams.has("download")) { u.searchParams.set("download", "1"); return u.toString(); }
  return u.toString();
}
// refuse local and private addresses
function blocked(u: URL): string | null {
  if (!/^https?:$/.test(u.protocol)) return "Only http and https links";
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h.endsWith(".localhost")) return "Local addresses are not allowed";
  if (/^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(h)) return "Private addresses are not allowed";
  if (h.includes(":") && (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80"))) return "Private addresses are not allowed";
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token.startsWith("sb_")) return json({ error: "Sign in to import from a link" }, 401);
  const sb = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: u, error } = await sb.auth.getUser(token);
  if (error || !u?.user) return json({ error: "Session expired, sign in again" }, 401);
  let body: { url?: string; doc_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid request" }, 400); }
  let target: string;
  try { target = direct(String(body.url || "")); } catch { return json({ error: "That is not a valid link" }, 400); }

  let url = new URL(target), res: Response | null = null;
  for (let hop = 0; hop < 6; hop++) {
    const why = blocked(url); if (why) return json({ error: why }, 400);
    try {
      res = await fetch(url, { redirect: "manual", headers: { "User-Agent": "MeridianoStudio/1.0 (+https://jads-marcelino.github.io/JGG/)", Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.5" }, signal: AbortSignal.timeout(15000) });
    } catch (e) { return json({ error: "Could not reach the link: " + (e as Error).message }, 502); }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) { url = new URL(res.headers.get("location")!, url); continue; }
    break;
  }
  if (!res) return json({ error: "No response" }, 502);
  if (!res.ok) return json({ error: res.status === 401 || res.status === 403 ? "The link is private. Share it as “anyone with the link” and try again." : res.status === 404 ? "File not found at that link." : "The site answered " + res.status }, 400);
  const type = (res.headers.get("content-type") || "").toLowerCase();
  if (type && !/html|text\/plain|octet-stream|xml/.test(type)) return json({ error: "That link is not an HTML file (" + type.split(";")[0] + ")." }, 400);
  const reader = res.body!.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > MAX) { try { reader.cancel(); } catch { /* */ } return json({ error: "The file is larger than 3 MB." }, 413); } chunks.push(value); }
  const buf = new Uint8Array(size); let o = 0; for (const c of chunks) { buf.set(c, o); o += c.length; }
  const html = new TextDecoder("utf-8").decode(buf);
  if (/accounts\.google\.com\/ServiceLogin|<title>[^<]*Sign in/i.test(html) || (url.hostname === "drive.google.com" && /Google Drive - Virus scan warning|uc-download-link/i.test(html) && !/<section|class="sl"/.test(html))) {
    return json({ error: "Google asked to sign in or confirm the download. Share the file as “anyone with the link”, or download it and choose it from Files." }, 400);
  }
  if (!/<[a-z!]/i.test(html)) return json({ error: "No HTML found at that link." }, 400);
  const cd = res.headers.get("content-disposition") || ""; const nm = (cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)/i) || [])[1];
  const name = decodeURIComponent(nm || url.pathname.split("/").pop() || url.hostname) || "link";
  await sb.from("events").insert({ user_id: u.user.id, email: (u.user.email || "").toLowerCase(), type: "import_link", doc_id: body.doc_id || null, meta: { host: url.hostname, bytes: size } });
  return json({ html, name, final_url: url.toString(), bytes: size });
});
