import base64
s=open('fonte/app.html').read()
F="/home/claude/meridiano/apresentacoes/data-strategy-for-leaders/fonte/fonts"
b=lambda p: base64.b64encode(open(p,'rb').read()).decode()
fonts="".join(f"@font-face{{font-family:'{fam}';src:url(data:font/woff2;base64,{b(f'{F}/{base}-{st}.woff2')}) format('woff2');font-weight:200 800;font-style:{st}}}\n" for fam,base in [("Newsreader","newsreader-latin-wght"),("Karla","karla-latin-wght")] for st in ("normal","italic"))
open('index.html','w').write(s.replace('/*FONTS*/',fonts))
