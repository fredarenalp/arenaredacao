import { createClient } from '@supabase/supabase-js'

// URL e chave pública (publishable) não são segredo: a proteção dos dados é a RLS do banco.
// Variáveis de ambiente, se definidas, têm prioridade.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://nklkchelknnvovoilybc.supabase.co'
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5rLex1ybuXDwGsKFjf1L3g_utKRNP3E'

export const supabase = createClient(url, key)
