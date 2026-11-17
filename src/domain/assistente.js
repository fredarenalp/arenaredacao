import { nivelPorOcorrencias, LIMITES_CONECTIVOS } from './grade.js'
import { contarPorCategoria } from './categorias.js'

// Limites configuráveis (nº de ocorrências → nível). Conectivos seguem a regra da coordenação.
export const LIMITES = {
  con: LIMITES_CONECTIVOS, // 1–2→3, 3–6→2, 7–8→1, 9+→0
  rep: [2, 5, 8],
  lin: [3, 8, 14], // ortografia + pontuação + concordância + regência + conjugação
}

const LINGUA = ['ort', 'pont', 'conc', 'reg', 'conj']

// Sugere níveis dos critérios que dependem de contagem (II e III). Os demais ficam null (decisão do corretor).
export function sugerirNiveis(marcacoes) {
  const c = contarPorCategoria(marcacoes)
  const lin = LINGUA.reduce((s, k) => s + (c[k] ?? 0), 0)
  const n2 = nivelPorOcorrencias(lin, LIMITES.lin)
  // critério III: o menor nível entre conectivos e repetições (o mais exigente prevalece)
  const n3 = Math.min(
    nivelPorOcorrencias(c.con ?? 0, LIMITES.con),
    nivelPorOcorrencias(c.rep ?? 0, LIMITES.rep),
  )
  return [null, n2, n3, null, null]
}

const FRASES = {
  ort: 'atenção à grafia de algumas palavras',
  pont: 'revise o uso da pontuação',
  conc: 'cuide da concordância',
  reg: 'verifique a regência de verbos e nomes',
  conj: 'revise a conjugação verbal',
  con: 'use os conectivos de forma adequada entre as ideias',
  rep: 'evite repetir palavras; varie o vocabulário',
}

export function comentarioAuto(marcacoes) {
  const c = contarPorCategoria(marcacoes)
  const itens = Object.keys(FRASES).filter((k) => c[k] > 0).map((k) => FRASES[k])
  if (!itens.length) return ''
  return 'Pontos de atenção: ' + itens.join('; ') + '.'
}
