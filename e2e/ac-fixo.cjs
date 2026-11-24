// AC fixo na lateral (computador): painel permanente, abas Ferramentas/Critérios, recolher, ferramenta ativa.
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
  const marcas = async () => p.locator('#mk g.xm').count()
  const arrasta = async (x0, y0, x1, y1) => { const r = await p.locator('#mk').boundingBox(); await p.mouse.move(r.x + r.width * x0, r.y + r.height * y0); await p.mouse.down(); await p.mouse.move(r.x + r.width * (x0 + x1) / 2, r.y + r.height * y0 + 3, { steps: 4 }); await p.mouse.move(r.x + r.width * x1, r.y + r.height * y1, { steps: 4 }); await p.mouse.up(); await p.waitForTimeout(300) }

  ok(await p.evaluate(() => document.querySelector('.pb').classList.contains('acf')), 'painel fixo ligado no computador')
  ok(await p.evaluate(() => document.getElementById('acpane').contains(document.getElementById('catp'))), 'o AC mora dentro do painel lateral')
  const m = await p.evaluate(() => { const a = document.getElementById('acpane'); return { c: a.clientHeight, s: a.scrollHeight } })
  ok(m.s <= m.c + 1, `o AC cabe sem rolar em 1366×768 (conteúdo ${m.s} px, painel ${m.c} px)`)
  ok(await p.evaluate(() => document.querySelector('#catp .pg-d .sinbar') !== null), 'sinais que faltam dentro do critério II')
  ok(await p.locator('#acFoot').innerText().then((t) => /arraste/.test(t)), 'rodapé orienta quando não há ferramenta')

  // ferramenta ativa: escolhe Rasura e arrasta duas vezes
  await p.click('#catp button[data-cat="ra"]')
  ok(/Rasura/.test(await p.innerText('#acFoot')), 'escolher Rasura deixa a ferramenta ativa (rodapé mostra "Ativa: Rasura")')
  const n0 = await marcas()
  await arrasta(.2, .3, .45, .3)
  ok(await marcas() === n0 + 1, 'arrastar na folha cria a marca já com o tipo (sem balão)')
  ok(await p.evaluate(() => document.getElementById('catp').classList.contains('idle')), 'depois de marcar o painel volta ao estado ocioso')
  await arrasta(.2, .4, .45, .4)
  ok(await marcas() === n0 + 2, 'a ferramenta continua ativa para o próximo erro')
  await p.keyboard.press('Escape')
  ok(/Escolha e arraste/.test(await p.innerText('#acFoot')), 'Esc solta a ferramenta')

  // arrasta sem ferramenta: marca sem tipo selecionada; classifica depois
  await arrasta(.2, .5, .45, .5)
  ok(await p.evaluate(() => !document.getElementById('catp').classList.contains('idle')), 'sem ferramenta a marca fica selecionada para classificar')
  await p.click('#catp button[data-cat="ac"]'); await p.waitForTimeout(300)
  ok(await p.evaluate(() => document.getElementById('catp').classList.contains('idle') || document.querySelector('#catp .subr')) !== null, 'classificar a marca pelo painel funciona')
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)

  // Ortografia como ferramenta: abre as opções no painel
  await p.click('#catp [data-sidetog="ort"]')
  ok(/Ortografia/.test(await p.innerText('#acFoot')), 'Ortografia pode ser a ferramenta ativa')
  await arrasta(.2, .6, .4, .6)
  ok(await p.locator('#catpS #orW').count() === 1 && await p.evaluate(() => document.getElementById('acpane').contains(document.getElementById('catpS'))), 'as opções de Ortografia abrem dentro do painel')
  await p.fill('#orW', 'exceção'); await p.click('#catpS [data-ortok="1"]'); await p.waitForTimeout(300)
  ok(await p.evaluate(() => document.getElementById('catp').classList.contains('idle')), 'depois de corrigir a palavra o painel volta ao estado ocioso')
  await p.keyboard.press('Escape')

  // as opções abrem logo abaixo do próprio critério (não no topo do painel)
  const abaixo = async (sec) => p.evaluate((q) => { const s = document.getElementById('catpS').getBoundingClientRect(), c = document.querySelector('#catp ' + q).getBoundingClientRect(); return { ok: !document.getElementById('catpS').classList.contains('hide') && (Math.abs(s.top - (c.bottom + 3)) < 8 || Math.abs(s.bottom - (c.top - 3)) < 8), s: [Math.round(s.top), Math.round(s.bottom)], c: [Math.round(c.top), Math.round(c.bottom)] } }, sec)
  await arrasta(.2, .55, .4, .55); await p.click('#catp [data-sidetog="par"]'); await p.waitForTimeout(300)
  const pp = await abaixo('.pg-e'); ok(pp.ok, 'Parágrafo abre logo abaixo da Estética ' + JSON.stringify(pp))
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  await arrasta(.2, .62, .4, .62); await p.click('#catp button[data-cat="ca"]'); await p.waitForTimeout(500)
  const pc = await abaixo('.pg-p'); ok(pc.ok, 'Conectivo ausente abre junto da Progressão ' + JSON.stringify(pc))
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  // teclas: R escolhe Rasura
  await p.keyboard.press('r'); await p.waitForTimeout(150)
  ok(/Rasura/.test(await p.innerText('#acFoot')), 'tecla R escolhe Rasura')
  await p.click('#acfSolta')

  // abas e recolher
  await p.click('[data-acf="cr"]'); await p.waitForTimeout(200)
  ok(await p.evaluate(() => document.querySelector('.pb').dataset.acftab === 'cr' && document.getElementById('acpane').offsetParent === null && document.getElementById('comps').offsetParent !== null), 'aba Critérios mostra os níveis e esconde o AC')
  await p.click('[data-acf="ac"]'); await p.waitForTimeout(200)
  const w0 = await p.evaluate(() => document.querySelector('.rc').getBoundingClientRect().width)
  await p.click('#acfCol'); await p.waitForTimeout(300)
  const w1 = await p.evaluate(() => document.querySelector('.rc').getBoundingClientRect().width)
  ok(w1 < 80 && w0 > 380, `recolher estreita o painel (${Math.round(w0)} → ${Math.round(w1)} px)`)
  ok(await p.locator('.acfchip').count() === 5, 'faixa recolhida mostra os 5 critérios')
  // diálogo com o painel recolhido: o painel se abre sozinho e volta a recolher ao fechar
  await p.click('#mkClear'); await p.waitForTimeout(400)
  ok(await p.evaluate(() => document.querySelector('.rc').getBoundingClientRect().width) > 300 && await p.locator('#lmpNo').isVisible(), 'diálogo "Limpar correção" com o painel recolhido abre inteiro (com botões)')
  await p.click('#lmpNo'); await p.waitForTimeout(400)
  ok(await p.evaluate(() => document.querySelector('.rc').getBoundingClientRect().width) < 80, 'fechado o diálogo, o painel volta a recolher')
  await p.click('#acfOpen'); await p.waitForTimeout(300)
  ok(await p.evaluate(() => document.querySelector('.rc').getBoundingClientRect().width) > 300, 'a seta reabre o painel')
  ok(erros.length === 0, 'sem erros de JavaScript' + (erros.length ? ': ' + erros[0] : ''))
  await b.close()
  console.log(falhas.length ? `\n${falhas.length} falha(s)` : '\nTudo certo')
  process.exit(falhas.length ? 1 : 0)
})()
