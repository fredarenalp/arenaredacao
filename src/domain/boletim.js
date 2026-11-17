// Boletim: média das notas liberadas por bimestre e evolução.
export function boletim(itens) {
  // itens: [{ bimestre, nota }] apenas de correções liberadas
  const por = {}
  for (const { bimestre, nota } of itens) {
    if (nota == null) continue
    ;(por[bimestre] ??= []).push(Number(nota))
  }
  return [1, 2, 3, 4].map((b) => {
    const v = por[b] ?? []
    return { bimestre: b, qtd: v.length, media: v.length ? v.reduce((s, x) => s + x, 0) / v.length : null }
  })
}

export function tendencia(linhas) {
  const com = linhas.filter((l) => l.media != null)
  if (com.length < 2) return 'sem dados suficientes'
  const d = com[com.length - 1].media - com[com.length - 2].media
  return d > 0.25 ? 'em alta' : d < -0.25 ? 'em queda' : 'estável'
}
