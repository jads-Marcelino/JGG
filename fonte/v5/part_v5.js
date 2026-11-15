
/* ===================== v5: slide versions, options, AI status ===================== */
function cleanHTML(h){return String(h||'').replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form)\b[\s\S]*?<\s*\/\s*\1\s*>/gi,'').replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form)\b[^>]*>/gi,'').replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi,'').replace(/(href|src|xlink:href)\s*=\s*("|')\s*javascript:[^"']*\2/gi,'$1="#"');}
function isVersion(p){return !!(p&&(p.group||p.order));}
function versionsOf(d){return openProps(d).filter(isVersion);}
function deckAfter(d,p){var order=(p.order&&p.order.length?p.order:d.order).slice(),files=Object.assign({},d.files,p.files||{});var removed=d.order.filter(function(k){return order.indexOf(k)<0});return {order:order,files:files,removed:removed};}
function changeKind(d,p,k){if(d.order.indexOf(k)<0)return 'new';if(p.files&&p.files[k]&&p.files[k]!==d.files[k])return 'changed';if(p.order&&p.order.indexOf(k)!==d.order.indexOf(k))return 'moved';return '';}

/* ---------- connector status (AI configured) ---------- */
var CONN_LAST=null;
function loadConnStatus(){if(!sb||!ME)return Promise.resolve();return sb.from('events').select('ts,meta,type').eq('user_id',ME).eq('type','mcp_call').gte('ts',new Date(now()-30*864e5).toISOString()).then(function(r){var rows=(r&&r.data)||[];rows.sort(function(a,b){return Date.parse(b.ts)-Date.parse(a.ts)});CONN_LAST=rows[0]||null;},function(){});}
var _keysReady=keysReady;keysReady=function(){var p=_keysReady();if(ME&&!loadConnStatus._for){loadConnStatus._for=ME;loadConnStatus().then(function(){if(RM){drawRight();if(RM.ide){ideTitle();ideStatus();}}});}return p;};
function aiStatus(){var c=aiConn();if(c)return {mode:'key',label:'AI ready · '+AIDEF[c.provider].label,detail:c.model};if(CONN_LAST)return {mode:'connector',label:'Claude connected',detail:'via your subscription'};return {mode:'none',label:'Connect AI',detail:''};}
connBadge=function(){var s=aiStatus(),c=aiConn();
 if(s.mode==='key')return '<div class="waiting" style="background:#EEF6F1;border:1px solid #CFE6D8;color:#1F6B42;margin:0 0 12px">✓ <b>&nbsp;AI configured&nbsp;</b> · '+AIDEF[c.provider].label+' · '+esc(c.model)+'<button class="btn sm" style="margin-left:auto" data-act="aiConnect">Settings</button></div>';
 if(s.mode==='connector')return '<div class="waiting" style="background:#EEF6F1;border:1px solid #CFE6D8;color:#1F6B42;margin:0 0 12px;flex-wrap:wrap">✓ <b>&nbsp;Your Claude is connected&nbsp;</b> (subscription). Ask in the Claude chat, e.g. “give me 3 options for slide 2 of '+esc(cur()?cur().name:'this deck')+'”. To run the AI here too, add an API key.<button class="btn sm" style="margin-left:auto" data-act="aiConnectM" data-v="key">Add key</button></div>';
 return '<div class="waiting" style="margin:0 0 12px">No AI connected yet. Use your Claude or ChatGPT.<button class="btn sm br" style="margin-left:auto" data-act="aiConnect">Connect</button></div>';};

/* ---------- version cards (proposals that redesign, add, remove or reorder slides) ---------- */
function versionCardsHTML(d){
 var vs=versionsOf(d);if(!vs.length)return '';var own=isOwner(d);var groups={},gorder=[];
 vs.slice().sort(function(a,b){return a.t-b.t}).forEach(function(p){var g=p.group||p.id;if(!groups[g]){groups[g]=[];gorder.push(g);}groups[g].push(p);});
 return '<p class="small" style="font-weight:700;letter-spacing:1.4px;text-transform:uppercase;margin:0 0 8px">New versions to review</p>'+gorder.reverse().map(function(g){var ps=groups[g];
  return '<div class="vgroup">'+(ps.length>1?'<p class="vg-h">'+ps.length+' options · pick one</p>':'')+ps.map(function(p){var after=deckAfter(d,p);var ks=after.order.filter(function(k){return changeKind(d,p,k)});
   var tags=[];var nn=ks.filter(function(k){return changeKind(d,p,k)==='new'}).length,nm=ks.filter(function(k){return changeKind(d,p,k)==='moved'}).length,nc=ks.length-nn-nm;if(nc)tags.push(nc+' redesigned');if(nn)tags.push(nn+' new');if(after.removed.length)tags.push(after.removed.length+' removed');if(nm)tags.push(nm+' moved');
   return '<div class="vcard'+(p.label?' opt':'')+'"><div class="h">'+(p.via!=='human'?av('claude','sm')+'<b>'+viaName(p)+'</b><span class="small">for '+esc(U(p.author).short)+'</span>':av(p.author,'sm')+'<b>'+esc(U(p.author).short)+'</b>')+(p.label?'<span class="optl">Option '+esc(p.label)+'</span>':'')+'<span class="small" style="margin-left:auto">'+ago(p.t)+'</span></div>'+
   (p.prompt?'<p class="vsum">'+esc(p.prompt)+'</p>':'')+'<p class="small" style="margin:2px 0 8px">'+esc(tags.join(' · ')||'no visible change')+' · '+after.order.length+' slides after approval</p>'+
   '<div class="vthumbs" data-act="vPrev" data-v="'+p.id+'">'+(ks.length?ks:after.order.slice(0,1)).slice(0,4).map(function(k){return '<div class="vthumb" data-p="'+p.id+'" data-k="'+k+'"><span class="vt-n">'+(after.order.indexOf(k)+1)+(changeKind(d,p,k)==='new'?' · new':'')+'</span></div>'}).join('')+(ks.length>4?'<div class="vmore">+'+(ks.length-4)+'</div>':'')+'</div>'+
   '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn sm" data-act="vPrev" data-v="'+p.id+'">◉ Preview</button>'+(own?'<button class="btn sm no" data-act="reject" data-v="'+p.id+'">Reject</button><button class="btn sm ok" style="flex:1" data-act="approve" data-v="'+p.id+'">✓ Approve as v'+(d.versions.length+1)+'</button>':(p.author===ME?'<button class="btn sm" data-act="reject" data-v="'+p.id+'">Withdraw</button>':'')+'<span class="small" style="align-self:center">Waiting for '+esc(U(d.owner).short)+'</span>')+'</div></div>';}).join('')+'</div>';}).join('')+'<div style="height:6px"></div>';
}
function hydrateVThumbs(root){var d=cur();if(!root||!d)return;root.querySelectorAll('.vthumb').forEach(function(t){if(t._done)return;t._done=true;var p=d.proposals.filter(function(x){return x.id===t.getAttribute('data-p')})[0];if(!p)return;var k=t.getAttribute('data-k');var h=(p.files&&p.files[k])||d.files[k]||'';thumb(t,h,d.kind);});}

/* ---------- full-screen preview of a proposed version ---------- */
var VP=null;
function openVersionPreview(pid){var d=cur();var p=d&&d.proposals.filter(function(x){return x.id===pid})[0];if(!p)return;var after=deckAfter(d,p);
 var first=after.order.filter(function(k){return changeKind(d,p,k)})[0];VP={pid:pid,i:Math.max(0,after.order.indexOf(first))};
 var bg=document.createElement('div');bg.className='modal-bg vp-bg';bg.id='vpModal';bg.onclick=function(e){if(e.target===bg)bg.remove();};document.body.appendChild(bg);drawVP();track('version_preview',ME,d.id,{proposal:pid});}
function drawVP(){var bg=document.getElementById('vpModal');if(!bg||!VP)return;var d=cur();var p=d.proposals.filter(function(x){return x.id===VP.pid})[0];if(!p){bg.remove();return;}var after=deckAfter(d,p);VP.i=Math.max(0,Math.min(VP.i,after.order.length-1));var k=after.order[VP.i],kind=changeKind(d,p,k);var own=isOwner(d);var open=p.status==='open';
 bg.innerHTML='<div class="vp"><div class="vp-h"><div style="min-width:0;flex:1"><p class="small" style="font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#C9A94E">'+(p.label?'Option '+esc(p.label)+' · ':'')+'Proposed version · '+esc(viaName(p)||U(p.author).short)+'</p><p class="vp-t">'+esc(p.prompt||'New version')+'</p></div><button class="btn sm" data-act="vpClose">×</button></div>'+
 '<div class="vp-stage"><div class="stage" id="vpStage"></div><span class="vp-badge '+kind+'">'+(kind==='new'?'New slide':kind==='changed'?'Redesigned':kind==='moved'?'Moved':'Unchanged')+'</span></div>'+
 (kind==='changed'?'<p class="small" style="color:#AFC1BA;margin-top:8px">Tap “Before” to compare with the approved slide.</p>':'')+
 '<div class="vp-nav"><button class="btn sm" data-act="vpGo" data-v="-1">‹</button><span>'+(VP.i+1)+' / '+after.order.length+'</span><button class="btn sm" data-act="vpGo" data-v="1">›</button>'+(kind==='changed'?'<button class="btn sm" data-act="vpBefore">Before</button>':'')+'<span style="flex:1"></span>'+(open&&own?'<button class="btn sm no" data-act="vpReject">Reject</button><button class="btn sm ok" data-act="vpApprove">✓ Approve as v'+(d.versions.length+1)+'</button>':'<span class="small" style="color:#AFC1BA">'+(open?'Only '+esc(U(d.owner).short)+' approves':esc(p.status))+'</span>')+'</div>'+
 '<div class="vp-strip">'+after.order.map(function(kk,i){var ck=changeKind(d,p,kk);return '<div class="vp-th '+(i===VP.i?'sel ':'')+ck+'" data-act="vpPick" data-v="'+i+'"><span>'+(i+1)+(ck==='new'?' · new':ck==='changed'?' · ✎':ck==='moved'?' · ↕':'')+'</span></div>'}).join('')+'</div>'+
 (after.removed.length?'<p class="small" style="color:#E7A57C;margin-top:8px">Removed in this version: '+after.removed.map(function(rk){return 'slide '+(d.order.indexOf(rk)+1)}).join(', ')+'</p>':'')+'</div>';
 mount(document.getElementById('vpStage'),VP.before?d.files[k]:after.files[k],d.kind);
 bg.querySelectorAll('.vp-th').forEach(function(t,i){thumb(t,after.files[after.order[i]],d.kind);});}

/* ---------- AI with the account key: new slides, redesigns, options ---------- */
var GUIDE_SLIDES_FE='Each slide is one HTML fragment drawn on a fixed 1920x1080 canvas. Root: <section style="position:absolute;inset:0;background:#0F2420;font-family:Karla,Arial,sans-serif;color:#EDEDE7"> ... </section>. Place every element with position:absolute and px values; side margins 128px. Palette: background #0F2420, panels #1D3A34, lines #365C53, brass #C9A94E, text #EDEDE7, muted #AFC1BA and #8FA79F (light slides may use #F8F6F1 with #0F2420 text). Type: Newsreader serif for titles and big numbers, Karla for labels and body. Eyebrow 24px bold, letter-spacing 3px, uppercase, brass, at left:128px top:128px. Title Newsreader 72px line-height 1.08 at top:180px. Big numbers up to 290px brass. Body at least 28px. Every editable text is a <p>, <h1> or <h2> with a unique data-edit="name" and plain text inside (<br> allowed). Shapes with <div> and inline <svg>. No <script>, <style>, <iframe>, event handlers, external images or fonts. One idea per slide. Keep the deck language. Never invent numbers: write [number]. Calm, precise Meridiano voice, no exclamation marks.';
var GUIDE_DOCS_FE='Each section is HTML. The first section starts with <h1 data-edit="title">…</h1><p class="meta" data-edit="meta">…</p>. Every section has <h2 data-edit="h">Heading</h2> then <p data-edit="p1">…</p>, <p data-edit="p2">… Plain text inside tags. Keep the language; never invent numbers or sources.';
var AIMODES=[['text','Edit text'],['redesign','Redesign slide'],['options','3 options'],['add','New slide'],['deck','Deck from comments']];
function buildVersion(d,op){var order=d.order,keyOf=function(n){return order[n-1];},files={},errs=[];
 (op.edit||[]).forEach(function(e){var k=keyOf(+e.slide),h=cleanHTML(e.html||'').trim();if(!k)errs.push('slide '+e.slide+' does not exist');else if(h)files[k]=h;});
 var list=order.slice(),drop={};(op.remove||[]).forEach(function(n){var k=keyOf(+n);if(k)drop[k]=1;});list=list.filter(function(k){return !drop[k]});
 (op.move||[]).forEach(function(m){var k=keyOf(+m.slide);if(!k||drop[k])return;list=list.filter(function(x){return x!==k});var a=+m.after||0,ak=keyOf(a);var i=a===0?0:(ak&&list.indexOf(ak)>=0?list.indexOf(ak)+1:list.length);list.splice(i,0,k);});
 var last={};(op.add||[]).forEach(function(n){var h=cleanHTML(n.html||'').trim();if(!h)return;var k='s'+uuid().replace(/-/g,'').slice(0,8);files[k]=h;var a=+n.after||0;var anchor=last[a]!==undefined?last[a]:(a===0?null:keyOf(a));var i=anchor===null?0:(anchor&&list.indexOf(anchor)>=0?list.indexOf(anchor)+1:list.length);list.splice(i,0,k);last[a]=k;});
 var structural=(op.add||[]).length||(op.remove||[]).length||(op.move||[]).length;return {files:files,order:structural?list:null,errs:errs};}
function aiDesign(mode,instr){
 var d=cur(),c=aiConn();if(!d)return;if(!canAI(d)){toast('The owner set AI to owner only',ME,true);return;}
 if(!c){openConnect(CONN_LAST?'key':'connector');return;}
 var n=d.order.indexOf(RM.path)+1,df=draftFiles(d),unit=d.kind==='doc'?'section':'slide';
 var ask={redesign:'Redesign '+unit+' '+n+': stronger layout and hierarchy, same message. Return 1 option editing '+unit+' '+n+'.',options:'Give 3 clearly different layout options for '+unit+' '+n+' (labels A, B, C), each editing only '+unit+' '+n+'.',add:'Add one new '+unit+' right after '+unit+' '+n+' that moves the story forward. Return 1 option using "add" with after='+n+'.',deck:'Read the open comments and propose ONE new version of the deck that addresses them: redesign, add, remove or move '+unit+'s as needed.'}[mode];
 var comments=d.comments.filter(function(x){return !x.resolved}).map(function(x){return '- '+unit+' '+(d.order.indexOf(x.path)+1)+' · '+U(x.author).short+': '+x.text;}).join('\n');
 var deckTxt=d.order.map(function(k,i){var T=texts(df[k]),o=[];Object.keys(T).forEach(function(f){o.push(f+': '+plain(T[f]).slice(0,160))});return unit+' '+(i+1)+' — '+o.join(' | ');}).join('\n');
 var htmls=mode==='deck'?d.order.slice(0,12).map(function(k,i){return '### '+unit+' '+(i+1)+'\n'+df[k];}).join('\n\n'):'### '+unit+' '+n+' (current HTML)\n'+df[RM.path];
 var sys='You are the design and writing assistant of Meridiano Studio (Meridiano Consulting: statistics, data and AI; strongest in the credit cycle). You produce NEW VERSIONS of '+unit+'s as HTML, for the owner to approve.\n'+(d.kind==='doc'?GUIDE_DOCS_FE:GUIDE_SLIDES_FE)+'\nReply with ONLY a JSON object, no code fences: {"reply":"one or two sentences to the team","options":[{"label":"A","summary":"one line","edit":[{"slide":N,"html":"..."}],"add":[{"after":N,"html":"..."}],"remove":[N],"move":[{"slide":N,"after":M}]}]}. Omit empty arrays. Numbers refer to the current order.';
 var user='Document: '+d.name+' ('+(d.kind==='doc'?'long-form text':'presentation')+', '+d.order.length+' '+unit+'s)\nOutline:\n'+deckTxt+'\n\n'+htmls+(comments?'\n\nOpen comments:\n'+comments:'')+'\n\nTask from '+U(ME).name+': '+ask+(instr?'\nExtra instruction: '+instr:'');
 var label=(AIMODES.filter(function(m){return m[0]===mode})[0]||['',''])[1]+(instr?' · '+instr:'')+' ('+unit+' '+n+')';
 d.chat.push({who:ME,html:esc(label),t:now()});var msg={who:'claude',html:'<i>'+AIDEF[c.provider].label+' is designing…</i>',t:now(),prov:c.provider};d.chat.push(msg);
 track('ai_request',ME,d.id,{prompt:label,provider:c.provider,model:c.model,mode:mode,real:true});if(RM.ide)ideOut('→ '+AIDEF[c.provider].label+' · '+c.model+' · '+label,'warn');
 d.presence.claude={path:RM.path,t:now(),typing:now()};RM.tab='ai';drawRight();
 var cc=Object.assign({},c,{maxTokens:mode==='deck'?16000:(mode==='options'?12000:6000)});
 callAI(cc,sys,user,function(full){if(window.ideStream)ideStream(full,c);msg.html='<p class="small" style="margin-bottom:3px">'+AIDEF[c.provider].label+' · designing · '+full.length+' characters</p><pre style="white-space:pre-wrap;font:11px/1.4 ui-monospace,Menlo,monospace;margin:0;max-height:120px;overflow:hidden">'+esc(full.slice(-400))+'</pre>';var R=el('.rright .rbody');if(R&&RM.tab==='ai'){var b=R.querySelectorAll('.msg.ai .bub');var lb=b[b.length-1];if(lb)lb.innerHTML=msg.html;R.scrollTop=R.scrollHeight;}})
 .then(function(full){var j;try{j=JSON.parse(full.replace(/^\s*```(json)?/,'').replace(/```\s*$/,'').trim());}catch(e){var m=full.match(/\{[\s\S]*\}/);try{j=m?JSON.parse(m[0]):null;}catch(e2){j=null;}}
  if(!j||!Array.isArray(j.options)||!j.options.length)throw new Error('The answer was not in the expected format. Try again or shorten the request.');
  var group='g-'+uuid().replace(/-/g,'').slice(0,8),made=0,chain=Promise.resolve();
  j.options.slice(0,4).forEach(function(op,i){var v=buildVersion(d,op);if(!Object.keys(v.files).length&&!v.order)return;var lab=j.options.length>1?(op.label||'ABCD'[i]):null;
   var row={id:uuid(),doc_id:d.id,author:ME,via:'ai',prompt:(op.summary||label)+' · '+AIDEF[c.provider].label,files:v.files,slide_order:v.order,option_group:group,option_label:lab,status:'open'};
   chain=chain.then(function(){return sb.from('proposals').insert(row).then(function(r){DB.err(r,'Saving version');made++;if(!d.proposals.some(function(x){return x.id===row.id}))d.proposals.push(mapProposal(Object.assign({updated_at:new Date().toISOString()},row)));});});});
  return chain.then(function(){msg.html=esc(j.reply||'Done.')+(made?'<div class="waiting" style="margin-top:8px">'+made+' new version'+(made>1?'s':'')+' to review · '+(isOwner(d)?'open Proposals to preview and approve':'waiting for '+esc(U(d.owner).short)+'’s approval')+'</div>':'<div class="waiting" style="margin-top:8px">No usable version came back.</div>');msg.t=now();if(RM.ide){var l0=RM.out[RM.out.length-1];if(l0)l0.stream=false;ideOut('✓ '+made+' version(s) created','ok');}
   delete d.presence.claude;refresh({all:true});if(made)toast('✦ '+made+' new version'+(made>1?'s':'')+' ready to review','claude');});
 }).catch(function(err){msg.html='<b>Could not finish.</b> '+esc(err.message||String(err));msg.t=now();if(RM.ide)ideOut('✗ '+(err.message||err),'warn');delete d.presence.claude;refresh({all:true});});
}
function aiModesHTML(d){var c=aiConn();RM.aimode=RM.aimode||'text';return '<div class="aimodes">'+AIMODES.map(function(m){return '<button data-act="aiMode" data-v="'+m[0]+'" class="'+(RM.aimode===m[0]?'on':'')+'">'+m[1]+'</button>'}).join('')+'</div>'+(RM.aimode!=='text'&&!c?'<p class="small" style="margin:6px 0 0">'+(CONN_LAST?'Your Claude is connected: ask for this in the Claude chat, or add an API key to run it here.':'Needs your AI: connect Claude or ChatGPT.')+'</p>':'');}

/* ---------- v5 clicks ---------- */
document.addEventListener('click',function(e){
 var a=e.target.closest('[data-act]');if(!a)return;var act=a.getAttribute('data-act'),v=a.getAttribute('data-v'),d=cur();
 switch(act){
  case 'vPrev':e.stopPropagation();openVersionPreview(v);break;
  case 'vpClose':var m=document.getElementById('vpModal');if(m)m.remove();break;
  case 'vpGo':VP.i+=(+v);VP.before=false;drawVP();break;
  case 'vpPick':VP.i=+v;VP.before=false;drawVP();break;
  case 'vpBefore':VP.before=!VP.before;drawVP();a=document.querySelector('[data-act="vpBefore"]');if(a)a.textContent=VP.before?'After':'Before';break;
  case 'vpApprove':var m2=document.getElementById('vpModal');if(m2)m2.remove();approve(VP.pid);break;
  case 'vpReject':var p=d.proposals.filter(function(x){return x.id===VP.pid})[0];var m3=document.getElementById('vpModal');if(m3)m3.remove();if(p)DB.reject(p.id).then(function(){p.status='rejected';refresh({all:true});toast('Version rejected',ME,true);}).catch(function(){});break;
  case 'aiMode':e.stopPropagation();RM.aimode=v;drawRight();break;
  case 'aiFree':
   if(RM&&RM.aimode&&RM.aimode!=='text'){e.stopPropagation();e.preventDefault();var q=(RM.ask||'').trim();RM.ask='';aiDesign(RM.aimode,q);break;}
   if(!aiConn()){var q2=(RM.ask||'').trim();if(!q2)break;e.stopPropagation();e.preventDefault();RM.ask='';d.chat.push({who:ME,html:esc(q2),t:now()});d.chat.push({who:'claude',html:CONN_LAST?'Your Claude is connected through the connector, so ask this in the <b>Claude chat</b>: it reads this deck and proposes new versions here. To get answers inside the Studio, add an API key in <b>Connect AI</b>.':'No AI is connected yet, so only the preset demo buttons work here. Connect your Claude or ChatGPT to get real answers and new slide versions.',t:now()});drawRight();}
   break;
 }
},true);
document.addEventListener('keydown',function(e){if(!document.getElementById('vpModal'))return;if(e.key==='ArrowRight'){VP.i++;VP.before=false;drawVP();}if(e.key==='ArrowLeft'){VP.i--;VP.before=false;drawVP();}if(e.key==='Escape'){document.getElementById('vpModal').remove();}});
