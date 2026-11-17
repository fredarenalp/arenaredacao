import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })

const TIPOS = ['aluno', 'corretor', 'professor', 'coordenacao']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Só a coordenação cria usuários.
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
  const { data: quem } = await admin.auth.getUser(token)
  if (!quem?.user) return json({ erro: 'Não autenticado' }, 401)
  const { data: eu } = await admin.from('perfis').select('tipo, ativo').eq('id', quem.user.id).maybeSingle()
  if (eu?.tipo !== 'coordenacao' || !eu.ativo) return json({ erro: 'Sem permissão' }, 403)

  const corpo = await req.json().catch(() => ({}))
  const { senha, nome, tipo, aluno_id, turma_ids } = corpo
  let email = corpo.email
  // Aluno entra com a matrícula: o e-mail de login é derivado dela.
  if (tipo === 'aluno' && aluno_id) {
    const { data: al } = await admin.from('alunos').select('matricula').eq('id', aluno_id).maybeSingle()
    if (!al) return json({ erro: 'Aluno não encontrado' }, 400)
    email = `${String(al.matricula).trim().toLowerCase()}@aluno.arena.com`
  }
  if (!email || !senha || !nome || !TIPOS.includes(tipo)) return json({ erro: 'Dados inválidos' }, 400)
  if (String(senha).length < 6) return json({ erro: 'A senha precisa de 6 caracteres ou mais' }, 400)

  const { data: criado, error } = await admin.auth.admin.createUser({ email, password: senha, email_confirm: true })
  if (error || !criado.user) return json({ erro: error?.message ?? 'Falha ao criar' }, 400)
  const id = criado.user.id

  const desfazer = async (msg: string) => { await admin.auth.admin.deleteUser(id); return json({ erro: msg }, 400) }

  const { error: e1 } = await admin.from('perfis').insert({ id, tipo, nome })
  if (e1) return desfazer(e1.message)
  if (tipo === 'aluno' && aluno_id) {
    const { error: e2 } = await admin.from('alunos').update({ perfil_id: id }).eq('id', aluno_id).is('perfil_id', null)
    if (e2) return desfazer(e2.message)
  }
  if (tipo === 'professor' && Array.isArray(turma_ids) && turma_ids.length) {
    const { error: e3 } = await admin.from('professor_turmas').insert(turma_ids.map((t: number) => ({ perfil_id: id, turma_id: t })))
    if (e3) return desfazer(e3.message)
  }
  return json({ id })
})
