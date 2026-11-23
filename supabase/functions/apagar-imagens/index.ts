import { createClient } from 'npm:@supabase/supabase-js@2'

// Apaga as FOTOS das redações de um bimestre e mantém notas, comentários e marcações.
// Só a coordenação chama. Só entram redações já corrigidas e com correção liberada; o resto não é tocado.
// { bimestre, confirmar, apenas? } — sem confirmar devolve só a contagem (simulação). `apenas` (lista de ids de redação)
// restringe a operação a essas redações (usado nos testes).

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: quem } = await admin.auth.getUser(token)
  if (!quem?.user) return json({ erro: 'Não autenticado' }, 401)
  const { data: eu } = await admin.from('perfis').select('tipo, ativo').eq('id', quem.user.id).maybeSingle()
  if (eu?.tipo !== 'coordenacao' || !eu.ativo) return json({ erro: 'Sem permissão' }, 403)

  const corpo = await req.json().catch(() => ({}))
  const b = Number(corpo.bimestre)
  if (!Number.isInteger(b) || b < 1 || b > 4) return json({ erro: 'Bimestre inválido' }, 400)

  const { data: props } = await admin.from('propostas').select('id').eq('bimestre', b)
  const propIds = (props ?? []).map((p) => p.id)
  if (!propIds.length) return json({ redacoes: 0, fotos: 0, bytes: 0, pendentes: 0 })

  // redações do bimestre com foto, em páginas (o limite padrão do banco é 1000 linhas)
  const todas: { id: number; foto_path: string; etapa: string; correcoes: { liberada: boolean }[] | { liberada: boolean } | null }[] = []
  for (let de = 0; ; de += 1000) {
    const { data, error } = await admin.from('redacoes').select('id, foto_path, etapa, correcoes(liberada)').in('proposta_id', propIds).not('foto_path', 'is', null).order('id').range(de, de + 999)
    if (error) return json({ erro: error.message }, 500)
    todas.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  const lib = (r: (typeof todas)[number]) => {
    const c = Array.isArray(r.correcoes) ? r.correcoes[0] : r.correcoes
    return r.etapa === 'corrigida' && !!c?.liberada
  }
  const apenas: number[] | null = Array.isArray(corpo.apenas) ? corpo.apenas.map(Number) : null
  const alvo = todas.filter((r) => lib(r) && (!apenas || apenas.includes(r.id)))
  const pendentes = todas.filter((r) => !lib(r)).length
  const caminhos = [...new Set(alvo.map((r) => r.foto_path))]

  // tamanho aproximado, somando os arquivos de cada pasta (uma pasta por aluno)
  const porPasta = new Map<string, Set<string>>()
  for (const c of caminhos) {
    const [pasta, ...resto] = c.split('/')
    if (!porPasta.has(pasta)) porPasta.set(pasta, new Set())
    porPasta.get(pasta)!.add(resto.join('/'))
  }
  let bytes = 0
  for (const [pasta, nomes] of porPasta) {
    const { data } = await admin.storage.from('redacoes').list(pasta, { limit: 1000 })
    for (const f of data ?? []) if (nomes.has(f.name)) bytes += Number((f.metadata as { size?: number } | null)?.size ?? 0)
  }

  if (!corpo.confirmar) return json({ redacoes: alvo.length, fotos: caminhos.length, bytes, pendentes })

  // 1) tira o caminho da foto das redações; 2) apaga os arquivos que ninguém mais usa
  const ids = alvo.map((r) => r.id)
  for (let i = 0; i < ids.length; i += 200) {
    const { error } = await admin.from('redacoes').update({ foto_path: null }).in('id', ids.slice(i, i + 200))
    if (error) return json({ erro: error.message }, 500)
  }
  let removidos = 0
  let falhas = 0
  for (let i = 0; i < caminhos.length; i += 100) {
    const lote = caminhos.slice(i, i + 100)
    const { data: ainda } = await admin.from('redacoes').select('foto_path').in('foto_path', lote)
    const emUso = new Set((ainda ?? []).map((x) => x.foto_path))
    const apagar = lote.filter((c) => !emUso.has(c))
    if (!apagar.length) continue
    const { data, error } = await admin.storage.from('redacoes').remove(apagar)
    if (error) falhas += apagar.length
    else removidos += (data ?? []).length
  }
  return json({ ok: true, redacoes: alvo.length, fotos: removidos, bytes, pendentes, falhas })
})
