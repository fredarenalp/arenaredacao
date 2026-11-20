// Carrega a lista de palavras (arquivo .tsv: palavra<TAB>comum 0/1) no banco. Só a coordenação grava.
// Uso: NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node scripts/semear-palavras.mjs <arquivo.tsv> [email] [senha]
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
const [arq, email = 'teste@arena.com', senha = 'teste'] = process.argv.slice(2)
const c = createClient('https://nklkchelknnvovoilybc.supabase.co', 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E', { auth: { persistSession: false } })
const { error: e0 } = await c.auth.signInWithPassword({ email, password: senha })
if (e0) throw e0
const norm = (w) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const linhas = fs.readFileSync(arq, 'utf8').split('\n').filter(Boolean)
const T = 5000
let feitos = 0
for (let i = 0; i < linhas.length; i += T) {
  const lote = linhas.slice(i, i + T).map((l) => { const [p, cm] = l.split('\t'); return { palavra: p, norm: norm(p), comum: cm === '1' } })
  for (let tent = 1; ; tent++) {
    const { error } = await c.from('palavras_pt').upsert(lote)
    if (!error) break
    if (tent >= 4) throw error
    await new Promise((r) => setTimeout(r, 1500 * tent))
  }
  feitos += lote.length
  if ((i / T) % 20 === 0) console.log('...', feitos)
}
const { count } = await c.from('palavras_pt').select('*', { count: 'exact', head: true })
console.log('palavras no banco:', count)
