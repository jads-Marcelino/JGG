from playwright.sync_api import sync_playwright
U = "file:///home/claude/studio4/test.html"
errs = []
def log(*a): print(*a, flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path="/usr/bin/google-chrome")
    ctx = b.new_context(viewport={"width": 1440, "height": 900})
    A = ctx.new_page(); B = ctx.new_page()
    for pg, n in ((A, 'A'), (B, 'B')):
        pg.on("pageerror", lambda e, n=n: errs.append(n + ': ' + str(e))); pg.on("dialog", lambda d: d.accept())
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
    log('B in room:', B.url.endswith(doc))

    # ---- A opens AI Studio
    A.click('[data-go="#/ide/%s"]' % doc); A.wait_for_timeout(1200)
    log('IDE body class:', A.evaluate("document.body.className"), '| files:', A.locator('.ide-tree .row[data-act="ideOpen"]').count())
    log('code has data-edit:', 'data-edit="title"' in A.input_value('#ideTA'))
    A.screenshot(path="v4-ide-desktop.png")
    # edit title in code
    ta = A.locator('#ideTA'); val = A.input_value('#ideTA')
    nv = val.replace('Data Strategy for Leaders</h1>', 'Data Strategy for Leaders · 2027</h1>', 1)
    log('replace ok:', nv != val)
    ta.fill(nv); A.wait_for_timeout(1500)
    log('B sees title:', B.evaluate("plain(texts(draftFiles(cur()).s1).title)"))
    log('changes tab:', A.locator('.ide-bot-b').inner_text()[:160].replace('\n', ' | '))
    # demo AI from IDE chat (open slide 2)
    A.locator('.ide-tree .row[data-act="ideOpen"]').nth(1).click(); A.wait_for_timeout(300)
    A.locator('.ide-chat [data-act="ai"]').first.click(); A.wait_for_timeout(3500)
    log('AI out:', A.locator('.ide-bot-h').inner_text().replace('\n', ' '), '| props:', A.evaluate("openProps(cur()).length"))
    A.click('[data-act="ideBot"][data-v="out"]'); A.wait_for_timeout(200)
    log('output:', A.locator('.ide-bot-b').inner_text()[:140].replace('\n', ' | '))
    A.screenshot(path="v4-ide-desktop-2.png")
    # connect modal: connector + key
    A.click('.ide-title [data-act="aiConnect"]'); A.wait_for_timeout(500)
    log('connector url shown:', '/functions/v1/mcp' in A.locator('#cnModal').inner_text())
    A.screenshot(path="v4-connect.png")
    A.click('[data-act="cnMode"][data-v="key"]'); A.wait_for_timeout(200)
    A.fill('#cKey', 'sk-ant-test-1234567890'); A.check('#cOk'); A.click('[data-act="cSave"]'); A.wait_for_timeout(800)
    log('key in account db:', A.evaluate("JSON.parse(localStorage.getItem('mock-sb-db')).ai_keys.map(k=>k.provider+':'+k.email)"), '| aiConn:', A.evaluate("aiConn()&&aiConn().provider"))
    log('B cannot read A key:', B.evaluate("sb.from('ai_keys').select('*').then(r=>r.data.length)"))
    # approve from source control panel
    A.click('[data-act="ideSide"][data-v="props"]'); A.wait_for_timeout(300)
    A.locator('.ide-side [data-act="approve"]').first.click(); A.wait_for_timeout(1500)
    log('B versions after approve:', B.evaluate("cur().versions.length"))

    # ---- tablet portrait and phone
    for w, h, tag in ((820, 1180, 'ipad'), (390, 844, 'phone')):
        A.set_viewport_size({"width": w, "height": h})
        A.goto(U + "#/"); A.wait_for_timeout(900); A.screenshot(path=f"v4-{tag}-home.png")
        A.goto(U + "#/room/" + doc); A.wait_for_timeout(1300); A.screenshot(path=f"v4-{tag}-room.png")
        if A.locator('.mbar [data-act="mtab"][data-v="comments"]').is_visible():
            A.click('.mbar [data-act="mtab"][data-v="comments"]'); A.wait_for_timeout(500); A.screenshot(path=f"v4-{tag}-sheet.png")
            log(tag, 'sheet open:', A.evaluate("document.getElementById('room').classList.contains('sheet')"))
            A.click('.rright [data-act="sheetClose"]'); A.wait_for_timeout(400)
        overflow = A.evaluate("document.documentElement.scrollWidth>innerWidth+1")
        log(tag, 'horizontal overflow on room:', overflow)
        A.goto(U + "#/ide/" + doc); A.wait_for_timeout(1300); A.screenshot(path=f"v4-{tag}-ide.png")
        if A.locator('.ide-mtabs').is_visible():
            for pane in ('preview', 'ai', 'changes', 'files'):
                A.click(f'[data-act="idePane"][data-v="{pane}"]'); A.wait_for_timeout(400); A.screenshot(path=f"v4-{tag}-ide-{pane}.png")
        A.goto(U + "#/templates"); A.wait_for_timeout(600)
        log(tag, 'templates overflow:', A.evaluate("document.documentElement.scrollWidth>innerWidth+1"))
    A.click('[data-act="burger"]'); A.wait_for_timeout(200); A.screenshot(path="v4-phone-menu.png")
    A.goto(U + "#/consent"); A.wait_for_timeout(400); log('consent w/o request:', A.locator('h1').first.inner_text())
    b.close()
log('ERRORS:', errs[:12])
