// Regra do atraso (banco REAL de teste): o aluno envia até a SEXTA-FEIRA da semana do prazo (feriado: dia útil anterior);
// proposta fechada/encerrada/rascunho não recebe envio; prazo individual libera um aluno. Restaura a proposta e apaga o que criou.
import { createClient } from '@supabase/supabase-js'
const URL = 'https://nklkchelknnvovoilybc.supabase.co'
const KEY = 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E'
const entrar = async (email, senha = 'teste') => { const c = createClient(URL, KEY, { auth: { persistSession: false } }); const { error } = await c.auth.signInWithPassword({ email, password: senha }); if (error) throw new Error(email + ': ' + error.message); return c }
let falhas = 0
const ok = (c, m) => { console.log(c ? 'ok   ' : 'FALHA', m); if (!c) falhas++ }
const aluno = await entrar('20260187@aluno.arena.com'), coord = await entrar('teste@arena.com')
const { data: al } = await aluno.from('alunos').select('id').single()
const { data: jaEnv } = await aluno.from('redacoes').select('proposta_id, versao')
const { data: todas } = await coord.from('propostas').select('id, status, prazo, prazo2, series').order('id')
const alvo = todas.find((p) => !jaEnv.some((r) => r.proposta_id === p.id && r.versao === 1) && (p.series ?? []).includes(8))
if (!alvo) { console.log('pulou: sem proposta livre do 8º ano para o aluno de teste'); process.exit(0) }
const orig = { status: alvo.status, prazo: alvo.prazo }
const dia = (n) => { const d = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const cfg = (status, prazo) => coord.from('propostas').update({ status, prazo }).eq('id', alvo.id)
const tenta = async () => { const r = await aluno.from('redacoes').insert({ aluno_id: al.id, proposta_id: alvo.id, versao: 1, foto_path: 'teste/envio-prazo.jpg' }).select().single(); if (r.data) await coord.from('redacoes').delete().eq('id', r.data.id); return r }
// fim esperado = sexta da semana do prazo (ou dia útil anterior se feriado), calculado pelo próprio banco
const fim = async (iso) => (await coord.rpc('fim_atraso', { p_prazo: iso })).data
try {
  await cfg('rascunho', dia(3)); ok(!!(await tenta()).error, 'rascunho não recebe envio')
  await cfg('encerrada', dia(3)); ok(!!(await tenta()).error, 'encerrada não recebe envio')
  await cfg('fechada', dia(3)); ok(!!(await tenta()).error, 'fechada não recebe envio')
  await cfg('aberta', dia(3)); const r1 = await tenta(); ok(!r1.error && r1.data.fora_do_prazo === false, 'aberta e no prazo: aceita (não é atraso)')
  const hoje = dia(0)
  // prazo cada vez mais antigo: acha um que ainda está na janela e um que já passou da sexta
  let dentro = null, fora = null
  for (let n = 1; n <= 14; n++) { const pz = dia(-n); const f = await fim(pz); if (f >= hoje && !dentro) dentro = pz; if (f < hoje && !fora) fora = pz }
  if (dentro) { await cfg('aberta', dentro); const r = await tenta(); ok(!r.error && r.data.fora_do_prazo === true, `dentro da janela (prazo ${dentro}, vai até ${await fim(dentro)}): aceita como atraso`) }
  if (fora) { await cfg('aberta', fora); const r = await tenta(); ok(!!r.error, `depois da sexta (prazo ${fora}, ia até ${await fim(fora)}): o banco recusa`) }
  // prazo individual libera só este aluno
  if (fora) {
    await coord.from('prazos_individuais').upsert({ aluno_id: al.id, proposta_id: alvo.id, ate: dia(2), vale_nota: true })
    const r = await tenta(); ok(!r.error, 'prazo individual libera o aluno mesmo depois da sexta')
    await coord.from('prazos_individuais').delete().eq('aluno_id', al.id).eq('proposta_id', alvo.id)
  }
  // feriado: se a sexta for feriado, o fim recua para o dia útil anterior
  const sexta = (() => { const d = new Date('2026-11-16T12:00:00Z'); return d })() // semana de 16/11/2026; sexta 20/11 é feriado (Consciência Negra)
  ok((await fim('2026-11-18')) === '2026-11-19', 'sexta feriado (20/11): o último dia é quinta 19/11')
  ok((await fim('2026-11-12')) === '2026-11-13', 'prazo na quinta 12/11: vai até a sexta 13/11')
  ok((await fim('2026-11-27')) === '2026-11-27', 'prazo na sexta: não há dias de atraso')
} finally {
  await coord.from('propostas').update(orig).eq('id', alvo.id)
  await coord.from('prazos_individuais').delete().eq('aluno_id', al.id).eq('proposta_id', alvo.id)
}
const { data: dep } = await coord.from('propostas').select('status, prazo').eq('id', alvo.id).single()
ok(dep.status === orig.status && dep.prazo === orig.prazo, 'proposta de teste restaurada')
process.exit(falhas ? 1 : 0)
