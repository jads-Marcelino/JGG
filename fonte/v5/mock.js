/* Test double for the subset of supabase-js used by Meridiano Studio.
   Tables live in localStorage and changes are broadcast to other tabs,
   so two pages behave like two people on different devices. */
(function(){
 var KEY='mock-sb-db',bc=new BroadcastChannel('mock-sb');
 function load(){try{return JSON.parse(localStorage.getItem(KEY))||null}catch(e){return null}}
 var db=load()||{users:[],profiles:[],documents:[],invites:[],proposals:[],comments:[],versions:[],events:[],ai_keys:[]};
 function save(){localStorage.setItem(KEY,JSON.stringify(db));}
 function reload(){db=load()||db;}
 var session=null;try{session=JSON.parse(sessionStorage.getItem('mock-sess'))}catch(e){}
 var authCbs=[];
 function uid(){return crypto.randomUUID();}
 function me(){return session&&session.user;}
 function myEmail(){return me()?me().email:'';}
 function role(docId){var d=db.documents.filter(function(x){return x.id===docId})[0];if(!d)return null;if(me()&&d.owner===me().id)return 'owner';var i=db.invites.filter(function(x){return x.doc_id===docId&&x.email===myEmail()})[0];return i?i.role:null;}
 function visible(t,r){if(t==='ai_keys')return !!(me()&&r.user_id===me().id);if(t==='documents')return !!role(r.id);if(['invites','proposals','comments','versions'].indexOf(t)>=0)return !!role(r.doc_id);if(t==='events')return me()&&(r.user_id===me().id||(r.doc_id&&role(r.doc_id)==='owner'));return true;}
 var channels=[];
 function emit(t,ev,row){var msg={kind:'pg',table:t,eventType:ev,new:row};bc.postMessage(msg);deliver(msg);}
 function deliver(msg){reload();channels.forEach(function(c){c._pg.forEach(function(h){if(h.table!==msg.table)return;if(h.event!=='*'&&h.event!==msg.eventType)return;var f=h.filter&&h.filter.match(/^(\w+)=eq\.(.+)$/);if(f&&String(msg.new[f[1]])!==f[2])return;if(!visible(msg.table,msg.new))return;setTimeout(function(){h.cb({eventType:msg.eventType,new:msg.new});},5);});});}
 bc.onmessage=function(e){var m=e.data;if(m.kind==='pg')deliver(m);if(m.kind==='pres')presRecv(m);};
 function Q(table){this.t=table;this.f=[];this.op='select';}
 Q.prototype.select=function(){if(this.op==='select')this.op='select';this.ret=true;return this;};
 Q.prototype.eq=function(c,v){this.f.push(function(r){return r[c]===v});return this;};
 Q.prototype.in=function(c,v){this.f.push(function(r){return v.indexOf(r[c])>=0});return this;};
 Q.prototype.gte=function(c,v){this.f.push(function(r){return r[c]>=v});return this;};
 Q.prototype.order=function(){return this;};Q.prototype.single=function(){this.one=true;return this;};
 Q.prototype.insert=function(o){this.op='insert';this.row=o;return this;};
 Q.prototype.update=function(o){this.op='update';this.row=o;return this;};
 Q.prototype.delete=function(){this.op='delete';return this;};
 Q.prototype.then=function(res,rej){var self=this;return new Promise(function(r){setTimeout(function(){r(self.exec());},10);}).then(res,rej);};
 Q.prototype.exec=function(){reload();var t=this.t,rows=db[t]||(db[t]=[]),self=this,ts=new Date().toISOString();
  if(!me())return {data:null,error:{message:'not signed in'}};
  if(this.op==='select'){var out=rows.filter(function(r){return visible(t,r)&&self.f.every(function(f){return f(r)})});return {data:this.one?out[0]:out,error:null};}
  if(this.op==='insert'){var arr=[].concat(this.row);for(var i=0;i<arr.length;i++){var r=Object.assign({},arr[i]);r.id=r.id||(t==='events'?rows.length+1:uid());r.created_at=r.created_at||ts;if(t==='events')r.ts=ts;if(t==='proposals'){r.updated_at=ts;var rl=role(r.doc_id);if(rl!=='owner'&&rl!=='editor')return {data:null,error:{message:'new row violates row-level security policy for table "proposals"'}};}
    if(t==='comments'&&!role(r.doc_id))return {data:null,error:{message:'rls'}};if(t==='invites'&&role(r.doc_id)!=='owner')return {data:null,error:{message:'rls'}};if(t==='ai_keys'&&(r.email!==myEmail()||r.user_id!==me().id))return {data:null,error:{message:'new row violates row-level security policy for table "ai_keys"'}};
    if(t==='comments'){r.resolved=!!r.resolved;r.applied=!!r.applied;}rows.push(r);save();emit(t,'INSERT',r);}return {data:arr,error:null};}
  if(this.op==='update'){var hit=rows.filter(function(r){return visible(t,r)&&self.f.every(function(f){return f(r)})});hit.forEach(function(r){Object.assign(r,self.row);if(t==='documents')r.updated_at=ts;save();emit(t,'UPDATE',r);});return {data:hit,error:null};}
  if(this.op==='delete'){rows=db[t];db[t]=rows.filter(function(r){return !(visible(t,r)&&self.f.every(function(f){return f(r)}))});save();return {data:null,error:null};}
 };
 function rpc(name,a){return new Promise(function(r){setTimeout(function(){reload();var ts=new Date().toISOString();
  if(name==='invite_status'){var ok=db.invites.some(function(i){return i.doc_id===a.p_doc&&i.email===a.p_email.toLowerCase()});return r({data:ok?'invited':'not_invited',error:null});}
  if(!me())return r({data:null,error:{message:'not signed in'}});
  if(name==='create_document'){var id=uid();var d={id:id,name:a.p_name,kind:a.p_kind,tpl:a.p_tpl,owner:me().id,ai_mode:a.p_ai,files:a.p_files,slide_order:a.p_order,created_at:ts,updated_at:ts};db.documents.push(d);
   db.versions.push({id:uid(),doc_id:id,n:1,msg:'Created from template '+a.p_tpl,proposed_by:me().id,approved_by:me().id,via:'human',snap:a.p_files,changed:Object.keys(a.p_files),created_at:ts});
   (a.p_emails||[]).forEach(function(e){db.invites.push({doc_id:id,email:e.toLowerCase(),role:a.p_role,created_at:ts});});save();return r({data:id,error:null});}
  if(name==='approve_proposal'){var p=db.proposals.filter(function(x){return x.id===a.p_id})[0];if(!p)return r({data:null,error:{message:'proposal not found'}});if(role(p.doc_id)!=='owner')return r({data:null,error:{message:'only the owner can approve'}});
   var d2=db.documents.filter(function(x){return x.id===p.doc_id})[0];Object.assign(d2.files,p.files);if(p.slide_order&&p.slide_order.length)d2.slide_order=p.slide_order;d2.updated_at=ts;var n=db.versions.filter(function(v){return v.doc_id===p.doc_id}).length+1;
   var v={id:uid(),doc_id:p.doc_id,n:n,msg:p.prompt||'Edits',proposed_by:p.author,via:p.via,approved_by:me().id,snap:JSON.parse(JSON.stringify(d2.files)),changed:Object.keys(p.files),created_at:ts};db.versions.push(v);p.status='approved';p.decided_by=me().id;var sib=[];if(p.option_group)db.proposals.forEach(function(q){if(q.option_group===p.option_group&&q.id!==p.id&&q.status==='open'){q.status='rejected';sib.push(q);}});save();sib.forEach(function(q){emit('proposals','UPDATE',q);});
   emit('documents','UPDATE',d2);emit('versions','INSERT',v);emit('proposals','UPDATE',p);return r({data:n,error:null});}
  if(name==='reject_proposal'){var p2=db.proposals.filter(function(x){return x.id===a.p_id})[0];if(p2){p2.status=role(p2.doc_id)==='owner'?'rejected':'withdrawn';save();emit('proposals','UPDATE',p2);}return r({data:null,error:null});}
  r({data:null,error:{message:'unknown rpc'}});},10);});}
 var pres={};
 function presRecv(m){channels.forEach(function(c){if(c.name!==m.ch)return;if(m.leave)delete c._state[m.key];else c._state[m.key]=[m.meta];c._sync.forEach(function(cb){setTimeout(cb,5)});});}
 function channel(name,opts){var c={name:name,_pg:[],_sync:[],_state:{},key:opts&&opts.config&&opts.config.presence&&opts.config.presence.key};
  c.on=function(type,f,cb){if(type==='postgres_changes')c._pg.push({table:f.table,event:f.event,filter:f.filter,cb:cb});if(type==='presence')c._sync.push(cb);return c;};
  c.subscribe=function(cb){channels.push(c);setTimeout(function(){cb&&cb('SUBSCRIBED');bc.postMessage({kind:'presreq',ch:name});},20);return c;};
  c.track=function(meta){var m={kind:'pres',ch:name,key:c.key,meta:meta};c._last=m;presRecv(m);bc.postMessage(m);return Promise.resolve();};
  c.presenceState=function(){return c._state;};
  return c;}
 bc.addEventListener('message',function(e){if(e.data.kind==='presreq')channels.forEach(function(c){if(c.name===e.data.ch&&c._last)bc.postMessage(c._last);});});
 window.__SB_MOCK={
  from:function(t){return new Q(t);},rpc:rpc,channel:channel,removeChannel:function(c){channels=channels.filter(function(x){return x!==c});if(c.key)bc.postMessage({kind:'pres',ch:c.name,key:c.key,leave:true});},
  auth:{
   getSession:function(){return Promise.resolve({data:{session:session}});},
   onAuthStateChange:function(cb){authCbs.push(cb);return {data:{subscription:{unsubscribe:function(){}}}};},
   signUp:function(o){return new Promise(function(r){setTimeout(function(){reload();var em=o.email.toLowerCase();if(db.users.some(function(u){return u.email===em}))return r({data:{},error:{message:'User already registered'}});var u={id:uid(),email:em,pw:o.password,user_metadata:(o.options&&o.options.data)||{}};db.users.push(u);db.profiles.push({id:u.id,email:em,name:u.user_metadata.name||em.split('@')[0]});save();session={user:{id:u.id,email:em,user_metadata:u.user_metadata}};sessionStorage.setItem('mock-sess',JSON.stringify(session));authCbs.forEach(function(cb){cb('SIGNED_IN',session)});r({data:{session:session,user:session.user},error:null});},10);});},
   signInWithPassword:function(o){return new Promise(function(r){setTimeout(function(){reload();var u=db.users.filter(function(x){return x.email===o.email.toLowerCase()&&x.pw===o.password})[0];if(!u)return r({data:{},error:{message:'Invalid login credentials'}});session={user:{id:u.id,email:u.email,user_metadata:u.user_metadata}};sessionStorage.setItem('mock-sess',JSON.stringify(session));authCbs.forEach(function(cb){cb('SIGNED_IN',session)});r({data:{session:session},error:null});},10);});},
   signOut:function(){session=null;sessionStorage.removeItem('mock-sess');authCbs.forEach(function(cb){cb('SIGNED_OUT',null)});return Promise.resolve({error:null});}
  }};
})();
