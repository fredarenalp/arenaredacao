// Teste de segurança no banco real: cada perfil só pode ver/fazer o que lhe cabe.
// Uso: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node e2e/seguranca-real.mjs
import { createClient } from '@supabase/supabase-js'
const URL = 'https://nklkchelknnvovoilybc.supabase.co'
const KEY = 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E'
const novo = () => createClient(URL, KEY, { auth: { persistSession: false } })
const entrar = async (email) => { const c = novo(); const { error } = await c.auth.signInWithPassword({ email, password: 'teste' }); if (error) throw new Error(email + ': ' + error.message); return c }
let falhas = 0
const ok = (c, m) => { console.log(c ? 'ok   ' : 'FALHA', m); if (!c) falhas++ }
const vazio = async (q) => { const { data, error } = await q; return error ? true : !data || (Array.isArray(data) ? data.length === 0 : false) }

const anon = novo()
for (const t of ['perfis', 'alunos', 'redacoes', 'correcoes', 'marcacoes', 'avisos', 'comunicados', 'pacotes', 'regras', 'eventos', 'acessos', 'retornos', 'propostas', 'turmas']) {
  ok(await vazio(anon.from(t).select('*').limit(5)), `anônimo não lê ${t}`)
}
ok(!(await anon.rpc('gerar_pacotes')).data, 'anônimo não executa gerar_pacotes')
ok(!!(await anon.storage.from('redacoes').createSignedUrl('3/seed-1794949627620.png', 60)).error, 'anônimo não assina foto')

const aluno = await entrar('20260187@aluno.arena.com')
const corretor = await entrar('corretor@arena.com')
const prof = await entrar('professor@arena.com')

// aluno
const { data: minhas } = await aluno.from('redacoes').select('aluno_id')
ok(minhas.every((r) => r.aluno_id === minhas[0].aluno_id), 'aluno só vê redações dele')
const { data: al } = await aluno.from('alunos').select('id')
ok(al.length === 1, `aluno só vê o próprio cadastro (${al.length})`)
ok(await vazio(aluno.from('avisos').select('*').neq('aluno_id', al[0].id)), 'aluno não vê avisos de outros')
ok(await vazio(aluno.from('comunicados').select('*').neq('aluno_id', al[0].id)), 'aluno não vê comunicados de outros')
ok(await vazio(aluno.from('eventos').select('*')), 'aluno não vê o histórico')
ok(await vazio(aluno.from('retornos').select('*')), 'aluno não vê retornos de corretores')
ok(await vazio(aluno.from('acessos').select('*').neq('perfil_id', (await aluno.auth.getUser()).data.user.id)), 'aluno não vê acessos de outros')
const { data: perfisVisiveis } = await aluno.from('perfis').select('id')
ok(perfisVisiveis.length === 1, `aluno só vê o próprio perfil (${perfisVisiveis.length})`)
const coord = await entrar('teste@arena.com')
const { data: ganchosAntes } = await coord.from('regras').select('valor').eq('chave', 'ganchos').maybeSingle()
await coord.from('regras').upsert({ chave: 'ganchos', valor: [{ aluno: 'TESTE-SEGURANCA' }] })
const regrasAluno = (await aluno.from('regras').select('chave,valor')).data ?? []
ok(!regrasAluno.some((r) => r.chave === 'ganchos'), 'aluno NÃO lê os ganchos (nomes e notas de outros alunos)')
const regrasCorGan = (await corretor.from('regras').select('chave')).data ?? []
ok(!regrasCorGan.some((r) => r.chave === 'ganchos'), 'corretor NÃO lê os ganchos')
const regrasProf = (await prof.from('regras').select('chave')).data ?? []
ok(regrasProf.some((r) => r.chave === 'ganchos'), 'professor lê os ganchos')
if (ganchosAntes) await coord.from('regras').upsert({ chave: 'ganchos', valor: ganchosAntes.valor }); else await coord.from('regras').delete().eq('chave', 'ganchos')
const upd = await aluno.from('correcoes').update({ n1: 4 }).neq('redacao_id', 0).select()
ok(!upd.data || upd.data.length === 0, 'aluno não altera correções')
ok(!!(await aluno.from('propostas').insert({ ano: 2026, bimestre: 1, titulo: 'x', genero: 'x', numero: 9 })).error, 'aluno não cria proposta')
ok(!!(await aluno.rpc('gerar_pacotes')).error, 'aluno não executa gerar_pacotes')
const abuso = await aluno.from('redacoes').insert({ aluno_id: al[0].id + 999, proposta_id: 2, versao: 1 })
ok(!!abuso.error, 'aluno não envia redação em nome de outro')
const autoLib = await aluno.from('redacoes').insert({ aluno_id: al[0].id, proposta_id: 2, versao: 1, etapa: 'corrigida' })
ok(!!autoLib.error, 'aluno não cria redação já "corrigida"')
const up = await aluno.storage.from('redacoes').upload(`${al[0].id + 999}/invasao.png`, new Uint8Array([1, 2, 3]), { contentType: 'image/png' })
ok(!!up.error, 'aluno não grava foto na pasta de outro aluno')
ok(!!(await aluno.functions.invoke('criar-usuario', { body: { tipo: 'coordenacao', email: 'x@x.com', senha: 'abc123', nome: 'X' } })).error, 'aluno não cria usuário pela função')

// envio: prazo calculado no servidor e reescrita só depois da 1ª versão liberada
const { data: props } = await aluno.from('propostas').select('id, prazo, bimestre, status').order('id')
const { data: jaEnv } = await aluno.from('redacoes').select('proposta_id, versao')
const livres = props.filter((p) => !jaEnv.some((r) => r.proposta_id === p.id && r.versao === 1))
// REGRA DO DONO: proposta encerrada/fechada/rascunho não recebe envio do aluno
const enc = livres.find((p) => p.status === 'encerrada')
if (enc) {
  const r = await aluno.from('redacoes').insert({ aluno_id: al[0].id, proposta_id: enc.id, versao: 1 }).select().single()
  ok(!!r.error, 'o banco recusa envio em proposta encerrada' + (r.error ? ' (' + r.error.message.slice(0, 50) + ')' : ''))
  if (r.data) await coord.from('redacoes').delete().eq('id', r.data.id)
} else console.log('pulou: sem proposta encerrada livre para o aluno de teste')
// proposta aberta: o servidor calcula "fora do prazo" sozinho, mesmo se o aluno mentir
const ab = livres.find((p) => p.status === 'aberta')
if (ab) {
  const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })
  const mentira = await aluno.from('redacoes').insert({ aluno_id: al[0].id, proposta_id: ab.id, versao: 1, fora_do_prazo: !(ab.prazo && ab.prazo < hoje) }).select().single()
  ok(!mentira.error && mentira.data.fora_do_prazo === !!(ab.prazo && ab.prazo < hoje), 'servidor calcula "fora do prazo" mesmo se o aluno disser outra coisa' + (mentira.error ? ': ' + mentira.error.message : ''))
  if (mentira.data) await coord.from('redacoes').delete().eq('id', mentira.data.id)
} else console.log('pulou: sem proposta aberta livre para o aluno de teste')
const semV1 = props.find((p) => !jaEnv.some((r) => r.proposta_id === p.id))
if (semV1) {
  const v2 = await aluno.from('redacoes').insert({ aluno_id: al[0].id, proposta_id: semV1.id, versao: 2 })
  ok(!!v2.error, 'aluno não envia a 2ª versão sem a 1ª liberada')
}
const txt = await aluno.storage.from('redacoes').upload(`${al[0].id}/nao-imagem.txt`, new Blob(['oi'], { type: 'text/plain' }), { contentType: 'text/plain' })
ok(!!txt.error, 'bucket recusa arquivo que não é imagem')

// corretor
ok(!!(await corretor.rpc('gerar_pacotes')).error, 'corretor não executa gerar_pacotes')
ok(await vazio(corretor.from('avisos').select('*')), 'corretor não vê avisos')
ok(await vazio(corretor.from('comunicados').select('*')), 'corretor não vê comunicados')
ok(await vazio(corretor.from('eventos').select('*')), 'corretor não vê o histórico completo')
const { data: pacs } = await corretor.from('pacotes').select('corretor_id')
const eu = (await corretor.auth.getUser()).data.user.id
ok(pacs.every((p) => p.corretor_id === eu), 'corretor só vê os pacotes dele')
ok(!!(await corretor.from('perfis').update({ tipo: 'coordenacao' }).eq('id', eu)).error || true, 'corretor tentou virar coordenação (conferido abaixo)')
const { data: eu2 } = await corretor.from('perfis').select('tipo').eq('id', eu).single()
ok(eu2.tipo === 'corretor', 'corretor continua corretor após tentar mudar o próprio papel')
const regrasCor = (await corretor.from('regras').select('chave')).data ?? []
ok(!regrasCor.some((r) => r.chave === 'ganchos'), 'corretor NÃO lê os ganchos de outros')

// professor
const { data: alProf } = await prof.from('alunos').select('turma_id')
const { data: minhasT } = await prof.from('professor_turmas').select('turma_id')
ok(alProf.every((a) => minhasT.some((t) => t.turma_id === a.turma_id)), 'professor só vê alunos das turmas dele')
ok(!!(await prof.rpc('gerar_pacotes')).error, 'professor não executa gerar_pacotes')
ok(!!(await prof.from('propostas').insert({ ano: 2026, bimestre: 1, titulo: 'x', genero: 'x', numero: 9 })).error, 'professor não cria proposta')
const profPerfil = await prof.from('perfis').update({ tipo: 'coordenacao' }).eq('id', (await prof.auth.getUser()).data.user.id)
const { data: pp } = await prof.from('perfis').select('tipo').eq('id', (await prof.auth.getUser()).data.user.id).single()
ok(pp.tipo === 'professor', 'professor não consegue se promover a coordenação')

console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo')
process.exit(falhas ? 1 : 0)
