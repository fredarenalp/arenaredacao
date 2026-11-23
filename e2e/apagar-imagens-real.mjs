// Apagar imagens (banco REAL): some só a foto das redações corrigidas e liberadas; nota, comentário e marcações ficam;
// redação ainda em correção não é tocada. Cria dados de teste próprios, só apaga as redações que ele mesmo criou
// (parâmetro `apenas`) e remove tudo ao final.
// Uso: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node e2e/apagar-imagens-real.mjs
import { createClient } from '@supabase/supabase-js'
const URL = 'https://nklkchelknnvovoilybc.supabase.co'
const KEY = 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E'
const entrar = async (email, senha = 'teste') => { const c = createClient(URL, KEY, { auth: { persistSession: false } }); const { error } = await c.auth.signInWithPassword({ email, password: senha }); if (error) throw new Error(email + ': ' + error.message); return c }
let falhas = 0
const ok = (c, m) => { console.log(c ? 'ok   ' : 'FALHA', m); if (!c) falhas++ }
const inv = async (c, corpo) => { const r = await c.functions.invoke('apagar-imagens', { body: corpo }); if (r.error) { let m = r.error.message; try { m = (await r.error.context.json()).erro } catch { /* sem json */ } return { erro: m } } return r.data }

const coord = await entrar('teste@arena.com')
const corretor = await entrar('corretor@arena.com')
const aluno = await entrar('20260187@aluno.arena.com')
const { data: al } = await coord.from('alunos').select('id').eq('matricula', '20260187').single()
const { data: cor } = await coord.from('perfis').select('id').eq('email', 'corretor@arena.com').single()

const { data: prop } = await coord.from('propostas').insert({ ano: 2026, bimestre: 4, numero: 9, titulo: 'Proposta de teste (apagar imagens)', genero: 'Carta', prazo: '2026-12-01' }).select().single()
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))
const sobe = async (nome) => { const path = `${al.id}/zz-apagar-${nome}-${Date.now()}.png`; const r = await aluno.storage.from('redacoes').upload(path, png, { contentType: 'image/png' }); if (r.error) throw r.error; return path }
const pathA = await sobe('a')
const pathB = await sobe('b')
const rA = (await aluno.from('redacoes').insert({ aluno_id: al.id, proposta_id: prop.id, versao: 1, foto_path: pathA }).select().single()).data

// A: corrigida e liberada, com marcação; B: segue em correção
await coord.from('redacoes').update({ etapa: 'corrigida', corretor_id: cor.id }).eq('id', rA.id)
await coord.from('correcoes').upsert({ redacao_id: rA.id, n1: 3, n2: 3, n3: 3, n4: 3, n5: 3, comentario: 'Comentário que deve ficar.', liberada: true })
await coord.from('marcacoes').insert({ redacao_id: rA.id, tipo: 'o', categoria: 'ac', linha: 3, dados: { t: 'o', cat: 'ac', line: 3 } })
// B: a 2ª versão só pode ser enviada depois que a 1ª foi corrigida e liberada
const envB = await aluno.from('redacoes').insert({ aluno_id: al.id, proposta_id: prop.id, versao: 2, foto_path: pathB }).select().single()
if (envB.error) throw new Error('não criou a 2ª versão: ' + envB.error.message)
const rB = envB.data

const limpa = async () => {
  const ids = [rA.id, typeof rB !== 'undefined' ? rB.id : null].filter(Boolean)
  await coord.from('marcacoes').delete().in('redacao_id', ids)
  await coord.from('correcoes').delete().in('redacao_id', ids)
  await coord.from('redacoes').delete().in('id', ids)
  await coord.from('propostas').delete().eq('id', prop.id)
  await coord.storage.from('redacoes').remove([pathA, pathB])
}

try {
  ok(!!(await inv(corretor, { bimestre: 4 })).erro, 'corretor não executa')
  ok(!!(await inv(aluno, { bimestre: 4 })).erro, 'aluno não executa')
  const sim = await inv(coord, { bimestre: 4, apenas: [rA.id, rB.id] })
  ok(sim.redacoes === 1 && sim.fotos === 1 && sim.pendentes >= 1, `simulação conta só a corrigida e liberada (${JSON.stringify(sim)})`)
  ok((await coord.storage.from('redacoes').download(pathA)).data != null, 'a simulação não apaga nada')

  const r = await inv(coord, { bimestre: 4, confirmar: true, apenas: [rA.id, rB.id] })
  ok(r.ok === true && r.fotos === 1 && !r.falhas, 'apagar roda sem falhas ' + JSON.stringify(r))
  const { data: a } = await coord.from('redacoes').select('foto_path').eq('id', rA.id).single()
  ok(a.foto_path === null, 'redação corrigida: foto_path vazio')
  const pasta = pathA.split('/')[0], nomeA = pathA.split('/')[1]
  const lista = (await coord.storage.from('redacoes').list(pasta, { limit: 1000 })).data ?? []
  ok(!lista.some((f) => f.name === nomeA), 'redação corrigida: arquivo some da lista do storage')
  const dl = await coord.storage.from('redacoes').download(pathA)
  console.log('   download após apagar:', dl.error ? 'erro (' + dl.error.message + ')' : 'ainda devolve ' + dl.data.size + ' bytes')
  const { data: c } = await coord.from('correcoes').select('comentario, liberada, nota').eq('redacao_id', rA.id).single()
  ok(c?.comentario === 'Comentário que deve ficar.' && c.liberada === true && c.nota != null, 'nota e comentário foram mantidos')
  const { data: mk } = await coord.from('marcacoes').select('id').eq('redacao_id', rA.id)
  ok(mk?.length === 1, 'marcações foram mantidas')
  const { data: b } = await coord.from('redacoes').select('foto_path').eq('id', rB.id).single()
  ok(b.foto_path === pathB && (await coord.storage.from('redacoes').download(pathB)).data != null, 'redação ainda em correção: foto intacta')
  const de_novo = await inv(coord, { bimestre: 4, apenas: [rA.id, rB.id] })
  ok(de_novo.fotos === 0, 'rodar de novo não acha mais nada para apagar')
} finally {
  await limpa()
  ok(true, 'dados de teste removidos')
}
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo')
process.exit(falhas ? 1 : 0)
