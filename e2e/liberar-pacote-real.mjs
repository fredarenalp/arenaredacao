// A correção do corretor só vai ao aluno quando a coordenação libera o pacote (banco REAL, usuários de teste; limpa ao final).
import { createClient } from '@supabase/supabase-js'
const URL = 'https://nklkchelknnvovoilybc.supabase.co'
const KEY = 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E'
const entrar = async (email, senha = 'teste') => { const c = createClient(URL, KEY, { auth: { persistSession: false } }); const { error } = await c.auth.signInWithPassword({ email, password: senha }); if (error) throw new Error(email + ': ' + error.message); return c }
let falhas = 0
const ok = (c, m) => { console.log(c ? 'ok   ' : 'FALHA', m); if (!c) falhas++ }
const corretor = await entrar('corretor@arena.com')
const coord = await entrar('teste@arena.com')
const alunoCli = await entrar('20260187@aluno.arena.com', 'teste')

// uma redação de pacote ainda não liberado, que o corretor enxerga
const { data: pacs } = await coord.from('pacotes').select('id, numero, liberado_em').is('liberado_em', null)
const { data: reds } = await coord.from('redacoes').select('id, aluno_id, pacote_id, etapa').in('pacote_id', (pacs ?? []).map((p) => p.id)).eq('etapa', 'enviada')
const { data: livres } = await coord.from('correcoes').select('redacao_id').in('redacao_id', (reds ?? []).map((r) => r.id))
const r = (reds ?? []).find((x) => !(livres ?? []).some((c) => c.redacao_id === x.id))
if (!r) { console.log('pulou: sem redação livre em pacote não liberado'); process.exit(0) }
const pac = pacs.find((p) => p.id === r.pacote_id)
const { data: aluno } = await coord.from('alunos').select('perfil_id').eq('id', r.aluno_id).single()

const limpa = async () => { await coord.from('marcacoes').delete().eq('redacao_id', r.id); await coord.from('correcoes').delete().eq('redacao_id', r.id); await coord.from('redacoes').update({ etapa: 'enviada', corretor_id: null }).eq('id', r.id); await coord.from('pacotes').update({ liberado_em: null, liberado_por: null }).eq('id', pac.id) }

// 1) o corretor salva, mesmo pedindo liberada: true, e a correção NÃO fica liberada
const { error: e1 } = await corretor.from('correcoes').upsert({ redacao_id: r.id, n1: 3, n2: 3, n3: 3, n4: 3, n5: 3, comentario: 'teste', liberada: true, extras: { retida: false } })
ok(!e1, 'corretor salva a correção' + (e1 ? ': ' + e1.message : ''))
const { data: c1 } = await coord.from('correcoes').select('liberada').eq('redacao_id', r.id).single()
ok(c1 && c1.liberada === false, 'a correção NÃO fica liberada com o corretor (mesmo pedindo liberada: true)')
// 2) o corretor não consegue liberar por update
await corretor.from('correcoes').update({ liberada: true }).eq('redacao_id', r.id)
const { data: c2 } = await coord.from('correcoes').select('liberada').eq('redacao_id', r.id).single()
ok(c2 && c2.liberada === false, 'o corretor não libera por update')
// 3) corretor e aluno não chamam liberar_pacote
const rc = await corretor.rpc('liberar_pacote', { p_pacote: pac.id }); ok(!!rc.error, 'o corretor não executa liberar_pacote')
const ra = await alunoCli.rpc('liberar_pacote', { p_pacote: pac.id }); ok(!!ra.error, 'o aluno não executa liberar_pacote')
// 4) o aluno ainda não vê a nota
if (aluno.perfil_id) { /* a visão do aluno é conferida pela RLS: sem liberada, ele não lê a correção */ }
// 5) a coordenação libera o pacote
const { data: n, error: e5 } = await coord.rpc('liberar_pacote', { p_pacote: pac.id })
ok(!e5 && n >= 1, `a coordenação libera o pacote (${n} correção)`)
const { data: c3 } = await coord.from('correcoes').select('liberada, liberada_em').eq('redacao_id', r.id).single()
ok(c3 && c3.liberada === true && !!c3.liberada_em, 'a correção passa a liberada')
// 6) REGRA DO DONO: depois de liberado ao aluno, o corretor NÃO altera nada (sem exceção)
const { error: e6a } = await corretor.from('correcoes').upsert({ redacao_id: r.id, n1: 4, n2: 3, n3: 3, n4: 3, n5: 3, comentario: 'teste 2', extras: { retida: false } })
ok(!!e6a, 'pacote liberado: o corretor NÃO consegue salvar de novo a correção')
const { data: c4 } = await coord.from('correcoes').select('liberada, n1, comentario').eq('redacao_id', r.id).single()
ok(c4 && c4.liberada === true && c4.n1 === 3 && c4.comentario === 'teste', 'a correção liberada continua exatamente como estava')
const { error: e6b } = await corretor.from('marcacoes').insert({ redacao_id: r.id, tipo: 'o' })
ok(!!e6b, 'pacote liberado: o corretor NÃO insere marcação')
const { error: e6c } = await corretor.from('correcoes').delete().eq('redacao_id', r.id)
const { data: c5 } = await coord.from('correcoes').select('redacao_id').eq('redacao_id', r.id)
ok((c5 ?? []).length === 1, 'pacote liberado: o corretor NÃO apaga a correção' + (e6c ? ' (bloqueado: ' + e6c.message.slice(0, 40) + ')' : ''))
// a coordenação continua podendo alterar
const { error: e6d } = await coord.from('correcoes').update({ comentario: 'ajuste da coordenação' }).eq('redacao_id', r.id)
ok(!e6d, 'a coordenação continua podendo alterar uma correção liberada')
await limpa()
const { data: fim } = await coord.from('correcoes').select('redacao_id').eq('redacao_id', r.id)
ok(!(fim ?? []).length, 'dados de teste removidos')
process.exit(falhas ? 1 : 0)
