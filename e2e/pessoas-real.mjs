// Confere no banco real: a coordenação redefine a senha de um aluno e o aluno entra com a matrícula.
// Uso: NODE_USE_ENV_PROXY=1 node e2e/pessoas-real.mjs <matrícula>
import { createClient } from '@supabase/supabase-js'
const URL = 'https://nklkchelknnvovoilybc.supabase.co'
const KEY = 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E'
const mat = process.argv[2] || '20269999'
const novo = () => createClient(URL, KEY, { auth: { persistSession: false } })

const coord = novo()
await coord.auth.signInWithPassword({ email: 'teste@arena.com', password: 'teste' })
const r = await coord.functions.invoke('criar-usuario', { body: { acao: 'senha', matricula: mat, senha: 'nova-senha-123' } })
console.log(r.data?.ok ? 'ok    senha redefinida pela coordenação' : 'FALHA redefinir', r.data ?? r.error)

const aluno = novo()
const { error } = await aluno.auth.signInWithPassword({ email: `${mat}@aluno.arena.com`, password: 'nova-senha-123' })
console.log(error ? 'FALHA login do aluno: ' + error.message : 'ok    aluno entra pela matrícula com a nova senha')
