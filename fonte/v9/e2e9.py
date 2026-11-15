import json, subprocess, time, os
from playwright.sync_api import sync_playwright
srv=subprocess.Popen(['python3','-m','http.server','8765','--bind','127.0.0.1'],cwd='/home/claude/studio4',stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
U="http://127.0.0.1:8765/test.html"; errs=[]
def log(*a): print(*a, flush=True)
PDF="/mnt/user-data/uploads/581382b6-Gui_a_de_Discovery_y_Diagno_stico_-_Operacio_n_Sonrisa_Panama_.pdf"
try:
  with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome"); ctx=b.new_context(viewport={"width":1440,"height":950},accept_downloads=True); A=ctx.new_page()
    A.on("pageerror",lambda e:errs.append(str(e))); A.on("dialog",lambda d:d.accept())
    A.on("console",lambda m:errs.append('console: '+m.text) if m.type=='error' else None)
    A.goto(U+"#/"); A.evaluate("localStorage.clear()"); A.goto(U+"#/signin"); A.wait_for_timeout(400)
    A.click('[data-act="auMode"][data-v="signup"]'); A.fill('#auName','Jadson Marcelino'); A.fill('#auEmail','jadson@meridiano.com'); A.fill('#auPass','secret123'); A.click('[data-act="auGo"]'); A.wait_for_timeout(800)
    A.goto(U+"#/templates"); A.wait_for_timeout(500); A.click('[data-act="tf"][data-v="Assessment"]'); A.wait_for_timeout(300)
    A.locator('[data-act="useTpl"][data-v="guide-os"]').click(); A.wait_for_timeout(300); A.fill('#mName','Triaje y Diagnóstico de Datos: Operación Sonrisa Panamá'); A.click('[data-act="create"]'); A.wait_for_timeout(1500)
    A.evaluate("document.querySelectorAll('.modal-bg').forEach(m=>m.remove())")
    gid=A.evaluate("cur().id"); log('guide fields:', A.evaluate("guideSchema(cur().files,cur().order).map(s=>s.field).join(',')"))
    json.dump(A.evaluate("({files:cur().files,order:cur().order})"),open('/tmp/guide.json','w'))
    A.goto(U+"#/view/"+gid); A.wait_for_timeout(1000); A.screenshot(path="v9-guide.png",full_page=True)
    A.goto(U+"#/assessments"); A.wait_for_timeout(1500); log('guides on page:', A.locator('#asGuides .card').count()); A.screenshot(path="v9-page-empty.png")
    with A.expect_download() as dl: A.click('#asGuides [data-act="asSheet"]')
    sheet=open(dl.value.path(),encoding='utf-8').read(); log('sheet lines:', len(sheet.splitlines()))
    filled=sheet.replace('Fecha: ','Fecha: 12/11/2026').replace('Directivos participantes: ','Directivos participantes: Ana Pérez (Directora), Luis Gómez (Finanzas)')
    stages=['1','2','1','2','1','1']; out=[]; si=0
    for line in filled.splitlines():
        if line.startswith('Etapa (1, 2 o 3):'): line+=stages[si]; si+=1
        elif line=='Notas: ': line='Notas: Reportes en Excel armados a mano por voluntarios.'
        elif line=='Respuesta: ': line='Respuesta: Papel en jornadas; duplicados en recurrentes.'
        out.append(line)
    open('/tmp/answers.txt','w').write('\n'.join(out))
    # 1) answer sheet -> automatic
    A.click('#asGuides [data-act="asNew"]'); A.wait_for_timeout(300); A.fill('#naTitle','Directiva · primera sesión')
    A.set_input_files('#naFile','/tmp/answers.txt'); A.wait_for_timeout(800); log('read:', A.locator('#naMsg').inner_text())
    A.click('[data-act="naNext"]'); A.wait_for_timeout(500); log('auto:', A.locator('#naModal .modal > div:nth-of-type(1)').inner_text()); A.screenshot(path="v9-fill.png")
    A.click('[data-act="naAuto"]'); A.wait_for_timeout(2000)
    row=A.evaluate("AS.list[0]"); log('row:', row['status'], row['stage'], row['method'], 'uploaded:', A.evaluate("window.__uploads"))
    A.screenshot(path="v9-page.png")
    rid=row['result_doc_id']; A.goto(U+"#/view/"+rid); A.wait_for_timeout(1200)
    T=A.evaluate("(()=>{var d=S.decks.find(x=>x.id==='%s');var t={};d.order.forEach(k=>Object.assign(t,texts(d.files[k])));return {etapa:plain(t.etapa),t2s:plain(t.t2s),t1n:plain(t.t1n),d1:plain(t.d1),fecha:plain(t.fecha),eyebrow:plain(t.eyebrow)}})()"%rid)
    log('filled:', T); A.screenshot(path="v9-filled.png",full_page=True)
    # 2) original PDF -> read text, few answers -> Claude path
    A.goto(U+"#/assessments"); A.wait_for_timeout(1200); A.evaluate("(()=>{window.__opened=[];window.open=function(u){window.__opened.push(u)};return 1})()")
    A.click('#asGuides [data-act="asNew"]'); A.wait_for_timeout(300); A.fill('#naTitle','PDF de prueba')
    A.set_input_files('#naFile',PDF); A.wait_for_timeout(4000); log('pdf read:', A.locator('#naMsg').inner_text())
    A.click('[data-act="naNext"]'); A.wait_for_timeout(500); log('pdf auto:', A.locator('#naModal .modal > div:nth-of-type(1)').inner_text()[:80])
    A.click('[data-act="naClaude"]'); A.wait_for_timeout(1200)
    log('claude url:', 'fill_assessment' in __import__('urllib.parse').parse.unquote(A.evaluate("window.__opened[0]||''")), '| status:', A.evaluate("AS.list.map(a=>a.status).join(',')"))
    # 3) pasted free notes with labels
    A.click('#asGuides [data-act="asNew"]'); A.wait_for_timeout(300); A.click('[data-act="naSrc"][data-v="paste"]'); A.fill('#naPaste','Fecha: 14/11/2026\nT1 Etapa: 2 - tablero mensual llega tarde\nT3 [x] 1 no existe repositorio\nD5 Respuesta: prioridad es seguimiento postoperatorio; cumplen Ley 81 con anonimización.')
    A.click('[data-act="naNext"]'); A.wait_for_timeout(400); log('notes auto:', A.evaluate("JSON.stringify(NA.ans)"))
    A.evaluate("document.getElementById('naModal').remove()")
    A.set_viewport_size({"width":390,"height":844}); A.goto(U+"#/assessments"); A.wait_for_timeout(1200); A.screenshot(path="v9-phone.png",full_page=True)
    b.close()
finally:
  srv.terminate()
log('ERRORS',errs[:10])
