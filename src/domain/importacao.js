// Importação em lote de alunos: linhas "ano;série;turma;matrícula;nome" (; , ou tab).
export function parseAlunos(texto) {
  const ok = []
  const erros = []
  texto.split(/\r?\n/).forEach((linha, i) => {
    if (!linha.trim()) return
    const p = linha.split(/[;\t,]/).map((x) => x.trim())
    const [ano, serie, turma, matricula, ...resto] = p
    const nome = resto.join(' ').trim()
    if (i === 0 && /ano/i.test(ano)) return // cabeçalho
    if (!/^\d{4}$/.test(ano) || !serie || !turma || !matricula || !nome) {
      erros.push({ linha: i + 1, motivo: 'formato inválido' })
      return
    }
    ok.push({ ano: Number(ano), serie, turma, matricula, nome })
  })
  const vistos = new Set()
  return {
    alunos: ok.filter((a) => (vistos.has(a.matricula) ? (erros.push({ linha: 0, motivo: `matrícula repetida ${a.matricula}` }), false) : (vistos.add(a.matricula), true))),
    erros,
  }
}
