// Aviso de atraso: o aluno cria, a coordenação aceita/recusa, ninguém mais mexe (banco REAL de teste).
// O aviso criado pelo teste tem motivo "TESTE-VARREDURA"; a coordenação não apaga avisos (sem política de delete), então o teste os marca como
// recusados e o script imprime o comando SQL de limpeza ao final.
import { createClient } from '@supabase/supabase-js'
const URL = 'https://nklkchelknnvovoilybc.supabase.co'
const KEY = 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E'
const entrar = async (email, senha = 'teste') => { const c = createClient(URL, KEY, { auth: { persistSession: false } }); const { error } = await c.auth.signInWithPassword({ email, password: senha }); if (error) throw new Error(email + ': ' + error.message); return c }
let falhas = 0
const ok = (c, m) => { console.log(c ? 'ok   ' : 'FALHA', m); if (!c) falhas++ }
const aluno = await entrar('20260187@aluno.arena.com'), coord = await entrar('teste@arena.com'), corretor = await entrar('corretor@arena.com')
const { data: al } = await aluno.from('alunos').select('id').single()
const { data: prop } = await coord.from('propostas').select('id').eq('numero', 2).limit(1).single()

const { data: av, error: e1 } = await aluno.from('avisos').insert({ aluno_id: al.id, proposta_id: prop.id, tipo: 'atraso', motivo: 'TESTE-VARREDURA' }).select().single()
ok(!e1 && av?.status === 'pend', 'aluno cria o aviso (fica pendente)' + (e1 ? ': ' + e1.message : ''))
const { data: outro } = await aluno.from('avisos').insert({ aluno_id: al.id + 999, proposta_id: prop.id, tipo: 'atraso', motivo: 'x' }).select()
ok(!(outro ?? []).length, 'aluno não cria aviso em nome de outro aluno')
const { data: vc } = await corretor.from('avisos').select('id').eq('id', av.id)
ok(!(vc ?? []).length, 'corretor não vê avisos de alunos')
const { error: eA } = await aluno.from('avisos').update({ status: 'aceito' }).eq('id', av.id)
const { data: ch1 } = await coord.from('avisos').select('status').eq('id', av.id).single()
ok(ch1.status === 'pend', 'aluno não decide o próprio aviso')

const { data: uid } = await coord.auth.getUser()
const { error: eB } = await coord.from('avisos').update({ status: 'aceito', decidido_por: uid.user.id, decidido_em: new Date().toISOString() }).eq('id', av.id)
const { data: ch2 } = await coord.from('avisos').select('status').eq('id', av.id).single()
ok(!eB && ch2.status === 'aceito', 'coordenação ACEITA o aviso')
const { data: vis } = await aluno.from('avisos').select('status').eq('id', av.id).single()
ok(vis?.status === 'aceito', 'o aluno vê que foi aceito')
await coord.from('avisos').update({ status: 'recusado', decidido_por: uid.user.id, decidido_em: new Date().toISOString() }).eq('id', av.id)
const { data: ch3 } = await coord.from('avisos').select('status').eq('id', av.id).single()
ok(ch3.status === 'recusado', 'coordenação RECUSA (muda a decisão)')
console.log(`\nLimpeza: delete from public.avisos where id = ${av.id};`)
process.exit(falhas ? 1 : 0)
