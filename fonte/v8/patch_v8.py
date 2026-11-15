"""Applies v8 (import from link, Drive, clipboard, import links) on top of v7."""
import os, sys
H = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(H, 'app.html')).read()
if 'v8: import from device' in s: sys.exit('already patched')
def R(old, new):
    global s
    n = s.count(old)
    if n != 1: raise SystemExit(f'{n} matches: ' + old[:90])
    s = s.replace(old, new)
R('/* ---------- events ---------- */', open(os.path.join(H, 'part_v8.js')).read() + '\n/* ---------- events ---------- */')
R('Meridiano Studio v7 ===================', 'Meridiano Studio v8 ===================')
open(os.path.join(H, 'app.html'), 'w').write(s)
print('v8 patched', len(s))
