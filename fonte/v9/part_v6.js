
/* ===================== v6: no demo AI · ask Claude · upload HTML from Claude ===================== */
/* uploaded Claude decks keep their own CSS inside a sandboxed frame (no scripts run) */
var _clean5=cleanHTML;
cleanHTML=function(h){var keep=[];h=String(h||'').replace(/<iframe sandbox="" data-ms-frame="1" srcdoc="[^"]*"[^>]*><\/iframe>/g,function(m){keep.push(m);return '\u0000F'+(keep.length-1)+'\u0000';});
 h=_clean5(h);return h.replace(/\u0000F(\d+)\u0000/g,function(m,i){return keep[+i];});};
function frameSlide(docHtml,bg){return '<section style="position:absolute;inset:0;overflow:hidden;background:'+(bg||'#fff')+'" data-ms-frame="1"><iframe sandbox="" data-ms-frame="1" srcdoc="'+esc(docHtml)+'" style="position:absolute;left:0;top:0;width:1920px;height:1080px;border:0" title="Uploaded slide"></iframe></section>';}
function isFrame(h){return /data-ms-frame="1"/.test(h||'');}

/* ---------- parse an HTML file into slides ---------- */
function parseUpload(text,d){
 var doc=new DOMParser().parseFromString(text,'text/html');doc.querySelectorAll('script,noscript').forEach(function(x){x.remove()});
 var out={format:'',slides:[]};
 // 1) Meridiano Studio export (or Claude following the Studio format)
 var st=doc.querySelector('#st');var sl=st?[].slice.call(st.children).filter(function(x){return x.classList.contains('sl')}):[];
 if(!sl.length)sl=[].slice.call(doc.querySelectorAll('div.sl'));
 if(sl.length){out.format='Meridiano Studio format · editable';sl.forEach(function(x){var h=x.innerHTML.trim();if(h)out.slides.push({html:h,native:true});});return out;}
 if(d.kind==='doc'){var dp=doc.querySelector('.docpage');if(dp){out.format='Meridiano text format · editable';var parts=dp.innerHTML.split(/(?=<h2 data-edit="h")/);var first=parts.shift()||'';if(parts.length){parts[0]=first+parts[0];}else parts=[first];parts.forEach(function(p){if(p.trim())out.slides.push({html:p.trim(),native:true});});return out;}}
 // 2) native sections drawn on 1920x1080
 var secs=[].slice.call(doc.querySelectorAll('body > section, body > div > section')).filter(function(s){return /position:\s*absolute/.test(s.getAttribute('style')||'')&&s.querySelector('[data-edit]');});
 if(secs.length){out.format='Meridiano slide sections · editable';secs.forEach(function(s){out.slides.push({html:s.outerHTML,native:true});});return out;}
 // 3) any HTML deck: one frame per slide, keeping the file's own styles
 var heads=[].slice.call(doc.head?doc.head.querySelectorAll('style,link[rel="stylesheet"],meta[charset]'):[]).map(function(x){return x.outerHTML}).join('\n')+[].slice.call(doc.body?doc.body.querySelectorAll('style'):[]).map(function(x){return x.outerHTML}).join('\n');
 var cands=[].slice.call(doc.querySelectorAll('.slide,[class*="slide"],section,[data-slide]')).filter(function(e){return !e.parentElement.closest('.slide,[class*="slide"],section,[data-slide]');}).filter(function(e){return (e.textContent||'').trim().length>0||e.querySelector('svg,img,canvas');});
 if(cands.length<2)cands=[doc.body];
 var force='<style>html,body{margin:0;width:1920px;height:1080px;overflow:hidden}.msx-slide{display:block!important;visibility:visible!important;opacity:1!important;transform:none!important;position:relative!important;left:0!important;top:0!important;width:1920px!important;min-height:1080px!important;margin:0!important}</style>';
 out.format=cands.length>1?'HTML deck from Claude · '+cands.length+' slides kept with their own design':'HTML page from Claude · kept as one slide';
 cands.forEach(function(e){var bgc=(e.getAttribute('style')||'').match(/background(?:-color)?:\s*([^;]+)/);var inner=e===doc.body?doc.body.innerHTML:(e.classList.add('msx-slide'),e.outerHTML);
  out.slides.push({html:frameSlide('<!DOCTYPE html><html><head><meta charset="utf-8">'+heads+force+'</head><body>'+inner+'</body></html>',bgc?bgc[1]:'#fff'),native:false});});
 return out;}

/* ---------- upload modal: choose what each uploaded slide does ---------- */
var UP=null;
function openUpload(){var d=cur();if(!d)return;if(!canEdit(d)){toast('Only the owner and editors can upload a new version',ME,true);return;}
 UP={step:1,name:'',parsed:null,map:[],whole:false};var bg=document.createElement('div');bg.className='modal-bg';bg.id='upModal';bg.onclick=function(e){if(e.target===bg)bg.remove();};document.body.appendChild(bg);drawUpload();}
function drawUpload(){var bg=document.getElementById('upModal');if(!bg)return;var d=cur(),unit=d.kind==='doc'?'section':'slide';
 if(UP.step===1){bg.innerHTML='<div class="modal" style="width:620px"><h2 class="t">Upload a version from Claude</h2><p class="muted" style="margin:6px 0 14px;line-height:1.5">Bring the HTML file Claude made: a full deck or a few '+unit+'s. You choose what it replaces, and it arrives as a new version for '+esc(U(d.owner).short)+' to approve.</p>'+
  '<label class="upbox"><input type="file" id="upFile" accept=".html,.htm,text/html" style="display:none"><b>Choose an HTML file</b><span class="small">From Files, iCloud or Downloads</span></label>'+
  '<p class="small" style="margin:12px 0 6px;font-weight:700;letter-spacing:1px;text-transform:uppercase">Or paste the HTML</p><textarea class="in" id="upPaste" rows="5" placeholder="&lt;!DOCTYPE html&gt;…" style="font:12px ui-monospace,Menlo,monospace"></textarea>'+
  '<p class="small" id="upMsg" style="min-height:18px;margin:8px 0;color:#9A3B1B"></p><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><button class="btn" data-act="upPrompt">Copy prompt for Claude</button><div style="display:flex;gap:8px"><button class="btn" data-act="close">Cancel</button><button class="btn pri" data-act="upRead">Continue</button></div></div></div>';
  var f=document.getElementById('upFile');f.onchange=function(){var file=f.files[0];if(!file)return;if(file.size>3e6){document.getElementById('upMsg').textContent='This file is larger than 3 MB. Ask Claude for a lighter version.';return;}var r=new FileReader();r.onload=function(){UP.name=file.name;upParse(String(r.result));};r.readAsText(file);};return;}
 var P=UP.parsed,n=d.order.length;
 var rows=P.slides.map(function(s,i){var m=UP.map[i];return '<div class="uprow"><div class="upth" data-i="'+i+'"><span>'+(i+1)+'</span></div><div style="flex:1;min-width:0"><p style="font-weight:700">Uploaded '+unit+' '+(i+1)+(s.native?'':' <span class="pill">own design</span>')+'</p><select class="in" data-up="'+i+'" '+(UP.whole?'disabled':'')+' style="margin-top:6px"><option value="skip" '+(m==='skip'?'selected':'')+'>Skip</option>'+
  d.order.map(function(k,j){return '<option value="r'+(j+1)+'" '+(m==='r'+(j+1)?'selected':'')+'>Replace '+unit+' '+(j+1)+' · '+esc(plain(texts(d.files[k]).title||texts(d.files[k]).h||'').slice(0,40))+'</option>'}).join('')+
  '<option value="add" '+(m==='add'?'selected':'')+'>Add as a new '+unit+' at the end</option></select></div></div>'}).join('');
 var sum=upSummary();
 bg.innerHTML='<div class="modal" style="width:720px"><h2 class="t">What should this version change?</h2><p class="muted" style="margin:6px 0 4px">'+esc(UP.name||'Pasted HTML')+' · '+esc(P.format)+'</p>'+
  '<div class="seg" style="margin:10px 0 12px"><button data-act="upWhole" data-v="0" class="'+(!UP.whole?'on':'')+'">Only specific '+unit+'s</button><button data-act="upWhole" data-v="1" class="'+(UP.whole?'on':'')+'">Replace the whole deck</button></div>'+
  (UP.whole?'<p class="small" style="margin-bottom:10px">The deck becomes exactly the '+P.slides.length+' uploaded '+unit+'s; the current '+n+' are removed in this version.</p>':'<p class="small" style="margin-bottom:10px">Pick, for each uploaded '+unit+', which current '+unit+' it replaces, or add it as new.</p>')+
  '<div class="uplist">'+rows+'</div><div class="waiting" style="margin-top:12px">'+esc(sum.text)+'</div>'+
  '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:14px"><button class="btn" data-act="upBack">← Back</button><button class="btn pri" data-act="upCreate" '+(sum.ok?'':'disabled')+'>Create v'+(d.versions.length+1)+' for approval</button></div></div>';
 bg.querySelectorAll('.upth').forEach(function(t){thumb(t,P.slides[+t.getAttribute('data-i')].html,d.kind);});
 bg.querySelectorAll('select[data-up]').forEach(function(s){s.onchange=function(){UP.map[+s.getAttribute('data-up')]=s.value;drawUpload();};});}
function upParse(text){var d=cur(),msg=document.getElementById('upMsg');if(!/<[a-z!]/i.test(text||'')){if(msg)msg.textContent='That does not look like HTML.';return;}
 var P;try{P=parseUpload(text,d);}catch(e){if(msg)msg.textContent='Could not read this HTML: '+e.message;return;}
 if(!P.slides.length){if(msg)msg.textContent='No slides found in this file.';return;}
 UP.parsed=P;UP.step=2;var cn=d.order.indexOf(RM.path)+1,N=P.slides.length;UP.whole=N>1&&N!==d.order.length;UP.map=P.slides.map(function(s,i){return N===1?'r'+cn:(i<d.order.length?'r'+(i+1):'add');});drawUpload();}
function upSummary(){var d=cur(),P=UP.parsed,unit=d.kind==='doc'?'section':'slide';if(UP.whole)return {ok:true,text:'New version: '+P.slides.length+' '+unit+'s replace the current '+d.order.length+'.'};
 var rep=[],add=0,seen={},dup=false;UP.map.forEach(function(m){if(m==='add')add++;else if(m&&m[0]==='r'){if(seen[m])dup=true;seen[m]=1;rep.push(+m.slice(1));}});
 if(dup)return {ok:false,text:'Two uploaded '+unit+'s replace the same '+unit+'. Pick one.'};if(!rep.length&&!add)return {ok:false,text:'Nothing selected yet.'};
 return {ok:true,text:'New version: '+(rep.length?'replaces '+unit+' '+rep.sort(function(a,b){return a-b}).join(', '):'')+(rep.length&&add?' and ':'')+(add?'adds '+add+' new '+unit+(add>1?'s':''):'')+'.'};}
function upCreate(){var d=cur(),P=UP.parsed,files={},order=null;var nk=function(){return 's'+uuid().replace(/-/g,'').slice(0,8);};
 if(UP.whole){order=[];P.slides.forEach(function(s){var k=nk();files[k]=cleanHTML(s.html);order.push(k);});}
 else{var adds=[];UP.map.forEach(function(m,i){var h=cleanHTML(P.slides[i].html);if(m==='add'){var k=nk();files[k]=h;adds.push(k);}else if(m&&m[0]==='r'){files[d.order[+m.slice(1)-1]]=h;}});if(adds.length)order=d.order.concat(adds);}
 var row={id:uuid(),doc_id:d.id,author:ME,via:'human',prompt:'Imported · '+(UP.name||'pasted HTML'),files:files,slide_order:order,option_group:'up-'+uuid().slice(0,8),option_label:null,status:'open'};
 var b=document.querySelector('[data-act="upCreate"]');if(b){b.disabled=true;b.textContent='Creating…';}
 sb.from('proposals').insert(row).then(function(r){DB.err(r,'Uploading version');if(!d.proposals.some(function(x){return x.id===row.id}))d.proposals.push(mapProposal(Object.assign({updated_at:new Date().toISOString()},row)));track('upload_version',ME,d.id,{slides:P.slides.length,whole:UP.whole,format:P.format});
  var m=document.getElementById('upModal');if(m)m.remove();toast('New version uploaded · waiting for '+esc(U(d.owner).short)+'’s approval',ME,true);RM.tab='props';if(RM.ide){RM.side='props';ideAct();ideSide();}refresh({all:true});drawRight();if(isMobile()&&!RM.ide)sheet(true);}).catch(function(){if(b){b.disabled=false;b.textContent='Try again';}});}

/* ---------- ask Claude from the Studio (scope: all, this, specific) ---------- */
function scopeList(d){var s=RM.scope||'this',n=d.order.indexOf(RM.path)+1;if(s==='all')return d.order.map(function(k,i){return i+1});if(s==='pick'){var l=String(RM.pick||'').split(/[^0-9]+/).map(Number).filter(function(x){return x>=1&&x<=d.order.length});return l.length?l.filter(function(x,i,a){return a.indexOf(x)===i}):[n];}return [n];}
function claudePrompt(d,withHtml){var unit=d.kind==='doc'?'section':'slide',L=scopeList(d),all=(RM.scope==='all');var req=(RM.ask||'').trim()||'Improve these '+unit+'s: clearer message, stronger layout, same facts.';
 if(!withHtml)return 'Use the Meridiano Studio connector.\nDocument: "'+d.name+'" (id '+d.id+').\nScope: '+(all?'all '+d.order.length+' '+unit+'s':unit+(L.length>1?'s ':' ')+L.join(', '))+'.\nRequest: '+req+'\n\nRead the document with include_html and follow get_design_guide. Propose the result with propose_slides as a new version for approval'+(/option|alternativ|op[cç][aã]o|opç/i.test(req)?' (one call per option, same option_group)':'')+'. Do not change '+unit+'s outside the scope.';
 var df=draftFiles(d);var guide=d.kind==='doc'?GUIDE_DOCS_FE:GUIDE_SLIDES_FE;
 return 'You are editing a Meridiano Studio '+(d.kind==='doc'?'document':'presentation')+': "'+d.name+'".\n\nRequest: '+req+'\nScope: '+(all?'all '+unit+'s':unit+(L.length>1?'s ':' ')+L.join(', '))+'.\n\nFormat rules:\n'+guide+'\n\nReturn ONE complete HTML file and nothing else. Inside <body>, put <div id="st"> and, for every '+unit+' you return, one <div class="sl"> containing that '+unit+'’s HTML'+(d.kind==='doc'?'':' (a single <section> following the rules)')+', in order. Return '+(all?'the whole deck':'only the '+unit+'s in the scope')+'.\n\nCurrent '+unit+'s:\n'+(all?d.order.map(function(k,i){return i+1}):L).map(function(i){return '### '+unit+' '+i+'\n'+df[d.order[i-1]];}).join('\n\n');}
function copyText(t,okMsg){(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){toast(okMsg||'Copied',null,true);},function(){var ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();try{document.execCommand('copy');toast(okMsg||'Copied',null,true);}catch(e){prompt('Copy this',t);}ta.remove();});}
function openInClaude(d){var p=claudePrompt(d,false);copyText(p,'Request copied · paste it in Claude if it does not appear');track('ask_claude',ME,d.id,{scope:RM.scope||'this',slides:scopeList(d)});window.open('https://claude.ai/new?q='+encodeURIComponent(p),'_blank','noopener');}

/* ---------- the new AI panel (room and AI Studio) ---------- */
function aiPanel(d,ide){
 var unit=d.kind==='doc'?'section':'slide',n=d.order.indexOf(RM.path)+1,c=aiConn(),st=aiStatus();RM.scope=RM.scope||'this';
 if(!canAI(d))return '<div class="'+(ide?'ide-empty':'')+'" style="text-align:center;padding:26px 8px"><p style="font:400 21px Newsreader;color:'+(ide?'#EDEDE7':'var(--g)')+'">'+(canEdit(d)?'AI is set to owner only':'Commenters can’t use the AI')+'</p><p class="small" style="margin-top:8px;line-height:1.5">Leave a comment with what you would change. '+esc(U(d.owner).short)+' turns comments into new versions with Claude.</p><button class="btn sm pri" style="margin-top:14px" data-act="tab" data-v="comments">Write a comment</button></div>';
 var chat=d.chat.filter(function(m){return m.prov||m.who!=='claude'||m.real}).map(function(m){return '<div class="msg '+(m.who==='claude'?'ai':(m.who===ME?'me':''))+'">'+av(m.who,'sm')+'<div class="bub"><p class="small" style="margin-bottom:3px"><b>'+(m.prov?AIDEF[m.prov].label:(m.who==='claude'?'Studio':U(m.who).short))+'</b> · '+ago(m.t)+'</p>'+m.html+'</div></div>'}).join('');
 var scope='<div class="aimodes"><button data-act="aiScope" data-v="this" class="'+(RM.scope==='this'?'on':'')+'">This '+unit+' ('+n+')</button><button data-act="aiScope" data-v="all" class="'+(RM.scope==='all'?'on':'')+'">All '+unit+'s</button><button data-act="aiScope" data-v="pick" class="'+(RM.scope==='pick'?'on':'')+'">Specific…</button></div>'+(RM.scope==='pick'?'<input class="in" data-model="pick" placeholder="e.g. 1, 3, 4" style="margin-bottom:8px;padding:7px 10px">':'');
 var connLine=st.mode==='none'?'<p class="small" style="margin:0 0 8px">Connect the Studio to your Claude once (Connect AI), then requests go straight from here.</p>':'';
 return '<div class="aip">'+(ide?'':connBadge())+
  '<p class="aip-h">✦ Ask Claude</p><p class="small" style="margin:-2px 0 8px;line-height:1.45">Write what you want. Claude opens with the request ready, works on this deck through the connector and sends back a new version for approval.</p>'+connLine+scope+
  '<textarea class="in" rows="3" data-model="ask" placeholder="e.g. 3 layout options for this slide · make every slide shorter · add a next-steps slide"></textarea>'+
  '<div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn sm br" data-act="askClaude" style="flex:1">Open in Claude ↗</button><button class="btn sm" data-act="copyClaude" title="For a Claude chat without the connector: Claude returns an HTML file you upload here">Copy prompt for HTML</button></div>'+
  '<p class="aip-h" style="margin-top:18px">⤒ Upload from Claude</p><p class="small" style="margin:-2px 0 8px;line-height:1.45">Got an HTML file from Claude? Upload it and choose: replace the whole deck or only some '+unit+'s. It becomes v'+(d.versions.length+1)+' after approval.</p><button class="btn sm" data-act="upOpen" style="width:100%">Upload HTML file…</button>'+
  (c?'<p class="aip-h" style="margin-top:18px">⚡ Run here · '+AIDEF[c.provider].label+'</p>'+aiModesHTML(d)+'<div style="display:flex;justify-content:flex-end;margin-top:4px"><button class="btn sm br" data-act="aiFree">✦ Generate here</button></div>':'')+
  (chat?'<p class="aip-h" style="margin-top:18px">Activity</p>'+chat:'')+'</div>';
}
aiHTML=function(d){return aiPanel(d,false);};
ideChat=function(){var d=cur(),R=el('.ide-chat');if(!R)return;if(R.contains(document.activeElement)){RM.pendingRight=true;return;}var c=aiConn(),st=aiStatus();
 R.innerHTML='<div class="ch"><span style="font:700 10.5px Karla;letter-spacing:1.4px;text-transform:uppercase;color:var(--tx2)">AI</span><span style="flex:1"></span><button class="model" data-act="aiConnect"><span class="dot '+(st.mode!=='none'?'':'off')+'"></span>'+(c?'AI ready · '+AIDEF[c.provider].label+' · '+esc(c.model):st.label)+' ▾</button></div><div class="rbody">'+aiPanel(d,true)+'</div>';
 R.querySelectorAll('[data-model]').forEach(function(i){i.value=RM[i.getAttribute('data-model')]||'';i.oninput=function(){RM[i.getAttribute('data-model')]=i.value;};});};

/* ---------- v6 clicks ---------- */
document.addEventListener('click',function(e){
 var a=e.target.closest('[data-act]');if(!a)return;var act=a.getAttribute('data-act'),v=a.getAttribute('data-v'),d=cur();
 switch(act){
  case 'aiScope':e.stopPropagation();RM.scope=v;drawRight();break;
  case 'askClaude':e.stopPropagation();if(d)openInClaude(d);break;
  case 'copyClaude':e.stopPropagation();if(d){copyText(claudePrompt(d,true),'Prompt copied · paste it in Claude, then upload the HTML it returns');track('ask_claude_html',ME,d.id,{scope:RM.scope||'this'});}break;
  case 'upOpen':e.stopPropagation();openUpload();break;
  case 'upPrompt':e.stopPropagation();if(d){RM.scope=RM.scope||'all';copyText(claudePrompt(d,true),'Prompt copied · paste it in Claude');}break;
  case 'upRead':e.stopPropagation();var t=(document.getElementById('upPaste')||{}).value||'';if(!t.trim()){document.getElementById('upMsg').textContent='Choose a file or paste the HTML.';break;}UP.name='Pasted HTML';upParse(t);break;
  case 'upWhole':e.stopPropagation();UP.whole=v==='1';drawUpload();break;
  case 'upBack':e.stopPropagation();UP.step=1;drawUpload();break;
  case 'upCreate':e.stopPropagation();if(upSummary().ok)upCreate();break;
  case 'applyAI':if(aiConn())break;e.stopPropagation();e.preventDefault();var cc=d&&d.comments.filter(function(x){return x.id===v})[0];if(!cc)break;RM.path=cc.path;RM.scope='this';RM.ask='Apply this comment from '+U(cc.author).name+': '+cc.text;DB.updComment(cc.id,{applied:true}).catch(function(){});cc.applied=true;openInClaude(d);RM.tab='ai';drawLeft();drawCenter();drawRight();break;
 }
},true);

/* keep the room on a slide that still exists after a version changes the order */
var _refresh6=refresh;refresh=function(w){w=w||{};var d=cur();
 if(RM&&d&&d.order.length&&d.order.indexOf(RM.path)<0){RM.path=d.order[0];if(RM.ide){RM.open=[RM.path];ideTabs();ideCode(true);}else{drawCenter();drawLeft();}}
 else if(RM&&d&&!RM.ide&&w.all&&route().name==='#/room'){var st=document.getElementById('rStage');if(!(st&&st.contains(document.activeElement))&&RM._vn!==d.versions.length){RM._vn=d.versions.length;drawCenter();}}
 return _refresh6(w);};
