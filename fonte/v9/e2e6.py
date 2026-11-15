from playwright.sync_api import sync_playwright
from urllib.parse import unquote
U = "file:///home/claude/studio4/test.html"
errs = []
def log(*a): print(*a, flush=True)
SEC = '<section style="position:absolute;inset:0;background:#0F2420;font-family:Karla,Arial,sans-serif;color:#EDEDE7"><p data-edit="eyebrow" style="position:absolute;left:128px;top:128px;font-size:24px;color:#C9A94E">From Claude</p><h2 data-edit="title" style="position:absolute;left:128px;top:180px;font-family:Newsreader,Georgia,serif;font-size:72px">{}</h2></section>'
NATIVE = '<!DOCTYPE html><html><body><div id="st"><div class="sl">' + SEC.format('Claude slide one') + '</div><div class="sl">' + SEC.format('Claude slide two') + '</div></div></body></html>'
FOREIGN = '''<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Georgia;background:#111}.slide{display:none;width:100vw;height:100vh;background:linear-gradient(135deg,#0F2420,#2E8070);color:#fff;padding:120px;box-sizing:border-box}.slide.active{display:block}h1{font-size:110px;margin:0}p{font-size:40px;color:#C9A94E}</style></head>
<body><div class="slide active"><h1>Deck by Claude</h1><p>Opening</p></div><div class="slide"><h1>Second idea</h1><p>Middle</p></div><div class="slide"><h1>Close</h1><p>End</p></div><script>alert('x')</script></body></html>'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome")
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
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
    doc = A.evaluate("cur().id")
    B.goto(link); B.wait_for_timeout(800); B.fill('#auName', 'Gustavo Sabillón'); B.fill('#auPass', 'secret456'); B.click('[data-act="auGo"]'); B.wait_for_timeout(1500)
    for pg in (A, B): pg.evaluate("(()=>{window.__opened=[];window.open=function(u){window.__opened.push(u);return null};return 1})()")

    A.click('[data-act="tab"][data-v="ai"]'); A.wait_for_timeout(300)
    log('demo buttons left:', A.locator('.rright [data-act="ai"]').count(), '| ask:', A.locator('[data-act="askClaude"]').count(), '| upload:', A.locator('[data-act="upOpen"]').count())
    A.screenshot(path="v6-ai-panel.png")
    # ask Claude for specific slides
    A.click('[data-act="aiScope"][data-v="pick"]'); A.wait_for_timeout(150); A.fill('input[data-model="pick"]', '1, 3'); A.fill('.rright textarea[data-model="ask"]', '3 layout options'); A.click('[data-act="askClaude"]'); A.wait_for_timeout(300)
    url = A.evaluate("window.__opened[0]||''")
    q = unquote(url.split('q=', 1)[1]) if 'q=' in url else ''
    log('opens claude.ai:', url.startswith('https://claude.ai/new?q='), '| has id:', doc in q, '| scope:', 'slides 1, 3' in q, '| options rule:', 'option_group' in q)
    log('html prompt size:', A.evaluate("claudePrompt(cur(),true).length"), '| contains slide html:', A.evaluate("claudePrompt(cur(),true).indexOf('data-edit')>0"))

    # upload native Studio format: 2 slides -> replace slide 2, add one
    A.click('[data-act="upOpen"]'); A.wait_for_timeout(300)
    A.set_input_files('#upFile', files=[{"name": "claude-deck.html", "mimeType": "text/html", "buffer": NATIVE.encode()}]); A.wait_for_timeout(600)
    log('format:', A.locator('#upModal .muted').first.inner_text(), '| whole default:', A.evaluate("UP.whole"))
    A.click('[data-act="upWhole"][data-v="0"]'); A.wait_for_timeout(200)
    A.select_option('select[data-up="0"]', 'r2'); A.wait_for_timeout(150); A.select_option('select[data-up="1"]', 'add'); A.wait_for_timeout(200)
    log('summary:', A.locator('#upModal .waiting').inner_text()); A.screenshot(path="v6-upload-map.png")
    A.click('[data-act="upCreate"]'); A.wait_for_timeout(1200)
    log('B sees upload card:', B.evaluate("versionsOf(cur()).map(p=>p.prompt).join('|')"))
    A.locator('.vcard [data-act="approve"]').first.click(); A.wait_for_timeout(1500)
    log('after approve: slides', B.evaluate("cur().order.length"), '| slide 2:', B.evaluate("plain(texts(cur().files[cur().order[1]]).title)"), '| slide 6:', B.evaluate("plain(texts(cur().files[cur().order[5]]).title)"), '| v', B.evaluate("cur().versions.length"))

    # upload a free-form Claude deck (own CSS) as the whole deck, by B (editor)
    B.click('[data-act="tab"][data-v="ai"]'); B.wait_for_timeout(300); B.click('[data-act="upOpen"]'); B.wait_for_timeout(300)
    B.click('[data-act="upSrc"][data-v="paste"]'); B.wait_for_timeout(150); B.fill('#upPaste', FOREIGN); B.click('[data-act="upRead"]'); B.wait_for_timeout(600)
    log('foreign format:', B.locator('#upModal .muted').first.inner_text(), '| slides:', B.evaluate("UP.parsed.slides.length"), '| whole:', B.evaluate("UP.whole"))
    B.screenshot(path="v6-upload-foreign.png")
    B.click('[data-act="upCreate"]'); B.wait_for_timeout(1200)
    log('A sees B upload:', A.evaluate("versionsOf(cur()).length"), '| no script stored:', A.evaluate("versionsOf(cur()).every(p=>Object.values(p.files).every(h=>!/<script/i.test(h)&&h.indexOf('&lt;script')<0))"))
    A.click('[data-act="tab"][data-v="props"]'); A.wait_for_timeout(400)
    A.locator('.vcard [data-act="vPrev"]').first.click(); A.wait_for_timeout(1200); A.screenshot(path="v6-foreign-preview.png")
    log('preview iframe sandbox:', A.evaluate("(document.querySelector('#vpStage iframe')||{}).getAttribute&&document.querySelector('#vpStage iframe').getAttribute('sandbox')"))
    A.click('[data-act="vpApprove"]'); A.wait_for_timeout(1500)
    log('deck now:', B.evaluate("cur().order.length"), 'slides | frames:', B.evaluate("cur().order.every(k=>isFrame(cur().files[k]))"))
    A.goto(U + "#/room/" + doc); A.wait_for_timeout(1500)
    log('room stage iframe:', A.locator('#rStage iframe').count()); A.screenshot(path="v6-room-frame.png")

    # owner applies a comment without a key -> opens Claude with the comment
    B.click('[data-act="tab"][data-v="comments"]'); B.fill('textarea[data-model="draft"]', 'Make the title shorter'); B.click('[data-act="comment"]'); B.wait_for_timeout(1000)
    A.evaluate("(()=>{window.__opened=[];window.open=function(u){window.__opened.push(u);return null};return 1})()")
    A.click('[data-act="tab"][data-v="comments"]'); A.wait_for_timeout(300); A.locator('[data-act="applyAI"]').first.click(); A.wait_for_timeout(300)
    log('apply comment opens claude:', 'Make%20the%20title%20shorter' in A.evaluate("window.__opened[0]||''"))
    # IDE and phone
    A.goto(U + "#/ide/" + doc); A.wait_for_timeout(1200); log('IDE ask:', A.locator('.ide-chat [data-act="askClaude"]').count()); A.screenshot(path="v6-ide.png")
    A.set_viewport_size({"width": 390, "height": 844}); A.goto(U + "#/room/" + doc); A.wait_for_timeout(1000)
    A.click('.mbar [data-act="mtab"][data-v="ai"]'); A.wait_for_timeout(500); A.screenshot(path="v6-phone-ai.png")
    A.click('[data-act="upOpen"]'); A.wait_for_timeout(300); A.screenshot(path="v6-phone-upload.png")
    b.close()
log('ERRORS:', errs[:12])
