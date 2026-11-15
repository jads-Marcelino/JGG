"""Builds index.html (Supabase) and test.html (local mock) from app.html."""
import base64, json, os, sys
H=os.path.dirname(os.path.abspath(__file__))
s=open(os.path.join(H,'app.html')).read()
F=os.path.join(H,'fonts')
b=lambda p: base64.b64encode(open(p,'rb').read()).decode()
fonts="".join(f"@font-face{{font-family:'{fam}';src:url(data:font/woff2;base64,{b(f'{F}/{base}-{st}.woff2')}) format('woff2');font-weight:200 800;font-style:{st}}}\n" for fam,base in [("Newsreader","newsreader-latin-wght"),("Karla","karla-latin-wght")] for st in ("normal","italic"))
s=s.replace('/*FONTS*/',fonts)
cfg={}
if os.path.exists(os.path.join(H,'config.json')): cfg=json.load(open(os.path.join(H,'config.json')))
umd=open(os.path.join(H,'supabase.umd.js')).read()
prod=s.replace('/*SBUMD*/',umd).replace('__SB_URL__',cfg.get('url','__SB_URL__')).replace('__SB_KEY__',cfg.get('anon_key','__SB_KEY__'))
open(os.path.join(H,'index.html'),'w').write(prod)
test=s.replace('/*SBUMD*/',open(os.path.join(H,'mock.js')).read())
open(os.path.join(H,'test.html'),'w').write(test)
print('index.html',len(prod),'test.html',len(test),'configured' if cfg else 'NOT configured')
