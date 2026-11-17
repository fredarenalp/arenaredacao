import { describe, it, expect } from 'vitest'
import { parseAlunos } from './importacao.js'

describe('importação', () => {
  it('lê linhas válidas e ignora cabeçalho', () => {
    const r = parseAlunos('ano;serie;turma;matricula;nome\n2026;1;A;100;Ana Souza\n2026;1;B;101;Bia')
    expect(r.alunos).toHaveLength(2)
    expect(r.alunos[0]).toEqual({ ano: 2026, serie: '1', turma: 'A', matricula: '100', nome: 'Ana Souza' })
    expect(r.erros).toEqual([])
  })
  it('reporta linhas inválidas e matrículas repetidas', () => {
    const r = parseAlunos('2026;1;A;100;Ana\nx;1;A;101;Bia\n2026;1;A;100;Clara')
    expect(r.alunos).toHaveLength(1)
    expect(r.erros).toHaveLength(2)
  })
})
