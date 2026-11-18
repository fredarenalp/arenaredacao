// Confere o acesso simplificado: usuário "teste" + senha "teste" nos quatro perfis.
// Uso: npx vite preview --port 4173 &   depois:   node e2e/acesso-teste.cjs
const { chromium } = require('playwright')
const proxy = process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}
const URL = process.env.APP_URL || 'http://localhost:4173'
let falhas = 0
const ok = (c, m) => { console.log(c ? 'ok   ' : 'FALHA', m); if (!c) falhas++ }

;(async () => {
  const b = await chromium.launch(proxy)
  const nova = async () => { const p = await (await b.newContext({ viewport: { width: 1366, height: 850 }, ignoreHTTPSErrors: true })).newPage(); await p.goto(URL); await p.waitForTimeout(500); return p }

  let p = await nova()
  await p.fill('#email', 'teste'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('#phCards', { timeout: 20000 }).catch(() => {})
  ok(await p.evaluate(() => document.body.classList.contains('in-portal')), 'corretor: teste / teste')

  p = await nova()
  await p.click('.p[data-k=aluno]'); await p.fill('#mat', 'teste'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('#alMain .bimq', { timeout: 20000 }).catch(() => {})
  ok(await p.evaluate(() => document.body.classList.contains('in-aluno')), 'aluno: teste / teste')

  p = await nova()
  await p.click('#restrBtn'); await p.fill('#email', 'teste'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('body.in-coord', { timeout: 25000 }).catch(() => {})
  ok(await p.evaluate(() => document.body.classList.contains('in-coord')), 'coordenação: teste / teste')

  p = await nova()
  await p.click('#restrBtn'); await p.click('#row2 .p[data-k=prof]'); await p.fill('#email', 'teste'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('body.in-coord', { timeout: 25000 }).catch(() => {})
  ok(await p.evaluate(() => document.body.classList.contains('in-coord') && /Prof\./.test(document.getElementById('coNm').textContent)), 'professor: teste / teste')

  await b.close()
  process.exit(falhas ? 1 : 0)
})()
