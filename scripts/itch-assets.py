# Renders itch.io assets into itch/: cover.png (630x500) and three screenshots. Needs the server on 8772.
import asyncio, base64, json, subprocess
from playwright.async_api import async_playwright
URL = 'http://127.0.0.1:8772/index.html'
async def level(pg, k):
    await pg.locator('#levels [data-level]').nth(k - 1).click(); await pg.wait_for_timeout(700)
async def tap(pg, n, x, y):
    c = pg.locator('canvas'); bb = await c.bounding_box(); cs = bb['width'] / n
    await pg.mouse.click(bb['x'] + cs * (x + .5), bb['y'] + cs * (y + .5))
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1100, 'height': 860}, device_scale_factor=1, reduced_motion='reduce')
        pg = await ctx.new_page(); await pg.goto(URL); await pg.evaluate('localStorage.clear()'); await pg.reload(); await pg.wait_for_timeout(600)
        panel = pg.locator('.panel')
        # 1: level 5, two claims made, the third one's evidence on screen
        await level(pg, 5)
        for (x, y, k) in [(3, 0, 's'), (3, 2, 'f')]:
            await tap(pg, 6, x, y); await pg.keyboard.press(k)
        await pg.evaluate('document.activeElement.blur()'); await panel.screenshot(path='itch/shot1-evidence.png')
        # 2: level 17, the cyan target focused
        await level(pg, 17); await tap(pg, 7, 4, 6); await pg.wait_for_timeout(200)
        await panel.screenshot(path='itch/shot2-focus.png')
        # 3: level 14 won (proof from the test helper)
        proofs = json.loads(subprocess.run(['bash', '-c', 'source ~/.nvm/nvm.sh && node test/sequence.mjs'], capture_output=True, text=True).stdout)
        pr = proofs[13]; await level(pg, 14)
        for i, t in pr['claims']:
            if (await pg.locator('#msg').inner_text()).startswith('Proven. '): break
            await tap(pg, pr['w'], i % pr['w'], i // pr['w']); await pg.keyboard.press('f' if t == 'flip' else 's')
        await pg.wait_for_timeout(300); await panel.screenshot(path='itch/shot3-proven.png')
        # cover: title over the level 17 focus picture
        await level(pg, 17); await tap(pg, 7, 4, 6); await pg.wait_for_timeout(200)
        png = await pg.locator('canvas').screenshot()
        serif = base64.b64encode(open('fonts/source-serif-4-latin-opsz-normal.woff2', 'rb').read()).decode()
        card = await b.new_page(viewport={'width': 630, 'height': 500}, device_scale_factor=1)
        await card.set_content(f'''<style>@font-face {{ font-family: S; font-weight: 200 900; src: url(data:font/woff2;base64,{serif}) format("woff2"); }}</style>
          <body style="margin:0;width:630px;height:500px;background:#fbf9f4;display:flex;align-items:center;gap:26px;padding:0 0 0 34px;box-sizing:border-box">
          <div style="flex:1;color:#1f2430"><div style="font:650 50px/1.02 S;letter-spacing:-1px;white-space:nowrap">No Fewer</div>
          <div style="font:400 21px/1.35 S;color:#3d4452;margin-top:16px">Don't solve the puzzle. Prove nobody can solve it in fewer flips.</div></div>
          <img src="data:image/png;base64,{base64.b64encode(png).decode()}" style="width:330px;height:330px;margin-right:30px;border-radius:12px;box-shadow:0 10px 24px -10px rgba(20,24,33,.5)">
          </body>''')
        await card.wait_for_timeout(300); await card.screenshot(path='itch/cover.png')
        await b.close()
asyncio.run(main())
