from playwright.sync_api import sync_playwright
from urllib.parse import quote
U="file:///home/claude/studio4/test.html"; errs=[]
def log(*a): print(*a, flush=True)
SEC='<section style="position:absolute;inset:0;background:#0F2420;color:#EDEDE7"><h2 data-edit="title" style="position:absolute;left:128px;top:180px;font-size:72px">{}</h2></section>'
NATIVE='<div id="st"><div class="sl">'+SEC.format('From Drive one')+'</div><div class="sl">'+SEC.format('From Drive two')+'</div></div>'
STUB="""(()=>{window.__FETCH_STUB=function(n,b){if(n!=='fetch-url')return {data:null,error:{message:'?'}};if(/private/.test(b.url))return {data:null,error:{message:'Edge Function returned a non-2xx status code',context:{json:function(){return Promise.resolve({error:'The link is private. Share it as anyone with the link.'})}}}};window.__lastUrl=b.url;return {data:{html:%s,name:'deck-from-drive.html'},error:null};};return 1})()""" % repr(NATIVE).replace("'",'"') if False else None
with sync_playwright() as p:
    b=p.chromium.launch(executable_path="/usr/bin/google-chrome"); ctx=b.new_context(viewport={"width":1366,"height":900}); A=ctx.new_page()
    A.on("pageerror",lambda e:errs.append(str(e))); A.on("dialog",lambda d:d.dismiss())
    A.goto(U+"#/"); A.evaluate("localStorage.clear()"); A.goto(U+"#/signin"); A.wait_for_timeout(300)
    A.click('[data-act="auMode"][data-v="signup"]'); A.fill('#auName','Jadson Marcelino'); A.fill('#auEmail','jadson@meridiano.com'); A.fill('#auPass','secret123'); A.click('[data-act="auGo"]'); A.wait_for_timeout(800)
    A.goto(U+"#/templates"); A.wait_for_timeout(500); A.locator('.deckcard').first.click(); A.wait_for_timeout(300); A.fill('#mName','Deck'); A.click('[data-act="create"]'); A.wait_for_timeout(1500)
    doc=A.evaluate("cur().id")
    def stub(page):
        page.evaluate("(h)=>{window.__FETCH_STUB=function(n,b){if(/private/.test(b.url))return {data:null,error:{message:'non-2xx',context:{json:function(){return Promise.resolve({error:'The link is private. Share it as anyone with the link.'})}}}};window.__lastUrl=b.url;return {data:{html:h,name:'deck-from-drive.html'},error:null};};}", NATIVE)
    stub(A)
    A.click('[data-act="tab"][data-v="ai"]'); A.wait_for_timeout(300)
    log('panel:', A.locator('.aip').inner_text().count('Import'))
    A.click('[data-act="upOpen"]'); A.wait_for_timeout(300)
    log('device label:', 'Google Drive' in A.locator('.upbox').inner_text())
    A.click('[data-act="upSrc"][data-v="link"]'); A.wait_for_timeout(200); A.screenshot(path="v8-link.png")
    A.fill('#upUrl','https://drive.google.com/file/d/PRIVATE/view?private'); A.click('[data-act="upFetch"]'); A.wait_for_timeout(500)
    log('private msg:', A.locator('#upMsg').inner_text())
    A.fill('#upUrl','https://drive.google.com/file/d/ABC123/view?usp=sharing'); A.click('[data-act="upFetch"]'); A.wait_for_timeout(600)
    log('step2:', A.locator('#upModal .muted').first.inner_text(), '| url sent:', A.evaluate("window.__lastUrl"))
    A.click('[data-act="upCreate"]'); A.wait_for_timeout(900); log('version created:', A.evaluate("versionsOf(cur()).map(p=>p.prompt).join('|')"))
    # import link
    A.click('[data-act="tab"][data-v="ai"]'); A.wait_for_timeout(200); A.click('[data-act="upOpen"]'); A.wait_for_timeout(200); A.click('[data-act="upSrc"][data-v="link"]'); A.fill('#upUrl','https://www.dropbox.com/s/xyz/deck.html?dl=0'); A.wait_for_timeout(100)
    link=A.evaluate("importLinkFor(cur(),UP.url)"); log('import link:', link.split('#')[1][:60]); A.evaluate("document.getElementById('upModal').remove()")
    A.goto(U+"#/shared"); A.wait_for_timeout(500); A.goto(link); A.wait_for_timeout(2500)
    log('deep link opened modal at step:', A.evaluate("UP&&UP.step"), '| url:', A.evaluate("window.__lastUrl"))
    A.set_viewport_size({"width":390,"height":844}); A.evaluate("document.getElementById('upModal')&&document.getElementById('upModal').remove()")
    A.evaluate("openUpload();UP.src='link';drawUpload()"); A.wait_for_timeout(300); A.screenshot(path="v8-phone-link.png")
    b.close()
log('ERRORS',errs)
