// Ciclo completo contra o banco REAL com os usuários de teste (aluno, corretor, coordenação).
// Uso: node e2e/ciclo-real.mjs   (limpa a redação de teste ao final)
import { createClient } from '@supabase/supabase-js'
const URL = 'https://nklkchelknnvovoilybc.supabase.co'
const KEY = 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E'
const entrar = async (email) => {
  const c = createClient(URL, KEY, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: email.startsWith('20260187') ? '0000' : 'teste' })
  if (error) throw new Error(`login ${email}: ${error.message}`)
  return c
}
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FALHA'), msg); if (!cond) process.exitCode = 1 }

const aluno = await entrar('20260187@aluno.arena.com')
const corretor = await entrar('corretor@arena.com')
const coord = await entrar('teste@arena.com')

const { data: al } = await aluno.from('alunos').select('*').single()
const { data: prop } = await aluno.from('propostas').select('*').limit(1).single()
const png = new Uint8Array([137,80,78,71,13,10,26,10])
const path = `${al.id}/e2e-${Date.now()}.png`
const up = await aluno.storage.from('redacoes').upload(path, png, { contentType: 'image/png' })
ok(!up.error, 'aluno envia a foto')
const { data: red, error: eR } = await aluno.from('redacoes').insert({ aluno_id: al.id, proposta_id: prop.id, foto_path: path }).select().single()
ok(!eR, 'aluno cria a redação' + (eR ? ': ' + eR.message : ''))

const { data: fila } = await corretor.from('redacoes').select('id').eq('etapa', 'enviada')
ok(fila?.some((r) => r.id === red.id), 'corretor vê a redação na fila')
const { data: url } = await corretor.storage.from('redacoes').createSignedUrl(path, 60)
ok(!!url?.signedUrl, 'corretor acessa a foto')

await corretor.from('marcacoes').insert({ redacao_id: red.id, tipo: 'o', categoria: 'ort', dados: { cx: 0.3, cy: 0.4 } })
const { error: eC } = await corretor.from('correcoes').upsert({ redacao_id: red.id, n1: 4, n2: 3, n3: 3, n4: 2, n5: 4, comentario: 'Ciclo de teste.', extras: { retida: false } })
ok(!eC, 'corretor salva a correção')
const { error: eL } = await corretor.from('correcoes').update({ liberada: true }).eq('redacao_id', red.id)
ok(!eL, 'corretor libera correção comum (nota 8)')
const { data: dep } = await aluno.from('correcoes').select('*').eq('redacao_id', red.id).single()
ok(dep?.nota === 8, `aluno vê a nota após liberar (nota ${dep?.nota})`)
const { data: marcDep } = await aluno.from('marcacoes').select('*').eq('redacao_id', red.id)
ok(marcDep.length === 1, 'aluno vê as marcações após liberar')

// nota 10 é retida: o corretor NÃO libera; coordenação libera
await corretor.from('correcoes').update({ n1: 4, n2: 4, n3: 4, n4: 4, n5: 4, liberada: false }).eq('redacao_id', red.id)
const { error: eRet } = await corretor.from('correcoes').update({ liberada: true }).eq('redacao_id', red.id)
ok(!!eRet, 'corretor NÃO libera nota 10 (retida)')
const { data: ret } = await aluno.from('correcoes').select('liberada').eq('redacao_id', red.id)
ok(ret.length === 0, 'aluno não vê a nota retida')
await coord.from('correcoes').update({ liberada: true }).eq('redacao_id', red.id)
const { data: ret2 } = await aluno.from('correcoes').select('nota').eq('redacao_id', red.id)
ok(ret2[0]?.nota === 10, 'coordenação libera a nota retida')

await coord.from('correcoes').update({ n1: 3 }).eq('redacao_id', red.id)
const { data: ev } = await coord.from('eventos').select('*').eq('redacao_id', red.id).eq('acao', 'nota_alterada')
ok(ev.length >= 1, 'alteração de nota gerou auditoria')

// limpeza
await coord.from('redacoes').delete().eq('id', red.id)
await coord.storage.from('redacoes').remove([path])
const { data: resto } = await coord.from('redacoes').select('id').eq('id', red.id)
ok(resto.length === 0, 'redação de teste removida')
