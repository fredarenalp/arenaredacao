// Grade de correção "Gêneros": 5 critérios (I–V), níveis 0–4, nota = soma × 0,5 (0 a 10).
export const CRITERIOS = [
  { n: 1, nome: 'Estética', cor: '#3c7678', romano: 'I' },
  { n: 2, nome: 'Linguagem', cor: '#1a4888', romano: 'II' },
  { n: 3, nome: 'Progressão', cor: '#6a3a8a', romano: 'III' },
  { n: 4, nome: 'Proposta', cor: '#b07a10', romano: 'IV' },
  { n: 5, nome: 'Abordagem', cor: '#2f855a', romano: 'V' },
]

export const NIVEL_MIN = 0
export const NIVEL_MAX = 4
export const PESO_NIVEL = 0.5

export function nivelValido(n) {
  return Number.isInteger(n) && n >= NIVEL_MIN && n <= NIVEL_MAX
}

// niveis: array de 5 inteiros 0–4. Retorna null se incompleto/inválido.
export function calcularNota(niveis) {
  if (!Array.isArray(niveis) || niveis.length !== CRITERIOS.length) return null
  if (!niveis.every(nivelValido)) return null
  return niveis.reduce((s, n) => s + n, 0) * PESO_NIVEL
}

export function formatarNota(nota) {
  return nota == null ? '—' : nota.toFixed(1).replace('.', ',')
}

// Limites do assistente: nº de ocorrências -> nível sugerido (4 = nenhuma).
// limites = [a, b, c]: <=0 → 4; 1..a → 3; a+1..b → 2; b+1..c → 1; >c → 0
export function nivelPorOcorrencias(qtd, limites) {
  const [a, b, c] = limites
  if (qtd <= 0) return 4
  if (qtd <= a) return 3
  if (qtd <= b) return 2
  if (qtd <= c) return 1
  return 0
}

// Conectivos: 1–2 → 3; 3–6 → 2; 7–8 → 1; 9+ → 0
export const LIMITES_CONECTIVOS = [2, 6, 8]
