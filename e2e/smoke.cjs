// Fumaça no navegador (banco real): entra com cada perfil e abre todas as telas, sem erros de página.
// Uso: npm run build && npx vite preview --port 4173 &   depois:   node e2e/smoke.cjs
const { chromium } = require('playwright')

const proxy = process.env.HTTPS_PROXY ? { proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } } : {}
const URL = process.env.APP_URL || 'http://localhost:4173'
let falhas = 0

async function pagina(b) {
  const p = await (await b.newContext({ viewport: { width: 1366, height: 850 }, ignoreHTTPSErrors: true })).newPage()
  p.erros = []
  p.on('pageerror', (e) => p.erros.push(e.message.slice(0, 200)))
  await p.goto(URL)
  await p.waitForTimeout(500)
  return p
}
const ok = (c, m) => { console.log(c ? 'ok   ' : 'FALHA', m); if (!c) falhas++ }

;(async () => {
  const b = await chromium.launch(proxy)

  // corretor
  let p = await pagina(b)
  await p.fill('#email', 'corretor@arena.com'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('#phCards', { timeout: 20000 })
  ok(await p.textContent('#phOla') === 'Olá, Corretor', 'corretor: saudação com o nome real')
  ok(p.erros.length === 0, 'corretor: sem erros de página ' + p.erros.join('|'))

  // aluno
  p = await pagina(b)
  await p.click('.p[data-k=aluno]'); await p.fill('#mat', '20260187'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('#alMain .bimq', { timeout: 20000 })
  for (const aba of ['bol', 'crit', 'lista']) { await p.click(`[data-al=${aba}]`); await p.waitForTimeout(500) }
  ok(p.erros.length === 0, 'aluno: lista, boletim e critérios sem erros ' + p.erros.join('|'))

  // coordenação: todas as abas
  p = await pagina(b)
  await p.click('#restrBtn'); await p.fill('#email', 'teste@arena.com'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('body.in-coord', { timeout: 25000 }); await p.waitForTimeout(1200)
  for (const t of ['acessos', 'entregas', 'turmas', 'avisos', 'corretores', 'relatorios', 'propostas', 'pessoas', 'regras', 'hist']) {
    await p.locator(`#coBar [data-top="${t}"]`).first().click(); await p.waitForTimeout(500)
  }
  ok(p.erros.length === 0, 'coordenação: 10 abas sem erros ' + p.erros.join('|'))

  // professor
  p = await pagina(b)
  await p.click('#restrBtn'); await p.click('#row2 .p[data-k=prof]'); await p.fill('#email', 'professor@arena.com'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
  await p.waitForSelector('body.in-coord', { timeout: 25000 }); await p.waitForTimeout(1200)
  for (const t of ['pgeral', 'ppac', 'pfila', 'pmed']) { await p.locator(`#coBar [data-top="${t}"]`).first().click(); await p.waitForTimeout(500) }
  ok(p.erros.length === 0, 'professor: 4 abas sem erros ' + p.erros.join('|'))

  // credenciais erradas e perfil errado
  p = await pagina(b)
  await p.fill('#email', 'corretor@arena.com'); await p.fill('#pwd', 'errada'); await p.click('#entrar'); await p.waitForTimeout(2500)
  ok((await p.textContent('#alerts')).includes('incorreta'), 'login: senha errada é recusada')

  await b.close()
  process.exit(falhas ? 1 : 0)
})()
