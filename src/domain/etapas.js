// Etapas da produção do aluno.
export const ETAPAS = ['enviada', 'em_correcao', 'aguardando_liberacao', 'corrigida']

const ROTULOS = {
  enviada: 'Enviada',
  em_correcao: 'Em correção',
  aguardando_liberacao: 'Aguardando liberação',
  corrigida: 'Corrigida',
}

export function rotuloEtapa(etapa) {
  return ROTULOS[etapa] ?? 'Desconhecida'
}

export function indiceEtapa(etapa) {
  const i = ETAPAS.indexOf(etapa)
  return i < 0 ? null : i + 1
}

// Transições permitidas (a liberação é decisão da coordenação).
const PROXIMAS = {
  enviada: ['em_correcao'],
  em_correcao: ['aguardando_liberacao', 'corrigida'],
  aguardando_liberacao: ['em_correcao', 'corrigida'],
  corrigida: ['em_correcao'], // reabertura exige justificativa (ver auditoria)
}

export function podeTransitar(de, para) {
  return (PROXIMAS[de] ?? []).includes(para)
}
