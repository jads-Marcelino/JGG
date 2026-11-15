from playwright.sync_api import sync_playwright
U="file:///home/claude/studio4/test.html"
errs=[]
def log(*a): print(*a, flush=True)
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome")
    ctx=b.new_context(viewport={"width":1366,"height":900})
    A=ctx.new_page(); Bp=ctx.new_page()
    for pg,n in ((A,'A'),(Bp,'B')):
        pg.on("pageerror",lambda e,n=n:errs.append(n+': '+str(e))); pg.on("dialog",lambda d:d.accept())
        pg.on("console",lambda m,n=n:errs.append(n+' console: '+m.text) if m.type=='error' else None)
    A.goto(U+"#/"); A.evaluate("localStorage.clear()"); A.goto(U+"#/signin"); A.wait_for_timeout(300)
    A.click('[data-act="auMode"][data-v="signup"]'); A.fill('#auName','Jadson Marcelino'); A.fill('#auEmail','jadson@meridiano.com'); A.fill('#auPass','secret123'); A.click('[data-act="auGo"]'); A.wait_for_timeout(800)
    log('A after signup:', A.url)
    A.goto(U+"#/templates"); A.wait_for_timeout(500); A.locator('.deckcard').first.click(); A.wait_for_timeout(300)
    A.fill('#mName','Data Strategy for Leaders'); A.fill('#mInv','gustavo@meridiano.com'); A.click('[data-act="create"]'); A.wait_for_timeout(1800)
    log('A room:', A.url); A.screenshot(path="e1-share.png")
    link=A.locator('.modal [data-act="copy"]').first.get_attribute('data-v') if A.locator('.modal [data-act="copy"]').count() else None
    if not link:
        A.locator('[data-act="shLink"]').first.click(); A.wait_for_timeout(200); link=A.locator('.modal [data-act="copy"]').first.get_attribute('data-v')
    log('link:', link)
    A.click('[data-act="close"]')
    # B joins via link
    Bp.goto(link); Bp.wait_for_timeout(800); Bp.screenshot(path="e2-join.png")
    Bp.fill('#auName','Gustavo Sabillón'); Bp.fill('#auPass','secret456'); Bp.click('[data-act="auGo"]'); Bp.wait_for_timeout(1500)
    log('B url:', Bp.url)
    # B edits title
    t=Bp.locator('#rStage [data-edit="title"]'); t.click(); Bp.keyboard.press("End"); Bp.keyboard.type(" 2027", delay=50); Bp.wait_for_timeout(1500)
    log('A sees title:', A.evaluate("plain(texts(draftFiles(cur()).s1).title)"))
    # B comments
    Bp.click('[data-act="tab"][data-v="comments"]'); Bp.fill('textarea[data-model="draft"]','Can we add a client example? @Jadson'); Bp.click('[data-act="comment"]'); Bp.wait_for_timeout(1200)
    A.click('[data-act="tab"][data-v="comments"]'); A.wait_for_timeout(500)
    log('A comment author:', A.locator('.cmt .h b').first.inner_text(), '|', A.locator('.cmt p').nth(1).inner_text())
    A.screenshot(path="e3-A-room.png"); Bp.screenshot(path="e4-B-room.png")
    # A approves
    A.click('[data-act="tab"][data-v="props"]'); A.wait_for_timeout(300); A.locator('[data-act="approve"]').first.click(); A.wait_for_timeout(1500)
    log('B versions:', Bp.evaluate("cur().versions.length"), 'B approved title:', Bp.evaluate("plain(texts(cur().files.s1).title)"))
    # stranger
    C=ctx.new_page(); C.on("pageerror",lambda e:errs.append('C: '+str(e)))
    C.goto(link.replace('gustavo%40meridiano.com','x%40y.com')); C.wait_for_timeout(800); log('C sees:', C.locator('h1').first.inner_text())
    # analytics + mcp as A
    A.goto(U+"#/analytics"); A.wait_for_timeout(1000); A.screenshot(path="e5-analytics.png",full_page=True)
    A.goto(U+"#/mcp"); A.wait_for_timeout(800); A.click('[data-act="mcpPick"][data-v="list_presentations"]'); A.wait_for_timeout(500); A.click('[data-act="mcpRun"]'); A.wait_for_timeout(800)
    log('MCP:', A.locator('#mcpOut').inner_text()[:300].replace('\n',' '))
    Bp.goto(U+"#/shared"); Bp.wait_for_timeout(800); Bp.screenshot(path="e6-B-shared.png")
    b.close()
log('ERRORS:', errs[:10])
