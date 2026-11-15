
/* ===================== v4 additions ===================== */
var MCP_URL=(SB_URL.indexOf('http')===0?SB_URL:'https://oqokqkrczmdnhfwiwwdv.supabase.co')+'/functions/v1/mcp';
function isMobile(){return window.matchMedia&&matchMedia('(max-width:860px)').matches;}
function viaName(p){if(!p||!p.via||p.via==='human')return '';if(p.via==='mcp')return 'AI connector';var t=(p.prompt||p.msg||'');return /ChatGPT/.test(t)?'ChatGPT':/Claude/.test(t)?'Claude':'AI';}

/* ---------- AI keys saved to the account (bound to the sign-in e-mail) ---------- */
var KEYS={},KEYS_FOR=null,KEYS_P=null;
DB.loadKeys=function(){if(!sb||!ME)return Promise.resolve(KEYS);return sb.from('ai_keys').select('*').then(function(r){if(r&&r.error){console.warn(r.error);return KEYS;}KEYS={};(r.data||[]).forEach(function(k){KEYS[k.provider]=k;});return KEYS;});};
DB.saveKey=function(c){var row={user_id:ME,provider:c.provider,email:MYEMAIL,api_key:c.key,model:c.model,updated_at:new Date().toISOString()};
 return sb.from('ai_keys').delete().eq('provider',c.provider).then(function(r){DB.err(r,'Saving key');return sb.from('ai_keys').insert(row);}).then(function(r){DB.err(r,'Saving key');KEYS[c.provider]=row;});};
DB.delKey=function(p){return sb.from('ai_keys').delete().eq('provider',p).then(function(r){DB.err(r,'Removing key');delete KEYS[p];});};
function keysReady(){if(!ME)return Promise.resolve();if(KEYS_FOR!==ME||!KEYS_P){KEYS_FOR=ME;KEYS={};KEYS_P=DB.loadKeys().catch(function(){return KEYS;});}return KEYS_P;}
aiConn=function(){var ks=Object.keys(KEYS).map(function(p){return KEYS[p]}).filter(function(k){return k&&k.email===MYEMAIL&&k.api_key;}).sort(function(a,b){return Date.parse(b.updated_at||0)-Date.parse(a.updated_at||0)});var k=ks[0];return k?{provider:k.provider,model:k.model||AIDEF[k.provider].model,key:k.api_key,email:k.email}:null;};
saveConn=function(c){return c?DB.saveKey(c):Promise.resolve();};
var _setSession=setSession;setSession=function(s){var r=_setSession(s);if(ME)keysReady().then(function(){if(RM)drawRight();});else{KEYS={};KEYS_FOR=null;KEYS_P=null;}return r;};

connBadge=function(){var c=aiConn();return c?'<div class="waiting" style="background:#EEF6F1;border:1px solid #CFE6D8;color:#1F6B42;margin:0 0 12px">✓ '+AIDEF[c.provider].label+' · '+esc(c.model)+' · '+esc(c.email)+'<button class="btn sm" style="margin-left:auto" data-act="aiConnect">Change</button></div>':'<div class="waiting" style="margin:0 0 12px">Demo AI is answering. Connect <b>&nbsp;your&nbsp;</b> Claude or ChatGPT for real generation.<button class="btn sm br" style="margin-left:auto" data-act="aiConnect">Connect</button></div>';};

/* ---------- Connect your AI: subscription via connector, or API key on the account ---------- */
var CN={mode:'connector',provider:'claude'};
openConnect=function(mode){
 var c=aiConn();if(mode)CN.mode=mode;var bg=document.createElement('div');bg.className='modal-bg';bg.id='cnModal';
 bg.onclick=function(e){if(e.target===bg)bg.remove();};document.body.appendChild(bg);
 bg.dataset.provider=(c&&c.provider)||CN.provider;drawConnect();
 sb.from('events').select('ts,meta,type').eq('user_id',ME).eq('type','mcp_call').gte('ts',new Date(now()-30*864e5).toISOString()).then(function(r){var rows=(r&&r.data)||[];rows.sort(function(a,b){return Date.parse(b.ts)-Date.parse(a.ts)});CN.last=rows[0]||null;if(document.getElementById('cnModal'))drawConnect();});
};
function drawConnect(){
 var bg=document.getElementById('cnModal');if(!bg)return;var c=aiConn(),p=bg.dataset.provider,u=U(ME),k=KEYS[p];
 var seg='<div class="seg" style="margin:4px 0 14px"><button data-act="cnMode" data-v="connector" class="'+(CN.mode==='connector'?'on':'')+'">Use my subscription</button><button data-act="cnMode" data-v="key" class="'+(CN.mode==='key'?'on':'')+'">API key in the Studio</button></div>';
 var prov='<div class="seg" style="margin-bottom:12px"><button data-act="cp" data-v="claude" class="'+(p==='claude'?'on':'')+'">Claude</button><button data-act="cp" data-v="openai" class="'+(p==='openai'?'on':'')+'">ChatGPT</button></div>';
 var body;
 if(CN.mode==='connector'){
  var last=CN.last?'<div class="waiting" style="background:#EEF6F1;border:1px solid #CFE6D8;color:#1F6B42;margin:10px 0 0">✓ Connector in use · last call '+ago(Date.parse(CN.last.ts))+(CN.last.meta&&CN.last.meta.tool?' · '+esc(CN.last.meta.tool):'')+'</div>':'';
  var steps=p==='claude'?
   '<ol><li>In Claude on the web or desktop, open <b>Settings → Connectors</b> and choose <b>Add custom connector</b>.</li><li>Name it <b>Meridiano Studio</b> and paste the address below.</li><li>Click <b>Connect</b> and sign in with <b>'+esc(u.email)+'</b>, then allow access.</li><li>In any chat: <i>“Open my Meridiano document and tighten slide 3.”</i> The change appears here, live, as a proposal.</li></ol><p class="small" style="margin-top:6px">After it is added on the web, it also works in the Claude app on iPad and iPhone.</p>':
   '<ol><li>In ChatGPT (Plus or Pro), open <b>Settings → Apps &amp; Connectors</b> and turn on developer mode under Advanced.</li><li>Create a connector named <b>Meridiano Studio</b> with the address below and OAuth authentication.</li><li>Sign in with <b>'+esc(u.email)+'</b> and allow access.</li><li>Ask ChatGPT to edit a document; it proposes the change here, live.</li></ol>';
  body='<div class="connect-opt on"><p style="line-height:1.5">Your own '+(p==='claude'?'Claude':'ChatGPT')+' plan does the work. It connects to the Studio and signs in with your Studio account, so it can only open what is shared with <b>'+esc(u.email)+'</b>, and everything it writes is a proposal the owner approves.</p>'+steps+
   '<div class="urlbox" style="margin-top:10px"><span>'+esc(MCP_URL)+'</span><button class="btn sm" data-act="copy" data-v="'+esc(MCP_URL)+'">Copy</button></div>'+last+'</div>'+
   '<p class="small" style="line-height:1.5">Why not your Claude or ChatGPT password? Neither service lets other apps sign in with it. The connector is the supported way to use your plan: you sign in to the Studio from inside your AI.</p>';
 } else {
  body='<p class="muted" style="margin-bottom:12px;line-height:1.5">The AI runs inside the Studio, in the AI Studio panel and the room. The key is saved to your Studio account, readable only by you, and works on any device you sign in on. It is billed by '+(p==='claude'?'Anthropic':'OpenAI')+' per use.</p>'+prov+
  '<div class="field"><label>Account e-mail (must match your sign-in)</label><input class="in" value="'+esc(u.email)+'" readonly style="background:#F4F5F2"></div>'+
  '<div class="field"><label>API key</label><input class="in" id="cKey" type="password" autocomplete="off" placeholder="'+AIDEF[p].keyHint+'" value="'+esc(k&&k.api_key||'')+'"><span class="small" id="cWhere">Create it at '+AIDEF[p].where+', signed in as '+esc(u.email)+'.</span></div>'+
  '<div class="field"><label>Model</label><input class="in" id="cModel" value="'+esc(k&&k.model||AIDEF[p].model)+'"></div>'+
  '<label style="display:flex;gap:8px;align-items:flex-start;margin-bottom:14px;line-height:1.4"><input type="checkbox" id="cOk" '+(k?'checked':'')+'> <span>This key belongs to my '+(p==='claude'?'Claude':'ChatGPT')+' account registered with <b>'+esc(u.email)+'</b>.</span></label>'+
  '<p class="small" id="cMsg" style="min-height:18px;margin-bottom:10px"></p>'+
  '<div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap"><button class="btn no" data-act="cOff">Remove key</button><div style="display:flex;gap:8px"><button class="btn" data-act="cTest">Test</button><button class="btn pri" data-act="cSave">Save to my account</button></div></div>';
 }
 bg.innerHTML='<div class="modal" style="width:600px"><h2 class="t">Connect your AI</h2><p class="muted" style="margin:6px 0 4px;line-height:1.5">Signed in as <b>'+esc(u.email)+'</b>. The AI always acts as this account.'+(c?' Key on file: '+AIDEF[c.provider].label+'.':'')+'</p>'+seg+(CN.mode==='connector'?prov:'')+body+'<div style="text-align:right;margin-top:14px"><button class="btn" data-act="close">Done</button></div></div>';
}
readConn=function(){var bg=document.getElementById('cnModal');var p=bg.dataset.provider;return {provider:p,model:document.getElementById('cModel').value.trim()||AIDEF[p].model,key:document.getElementById('cKey').value.trim(),email:MYEMAIL};};

/* ---------- room on phones: bottom bar + sheet ---------- */
function mbarHTML(d){var op=openProps(d).length,oc=d.comments.filter(function(c){return !c.resolved}).length;var open=document.getElementById('room')&&document.getElementById('room').classList.contains('sheet');
 return [['ai','✦','AI',0],['props','✎','Proposals',op],['comments','💬','Comments',oc],['history','⧗','Versions',0]].map(function(t){return '<button data-act="mtab" data-v="'+t[0]+'" class="'+(open&&RM.tab===t[0]?'on':'')+'"><b>'+t[1]+'</b><span>'+t[2]+(t[3]?'<span class="bd2">'+t[3]+'</span>':'')+'</span></button>'}).join('')+'<button data-go="#/ide/'+d.id+'"><b>⌨</b><span>AI Studio</span></button>';}
function sheet(open){var r=document.getElementById('room');if(!r||r.classList.contains('ide'))return;r.classList.toggle('sheet',open);var b=document.querySelector('.sheet-bg');if(open&&!b){b=document.createElement('div');b.className='sheet-bg';b.setAttribute('data-act','sheetClose');document.body.appendChild(b);}if(!open&&b)b.remove();var m=el('.mbar');if(m&&cur())m.innerHTML=mbarHTML(cur());}

/* ============================ AI STUDIO (IDE) ============================ */
function pad2(n){return (n<10?'0':'')+n;}
function slug(t){return (plain(t||'')||'untitled').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,22)||'untitled';}
function fileOf(d,k){var i=d.order.indexOf(k),T=texts(draftFiles(d)[k]||'');return (d.kind==='doc'?'sections/':'slides/')+pad2(i+1)+'-'+slug(T.h||T.title||T.eyebrow||k)+'.html';}
function baseName(f){return f.split('/').pop();}
function hlHTML(s){return esc(s).replace(/(&lt;!--[\s\S]*?--&gt;)|(&lt;\/?)([\w-]+)([\s\S]*?)(\/?&gt;)/g,function(m,cm,open,tag,attrs,close){if(cm)return '<span class="t-c">'+cm+'</span>';return '<span class="t-p">'+open+'</span><span class="t-t">'+tag+'</span>'+attrs.replace(/([\w:-]+)(=)(&quot;[\s\S]*?&quot;)/g,function(x,a,eq,v){return '<span class="t-a'+(a==='data-edit'?' t-e':'')+'">'+a+'</span>'+eq+'<span class="t-v">'+v+'</span>';})+'<span class="t-p">'+close+'</span>';});}
function lineDiff(a,b){a=a.split('\n');b=b.split('\n');var n=a.length,m=b.length;if(n*m>250000)return [{t:'d',s:'(file too large to diff)'}];
 var L=[];for(var i=0;i<=n;i++){L.push(new Array(m+1).fill(0));}for(i=n-1;i>=0;i--)for(var j=m-1;j>=0;j--)L[i][j]=a[i]===b[j]?L[i+1][j+1]+1:Math.max(L[i+1][j],L[i][j+1]);
 var out=[];i=0;j=0;while(i<n&&j<m){if(a[i]===b[j]){out.push({t:'s',s:a[i]});i++;j++;}else if(L[i+1][j]>=L[i][j+1]){out.push({t:'d',s:a[i]});i++;}else{out.push({t:'a',s:b[j]});j++;}}
 while(i<n)out.push({t:'d',s:a[i++]});while(j<m)out.push({t:'a',s:b[j++]});return out;}
function fieldDiffs(d,k){var A=texts(d.files[k]||''),D=texts(draftFiles(d)[k]||'');return Object.keys(D).filter(function(f){return D[f]!==A[f]}).map(function(f){return {f:f,a:plain(A[f]||''),b:plain(D[f])}});}

routes['#/ide']=function(v,id){
 if(!requireAuth())return;
 v.innerHTML='<div class="wrap"><p class="muted">Opening AI Studio…</p></div>';
 Promise.all([DB.loadDoc(id),keysReady()]).then(function(rs){var d=rs[0];
  if(route().name!=='#/ide')return;
  if(!d){document.body.classList.remove('ide-on');v.innerHTML='<div class="wrap" style="max-width:560px"><h1 class="big" style="font-size:34px">No access</h1><p class="lead" style="margin-top:10px">'+esc(MYEMAIL)+' cannot open this document.</p></div>';return;}
  var keep=RM&&RM.id===d.id?RM:null;
  RM={id:d.id,path:keep?keep.path:d.order[0],tab:'ai',view:'draft',follow:null,editing:null,draft:keep?keep.draft:'',ask:'',ide:true,side:keep&&keep.side||'files',open:keep&&keep.open||[d.order[0]],split:keep&&keep.split||'both',bot:keep&&keep.bot||'changes',botMin:false,pane:isMobile()?'code':'code',out:keep&&keep.out||[]};
  if(RM.open.indexOf(RM.path)<0)RM.open.push(RM.path);
  myPres={path:RM.path,key:null,presenting:false};d.presence={};d.presence[ME]=Object.assign({t:now()},myPres);
  v.innerHTML=ideShell(d);ideDraw();subscribe(d);track('ide_open',ME,d.id);
 }).catch(function(){v.innerHTML='<div class="wrap"><p class="muted">Could not open AI Studio. Check your connection and try again.</p></div>';});
};
function ideShell(d){
 var st=d.kind==='doc'?'<div class="paper editing" id="rStage"></div>':'<div class="stage editing" id="rStage"></div>';
 return '<div id="room" class="ide" data-pane="'+RM.pane+'"><div class="ide-title"></div><div class="ide-act"></div><div class="ide-side"></div>'+
 '<div class="ide-main"><div class="ide-tabs"></div><div class="ide-split"><div class="ide-code"><div class="gut"></div><div class="ed"><pre class="hl"><code></code></pre><textarea id="ideTA" wrap="off" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off"></textarea></div></div>'+
 '<div class="ide-prev"><div class="ide-prev-h">Preview · live draft<span style="flex:1"></span><span class="pvn"></span></div><div class="ide-prev-b">'+st+'</div></div></div>'+
 '<div class="ide-bot"><div class="ide-bot-h"></div><div class="ide-bot-b"></div></div></div>'+
 '<div class="rright ide-chat"></div><div class="ide-status"></div><div class="ide-mtabs"></div></div>';
}
function ideDraw(){ideTitle();ideAct();ideSide();ideTabs();ideCode(true);fillStage();ideBottom();drawRight();ideStatus();ideMtabs();}
function ideTitle(){var d=cur(),T=el('.ide-title');if(!T)return;var on=online(d);
 T.innerHTML='<a href="#/" title="Home" style="display:flex">'+LOGO(24,true)+'</a><span class="nm">'+esc(d.name)+'</span><span class="pill hide-m" style="background:#1B3A33;color:#CFE0D8">v'+d.versions.length+'</span><span class="live hide-m" style="color:#F1A08F">Live</span>'+
 '<div class="faces">'+members(d).concat(on.filter(function(u){return members(d).indexOf(u)<0})).map(function(m){return av(m,on.indexOf(m)>=0?'on':'')}).join('')+'</div><div style="flex:1"></div>'+
 '<button class="tb" data-go="#/room/'+d.id+'">◧ Room</button><button class="tb hide-m" data-act="share">Share</button><button class="tb hide-m" data-act="export">⤓ HTML</button><button class="tb br" data-act="aiConnect">✦ '+(aiConn()?AIDEF[aiConn().provider].label:'Connect AI')+'</button>';}
function ideAct(){var d=cur(),A=el('.ide-act');if(!A)return;var op=openProps(d).length,oc=d.comments.filter(function(c){return !c.resolved}).length;
 A.innerHTML=[['files','🗂','Explorer',0],['props','⑂','Proposals (source control)',op],['comments','💬','Comments',oc],['history','⧗','Versions',0],['connect','⚇','Connect your AI',0]].map(function(b){return '<button title="'+b[2]+'" data-act="ideSide" data-v="'+b[0]+'" class="'+(RM.side===b[0]?'on':'')+'">'+b[1]+(b[3]?'<span class="n">'+b[3]+'</span>':'')+'</button>'}).join('')+'<div class="sp"></div><button title="Back to the room" data-go="#/room/'+d.id+'">◧</button>';}
function ideSide(){var d=cur(),S2=el('.ide-side');if(!S2||S2.contains(document.activeElement))return;var on=online(d),df=draftFiles(d);
 if(RM.side==='files'){
  var prs={};openProps(d).forEach(function(p){Object.keys(p.files).forEach(function(k){if(p.files[k]!==d.files[k])prs[k]=(prs[k]||0)+1;});});
  S2.innerHTML='<div class="ide-h">Explorer<span class="sp"></span></div><div class="ide-tree">'+
   '<div class="row" style="--d:0"><span class="ic">▾</span><span class="fn"><b>'+esc(d.name)+'</b></span></div>'+
   '<div class="row" style="--d:1"><span class="ic">▾</span><span class="fn">'+(d.kind==='doc'?'sections':'slides')+'</span></div>'+
   d.order.map(function(k){var who=on.filter(function(u){return u!==ME&&d.presence[u].path===k});return '<div class="row '+(RM.path===k?'sel':'')+'" style="--d:2" data-act="ideOpen" data-v="'+k+'"><span class="ic">&lt;/&gt;</span><span class="fn">'+esc(baseName(fileOf(d,k)))+'</span><span class="faces">'+who.map(function(u){return av(u,'sm')}).join('')+'</span>'+(prs[k]?'<span class="m" title="'+prs[k]+' open proposal(s)">M</span>':'')+'</div>'}).join('')+
   '<div class="row" style="--d:1"><span class="ic">▾</span><span class="fn">published</span></div>'+
   '<div class="row" style="--d:2" data-go="#/view/'+d.id+'"><span class="ic">◉</span><span class="fn">index.html</span><span class="small" style="color:var(--tx2)">v'+d.versions.length+'</span></div>'+
   '<div class="row" style="--d:2" data-act="export"><span class="ic">⤓</span><span class="fn">Download HTML</span></div></div>'+
   '<div class="ide-h" style="margin-top:10px">Who is here</div><div class="ide-tree">'+on.map(function(u){var p=d.presence[u];return '<div class="row" style="--d:0;cursor:default">'+av(u,'sm')+'<span class="fn">'+esc(U(u).short)+(u===ME?' (you)':'')+'</span><span class="small" style="color:var(--tx2)">'+(p&&p.path?baseName(fileOf(d,p.path)).slice(0,14):'')+'</span></div>'}).join('')+'</div>';
  return;}
 if(RM.side==='connect'){S2.innerHTML='<div class="ide-h">Connect your AI</div><div class="rpanel" style="color:var(--tx);line-height:1.5"><p style="color:var(--tx)">Two ways, both tied to <b>'+esc(MYEMAIL)+'</b>:</p><p style="margin-top:10px"><b style="color:#F2D27A">Subscription</b><br><span class="small">Add the Studio as a connector inside Claude or ChatGPT and sign in with this e-mail. Your plan does the work; edits arrive here live.</span></p><div class="urlbox" style="margin:8px 0;background:#0B1A17;border-color:var(--ln);color:#CFE0D8"><span>'+esc(MCP_URL)+'</span></div><button class="btn sm br" data-act="aiConnectM" data-v="connector">How to add it</button><p style="margin-top:16px"><b style="color:#F2D27A">API key</b><br><span class="small">Runs here in the chat panel, saved to your account.</span></p><button class="btn sm" style="margin-top:8px" data-act="aiConnectM" data-v="key">'+(aiConn()?'Change key':'Add a key')+'</button></div>';return;}
 var H={props:propsHTML,comments:commentsHTML,history:historyHTML}[RM.side];
 S2.innerHTML='<div class="ide-h">'+({props:'Source control · proposals',comments:'Comments',history:'Versions'})[RM.side]+'</div><div class="rpanel">'+H(d)+'</div>';
 S2.querySelectorAll('[data-model]').forEach(function(i){i.value=RM[i.getAttribute('data-model')]||'';i.oninput=function(){RM[i.getAttribute('data-model')]=i.value;};});
}
function ideTabs(){var d=cur(),T=el('.ide-tabs');if(!T)return;RM.open=RM.open.filter(function(k){return d.order.indexOf(k)>=0});if(RM.open.indexOf(RM.path)<0)RM.open.push(RM.path);
 var prk={};openProps(d).forEach(function(p){Object.keys(p.files).forEach(function(k){if(p.files[k]!==d.files[k])prk[k]=1;});});
 T.innerHTML=RM.open.map(function(k){return '<div class="tab '+(RM.path===k?'on':'')+'" data-act="ideOpen" data-v="'+k+'"><span style="color:#E3A86B">&lt;/&gt;</span>'+esc(baseName(fileOf(d,k)))+(prk[k]?'<span class="m">M</span>':'')+(RM.open.length>1?'<span class="x" data-act="ideClose" data-v="'+k+'">×</span>':'')+'</div>'}).join('')+
 '<div class="sp"></div><div class="tool"><button data-act="ideSplit" data-v="code" class="'+(RM.split==='code'?'on':'')+'">Code</button><button data-act="ideSplit" data-v="both" class="'+(RM.split==='both'?'on':'')+'">Split</button><button data-act="ideSplit" data-v="prev" class="'+(RM.split==='prev'?'on':'')+'">Preview</button></div>';
 var sp=el('.ide-split');if(sp){sp.classList.toggle('code-only',RM.split==='code');sp.classList.toggle('prev-only',RM.split==='prev');}
 var pv=el('.pvn');if(pv)pv.textContent=(d.kind==='doc'?'Section ':'Slide ')+(d.order.indexOf(RM.path)+1)+' of '+d.order.length;}
var ideT=null;
function ideCode(force){var d=cur(),ta=document.getElementById('ideTA');if(!ta)return;var html=draftFiles(d)[RM.path]||'';
 if(force||(document.activeElement!==ta&&ta.value!==html)){var ss=ta.selectionStart;ta.value=html;if(document.activeElement===ta)try{ta.setSelectionRange(ss,ss)}catch(e){}}
 ta.readOnly=!canEdit(d);var ro=el('.ide-code .ro');if(!canEdit(d)&&!ro)el('.ide-code').insertAdjacentHTML('beforeend','<span class="ro">Read-only · you can comment</span>');
 ideHL();
 if(!ta._wired){ta._wired=true;
  ta.addEventListener('scroll',function(){var pre=el('.ide-code pre'),g=el('.ide-code .gut');pre.scrollTop=ta.scrollTop;pre.scrollLeft=ta.scrollLeft;g.scrollTop=ta.scrollTop;});
  ta.addEventListener('input',function(){ideHL();clearTimeout(ideT);var path=RM.path,val=ta.value;ideT=setTimeout(function(){if(cur()&&canEdit(cur()))propose(ME,'human',path,val,null);},350);});
  ta.addEventListener('focus',function(){pres({key:null});});
  ta.addEventListener('keydown',function(e){if(e.key==='Tab'){e.preventDefault();var s=ta.selectionStart,en=ta.selectionEnd;ta.value=ta.value.slice(0,s)+'  '+ta.value.slice(en);ta.selectionStart=ta.selectionEnd=s+2;ta.dispatchEvent(new Event('input'));}});
  ['keyup','click','select'].forEach(function(ev){ta.addEventListener(ev,ideStatus);});}
}
function ideHL(){var ta=document.getElementById('ideTA');if(!ta)return;var pre=el('.ide-code pre code'),g=el('.ide-code .gut');pre.innerHTML=hlHTML(ta.value)+'\n';var n=ta.value.split('\n').length,h='';for(var i=1;i<=n;i++)h+=i+'\n';g.textContent=h;var p2=el('.ide-code pre');p2.scrollTop=ta.scrollTop;p2.scrollLeft=ta.scrollLeft;g.scrollTop=ta.scrollTop;}
function ideOut(line,cls){RM.out.push({t:now(),s:line,c:cls||''});if(RM.out.length>200)RM.out.shift();if(RM.bot==='out')ideBottom();}
window.ideStream=function(full,c){if(!RM||!RM.ide)return;var last=RM.out[RM.out.length-1];if(last&&last.stream){last.s=full.slice(-1500);}else RM.out.push({t:now(),s:full.slice(-1500),c:'mut',stream:true});if(RM.bot==='out')ideBottom();};
function ideBottom(){var d=cur(),H=el('.ide-bot-h'),B=el('.ide-bot-b');if(!H)return;el('.ide-bot').classList.toggle('min',!!RM.botMin);
 var fd=fieldDiffs(d,RM.path);var probs=ideProblems(d);
 H.innerHTML=[['changes','Changes'+(fd.length?' · '+fd.length:'')],['out','AI output'],['problems','Problems'+(probs.length?' · '+probs.length:'')]].map(function(t){return '<button data-act="ideBot" data-v="'+t[0]+'" class="'+(RM.bot===t[0]?'on':'')+'">'+t[1]+'</button>'}).join('')+'<span class="sp"></span><button data-act="ideBotMin" title="Minimise">'+(RM.botMin?'▴':'▾')+'</button>';
 if(RM.bot==='changes'){
  if(!fd.length){B.innerHTML='<span class="mut">No changes on '+esc(baseName(fileOf(d,RM.path)))+' compared with approved v'+d.versions.length+'.</span>';return;}
  var who=openProps(d).filter(function(p){return p.files[RM.path]&&p.files[RM.path]!==d.files[RM.path]}).map(function(p){return (p.via!=='human'?'✦ '+viaName(p)+' for ':'')+U(p.author).short}).join(', ');
  B.innerHTML='<span class="mut">'+esc(baseName(fileOf(d,RM.path)))+' · approved v'+d.versions.length+' → live draft'+(who?' · by '+esc(who):'')+'</span>\n'+fd.map(function(x){return '\n<span class="warn">@@ '+esc(x.f)+' @@</span>\n<span class="dl d">- '+esc(x.a)+'</span><span class="dl a">+ '+esc(x.b)+'</span>'}).join('')+
   '\n\n<span class="mut">HTML diff</span>\n'+lineDiff(d.files[RM.path]||'',draftFiles(d)[RM.path]||'').filter(function(l){return l.t!=='s'}).slice(0,60).map(function(l){return '<span class="dl '+l.t+'">'+(l.t==='a'?'+ ':'- ')+esc(l.s.slice(0,240))+'</span>'}).join('')+
   (isOwner(d)?'\n<button class="btn sm ok" data-act="ideApproveFile" style="margin-top:8px">✓ Approve these proposals</button>':'');
 } else if(RM.bot==='out'){
  B.innerHTML=RM.out.length?RM.out.map(function(o){return '<span class="mut">['+new Date(o.t).toLocaleTimeString()+']</span> <span class="'+o.c+'">'+esc(o.s)+'</span>'}).join('\n'):'<span class="mut">AI requests and their raw output stream here as they are generated.</span>';B.scrollTop=B.scrollHeight;
 } else {
  B.innerHTML=probs.length?probs.map(function(p){return '<span class="warn">⚠</span> '+esc(p)}).join('\n'):'<span class="ok">✓ No problems in '+esc(baseName(fileOf(d,RM.path)))+'.</span>';
 }
}
function ideProblems(d){var h=draftFiles(d)[RM.path]||'',out=[];var A=texts(d.files[RM.path]||''),D=texts(h);
 Object.keys(A).forEach(function(f){if(!(f in D))out.push('Editable field "'+f+'" was removed; the AI and the room can no longer edit it.');});
 ['section','div','p','h1','h2','span','svg'].forEach(function(t){var o=(h.match(new RegExp('<'+t+'[\\s>]','g'))||[]).length,c=(h.match(new RegExp('</'+t+'>','g'))||[]).length;if(o!==c)out.push('<'+t+'> opened '+o+'× and closed '+c+'×.');});
 if(/<script/i.test(h))out.push('Scripts are not allowed inside a slide; they are removed on export.');return out;}
function ideStatus(){var d=cur(),S3=el('.ide-status');if(!S3)return;var ta=document.getElementById('ideTA'),ln=1,col=1;if(ta){var pre=ta.value.slice(0,ta.selectionStart).split('\n');ln=pre.length;col=pre[pre.length-1].length+1;}var c=aiConn();
 S3.innerHTML='<span>⑂ live draft</span><span>✎ '+openProps(d).length+' open</span><span>✓ v'+d.versions.length+' approved</span><span>● '+online(d).length+' online</span><span class="sp"></span><span>Ln '+ln+', Col '+col+'</span><span>HTML</span><button data-act="aiConnect">✦ '+(c?AIDEF[c.provider].label+' · '+esc(c.model):'Demo AI · connect yours')+'</button><span>'+esc(MYEMAIL)+'</span>';}
function ideMtabs(){var M=el('.ide-mtabs');if(!M)return;var d=cur(),fd=fieldDiffs(d,RM.path).length;
 M.innerHTML=[['files','🗂','Files'],['code','&lt;/&gt;','Code'],['preview','◉','Preview'],['ai','✦','AI'],['changes','±','Changes'+(fd?' '+fd:'')]].map(function(t){return '<button data-act="idePane" data-v="'+t[0]+'" class="'+(RM.pane===t[0]?'on':'')+'"><b>'+t[1]+'</b>'+t[2]+'</button>'}).join('');}
function ideChat(){
 var d=cur(),R=el('.ide-chat');if(!R)return;if(R.contains(document.activeElement)){RM.pendingRight=true;return;}
 var c=aiConn(),unit=d.kind==='doc'?'section':'slide',n=d.order.indexOf(RM.path)+1;
 var head='<div class="ch"><span style="font:700 10.5px Karla;letter-spacing:1.4px;text-transform:uppercase;color:var(--tx2)">AI chat</span><span style="flex:1"></span><button class="model" data-act="aiConnect"><span class="dot '+(c?'':'off')+'"></span>'+(c?AIDEF[c.provider].label+' · '+esc(c.model):'Demo AI · connect yours')+' ▾</button></div>';
 if(!canAI(d)){R.innerHTML=head+'<div class="rbody"><div class="ide-empty"><p style="font:400 20px Newsreader;color:#EDEDE7">'+(canEdit(d)?'AI is set to owner only':'Commenters can’t use the AI')+'</p><p style="margin-top:8px">Leave a comment with what you would change. '+esc(U(d.owner).short)+' applies comments with the AI and approves the result.</p><button class="btn sm br" style="margin-top:14px" data-act="ideSide" data-v="comments">Write a comment</button></div></div>';return;}
 var chat=d.chat.map(function(m){return '<div class="msg '+(m.who==='claude'?'ai':(m.who===ME?'me':''))+'">'+av(m.who,'sm')+'<div class="bub"><p class="small" style="margin-bottom:3px"><b>'+(m.prov?AIDEF[m.prov].label:(m.who==='claude'?'Demo AI':U(m.who).short))+'</b> · '+ago(m.t)+'</p>'+m.html+'</div></div>'}).join('');
 var cta=c?'':'<div class="cta-box"><b>Connect your own AI.</b><br><span class="small" style="color:var(--tx2)">Use your Claude or ChatGPT plan through the connector, or save an API key to your account. Until then a demo AI answers with fixed rewrites.</span><div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap"><button class="btn sm br" data-act="aiConnectM" data-v="connector">Use my subscription</button><button class="btn sm" data-act="aiConnectM" data-v="key">Add API key</button></div></div>';
 var PR=d.kind==='doc'?AIPD:AIP;
 R.innerHTML=head+'<div class="rbody">'+cta+(chat||'<div class="ide-empty">Ask for a change to the open file. The AI writes it as a proposal; everyone in the room sees it being written, and the owner approves.</div>')+'</div>'+
 '<div class="ctx"><span>@ '+esc(baseName(fileOf(d,RM.path)))+'</span><span>'+unit+' '+n+' of '+d.order.length+'</span></div>'+
 '<div class="ask"><div class="prompts">'+PR.map(function(p,i){return '<button data-act="ai" data-v="'+i+'">'+p[0]+'</button>'}).join('')+'</div><textarea rows="3" data-model="ask" placeholder="Ask the AI to change '+unit+' '+n+'…  (⌘/Ctrl + Enter)"></textarea><div style="display:flex;align-items:center;gap:8px;margin-top:8px"><span class="small" style="color:var(--tx2);flex:1">Result arrives as a proposal · owner approves</span><button class="btn sm br" data-act="aiFree">✦ Generate</button></div></div>';
 R.querySelectorAll('[data-model]').forEach(function(i){i.value=RM[i.getAttribute('data-model')]||'';i.oninput=function(){RM[i.getAttribute('data-model')]=i.value;};i.onkeydown=function(e){if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();var b=R.querySelector('[data-act="aiFree"]');if(b)b.click();}};});
 var B=R.querySelector('.rbody');B.scrollTop=B.scrollHeight;
}
function ideRefresh(w){
 var d=cur();if(!d)return;var st=document.getElementById('rStage');var focused=st&&st.contains(document.activeElement);
 if(!(w.src)&&!focused&&(w.edit===RM.path||w.remote||w.all))fillStage();else drawOverlays();
 ideCode(false);ideTitle();ideAct();ideTabs();ideStatus();ideMtabs();
 var Sd=el('.ide-side');if(Sd&&!Sd.contains(document.activeElement))ideSide();
 if(RM.bot!=='out')ideBottom();
 if(!w.presence)drawRight();
}
function ideOpenFile(k){RM.path=k;RM.follow=null;if(RM.open.indexOf(k)<0)RM.open.push(k);pres({key:null});ideTabs();ideCode(true);fillStage();ideSide();ideBottom();drawRight();ideStatus();if(isMobile()&&RM.pane==='files'){RM.pane='code';document.getElementById('room').dataset.pane='code';ideMtabs();}}

/* ---------- OAuth consent (Claude / ChatGPT connector sign-in) ---------- */
(function(){try{var q=new URLSearchParams(location.search);var a=q.get('authorization_id');if(a){sessionStorage.setItem('ms4-oauth',a);history.replaceState(null,'',location.pathname+'#/consent');}}catch(e){}})();
routes['#/consent']=function(v){
 var aid='';try{aid=sessionStorage.getItem('ms4-oauth')||'';}catch(e){}
 if(!aid){v.innerHTML='<div class="wrap" style="max-width:520px;text-align:center"><h1 class="big" style="font-size:32px">Nothing to approve</h1><p class="lead" style="margin:10px auto">This page opens when Claude or ChatGPT asks to connect to Meridiano Studio.</p></div>';return;}
 if(!requireAuth())return;
 if(!sb.auth.oauth){v.innerHTML='<div class="wrap"><p class="muted">This build cannot complete connector sign-in.</p></div>';return;}
 v.innerHTML='<div class="wrap" style="max-width:520px"><p class="muted">Checking the request…</p></div>';
 sb.auth.oauth.getAuthorizationDetails(aid).then(function(r){
  if(r.error){v.innerHTML='<div class="wrap" style="max-width:520px"><h1 class="big" style="font-size:30px">This request expired</h1><p class="lead" style="margin-top:10px">'+esc(r.error.message||'')+'</p><p class="muted" style="margin-top:10px">Go back to Claude or ChatGPT and click Connect again.</p></div>';try{sessionStorage.removeItem('ms4-oauth')}catch(e){}return;}
  var x=r.data||{};var to=x.redirect_url||x.redirect_to;if(!x.authorization_id&&to){try{sessionStorage.removeItem('ms4-oauth')}catch(e){}location.href=to;return;}
  var cn=(x.client&&(x.client.name||x.client.client_name))||'An AI app';var host='';try{host=new URL(x.redirect_uri||'').host;}catch(e){}
  v.innerHTML='<div class="wrap" style="max-width:520px"><div style="display:flex;justify-content:center">'+LOGO(56)+'</div><h1 class="big" style="font-size:32px;text-align:center;margin-top:12px">Connect '+esc(cn)+'</h1><p class="lead" style="text-align:center;margin:10px auto 0"><b>'+esc(cn)+'</b>'+(host?' ('+esc(host)+')':'')+' wants to work in Meridiano Studio as <b>'+esc(MYEMAIL)+'</b>.</p>'+
  '<div class="card" style="padding:22px;margin-top:20px"><p class="small" style="font-weight:700;letter-spacing:1.4px;text-transform:uppercase">It will be able to</p><ul style="padding-left:18px;line-height:1.7;margin-top:8px"><li>read the presentations and texts shared with you</li><li>propose changes, which everyone sees live and only the owner approves</li><li>comment, and read versions and your usage numbers</li></ul><p class="small" style="margin-top:10px">It cannot see your AI keys or anything not shared with this e-mail. Remove it any time from your AI app’s connector settings.'+(x.scope?' Scopes: '+esc(x.scope)+'.':'')+'</p>'+
  '<div style="display:flex;gap:8px;margin-top:18px"><button class="btn no" style="flex:1" data-act="oaDeny">Deny</button><button class="btn pri" style="flex:2" data-act="oaAllow">Allow</button></div></div><p class="small" style="text-align:center;margin-top:12px">Not you? <a href="#" data-act="signout">Sign out</a> and sign in with the right e-mail.</p></div>';
 });
};
function oauthDecide(allow){var aid='';try{aid=sessionStorage.getItem('ms4-oauth')||'';}catch(e){}if(!aid)return;
 (allow?sb.auth.oauth.approveAuthorization(aid):sb.auth.oauth.denyAuthorization(aid)).then(function(r){try{sessionStorage.removeItem('ms4-oauth')}catch(e){}
  if(r.error){toast('⚠ '+esc(r.error.message||'Could not complete'),null,true);return;}track('connector_'+(allow?'allowed':'denied'),ME,null,{});var to=r.data&&(r.data.redirect_url||r.data.redirect_to);if(to)location.href=to;});}

/* ---------- v4 click actions ---------- */
document.addEventListener('click',function(e){
 var a=e.target.closest('[data-act]');if(!a)return;var act=a.getAttribute('data-act'),v=a.getAttribute('data-v');
 switch(act){
  case 'burger':document.getElementById('nav').classList.toggle('open');break;
  case 'mtab':if(RM.tab===v&&document.getElementById('room').classList.contains('sheet')){sheet(false);break;}RM.tab=v;drawRight();sheet(true);break;
  case 'sheetClose':sheet(false);break;
  case 'cnMode':CN.mode=v;drawConnect();break;
  case 'aiConnectM':openConnect(v);break;
  case 'ideOpen':if(e.target.closest('[data-act="ideClose"]'))break;ideOpenFile(v);break;
  case 'ideClose':e.stopPropagation();RM.open=RM.open.filter(function(k){return k!==v});if(RM.path===v&&RM.open.length)ideOpenFile(RM.open[RM.open.length-1]);else ideTabs();break;
  case 'ideSide':var room=document.getElementById('room');if(isMobile()){RM.side=v;RM.pane='files';room.dataset.pane='files';ideMtabs();}else if(RM.side===v&&window.innerWidth<=1000){room.classList.toggle('side-open');}else{RM.side=v;room.classList.add('side-open');}ideAct();ideSide();break;
  case 'ideSplit':RM.split=v;ideTabs();break;
  case 'ideBot':RM.bot=v;RM.botMin=false;ideBottom();break;
  case 'ideBotMin':RM.botMin=!RM.botMin;ideBottom();break;
  case 'idePane':RM.pane=v;document.getElementById('room').dataset.pane=v;if(v==='changes')RM.bot='changes';if(v==='preview')fillStage();if(v==='code')ideCode(true);if(v==='files'){RM.side=RM.side||'files';ideSide();}if(v==='ai')drawRight();ideBottom();ideMtabs();break;
  case 'ideApproveFile':var d0=cur();openProps(d0).filter(function(p){return p.files[RM.path]}).reduce(function(pr,p){return pr.then(function(){return flushSave(d0,p).then(function(){return DB.approve(p.id);});});},Promise.resolve()).then(function(){return DB.loadDoc(d0.id);}).then(function(){toast('✓ Approved · published',ME);refresh({all:true});}).catch(function(){});break;
  case 'oaAllow':a.disabled=true;oauthDecide(true);break;
  case 'oaDeny':oauthDecide(false);break;
 }
},true);
