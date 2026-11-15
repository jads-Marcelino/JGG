
/* ===================== v8: import from device, link (Drive, Docs, Dropbox, OneDrive, GitHub), clipboard, import links ===================== */
function fetchLink(url){var d=cur();
 if(!sb.functions||!sb.functions.invoke)return Promise.reject(new Error('Link import is not available in this build.'));
 return sb.functions.invoke('fetch-url',{body:{url:url,doc_id:d?d.id:null}}).then(function(r){
  if(r.error){var c=r.error.context;if(c&&c.json)return c.json().then(function(j){throw new Error(j.error||r.error.message);},function(){throw new Error(r.error.message);});throw new Error(r.error.message||String(r.error));}
  if(!r.data||!r.data.html)throw new Error((r.data&&r.data.error)||'Nothing came back from that link.');return r.data;});}
function importLinkFor(d,url){return location.origin+location.pathname+'#/import/'+d.id+'/'+encodeURIComponent(url);}
var _drawUpload7=drawUpload;
drawUpload=function(){var bg=document.getElementById('upModal');if(!bg)return;if(UP.step!==1)return _drawUpload7();var d=cur(),unit=d.kind==='doc'?'section':'slide';UP.src=UP.src||'device';
 var tabs='<div class="seg" style="margin:4px 0 14px;display:flex;flex-wrap:wrap"><button data-act="upSrc" data-v="device" class="'+(UP.src==='device'?'on':'')+'">Device or Drive</button><button data-act="upSrc" data-v="link" class="'+(UP.src==='link'?'on':'')+'">Link</button><button data-act="upSrc" data-v="paste" class="'+(UP.src==='paste'?'on':'')+'">Paste</button></div>';
 var body;
 if(UP.src==='device')body='<label class="upbox"><input type="file" id="upFile" accept=".html,.htm,text/html,text/plain" style="display:none"><b>Choose an HTML file</b><span class="small">Files, iCloud Drive, Google Drive, Dropbox or OneDrive (any app that shows up in Files)</span></label>';
 else if(UP.src==='link')body='<div class="field" style="margin:0"><label>Shared link</label><input class="in" id="upUrl" type="url" inputmode="url" placeholder="https://drive.google.com/file/d/… · Dropbox · OneDrive · GitHub · any public page" value="'+esc(UP.url||'')+'"></div>'+
  '<p class="small" style="margin:8px 0 0;line-height:1.5">Google Drive and Docs: share as “Anyone with the link”. Links to Drive, Google Docs, Dropbox, OneDrive and GitHub files are turned into direct downloads.</p>'+
  '<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn pri" data-act="upFetch">Import from link</button><button class="btn" data-act="upShareLink" title="A link that opens this document and imports the file">Copy import link</button></div>';
 else body='<textarea class="in" id="upPaste" rows="7" placeholder="&lt;!DOCTYPE html&gt;…" style="font:12px ui-monospace,Menlo,monospace">'+esc(UP.paste||'')+'</textarea><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn" data-act="upClip">Paste from clipboard</button><button class="btn pri" data-act="upRead">Continue</button></div>';
 bg.innerHTML='<div class="modal" style="width:640px"><h2 class="t">Import a new version</h2><p class="muted" style="margin:6px 0 12px;line-height:1.5">Bring an HTML file made by Claude or anyone else: a full deck or a few '+unit+'s. You choose what it replaces, and it arrives as v'+(d.versions.length+1)+' for '+esc(U(d.owner).short)+' to approve.</p>'+tabs+body+
  '<p class="small" id="upMsg" style="min-height:18px;margin:10px 0 6px;color:#9A3B1B"></p><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:12px"><button class="btn" data-act="upPrompt">Copy prompt for Claude</button><button class="btn" data-act="close">Cancel</button></div></div>';
 var f=document.getElementById('upFile');if(f)f.onchange=function(){var file=f.files[0];if(!file)return;if(file.size>3e6){document.getElementById('upMsg').textContent='This file is larger than 3 MB.';return;}var r=new FileReader();r.onload=function(){UP.name=file.name;upParse(String(r.result));};r.readAsText(file);};
 var ui=document.getElementById('upUrl');if(ui){ui.oninput=function(){UP.url=ui.value;};ui.onkeydown=function(e){if(e.key==='Enter'){e.preventDefault();upFetch();}};}
 var tp=document.getElementById('upPaste');if(tp)tp.oninput=function(){UP.paste=tp.value;};
};
function upFetch(){var msg=document.getElementById('upMsg'),url=(UP.url||'').trim();if(!/^https?:\/\//i.test(url)){if(msg)msg.textContent='Paste a link that starts with https://';return;}
 var b=document.querySelector('[data-act="upFetch"]');if(b){b.disabled=true;b.textContent='Importing…';}if(msg){msg.style.color='var(--mut)';msg.textContent='Fetching the file…';}
 fetchLink(url).then(function(r){UP.name=r.name||url;upParse(r.html);track('import_link',ME,cur().id,{host:(url.match(/^https?:\/\/([^/]+)/)||[])[1]});}).catch(function(e){var m=document.getElementById('upMsg');if(m){m.style.color='#9A3B1B';m.textContent=e.message||String(e);}var b2=document.querySelector('[data-act="upFetch"]');if(b2){b2.disabled=false;b2.textContent='Import from link';}});}

/* import links: #/import/<doc>/<encoded url> opens the document and imports the file */
routes['#/import']=function(v,id,u){if(!requireAuth())return;try{sessionStorage.setItem('ms8-import',JSON.stringify({id:id,url:decodeURIComponent(u||'')}));}catch(e){}go('#/room/'+id);};
setInterval(function(){var p=null;try{p=JSON.parse(sessionStorage.getItem('ms8-import')||'null');}catch(e){}if(!p)return;var d=cur();if(!d||d.id!==p.id||route().name!=='#/room')return;
 try{sessionStorage.removeItem('ms8-import');}catch(e){}if(!canEdit(d)){toast('Only the owner and editors can import a version',ME,true);return;}openUpload();UP.src='link';UP.url=p.url;drawUpload();if(p.url)upFetch();},500);

/* AI panel wording and prompt: mention the new sources and send_html */
var _aiPanel7=aiPanel;aiPanel=function(d,ide){return _aiPanel7(d,ide).replace('⤒ Upload from Claude','⤒ Import a version').replace('Got an HTML file from Claude? Upload it','From your device, Google Drive, Dropbox or a shared link. Import it').replace('Upload HTML file…','Import file or link…');};
aiHTML=function(d){return aiPanel(d,false);};
var _claudePrompt7=claudePrompt;claudePrompt=function(d,withHtml){var p=_claudePrompt7(d,withHtml);return withHtml?p:p+'\nIf you build a complete HTML file instead, send it with send_html (mode whole, add or replace).';};

document.addEventListener('click',function(e){
 var a=e.target.closest('[data-act]');if(!a)return;var act=a.getAttribute('data-act'),v=a.getAttribute('data-v'),d=cur();
 switch(act){
  case 'upSrc':e.stopPropagation();UP.src=v;drawUpload();break;
  case 'upFetch':e.stopPropagation();upFetch();break;
  case 'upShareLink':e.stopPropagation();var u=(UP.url||'').trim();if(!/^https?:\/\//i.test(u)){document.getElementById('upMsg').textContent='Paste the file link first.';break;}copyText(importLinkFor(d,u),'Import link copied · whoever opens it imports this file into “'+esc(d.name)+'”');break;
  case 'upClip':e.stopPropagation();if(!navigator.clipboard||!navigator.clipboard.readText){document.getElementById('upMsg').textContent='This browser does not allow reading the clipboard. Long-press the box and choose Paste.';break;}
   navigator.clipboard.readText().then(function(t){UP.paste=t;var tp=document.getElementById('upPaste');if(tp)tp.value=t;if(/^https?:\/\/\S+$/.test((t||'').trim())){UP.src='link';UP.url=t.trim();drawUpload();upFetch();}},function(){document.getElementById('upMsg').textContent='Clipboard access was blocked. Long-press the box and choose Paste.';});break;
 }
},true);
