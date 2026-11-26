// Card "Sua redação voltou" da 2ª versão: a frase pequena é o DIAGNÓSTICO marcado pelo corretor (não a frase da faixa de nota). Não grava no banco.
const { chromium } = require('playwright')
const FR = ['Nenhuma das alterações indicadas na primeira versão foi realizada.', 'Somente as correções gramaticais apontadas na primeira versão foram efetuadas.', 'Parte das recomendações registradas na primeira versão foi atendida.', 'As modificações realizadas foram superficiais e não contemplaram as correções solicitadas.', 'Todas as recomendações apresentadas na primeira versão foram devidamente atendidas.']
let falhas = 0; const ok = (c, m) => { console.log(c ? 'ok   ' : 'FALHA', m); if (!c) falhas++ }
;(async () => {
  const b = await chromium.launch({ proxy: { server: process.env.HTTPS_PROXY, bypass: 'localhost,127.0.0.1' } })
  for (const d of [null, 0, 1, 2, 3, 4]) {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true })).newPage()
    await p.goto('http://localhost:4173'); await p.waitForTimeout(500); await p.click('.p[data-k=aluno]'); await p.fill('#mat', '0000'); await p.fill('#pwd', 'teste'); await p.click('#entrar')
    await p.waitForSelector('body.in-aluno', { timeout: 25000 }); await p.waitForTimeout(2500)
    if (await p.locator('#alIntro:not(.hide)').count()) { await p.click('.ai-skip', { timeout: 3000 }).catch(() => {}); await p.waitForTimeout(400) }
    await p.evaluate((d) => { const P = window.__aluno.PROPS; const i = P.findIndex((x) => x.kind === 'corr'); P[i]._v = d == null ? 1 : 2; P[i].diag = d }, d)
    await p.click('.cxn'); await p.waitForTimeout(1200)
    const t = await p.evaluate(() => (document.querySelector('.aiq-fr') || {}).innerText || '')
    if (d == null) ok(/média|avançar|Quase|Bom|Excelente|Sensacional|Não desanime|Calma|exemplar/.test(t), '1ª versão: continua a frase da faixa de nota (' + t.replace(/\n/g, ' ') + ')')
    else ok(t === FR[d], `2ª versão, diagnóstico ${d}: o card mostra "${FR[d].slice(0, 40)}…"`)
    await p.context().close()
  }
  await b.close(); console.log(falhas ? falhas + ' falha(s)' : 'Tudo certo'); process.exit(falhas ? 1 : 0)
})()
