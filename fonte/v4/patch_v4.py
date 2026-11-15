"""Applies the v4 changes to app.html (v3 source) -> app.html (v4)."""
import os, re, sys
H = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(H, 'app.html')).read()
if 'v4 additions' in s:
    sys.exit('already patched')
css = open(os.path.join(H, 'part_v4.css')).read()
js = open(os.path.join(H, 'part_v4.js')).read()

def R(old, new, count=1):
    global s
    n = s.count(old)
    if n < 1:
        raise SystemExit('NOT FOUND: ' + old[:90])
    if count == 1 and n > 1:
        raise SystemExit(f'AMBIGUOUS ({n}): ' + old[:90])
    s = s.replace(old, new) if count != 1 else s.replace(old, new, 1)

# styles + script
s = s.replace('</style></head><body>', css + '</style></head><body>', 1)
R('/* ---------- events ---------- */', js + '\n/* ---------- events ---------- */')
R('Meridiano Studio v3 ===================', 'Meridiano Studio v4 ===================')
R('<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>Meridiano Studio</title>',
  '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n<meta name="theme-color" content="#0F2420">\n<title>Meridiano Studio</title>')

# router: keep the room session in AI Studio, IDE body class, close mobile menu
R("function render(){stopTimers();var r=route();if(r.name!=='#/room'&&r.name!=='#/view'){unsubscribe();RM=null;}",
  "function render(){stopTimers();var r=route();if(r.name!=='#/room'&&r.name!=='#/view'&&r.name!=='#/ide'){unsubscribe();RM=null;}document.body.classList.toggle('ide-on',r.name==='#/ide');var sb0=document.querySelector('.sheet-bg');if(sb0)sb0.remove();var nv=document.getElementById('nav');if(nv)nv.classList.remove('open');")
# nav: burger
R("(ME?'<div class=\"persona\" title=\"Signed in\">'", "'<button class=\"burger\" data-act=\"burger\" aria-label=\"Menu\">☰</button>'+(ME?'<div class=\"persona\" title=\"Signed in\">'")
R("<button class=\"btn sm\" data-act=\"signout\" style=\"margin-left:4px\">Sign out</button></div>':(sb?'<button class=\"btn pri sm\" data-go=\"#/signin\">Sign in</button>':''));}",
  "<button class=\"btn sm\" data-act=\"signout\" style=\"margin-left:4px\">Sign out</button></div>':(sb?'<button class=\"btn pri sm\" data-go=\"#/signin\">Sign in</button>':''));}")

# room: mobile bar, AI Studio button, sheet header, IDE hooks
R("v.innerHTML='<div id=\"room\"><div class=\"rtop\"></div><div class=\"rleft\"></div><div class=\"rcenter\"></div><div class=\"rright\"></div></div>';",
  "v.innerHTML='<div id=\"room\"><div class=\"rtop\"></div><div class=\"rleft\"></div><div class=\"rcenter\"></div><div class=\"rright\"></div><div class=\"mbar\"></div></div>';")
R("'<button class=\"btn sm\" data-act=\"share\">Share</button>", "'<button class=\"btn sm br\" data-go=\"#/ide/'+d.id+'\" title=\"Code, preview and AI chat side by side\">⌨ AI Studio</button><button class=\"btn sm\" data-act=\"share\">Share</button>")
R("function drawRight(){\n var d=cur(),R=el('.rright');if(!R)return;",
  "function drawRight(){\n if(RM&&RM.ide){ideChat();return;}\n var d=cur(),R=el('.rright');if(!R)return;var mb=el('.mbar');if(mb)mb.innerHTML=mbarHTML(d);")
R("R.innerHTML='<div class=\"tabs\">'", "R.innerHTML='<div class=\"sheet-h\"><i></i><button data-act=\"sheetClose\" aria-label=\"Close\">×</button></div><div class=\"tabs\">'")
R("function refresh(w){\n var r=route();", "function refresh(w){\n var r=route();\n if(r.name==='#/ide'&&cur()){ideRefresh(w);return;}")
R("case 'tab':RM.tab=v;drawRight();break;",
  "case 'tab':if(RM.ide){if(v!=='ai'){RM.side=v;document.getElementById('room').classList.add('side-open');if(isMobile()){RM.pane='files';document.getElementById('room').dataset.pane='files';ideMtabs();}ideAct();ideSide();}else if(isMobile()){RM.pane='ai';document.getElementById('room').dataset.pane='ai';ideMtabs();drawRight();}break;}RM.tab=v;drawRight();if(isMobile())sheet(true);break;")

# proposals from AI keys and from the connector
R("(p.via==='ai'?av('claude','sm')+'<b>Claude</b><span class=\"small\">for '+U(p.author).short+'</span>'",
  "(p.via!=='human'?av('claude','sm')+'<b>'+viaName(p)+'</b><span class=\"small\">for '+U(p.author).short+'</span>'")
R("var c=p.via==='ai'?'#C9A94E':U(p.author).color;ovl(st,e,c,(p.via==='ai'?'✦ Claude for '+U(p.author).short:U(p.author).short)+' · proposed')",
  "var c=p.via!=='human'?'#C9A94E':U(p.author).color;ovl(st,e,c,(p.via!=='human'?'✦ '+viaName(p)+' for '+U(p.author).short:U(p.author).short)+' · proposed')")
R("(v.via==='ai'?'✦ Claude for ':'')", "(v.via&&v.via!=='human'?'✦ '+viaName(v)+' for ':'')")
R("if(p){if(p.author===ME&&p.pending&&m.status==='open')return;Object.assign(p,m);}else d.proposals.push(m);",
  "if(p){if(p.author===ME&&p.pending&&m.status==='open')return;Object.assign(p,m);}else{d.proposals.push(m);if(m.via==='mcp'&&RM)toast('✦ '+esc(U(m.author).short)+'’s AI is writing a proposal through the connector','claude');}")

# AI output stream in AI Studio
R("callAI(c,SYS,user,function(full){", "callAI(c,SYS,user,function(full){if(window.ideStream)ideStream(full,c);")
R("track('ai_request',asker,d.id,{prompt:label,provider:c.provider,model:c.model,email:c.email,real:true});",
  "track('ai_request',asker,d.id,{prompt:label,provider:c.provider,model:c.model,email:c.email,real:true});if(RM&&RM.ide)ideOut('→ '+AIDEF[c.provider].label+' · '+c.model+' · '+label,'warn');")
R("var keys=Object.keys(j.changes).filter(function(k){return k in A;});",
  "var keys=Object.keys(j.changes).filter(function(k){return k in A;});if(RM&&RM.ide){var l0=RM.out[RM.out.length-1];if(l0)l0.stream=false;ideOut('✓ proposal ready · fields: '+(keys.join(', ')||'none'),'ok');}")
R(".catch(function(err){msg.html='<b>Could not reach '", ".catch(function(err){if(RM&&RM.ide)ideOut('✗ '+(err.message||err),'warn');msg.html='<b>Could not reach '")
R("d.chat.push({who:asker,html:esc(label),t:now()});track('ai_request',asker,d.id,{prompt:label});",
  "d.chat.push({who:asker,html:esc(label),t:now()});track('ai_request',asker,d.id,{prompt:label});if(RM&&RM.ide)ideOut('→ Demo AI · '+label,'warn');")

# connect modal actions (account-backed keys)
s = re.sub(r"case 'cp':.*?break;\n", "case 'cp':var bgm=document.getElementById('cnModal');if(bgm){bgm.dataset.provider=v;CN.provider=v;drawConnect();}break;\n", s, count=1, flags=re.S)
s = re.sub(r"case 'cSave':.*?break;\n",
  "case 'cSave':var cs=readConn();if(!cs.key){alert('Paste an API key.');break;}if(!document.getElementById('cOk').checked){alert('Confirm that the key belongs to your account with '+MYEMAIL+'.');break;}a.disabled=true;saveConn(cs).then(function(){track('ai_connect',ME,null,{provider:cs.provider,model:cs.model,email:cs.email,stored:'account'});var mb2=document.getElementById('cnModal');if(mb2)mb2.remove();toast(AIDEF[cs.provider].label+' saved to your account · '+esc(MYEMAIL),ME,true);if(RM){drawRight();if(RM.ide){ideTitle();ideStatus();}}}).catch(function(){a.disabled=false;});break;\n", s, count=1, flags=re.S)
s = re.sub(r"case 'cOff':.*?break;\n",
  "case 'cOff':var pv0=document.getElementById('cnModal').dataset.provider;if(!KEYS[pv0]){toast('No '+AIDEF[pv0].label+' key saved',ME,true);break;}DB.delKey(pv0).then(function(){var mb3=document.getElementById('cnModal');if(mb3)mb3.remove();toast(AIDEF[pv0].label+' key removed',ME,true);if(RM){drawRight();if(RM.ide){ideTitle();ideStatus();}}}).catch(function(){});break;\n", s, count=1, flags=re.S)
R("case 'aiFree':var q=(RM.ask||'').trim();if(!q)break;RM.ask='';", "case 'aiFree':var q=(RM.ask||'').trim();if(!q)break;RM.ask='';if(!canAI(d))break;")

# MCP and how-it-works pages: the hosted connector is live
R("<p style=\"font:13px ui-monospace,Menlo,monospace;margin-top:6px;word-break:break-all\">https://studio.meridiano-consulting.com/mcp</p><p class=\"small\" style=\"margin-top:6px\">Next step: Supabase Edge Function · Streamable HTTP · JSON-RPC 2.0</p>",
  "<p style=\"font:13px ui-monospace,Menlo,monospace;margin-top:6px;word-break:break-all\">'+esc(MCP_URL)+'</p><p class=\"small\" style=\"margin-top:6px\"><span class=\"pill ok\">Live</span> Supabase Edge Function · Streamable HTTP · JSON-RPC 2.0</p>")
R("OAuth 2.1 for people · scoped API keys for services (read-only analytics keys by default)", "OAuth 2.1: each person signs in with their Studio e-mail; the AI sees only what is shared with that e-mail")
R("Settings → Connectors → Add custom connector → paste the endpoint</p>", "Settings → Connectors → Add custom connector → paste the endpoint → sign in</p><button class=\"btn sm br\" style=\"margin-top:10px\" data-act=\"aiConnectM\" data-v=\"connector\">Step by step</button>")
R("The hosted endpoint for Claude and ChatGPT connectors is the next step.", "Claude and ChatGPT use the hosted endpoint, with the same permissions.")
R("'Each person connects Claude or ChatGPT with the same e-mail they sign in with'", "'Each person brings their own Claude or ChatGPT: as a connector on their plan, or an API key saved to their account','AI Studio: code, live preview and AI chat side by side, like an IDE'")


# home demo: fixed avatars (ids are not real accounts)
R("av('jadson')+av('gustavo')+av('gabriel')+av('claude')", "'<span class=\"av\" style=\"background:#A8832C\">JM</span><span class=\"av\" style=\"background:#2E8070\">GS</span><span class=\"av\" style=\"background:#2F6F86\">GT</span>'+av('claude')")

open(os.path.join(H, 'app.html'), 'w').write(s)
print('patched', len(s))
