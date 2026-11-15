"""Applies v7 (text templates) on top of v6."""
import os, sys
H = os.path.dirname(os.path.abspath(__file__))
s = open(os.path.join(H, 'app.html')).read()
if 'v7: text templates' in s: sys.exit('already patched')
def R(old, new):
    global s
    n = s.count(old)
    if n != 1: raise SystemExit(f'{n} matches: ' + old[:90])
    s = s.replace(old, new)
R('/* ---------- events ---------- */', open(os.path.join(H, 'part_v7.js')).read() + '\n/* ---------- events ---------- */')
R('Meridiano Studio v6 ===================', 'Meridiano Studio v7 ===================')
R("plain(T.h||'')", "plain(T.h||T.label||T.title||'')")
R("fileOf(d,k){var i=d.order.indexOf(k),T=texts(draftFiles(d)[k]||'');return (d.kind==='doc'?'sections/':'slides/')+pad2(i+1)+'-'+slug(T.h||T.title||T.eyebrow||k)", "fileOf(d,k){var i=d.order.indexOf(k),T=texts(draftFiles(d)[k]||'');return (d.kind==='doc'?'sections/':'slides/')+pad2(i+1)+'-'+slug(T.h||T.label||T.title||T.eyebrow||k)")
open(os.path.join(H, 'app.html'), 'w').write(s)
print('v7 patched', len(s))
