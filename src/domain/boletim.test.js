import { describe, it, expect } from 'vitest'
import { boletim, tendencia } from './boletim.js'

describe('boletim', () => {
  it('média por bimestre', () => {
    const b = boletim([{ bimestre: 1, nota: 6 }, { bimestre: 1, nota: 8 }, { bimestre: 2, nota: 9 }])
    expect(b[0].media).toBe(7)
    expect(b[1].media).toBe(9)
    expect(b[2].media).toBeNull()
  })
  it('tendência', () => {
    expect(tendencia(boletim([{ bimestre: 1, nota: 6 }, { bimestre: 2, nota: 8 }]))).toBe('em alta')
    expect(tendencia(boletim([{ bimestre: 1, nota: 6 }]))).toBe('sem dados suficientes')
  })
})
