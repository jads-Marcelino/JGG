"""Applies v9 (assessments) on top of v8."""
import os, sys
H = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(H, 'app.html')).read()
if 'v9: assessments' in s: sys.exit('already patched')
def R(old, new):
    global s
    n = s.count(old)
    if n != 1: raise SystemExit(f'{n} matches: ' + old[:90])
    s = s.replace(old, new)
R('/* ---------- events ---------- */', open(os.path.join(H, 'part_v9.js')).read() + '\n/* ---------- events ---------- */')
R('Meridiano Studio v8 ===================', 'Meridiano Studio v9 ===================')
R("['#/templates','Templates'],", "['#/templates','Templates'],['#/assessments','Assessments'],")
open(os.path.join(H, 'app.html'), 'w').write(s)
print('v9 patched', len(s))
