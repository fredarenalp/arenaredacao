// Monta (up) ou desmonta (down) um cenário AEE no banco real para testar a tela.
// Uso: NODE_USE_ENV_PROXY=1 node e2e/aee-cenario.mjs up|down
import { createClient } from '@supabase/supabase-js'
const URL = 'https://nklkchelknnvovoilybc.supabase.co'
const KEY = 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E'
const entrar = async (email, senha = 'teste') => { const c = createClient(URL, KEY, { auth: { persistSession: false } }); const { error } = await c.auth.signInWithPassword({ email, password: senha }); if (error) throw error; return c }
const coord = await entrar('teste@arena.com')
const { data: al } = await coord.from('alunos').select('id').eq('matricula', '20260187').single()
const { data: cor } = await coord.from('perfis').select('id').eq('email', 'corretor@arena.com').single()
if (process.argv[2] === 'up') {
  const aluno = await entrar('20260187@aluno.arena.com', 'teste')
  await coord.from('alunos_aee').upsert({ aluno_id: al.id })
  await coord.from('perfis').update({ especialista_aee: true }).eq('id', cor.id)
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const { data: prop } = await coord.from('propostas').insert({ ano: 2026, bimestre: 4, numero: 9, titulo: 'Proposta AEE de teste', genero: 'Carta', prazo: ontem }).select().single()
  await aluno.from('redacoes').insert({ aluno_id: al.id, proposta_id: prop.id, versao: 1, foto_path: '3/seed-1794949627620.png' })
  await coord.rpc('gerar_pacotes')
  const { data: pac } = await coord.from('pacotes').select('id').eq('aee', true).is('corretor_id', null)
  for (const p of pac) await coord.from('pacotes').update({ corretor_id: cor.id }).eq('id', p.id)
  console.log('cenário montado')
} else {
  const { data: ps } = await coord.from('propostas').select('id').eq('titulo', 'Proposta AEE de teste')
  for (const p of ps ?? []) await coord.from('redacoes').delete().eq('proposta_id', p.id)
  await coord.from('propostas').delete().eq('titulo', 'Proposta AEE de teste')
  await coord.from('pacotes').delete().eq('aee', true)
  await coord.from('alunos_aee').delete().eq('aluno_id', al.id)
  await coord.from('perfis').update({ especialista_aee: false }).eq('id', cor.id)
  console.log('cenário removido')
}
