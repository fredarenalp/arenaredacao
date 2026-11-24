// Painel lateral do corretor no computador: abas Critérios / Adicionais, recolher e expandir, AC sempre flutuante.
// Não grava nada no banco (nunca clica em Salvar). Uso: node e2e/ac-fixo.cjs   (preview em localhost:4173)
const { chromium } = require('playwright')
const falhas = []
const ok = (c, m) => { if (c) console.log('ok   ', m); else { falhas.push(m); console.log('FALHA', m) } }
;(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } })
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 }, ignoreHTTPSErrors: true })).newPage()
  const erros = []
  p.on('pageerror', (e) => erros.push(e.message))
  await p.goto('http://localhost:4173'); await p.waitForTimeout(500)
  await p.click('.p[data-k=corretor]'); await p.fill('#email', 'teste'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('#phCards', { timeout: 20000 }); await p.waitForTimeout(1200)
  await p.locator('.pcd').first().click(); await p.waitForTimeout(800)
  if (await p.locator('#plGo').isEnabled().catch(() => false)) await p.locator('#plGo').click(); else await p.locator('.plrow, [data-pl], .plr').first().click()
  await p.waitForSelector('#mk', { timeout: 8000 }); await p.waitForTimeout(1500)
  const vis = (sel) => p.evaluate((q) => { const e = document.querySelector(q); return !!e && e.offsetParent !== null && getComputedStyle(e).display !== 'none' }, sel)
  const larg = () => p.evaluate(() => document.querySelector('.rc').getBoundingClientRect().width)
  const arrasta = async (x0, y0, x1, y1) => { const r = await p.locator('#mk').boundingBox(); await p.mouse.move(r.x + r.width * x0, r.y + r.height * y0); await p.mouse.down(); await p.mouse.move(r.x + r.width * (x0 + x1) / 2, r.y + r.height * y0 + 3, { steps: 4 }); await p.mouse.move(r.x + r.width * x1, r.y + r.height * y1, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(300) }

  const ferr = async () => { if ((await p.getAttribute('[data-tool="o"]', 'aria-checked')) !== 'true') { await p.click('[data-tool="o"]'); await p.waitForTimeout(150) } }
  // o AC flutuante abre ao lado da marca, sem cobri-la
  const aoLado = () => p.evaluate(() => { const g = [...document.querySelectorAll('#mk g.xm')].pop(), r = g.getBoundingClientRect(), c = document.getElementById('catp').getBoundingClientRect(); return !(r.right > c.left && r.left < c.right && r.bottom > c.top && r.top < c.bottom) })
  // abas: Critérios (abre por padrão) e Adicionais; a aba Ferramentas não existe mais
  ok(await p.evaluate(() => document.querySelector('.pb').classList.contains('acf')), 'painel lateral ligado no computador')
  const abas = await p.evaluate(() => [...document.querySelectorAll('.acftab')].map((x) => x.textContent.replace(/\d+/g, '').trim() + (x.getAttribute('aria-selected') === 'true' ? '*' : '')))
  ok(abas.join('|') === 'Critérios*|Adicionais', 'duas abas: Critérios (aberta) e Adicionais ' + JSON.stringify(abas))
  ok(await p.evaluate(() => !document.querySelector('[data-acf="ac"]') && !document.getElementById('acpane')), 'a aba Ferramentas foi retirada')
  ok(await vis('#comps') && !(await vis('#cmBox')), 'Critérios mostra os critérios (níveis 0–4) e não a caixa de observações')
  ok(await vis('#fm .fmf'), 'Anular redação e Salvar continuam à vista')

  // Adicionais: observações adicionais sem rolar a tela
  await p.click('[data-acf="ad"]'); await p.waitForTimeout(300)
  ok(await vis('#cmBox') && !(await vis('#comps')), 'Adicionais mostra as observações adicionais no lugar dos critérios')
  const cx = await p.evaluate(() => { const c = document.getElementById('cmBox').getBoundingClientRect(), r = document.querySelector('.rc').getBoundingClientRect(); return c.top >= r.top && c.bottom <= r.bottom + 1 && getComputedStyle(document.getElementById('cmBox')).position === 'static' })
  ok(cx, 'a caixa de Adicionais cabe no painel, sem ficar fixa por cima de nada')
  await p.click('[data-acf="cr"]'); await p.waitForTimeout(200)

  // AC sempre flutuante, também com o painel aberto
  await ferr(); await arrasta(.2, .3, .4, .3)
  const flut = () => p.evaluate(() => { const c = document.getElementById('catp'); return !c.classList.contains('hide') && getComputedStyle(c).position === 'fixed' })
  ok(await flut(), 'criar um círculo abre o AC flutuante, junto da marca (painel aberto em Critérios)')
  ok(await aoLado(), 'o AC abre ao lado da marca, sem cobrir o trecho marcado (painel aberto)')
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)

  // recolher e expandir
  const w0 = await larg()
  await p.click('#acfCol'); await p.waitForTimeout(300)
  const w1 = await larg()
  ok(w1 < 80 && w0 > 380, `recolher deixa só a redação (${Math.round(w0)} → ${Math.round(w1)} px)`)
  ok(await p.locator('.acfchip').count() === 5, 'faixa recolhida mostra os 5 critérios')
  await ferr(); await arrasta(.55, .4, .75, .4)
  ok(await flut(), 'painel recolhido: o AC abre flutuante, como antes')
  ok(await aoLado(), 'o AC abre ao lado da marca, sem cobrir o trecho marcado (painel recolhido)')
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  // diálogo com o painel recolhido: o painel se abre sozinho e volta a recolher ao fechar
  await p.click('#mkClear'); await p.waitForTimeout(400)
  ok(await larg() > 300 && await p.locator('#lmpNo').isVisible(), 'diálogo "Limpar correção" com o painel recolhido abre inteiro (com botões)')
  await p.click('#lmpNo'); await p.waitForTimeout(400)
  ok(await larg() < 80, 'fechado o diálogo, o painel volta a recolher')
  await p.click('#acfOpen'); await p.waitForTimeout(300)
  ok(await larg() > 380, 'a seta ‹ reabre o painel')
  await p.click('.acfchip >> nth=0').catch(() => {})
  ok(erros.length === 0, 'sem erros de JavaScript' + (erros.length ? ': ' + erros[0] : ''))
  await b.close()
  console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\nTudo certo')
  process.exit(falhas.length ? 1 : 0)
})()
