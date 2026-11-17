// Teste de tela com o Supabase simulado (sem tocar no banco real).
// Uso: npm run build && npx vite preview --port 4173 & node e2e/fluxo.cjs
const { chromium } = require('playwright')

const USER = { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'a@a.com' }
const SESSAO = { access_token: 'x.eyJleHAiOjk5OTk5OTk5OTl9.y', token_type: 'bearer', expires_in: 3600, expires_at: 9999999999, refresh_token: 'r', user: USER }
const perfil = (tipo) => ({ id: USER.id, tipo, nome: 'Fulano', ativo: true })
const TABELAS = {
  aluno: {
    alunos: { id: 1, perfil_id: USER.id, turma_id: 1, matricula: '1', nome: 'Ana Aluna' },
    propostas: [{ id: 1, bimestre: 1, titulo: 'Carta', genero: 'carta', prazo: null }],
    redacoes: [{ id: 1, aluno_id: 1, proposta_id: 1, etapa: 'corrigida', foto_path: '1/x.jpg' }],
    correcoes: [{ redacao_id: 1, n1: 4, n2: 3, n3: 3, n4: 2, n5: 4, nota: 8, comentario: 'Bom texto.', liberada: true }],
    comunicados: [{ id: 1, texto: 'Prazo prorrogado.', aluno_id: 1 }],
  },
  corretor: { redacoes: [{ id: 5, etapa: 'enviada', fora_do_prazo: true, alunos: { nome: 'Bia' }, propostas: { titulo: 'Carta' } }] },
  professor: { redacoes: [{ id: 7, etapa: 'corrigida', alunos: { nome: 'Caio' }, propostas: { titulo: 'Carta' }, correcoes: { nota: 7, liberada: true } }] },
}

async function rodar(tipo, esperado) {
  const b = await chromium.launch()
  const p = await b.newPage()
  const erros = []
  p.on('pageerror', (e) => erros.push(e.message))
  await p.route('**/auth/v1/**', (r) => r.fulfill({ json: r.request().url().includes('/user') ? USER : SESSAO }))
  await p.route('**/rest/v1/**', (r) => {
    const t = new URL(r.request().url()).pathname.split('/').pop()
    if (t === 'perfis') return r.fulfill({ json: perfil(tipo) })
    const d = TABELAS[tipo]?.[t]
    const single = (r.request().headers().accept || '').includes('vnd.pgrst.object')
    r.fulfill({ json: d ?? (single ? null : []) })
  })
  await p.route('**/storage/v1/**', (r) => r.fulfill({ json: { signedUrl: '' } }))
  await p.goto('http://localhost:4173')
  await p.fill('input[type=email]', 'a@a.com')
  await p.fill('input[type=password]', 'x')
  await p.click('button')
  await p.waitForSelector('main', { timeout: 10000 })
  const ultimo = esperado[esperado.length - 1]
  await p.waitForFunction((t) => document.querySelector('main')?.textContent.includes(t), ultimo, { timeout: 5000 }).catch(() => {})
  const texto = await p.textContent('main')
  for (const e of esperado) if (!texto.includes(e)) { console.error(`FALHA ${tipo}: faltou "${e}"`); process.exitCode = 1 }
  if (erros.length) { console.error(`FALHA ${tipo}: erros de página`, erros); process.exitCode = 1 }
  console.log(`ok ${tipo}`)
  await b.close()
}

;(async () => {
  await rodar('aluno', ['Ana Aluna', 'Boletim', 'Prazo prorrogado.', 'Bom texto.'])
  await rodar('corretor', ['Redações para corrigir (1)', 'Bia', 'fora do prazo'])
  await rodar('professor', ['Caio'])
  await rodar('coordenacao', ['Aguardando liberação', 'Importar alunos', 'Novo usuário', 'Comunicado extraordinário'])
})()
