const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const source = fs.readFileSync(path.join(root, '../index.html'), 'utf8');
const checks = async function () {
  const results = [];
  const check = (name, value, detail) => results.push({ name, pass: !!value, detail });
  try {
    const c = document.createElement('canvas'); c.width = 800; c.height = 600;
    const blob = await new Promise(resolve => c.toBlob(resolve, 'image/png'));
    await importImages([new File([blob], 'one.png', { type: 'image/png' }), new File([blob], 'two.png', { type: 'image/png' })]);
    await new Promise(resolve => setTimeout(resolve, 100));
    check('import two pages', pages.length === 2 && !stage.hidden && view.naturalWidth === 800);
    const rect = canvas.getBoundingClientRect();
    const event = (type, dx = 0, dy = 0, extra = {}) => canvas.dispatchEvent(new PointerEvent(type, { clientX: rect.left + 50 + dx, clientY: rect.top + 50 + dy, pointerId: 1, pointerType: 'mouse', isPrimary: true, bubbles: true, ...extra }));
    event('pointerdown'); event('pointermove', 80, 60); event('pointerup', 80, 60);
    check('pen undo redo', activePage().strokes.length === 1);
    undo(); check('undo removes stroke', activePage().strokes.length === 0);
    redo(); check('redo restores stroke', activePage().strokes.length === 1);
    zoomCenter(1.25); check('zoom increases per-page scale', activePage().zoom === 1.25); zoomFit(); check('fit resets zoom', activePage().zoom === 1);
    undo();
    setTool('erase'); event('pointerdown', 200, 150); event('pointerup', 200, 150);
    check('empty eraser preserves redo', activePage().redo.length === 1, { redo: activePage().redo.length });
    setTool('line'); event('pointerdown'); event('pointerup', 120, 100);
    const line = activePage().strokes.at(-1);
    check('pointerup saves final position', line.points[0] !== line.points[2], { points: line.points });
    const a = document.getElementById('toolbar').getBoundingClientRect();
    const b = document.getElementById('zoombar').getBoundingClientRect();
    const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    check('toolbar and zoom do not overlap', overlap === 0, { viewport: innerWidth, main: main.clientWidth, overlap, toolbar: a.toJSON(), zoom: b.toJSON() });
    setTool('pen-red'); event('pointerdown');
    event('pointermove', 200, 100, { pointerId: 2, pointerType: 'touch', isPrimary: false });
    event('pointerup', 200, 100, { pointerId: 2, pointerType: 'touch', isPrimary: false });
    check('secondary pointer does not end primary stroke', drawing !== null);
    check('secondary pointer does not add points', drawing.points.length === 2);
    event('pointercancel', 0, 0, { pointerId: 2, pointerType: 'touch', isPrimary: false });
    check('secondary cancellation leaves primary drawing intact', drawing !== null);
    event('pointermove', 80, 60);
    event('lostpointercapture');
    check('lost capture commits partial stroke and releases drawing', drawing === null && activePage().strokes.at(-1).points.length > 2);
    const beforeErase = activePage().strokes.length;
    setTool('erase'); event('pointerdown'); event('pointermove', 80, 60); event('pointerup', 80, 60);
    check('eraser removes intersected strokes', activePage().strokes.length < beforeErase);
    undo(); check('one undo restores entire erased gesture', activePage().strokes.length === beforeErase);
    redo(); check('redo reapplies erased gesture', activePage().strokes.length < beforeErase);
    setTool('pen-red'); event('pointerdown'); event('pointermove', 80, 60);
    const firstPage = activePage(), beforeSwitch = firstPage.strokes.length;
    setActive(pages[1].id);
    check('switching page commits stroke on original page', drawing === null && firstPage.strokes.length === beforeSwitch + 1 && activePage().strokes.length === 0);
    endDraw();
    let decodeCalls = 0;
    pages.forEach(p => p.img.decode = () => { decodeCalls++; return new Promise(() => {}); });
    setActive(pages[0].id); setActive(pages[1].id);
    check('page switching reuses already decoded images', decodeCalls === 0);
    check('rapid page switch keeps image and active page aligned', view.src === activePage().url, { activeId, imageMatchesFirst: view.src === pages[0].url });
    removePage(pages[1].id);
    check('delete active page selects remaining image', pages.length === 1 && view.src === activePage().url);
    removePage(pages[0].id);
    check('delete last page restores empty state', pages.length === 0 && stage.hidden && !document.body.classList.contains('has-image'));
  } catch (e) { results.push({ error: e.stack }); }
  document.body.innerHTML = '';
  const result = document.createElement('pre'); result.id = 'review-results'; result.textContent = JSON.stringify(results); document.body.append(result);
};
const htmlPath = path.join(root, 'runtime.html');
fs.writeFileSync(htmlPath, source.replace('</body>', `<script>(${checks.toString()})()</script></body>`));
(async () => {
  const { chromium } = require('playwright-core');
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: Number(process.argv[2] || 1000), height: 800 } });
    await page.goto('file:///' + htmlPath.replaceAll('\\', '/'));
    await page.waitForSelector('#review-results', { timeout: 15000 });
    const results = JSON.parse(await page.locator('#review-results').textContent());
    if (results.some(r => r.error || !r.pass)) process.exitCode = 1;
    console.log(JSON.stringify(results, null, 2));
  } finally { await browser.close(); fs.unlinkSync(htmlPath); }
})().catch(e => { console.error(e); process.exitCode = 1; });


