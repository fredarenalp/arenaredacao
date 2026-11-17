import React from 'react'
import { CRITERIOS } from '../domain/grade.js'
import { critDe } from '../domain/categorias.js'

// Foto com marcações em coordenadas relativas (0–1). onClick só no modo de edição.
export default function FotoMarcada({ url, marcacoes, onClick }) {
  function clique(e) {
    if (!onClick) return
    const r = e.currentTarget.getBoundingClientRect()
    onClick({ cx: (e.clientX - r.left) / r.width, cy: (e.clientY - r.top) / r.height })
  }
  return (
    <div style={{ position: 'relative', cursor: onClick ? 'crosshair' : 'default' }} onClick={clique}>
      <img src={url} alt="Redação" style={{ width: '100%', display: 'block' }} />
      {marcacoes.map((m) => {
        const crit = critDe(m.categoria)
        const cor = CRITERIOS[(crit ?? 1) - 1].cor
        return (
          <span key={m.id ?? m.tmp} title={m.categoria}
            style={{ position: 'absolute', left: `${m.dados.cx * 100}%`, top: `${m.dados.cy * 100}%`, width: 22, height: 22,
              marginLeft: -11, marginTop: -11, border: `2px solid ${cor}`, borderRadius: '50%', color: cor,
              fontSize: 12, fontWeight: 700, display: 'grid', placeItems: 'center', background: '#fff8' }}>{crit}</span>
        )
      })}
    </div>
  )
}
