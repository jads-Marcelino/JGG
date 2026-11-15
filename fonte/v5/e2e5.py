import json
from playwright.sync_api import sync_playwright
U = "file:///home/claude/studio4/test.html"
errs = []
def log(*a): print(*a, flush=True)
SEC = '<section style="position:absolute;inset:0;background:#0F2420;font-family:Karla,Arial,sans-serif;color:#EDEDE7">{}</section>'
def slide(t, bg='#1D3A34'):
    return SEC.format(f'<div style="position:absolute;left:128px;top:380px;width:1664px;height:420px;background:{bg};border-top:4px solid #C9A94E"></div><p data-edit="eyebrow" style="position:absolute;left:128px;top:128px;font-size:24px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#C9A94E">Option</p><h2 data-edit="title" style="position:absolute;left:128px;top:180px;width:1600px;font-family:Newsreader,Georgia,serif;font-size:72px;color:#EDEDE7">{t}</h2><script>alert(1)</script><p data-edit="note" onclick="alert(2)" style="position:absolute;left:180px;top:450px;font-size:36px">Body for {t}</p>')
def sse(obj):
    txt = json.dumps(obj)
    chunks = [txt[i:i+400] for i in range(0, len(txt), 400)]
    body = 'event: message_start\ndata: {"type":"message_start"}\n\n' + ''.join('event: content_block_delta\ndata: ' + json.dumps({"type": "content_block_delta", "delta": {"type": "text_delta", "text": c}}) + '\n\n' for c in chunks) + 'event: message_stop\ndata: {"type":"message_stop"}\n\n'
    return body
STATE = {"mode": "options"}
def handler(route):
    if STATE["mode"] == "options":
        obj = {"reply": "Three layouts for slide 2.", "options": [{"label": "A", "summary": "Number-led", "edit": [{"slide": 2, "html": slide("Layout A")}]}, {"label": "B", "summary": "Split panel", "edit": [{"slide": 2, "html": slide("Layout B", "#24413A")}]}, {"label": "C", "summary": "Quote", "edit": [{"slide": 2, "html": slide("Layout C", "#152C27")}]}]}
    else:
        obj = {"reply": "Added a bridge slide.", "options": [{"summary": "Bridge slide", "add": [{"after": 2, "html": slide("Bridge slide")}]}]}
    route.fulfill(status=200, headers={"content-type": "text/event-stream", "access-control-allow-origin": "*"}, body=sse(obj))

with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome")
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    ctx.route("https://api.anthropic.com/**", handler)
    A = ctx.new_page(); B = ctx.new_page()
    for pg, n in ((A, 'A'), (B, 'B')):
        pg.on("pageerror", lambda e, n=n: errs.append(n + ': ' + str(e)))
        pg.on("dialog", lambda d, n=n: (errs.append(n + ' DIALOG: ' + d.message), d.dismiss()))
        pg.on("console", lambda m, n=n: errs.append(n + ' console: ' + m.text) if m.type == 'error' else None)
    A.goto(U + "#/"); A.evaluate("localStorage.clear()"); A.goto(U + "#/signin"); A.wait_for_timeout(300)
    A.click('[data-act="auMode"][data-v="signup"]'); A.fill('#auName', 'Jadson Marcelino'); A.fill('#auEmail', 'jadson@meridiano.com'); A.fill('#auPass', 'secret123'); A.click('[data-act="auGo"]'); A.wait_for_timeout(800)
    A.goto(U + "#/templates"); A.wait_for_timeout(500); A.locator('.deckcard').first.click(); A.wait_for_timeout(300)
    A.fill('#mName', 'Data Strategy for Leaders'); A.fill('#mInv', 'gustavo@meridiano.com'); A.click('[data-act="create"]'); A.wait_for_timeout(1800)
    if not A.locator('.modal [data-act="copy"]').count():
        A.locator('[data-act="shLink"]').first.click(); A.wait_for_timeout(200)
    link = A.locator('.modal [data-act="copy"]').first.get_attribute('data-v'); A.click('[data-act="close"]')
    doc = A.evaluate("cur().id"); n0 = A.evaluate("cur().order.length")
    B.goto(link); B.wait_for_timeout(800); B.fill('#auName', 'Gustavo Sabillón'); B.fill('#auPass', 'secret456'); B.click('[data-act="auGo"]'); B.wait_for_timeout(1500)

    # no key, no connector: free question gets an honest answer
    A.click('[data-act="tab"][data-v="ai"]'); A.wait_for_timeout(200)
    log('badge (none):', A.locator('.rright .waiting').first.inner_text()[:60])
    A.fill('textarea[data-model="ask"]', 'o que pode ser melhorado nesse slide?'); A.click('[data-act="aiFree"]'); A.wait_for_timeout(400)
    log('honest reply:', A.locator('.rright .msg.ai .bub').last.inner_text()[:90].replace('\n', ' '))
    # connector used -> status changes
    A.evaluate("sb.from('events').insert({user_id:ME,email:MYEMAIL,type:'mcp_call',meta:{tool:'initialize'}})"); A.wait_for_timeout(200)
    A.evaluate("loadConnStatus().then(()=>drawRight())"); A.wait_for_timeout(300)
    log('badge (connector):', A.locator('.rright .waiting').first.inner_text()[:60])
    # save key -> AI configured
    A.click('.rright [data-act="aiConnectM"][data-v="key"]'); A.wait_for_timeout(300)
    A.fill('#cKey', 'sk-ant-test-1234567890'); A.check('#cOk'); A.click('[data-act="cSave"]'); A.wait_for_timeout(700)
    log('badge (key):', A.locator('.rright .waiting').first.inner_text()[:60])

    # 3 options for slide 2
    A.locator('.rleft .th2').nth(1).click(); A.wait_for_timeout(300); A.click('[data-act="tab"][data-v="ai"]'); A.wait_for_timeout(200)
    A.click('[data-act="aiMode"][data-v="options"]'); A.wait_for_timeout(150); A.click('[data-act="aiFree"]'); A.wait_for_timeout(2500)
    log('A versions:', A.evaluate("versionsOf(cur()).map(p=>p.label).join(',')"), '| B versions:', B.evaluate("versionsOf(cur()).length"))
    log('script stripped:', A.evaluate("versionsOf(cur()).every(p=>Object.values(p.files).every(h=>h.indexOf('<script')<0&&h.indexOf('onclick')<0))"))
    log('draft unchanged by options:', A.evaluate("plain(texts(draftFiles(cur())[cur().order[1]]).title)"))
    B.click('[data-act="tab"][data-v="props"]'); B.wait_for_timeout(500); B.screenshot(path="v5-B-props.png")
    log('B cards:', B.locator('.vcard').count(), '| thumbs drawn:', B.locator('.vthumb .mini').count())
    A.click('[data-act="tab"][data-v="props"]'); A.wait_for_timeout(400)
    A.locator('.vcard [data-act="vPrev"]').nth(2).click(); A.wait_for_timeout(500); A.screenshot(path="v5-preview.png")
    log('preview title:', A.locator('.vp-t').inner_text(), '| badge:', A.locator('.vp-badge').inner_text())
    A.click('[data-act="vpApprove"]'); A.wait_for_timeout(1500)
    log('after approve B title:', B.evaluate("plain(texts(cur().files[cur().order[1]]).title)"), '| open versions:', B.evaluate("versionsOf(cur()).length"), '| v:', B.evaluate("cur().versions.length"))

    # new slide after slide 2
    STATE["mode"] = "add"
    A.click('[data-act="tab"][data-v="ai"]'); A.wait_for_timeout(200); A.click('[data-act="aiMode"][data-v="add"]'); A.click('[data-act="aiFree"]'); A.wait_for_timeout(2500)
    A.click('[data-act="tab"][data-v="props"]'); A.wait_for_timeout(300)
    A.locator('.vcard [data-act="approve"]').first.click(); A.wait_for_timeout(1500)
    log('slides:', n0, '->', B.evaluate("cur().order.length"), '| slide 3 title:', B.evaluate("plain(texts(cur().files[cur().order[2]]).title)"))

    # editor B proposes a structural version (like the connector does)
    B.evaluate("""sb.from('proposals').insert({id:crypto.randomUUID(),doc_id:cur().id,author:ME,via:'mcp',prompt:'Move closing slide to the front',files:{},slide_order:[cur().order[cur().order.length-1]].concat(cur().order.slice(0,-1)),option_group:'g-x',status:'open'})"""); B.wait_for_timeout(800)
    log('A sees connector version:', A.evaluate("versionsOf(cur()).map(p=>p.via+':'+p.prompt).join('|')"))
    # IDE side panel shows the card too
    A.goto(U + "#/ide/" + doc); A.wait_for_timeout(1200); A.click('[data-act="ideSide"][data-v="props"]'); A.wait_for_timeout(400)
    log('IDE title AI:', A.locator('.ide-title [data-act="aiConnect"]').inner_text(), '| IDE cards:', A.locator('.ide-side .vcard').count())
    A.screenshot(path="v5-ide.png")
    A.set_viewport_size({"width": 390, "height": 844}); A.goto(U + "#/room/" + doc); A.wait_for_timeout(1000)
    A.click('.mbar [data-act="mtab"][data-v="props"]'); A.wait_for_timeout(500); A.screenshot(path="v5-phone-props.png")
    A.locator('.vcard [data-act="vPrev"]').first.click(); A.wait_for_timeout(500); A.screenshot(path="v5-phone-preview.png")
    b.close()
log('ERRORS:', errs[:12])
