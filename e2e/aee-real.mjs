// Ciclo AEE no banco real: marca, pacote próprio, corretor especialista, retenção e liberação pelo professor.
// Uso: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node e2e/aee-real.mjs
import { createClient } from '@supabase/supabase-js'
const URL = 'https://nklkchelknnvovoilybc.supabase.co'
const KEY = 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E'
const novo = () => createClient(URL, KEY, { auth: { persistSession: false } })
const entrar = async (email, senha = email.startsWith('20260187') ? '0000' : 'teste') => { const c = novo(); const { error } = await c.auth.signInWithPassword({ email, password: senha }); if (error) throw new Error(email + ': ' + error.message); return c }
let falhas = 0
const ok = (c, m) => { console.log(c ? 'ok   ' : 'FALHA', m); if (!c) falhas++ }

const coord = await entrar('teste@arena.com')
const maria = await entrar('20269999@aluno.arena.com', 'nova-senha-123')
const corretor = await entrar('corretor@arena.com')
const prof = await entrar('professor@arena.com')
const aluno = await entrar('20260187@aluno.arena.com')

const { data: al } = await coord.from('alunos').select('id').eq('matricula', '20269999').single()
const { data: cor } = await coord.from('perfis').select('id').eq('email', 'corretor@arena.com').single()
const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)

// 1) marca o aluno e habilita o corretor
await coord.from('alunos_aee').upsert({ aluno_id: al.id })
await coord.from('perfis').update({ especialista_aee: false }).eq('id', cor.id)
const { data: prop } = await coord.from('propostas').insert({ ano: 2026, bimestre: 4, numero: 9, titulo: 'Proposta AEE de teste', genero: 'Carta', prazo: ontem }).select().single()

// 2) o aluno AEE envia como qualquer outro
const env = await maria.from('redacoes').insert({ aluno_id: al.id, proposta_id: prop.id, versao: 1, foto_path: '3/seed-1794949627620.png' }).select().single()
ok(!env.error, 'aluno AEE envia a redação normalmente')

// 3) pacote próprio, separado da turma
await coord.rpc('gerar_pacotes')
const { data: red } = await coord.from('redacoes').select('id, pacote_id').eq('id', env.data.id).single()
const { data: pac } = await coord.from('pacotes').select('*').eq('id', red.pacote_id).single()
ok(pac?.aee === true && /AEE/.test(pac.serie), `a redação foi para um pacote AEE (${pac?.serie})`)
const { data: outros } = await coord.from('redacoes').select('id').eq('pacote_id', pac.id)
ok(outros.length === 1, 'o pacote AEE contém só as redações de alunos AEE')

// 4) só corretor especialista recebe
const naoEsp = await coord.from('pacotes').update({ corretor_id: cor.id }).eq('id', pac.id)
ok(!!naoEsp.error, 'pacote AEE não vai para corretor que não é especialista')
await coord.from('perfis').update({ especialista_aee: true }).eq('id', cor.id)
const esp = await coord.from('pacotes').update({ corretor_id: cor.id }).eq('id', pac.id)
ok(!esp.error, 'pacote AEE vai para o corretor especialista')

// 5) sigilo da marca
ok(((await maria.from('alunos_aee').select('*')).data ?? []).length === 0, 'o próprio aluno AEE não lê a marca')
ok(((await aluno.from('alunos_aee').select('*')).data ?? []).length === 0, 'outro aluno não lê a marca')
ok(((await corretor.from('alunos_aee').select('*')).data ?? []).length === 1, 'o corretor do pacote lê só a marca dos alunos dele')
ok(((await prof.from('alunos_aee').select('*')).data ?? []).length >= 1, 'o professor da série lê a marca')

// 6) correção fica retida para o professor liberar
await corretor.from('correcoes').upsert({ redacao_id: env.data.id, n1: 3, n2: 3, n3: 3, n4: 3, n5: 3, comentario: 'Comentário do corretor.', extras: { retida: false } })
const tentativa = await corretor.from('correcoes').update({ liberada: true }).eq('redacao_id', env.data.id)
ok(!!tentativa.error, 'corretor NÃO libera a correção de aluno AEE')
ok(((await maria.from('correcoes').select('*').eq('redacao_id', env.data.id)).data ?? []).length === 0, 'aluno não vê a nota antes de o professor liberar')
const lib = await prof.from('correcoes').update({ liberada: true }).eq('redacao_id', env.data.id)
ok(!lib.error, 'professor libera a correção')
const { data: vista } = await maria.from('correcoes').select('nota').eq('redacao_id', env.data.id)
ok(vista?.[0]?.nota === 7.5, `aluno vê a nota depois da liberação (${vista?.[0]?.nota})`)

// limpeza
await coord.from('redacoes').delete().eq('proposta_id', prop.id)
await coord.from('propostas').delete().eq('id', prop.id)
await coord.from('pacotes').delete().eq('id', pac.id)
await coord.from('alunos_aee').delete().eq('aluno_id', al.id)
await coord.from('perfis').update({ especialista_aee: false }).eq('id', cor.id)
console.log(falhas ? `\n${falhas} falha(s)` : '\nTudo certo')
process.exit(falhas ? 1 : 0)
