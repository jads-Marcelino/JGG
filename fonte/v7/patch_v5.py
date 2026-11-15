"""Applies v5 on top of the v4 app.html (run patch_v4.py first)."""
import os, sys
H = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(H, 'app.html')).read()
if 'v5: slide versions' in s: sys.exit('already patched')
def R(old, new):
    global s
    n = s.count(old)
    if n != 1: raise SystemExit(f'{n} matches: ' + old[:90])
    s = s.replace(old, new)
s = s.replace('</style></head><body>', open(os.path.join(H, 'part_v5.css')).read() + '</style></head><body>', 1)
R('/* ---------- events ---------- */', open(os.path.join(H, 'part_v5.js')).read() + '\n/* ---------- events ---------- */')
R('Meridiano Studio v4 ===================', 'Meridiano Studio v5 ===================')
# data: proposal fields for versions
R("function mapProposal(r){return {id:r.id,author:r.author,via:r.via,prompt:r.prompt,files:r.files||{},status:r.status,t:tms(r.updated_at||r.created_at),saved:true};}",
  "function mapProposal(r){return {id:r.id,author:r.author,via:r.via,prompt:r.prompt,files:r.files||{},status:r.status,t:tms(r.updated_at||r.created_at),saved:true,order:(r.slide_order&&r.slide_order.length)?r.slide_order:null,group:r.option_group||null,label:r.option_label||null};}")
R("function draftFiles(d){var f=clone(d.files);openProps(d).sort(", "function draftFiles(d){var f=clone(d.files);openProps(d).filter(function(p){return !isVersion(p)}).sort(")
R("if(RM.view==='draft'){var A=texts(d.files[RM.path]);openProps(d).forEach(function(p){if(!p.files[RM.path])return;",
  "if(RM.view==='draft'){var A=texts(d.files[RM.path]);openProps(d).forEach(function(p){if(!p.files[RM.path]||isVersion(p))return;")
# proposals panel: version cards first
R(" var op=openProps(d);var own=isOwner(d);\n var h=own?", " var op=openProps(d).filter(function(p){return !isVersion(p)});var own=isOwner(d);\n var h=own?")
R(" if(!op.length)h+='<div style=\"text-align:center;padding:26px 6px\">", " h+=versionCardsHTML(d);\n if(!op.length&&!versionsOf(d).length)h+='<div style=\"text-align:center;padding:26px 6px\">")
R("Bd.innerHTML=({ai:aiHTML,props:propsHTML,comments:commentsHTML,history:historyHTML})[RM.tab](d);", "Bd.innerHTML=({ai:aiHTML,props:propsHTML,comments:commentsHTML,history:historyHTML})[RM.tab](d);hydrateVThumbs(Bd);")
# AI modes in the room
R("'<textarea class=\"in\" rows=\"2\" data-model=\"ask\" placeholder=\"Ask anything about '", "aiModesHTML(d)+'<textarea class=\"in\" rows=\"2\" data-model=\"ask\" placeholder=\"Ask anything about '")
# longer answers for slide design
R("body={model:c.model,max_tokens:1500,system:system", "body={model:c.model,max_tokens:(c.maxTokens||1500),system:system")
# never render scripts or handlers from proposals
R("function mount(el,html,kind){", "function mount(el,html,kind){html=cleanHTML(html);")
R("function thumb(el,html,kind){", "function thumb(el,html,kind){html=cleanHTML(html);")
open(os.path.join(H, 'app.html'), 'w').write(s)
print('v5 patched', len(s))
