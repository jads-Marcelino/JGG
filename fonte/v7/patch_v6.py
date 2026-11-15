"""Applies v6 on top of v5 (run patch_v4.py and patch_v5.py first)."""
import os, sys
H = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(H, 'app.html')).read()
if 'v6: no demo AI' in s: sys.exit('already patched')
def R(old, new):
    global s
    n = s.count(old)
    if n != 1: raise SystemExit(f'{n} matches: ' + old[:90])
    s = s.replace(old, new)
s = s.replace('</style></head><body>', open(os.path.join(H, 'part_v6.css')).read() + '</style></head><body>', 1)
R('/* ---------- events ---------- */', open(os.path.join(H, 'part_v6.js')).read() + '\n/* ---------- events ---------- */')
R('Meridiano Studio v5 ===================', 'Meridiano Studio v6 ===================')
R(" if(RM.tab==='ai')Bd.scrollTop=Bd.scrollHeight;", "")
open(os.path.join(H, 'app.html'), 'w').write(s)
print('v6 patched', len(s))
