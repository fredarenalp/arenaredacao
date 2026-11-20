// Varredura: percorre as telas dos quatro perfis, clica em abas/segmentos e procura
// textos quebrados (undefined, NaN, [object, null), erros de página/console e respostas HTTP 4xx/5xx.
// Uso: npx vite preview --port 4173 &   depois:   node e2e/varredura.cjs
const { chromium } = require('playwright')
const proxy = process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}
const URL = process.env.APP_URL || 'http://localhost:4173'
const RUIM = /undefined|NaN|\[object|\bnull\b|Infinity/
const achados = []

async function nova(b, rotulo) {
  const p = await (await b.newContext({ viewport: { width: 1366, height: 900 }, ignoreHTTPSErrors: true })).newPage()
  p.rotulo = rotulo
  p.on('pageerror', (e) => achados.push([rotulo, 'ERRO JS', e.message.slice(0, 160)]))
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) achados.push([rotulo, 'console', m.text().slice(0, 160)]) })
  p.on('response', (r) => { const u = r.url(); if (/supabase\.co/.test(u) && r.status() >= 400 && r.status() !== 406 && !/auth\/v1\/token/.test(u)) achados.push([rotulo, `HTTP ${r.status()}`, u.replace(/^https:\/\/[^/]+/, '').slice(0, 120)]) })
  await p.addInitScript(() => { window.print = () => {}; window.open = () => null })
  await p.goto(URL); await p.waitForTimeout(500)
  return p
}
async function texto(p, sel) { try { return (await p.innerText(sel)) || '' } catch { return '' } }
async function confere(p, onde, sel) {
  const t = await texto(p, sel)
  const m = t.match(RUIM)
  if (m) achados.push([p.rotulo, 'TEXTO RUIM', `${onde}: …${t.slice(Math.max(0, m.index - 50), m.index + 40).replace(/\s+/g, ' ')}…`])
}
async function clicaTodos(p, seletor, onde, sel) {
  const n = await p.locator(seletor).count()
  for (let i = 0; i < Math.min(n, 14); i++) {
    try { await p.locator(seletor).nth(i).click({ timeout: 2000 }); await p.waitForTimeout(250); await confere(p, `${onde} [${seletor}#${i}]`, sel) } catch { /* elemento sumiu: ok */ }
  }
}

;(async () => {
  const b = await chromium.launch(proxy)

  // corretor
  let p = await nova(b, 'corretor')
  await p.click('.p[data-k=corretor]'); await p.fill('#email', 'teste'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('#phCards', { timeout: 20000 }); await p.waitForTimeout(800)
  await confere(p, 'home', 'body')
  for (const aba of ['ab', 'co']) { await p.locator(`[data-pt="${aba}"]`).click().catch(() => {}); await p.waitForTimeout(300); await confere(p, 'pacotes ' + aba, '#portal') }
  const cards = await p.locator('.pcd').count()
  for (let i = 0; i < Math.min(cards, 4); i++) {
    await p.locator('.pcd').nth(i).click().catch(() => {}); await p.waitForTimeout(500); await confere(p, 'lista do pacote', '#portal')
    const alunos = await p.locator('#lst li, #lst .al, #lst button').count()
    if (alunos) { await p.locator('#lst li, #lst .al, #lst button').first().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(900); await confere(p, 'correção', '#portal') }
    await p.locator('#voltaHome').click().catch(() => {}); await p.waitForTimeout(400)
  }

  // aluno
  p = await nova(b, 'aluno')
  await p.click('.p[data-k=aluno]'); await p.fill('#mat', 'teste'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('#alMain .bimq', { timeout: 20000 }); if (await p.locator('#alIntro:not(.hide)').count()) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400) }; await p.waitForTimeout(500)
  for (const aba of ['lista', 'bol', 'crit', 'lista']) { await p.locator(`[data-al=${aba}]`).click().catch(() => {}); await p.waitForTimeout(400); await confere(p, 'aluno ' + aba, '#alMain') }
  for (const bim of [1, 2, 3, 4]) { await p.locator(`[data-bim="${bim}"]`).click().catch(() => {}); await p.waitForTimeout(300); await confere(p, `bimestre ${bim}`, '#alMain') }
  await clicaTodos(p, '#alMain .pc', 'cartões do aluno', '#alMain')
  await p.locator('[data-al=bol]').click().catch(() => {}); await p.waitForTimeout(400)
  await clicaTodos(p, '[data-gb]', 'boletim', '#alMain'); await clicaTodos(p, '[data-gc]', 'boletim critérios', '#alMain')

  // coordenação
  p = await nova(b, 'coordenação')
  await p.click('#restrBtn'); await p.fill('#email', 'teste'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('body.in-coord', { timeout: 25000 }); await p.waitForTimeout(1000)
  for (const t of ['acessos', 'entregas', 'turmas', 'avisos', 'corretores', 'relatorios', 'propostas', 'pessoas', 'regras', 'hist']) {
    await p.locator(`#coBar [data-top="${t}"]`).first().click().catch(() => {}); await p.waitForTimeout(500); await confere(p, 'coord ' + t, '#coMain')
    await clicaTodos(p, '#coMain [data-sub]', 'sub-aba ' + t, '#coMain')
    await clicaTodos(p, '#coMain [data-met]', 'métrica ' + t, '#coMain')
    await clicaTodos(p, '#coMain [data-en-p]', 'proposta ' + t, '#coMain')
    await clicaTodos(p, '#coMain [data-en-v]', 'versão ' + t, '#coMain')
    await clicaTodos(p, '#coMain [data-x-psub]', 'pessoas ' + t, '#coMain')
    await clicaTodos(p, '#coMain [data-x-avt]', 'demandas ' + t, '#coMain')
  }

  // professor
  p = await nova(b, 'professor')
  await p.click('#restrBtn'); await p.click('#row2 .p[data-k=prof]'); await p.fill('#email', 'teste'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('body.in-coord', { timeout: 25000 }); await p.waitForTimeout(1000)
  for (const t of ['pgeral', 'ppac', 'pfila', 'pmed']) { await p.locator(`#coBar [data-top="${t}"]`).first().click().catch(() => {}); await p.waitForTimeout(500); await confere(p, 'prof ' + t, '#coMain') }
  await clicaTodos(p, '#coMain [data-x-pg]', 'turmas do professor', '#coMain')

  await b.close()
  const unicos = [...new Map(achados.map((a) => [a.join('|'), a])).values()]
  if (!unicos.length) console.log('Nenhum achado.')
  for (const a of unicos) console.log(`[${a[0]}] ${a[1]}: ${a[2]}`)
  process.exit(unicos.length ? 1 : 0)
})()
