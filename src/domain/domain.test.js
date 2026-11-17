import { describe, it, expect } from 'vitest'
import { calcularNota, formatarNota, nivelPorOcorrencias, LIMITES_CONECTIVOS } from './grade.js'
import { podeTransitar, indiceEtapa } from './etapas.js'

describe('grade', () => {
  it('nota = soma dos níveis × 0,5', () => {
    expect(calcularNota([4, 4, 4, 4, 4])).toBe(10)
    expect(calcularNota([0, 0, 0, 0, 0])).toBe(0)
    expect(calcularNota([3, 2, 4, 1, 3])).toBe(6.5)
  })
  it('rejeita níveis inválidos ou incompletos', () => {
    expect(calcularNota([5, 0, 0, 0, 0])).toBeNull()
    expect(calcularNota([1, 2, 3])).toBeNull()
    expect(calcularNota([1.5, 0, 0, 0, 0])).toBeNull()
  })
  it('formata com vírgula', () => {
    expect(formatarNota(6.5)).toBe('6,5')
    expect(formatarNota(null)).toBe('—')
  })
  it('conectivos: 1–2→3, 3–6→2, 7–8→1, 9+→0', () => {
    const n = (q) => nivelPorOcorrencias(q, LIMITES_CONECTIVOS)
    expect([0, 1, 2, 3, 6, 7, 8, 9, 20].map(n)).toEqual([4, 3, 3, 2, 2, 1, 1, 0, 0])
  })
})

describe('etapas', () => {
  it('transições', () => {
    expect(podeTransitar('enviada', 'em_correcao')).toBe(true)
    expect(podeTransitar('enviada', 'corrigida')).toBe(false)
    expect(indiceEtapa('corrigida')).toBe(4)
  })
})
