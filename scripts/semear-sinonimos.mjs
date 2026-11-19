// Carrega no banco o JSON gerado por scripts/extrair-sinonimos.py (somente a coordenação consegue gravar).
// Uso: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node scripts/semear-sinonimos.mjs <arquivo.json> [email] [senha]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const [arq, email = 'teste@arena.com', senha = 'teste'] = process.argv.slice(2)
const c = createClient('https://nklkchelknnvovoilybc.supabase.co', 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E', { auth: { persistSession: false } })
const { error: e0 } = await c.auth.signInWithPassword({ email, password: senha })
if (e0) throw e0
const dados = JSON.parse(fs.readFileSync(arq, 'utf8'))
for (let i = 0; i < dados.length; i += 200) {
  const { error } = await c.from('sinonimos_grupos').upsert(dados.slice(i, i + 200))
  if (error) throw error
}
const { count } = await c.from('sinonimos_grupos').select('*', { count: 'exact', head: true })
console.log('verbetes no banco:', count)
