import React from 'react'
import { CRITERIOS, formatarNota } from '../domain/grade.js'
import { CATEGORIAS, contarPorCategoria } from '../domain/categorias.js'

// Verso da folha: nota, critérios com retângulos de nível, desvios marcados e comentário.
export default function Verso({ correcao, marcas }) {
  const cont = contarPorCategoria(marcas)
  return (
    <div className="verso">
      <h3>Nota: {formatarNota(Number(correcao.nota))}</h3>
      {CRITERIOS.map((k) => {
        const nivel = correcao['n' + k.n]
        return (
          <div key={k.n} className="crs">
            <span style={{ color: k.cor }}>{k.n}. {k.nome}</span>
            <span aria-label={`nível ${nivel} de 4`}>
              {[1, 2, 3, 4].map((i) => (
                <i key={i} style={{ display: 'inline-block', width: 22, height: 10, marginLeft: 3,
                  background: i <= nivel ? k.cor : 'transparent', border: `1px solid ${k.cor}` }} />
              ))}
            </span>
          </div>
        )
      })}
      <h4>Marcações</h4>
      <ul>{CATEGORIAS.filter((c) => cont[c.id]).map((c) => <li key={c.id}>{c.nome}: {cont[c.id]}</li>)}</ul>
      {correcao.comentario && <><h4>Comentário</h4><p>{correcao.comentario}</p></>}
    </div>
  )
}
