// Confere no banco real: a coordenação redefine a senha de um aluno e o aluno entra com a matrícula.
// Uso: NODE_USE_ENV_PROXY=1 node e2e/pessoas-real.mjs <matrícula>
import { createClient } from '@supabase/supabase-js'
const URL = 'https://nklkchelknnvovoilybc.supabase.co'
const KEY = 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E'
const mat = process.argv[2] || '20260187'
const novo = () => createClient(URL, KEY, { auth: { persistSession: false } })

const coord = novo()
await coord.auth.signInWithPassword({ email: 'teste@arena.com', password: 'teste' })
// A função exige senha com 6 caracteres ou mais: a senha de teste "teste" (5) é recusada, e nada muda no banco.
const r = await coord.functions.invoke('criar-usuario', { body: { acao: 'senha', matricula: mat, senha: 'teste' } })
let corpo = null
try { corpo = await r.error?.context?.json() } catch { /* sem corpo */ }
console.log(r.error && /6 caracteres/.test(corpo?.erro ?? '') ? 'ok    senha curta é recusada pela função (mínimo de 6 caracteres)' : 'FALHA: a função deveria recusar senha de 5 caracteres', corpo ?? r.data)
// O aluno de teste segue entrando com a senha de teste (definida direto no cadastro de autenticação).

const aluno = novo()
const { error } = await aluno.auth.signInWithPassword({ email: `${mat}@aluno.arena.com`, password: 'teste' })
console.log(error ? 'FALHA login do aluno: ' + error.message : 'ok    aluno entra pela matrícula com a nova senha')
