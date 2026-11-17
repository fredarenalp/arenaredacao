import { describe, it, expect } from 'vitest'
import { sugerirNiveis, comentarioAuto } from './assistente.js'

const m = (cat, n) => Array.from({ length: n }, () => ({ tipo: 'o', categoria: cat }))

describe('assistente', () => {
  it('sem marcações sugere nível 4 em II e III', () => {
    expect(sugerirNiveis([])).toEqual([null, 4, 4, null, null])
  })
  it('conectivos pesam pelo limite da coordenação', () => {
    expect(sugerirNiveis(m('con', 2))[2]).toBe(3)
    expect(sugerirNiveis(m('con', 5))[2]).toBe(2)
    expect(sugerirNiveis(m('con', 9))[2]).toBe(0)
  })
  it('critério III usa o menor nível entre conectivos e repetição', () => {
    expect(sugerirNiveis([...m('con', 1), ...m('rep', 6)])[2]).toBe(1)
  })
  it('critério II soma desvios de língua', () => {
    expect(sugerirNiveis([...m('ort', 2), ...m('pont', 2)])[1]).toBe(2)
  })
  it('comentário só cita categorias marcadas', () => {
    expect(comentarioAuto([])).toBe('')
    expect(comentarioAuto(m('pont', 1))).toContain('pontuação')
    expect(comentarioAuto(m('pont', 1))).not.toContain('grafia')
  })
})
