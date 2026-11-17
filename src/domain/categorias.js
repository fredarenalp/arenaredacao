// Categorias de marcação por critério (numeral = critério ao qual pertencem).
export const CATEGORIAS = [
  { id: 'gen', nome: 'Adequação ao gênero', crit: 1 },
  { id: 'ort', nome: 'Ortografia', crit: 2 },
  { id: 'pont', nome: 'Pontuação', crit: 2 },
  { id: 'conc', nome: 'Concordância', crit: 2 },
  { id: 'reg', nome: 'Regência', crit: 2 },
  { id: 'conj', nome: 'Conjugação verbal', crit: 2 },
  { id: 'con', nome: 'Conectivo', crit: 3 },
  { id: 'rep', nome: 'Repetição', crit: 3 },
  { id: 'info', nome: 'Informação / repertório', crit: 4 },
  { id: 'ele', nome: 'Elemento do gênero', crit: 5 },
]
export const critDe = (id) => CATEGORIAS.find((c) => c.id === id)?.crit ?? null
export function contarPorCategoria(marcacoes) {
  const r = {}
  for (const m of marcacoes) if (m.tipo === 'o') r[m.categoria] = (r[m.categoria] ?? 0) + 1
  return r
}
