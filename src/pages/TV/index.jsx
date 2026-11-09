import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { vendedoresDasVendas } from '../../config/roles'

const MEDAL = [
  {
    pos: 'oklch(0.80 0.19 85)',
    bg: 'oklch(0.78 0.19 85 / 0.10)',
    border: 'oklch(0.78 0.19 85 / 0.28)',
    bar: 'linear-gradient(90deg, oklch(0.55 0.18 85), oklch(0.80 0.22 85))',
    barGlow: '0 0 14px oklch(0.72 0.2 85 / 0.55)',
    cardGlow: '0 0 48px oklch(0.72 0.18 85 / 0.16)',
  },
  {
    pos: 'oklch(0.73 0.03 220)',
    bg: 'oklch(0.67 0.02 220 / 0.08)',
    border: 'oklch(0.67 0.02 220 / 0.22)',
    bar: 'linear-gradient(90deg, oklch(0.45 0.05 220), oklch(0.68 0.05 220))',
    barGlow: '0 0 10px oklch(0.65 0.04 220 / 0.4)',
    cardGlow: 'none',
  },
  {
    pos: 'oklch(0.65 0.12 50)',
    bg: 'oklch(0.60 0.12 50 / 0.08)',
    border: 'oklch(0.60 0.12 50 / 0.22)',
    bar: 'linear-gradient(90deg, oklch(0.42 0.10 50), oklch(0.65 0.14 50))',
    barGlow: '0 0 10px oklch(0.60 0.12 50 / 0.4)',
    cardGlow: 'none',
  },
]

export default function TV() {
  const [vendas, setVendas] = useState([])
  const [agora, setAgora] = useState(new Date())
  const [barrasAnimadas, setBarrasAnimadas] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'vendas'), orderBy('criadoEm', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setVendas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setBarrasAnimadas(true), 120)
    return () => clearTimeout(t)
  }, [])

  const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-${String(agora.getDate()).padStart(2, '0')}`

  const vendasHoje = vendas.filter(v => {
    if (!v.criadoEm) return false
    const d = v.criadoEm.toDate()
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return dStr === hojeStr
  })

  const ranking = vendedoresDasVendas(vendas)
    .map(({ email, nome }) => ({
      email,
      nome,
      qtd: vendasHoje.filter(v => v.vendedorEmail?.toLowerCase() === email.toLowerCase()).length,
    }))
    .sort((a, b) => b.qtd - a.qtd)

  const maxQtd = Math.max(1, ranking[0]?.qtd || 1)

  const dataFormatada = agora.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())
  const horaFormatada = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div style={{
      minHeight: '100vh',
      background: 'oklch(0.12 0.02 150)',
      color: 'white',
      fontFamily: "'Poppins', sans-serif",
      display: 'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 52px',
        background: 'oklch(0.10 0.015 150)',
        borderBottom: '1px solid oklch(1 0 0 / 0.07)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <img src="/logo.svg" alt="AmoSales" style={{ height: '42px', objectFit: 'contain' }} />
          <div style={{ width: '1px', height: '36px', background: 'oklch(1 0 0 / 0.10)' }} />
          <div>
            <p style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'oklch(0.60 0.18 150)',
              marginBottom: '3px',
            }}>
              Modo TV
            </p>
            <h1 style={{
              fontSize: '26px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
              color: 'white',
              lineHeight: 1,
            }}>
              Ranking do Dia
            </h1>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <p style={{
            fontSize: '38px',
            fontWeight: 700,
            letterSpacing: '0.03em',
            color: 'white',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {horaFormatada}
          </p>
          <p style={{
            fontSize: '13px',
            color: 'oklch(0.52 0 0)',
            marginTop: '5px',
            textTransform: 'capitalize',
            letterSpacing: '0.01em',
          }}>
            {dataFormatada}
          </p>
        </div>
      </div>

      {/* Ranking */}
      <div style={{
        flex: 1,
        padding: '40px 52px 52px',
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        boxSizing: 'border-box',
      }}>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {ranking.map(({ email, nome, qtd }, i) => {
            const medal = i < 3 ? MEDAL[i] : null
            const pct = barrasAnimadas ? (qtd / maxQtd) * 100 : 0

            return (
              <div
                key={email}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '28px',
                  padding: '22px 32px',
                  borderRadius: '20px',
                  background: medal ? medal.bg : 'oklch(0.16 0.018 150)',
                  border: `1px solid ${medal ? medal.border : 'oklch(1 0 0 / 0.06)'}`,
                  boxShadow: medal ? medal.cardGlow : 'none',
                  animation: 'slideDown 0.4s ease forwards',
                  opacity: 0,
                  animationDelay: `${i * 0.06}s`,
                  animationFillMode: 'forwards',
                }}
              >
                {/* Posição */}
                <div style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 900,
                  flexShrink: 0,
                  color: medal ? medal.pos : 'oklch(0.38 0 0)',
                  background: medal ? medal.bg : 'oklch(0.20 0.018 150)',
                  border: `1px solid ${medal ? medal.border : 'oklch(1 0 0 / 0.07)'}`,
                  letterSpacing: '-0.01em',
                }}>
                  {i + 1}º
                </div>

                {/* Avatar */}
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=1a2e1a&color=4ade80&size=112&bold=true&format=png`}
                  alt={nome}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    border: medal ? `2px solid ${medal.border}` : '2px solid oklch(1 0 0 / 0.08)',
                  }}
                />

                {/* Nome + barra */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'white',
                    marginBottom: '12px',
                    lineHeight: 1,
                    letterSpacing: '-0.01em',
                  }}>
                    {nome}
                  </p>
                  <div style={{
                    height: '10px',
                    borderRadius: '9999px',
                    background: 'oklch(0.22 0.02 150)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      borderRadius: '9999px',
                      width: `${pct}%`,
                      background: medal
                        ? medal.bar
                        : 'linear-gradient(90deg, oklch(0.35 0.12 150), oklch(0.55 0.18 150))',
                      boxShadow: medal ? medal.barGlow : '0 0 8px oklch(0.5 0.16 150 / 0.35)',
                      transition: 'width 1.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }} />
                  </div>
                </div>

                {/* Contagem */}
                <div style={{ textAlign: 'right', flexShrink: 0, minWidth: '96px' }}>
                  <span style={{
                    display: 'block',
                    fontSize: '64px',
                    fontWeight: 900,
                    lineHeight: 1,
                    color: medal ? medal.pos : 'oklch(0.42 0 0)',
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.03em',
                  }}>
                    {qtd}
                  </span>
                  <span style={{
                    fontSize: '13px',
                    color: 'oklch(0.45 0 0)',
                    fontWeight: 500,
                    letterSpacing: '0.01em',
                  }}>
                    {qtd === 1 ? 'venda' : 'vendas'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {vendasHoje.length === 0 && (
          <div style={{
            textAlign: 'center',
            paddingTop: '80px',
            color: 'oklch(0.38 0 0)',
          }}>
            <p style={{ fontSize: '18px', fontWeight: 600 }}>Nenhuma venda registrada hoje ainda</p>
            <p style={{ fontSize: '14px', marginTop: '8px', color: 'oklch(0.32 0 0)' }}>O ranking será atualizado assim que a primeira venda for registrada</p>
          </div>
        )}
      </div>
    </div>
  )
}
