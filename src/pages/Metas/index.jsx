import { useState, useEffect, useRef } from 'react'
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import confetti from 'canvas-confetti'
import { isGestorOuAdmin, vendedoresDasVendas } from '../../config/roles'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function getMesAtual() {
  const hoje = new Date()
  const ref = hoje.getDate() >= 25
    ? new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    : hoje
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
}

function getPeriodoParaMes(mesStr) {
  const [ano, mes] = mesStr.split('-').map(Number)
  return {
    inicio: new Date(ano, mes - 2, 25),
    fim: new Date(ano, mes - 1, 24, 23, 59, 59),
  }
}

function formatarMes(mesStr) {
  const [ano, mes] = mesStr.split('-').map(Number)
  return `${MESES[mes - 1]} de ${ano}`
}

function navMes(mesStr, delta) {
  const [ano, mes] = mesStr.split('-').map(Number)
  const d = new Date(ano, mes - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const IconX = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const IconPlus = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const IconChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
)

const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
)

const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const IconTarget = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
)

const IconArrowUp = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 11 12 6 7 11"/>
    <line x1="12" y1="18" x2="12" y2="6"/>
  </svg>
)

const IconPencil = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const IconTrash = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
)

function dispararConfete() {
  confetti({
    particleCount: 130,
    spread: 72,
    origin: { y: 0.55 },
    colors: ['#4ade80', '#22c55e', '#16a34a', '#fbbf24', '#f59e0b', '#ffffff'],
  })
}

export default function Metas() {
  const { user, perfil } = useAuth()
  const isGestor = isGestorOuAdmin(perfil)

  const [abaAtiva, setAbaAtiva] = useState('vendas')

  // --- Estado de Vendas ---
  const [metas, setMetas] = useState([])
  const [vendas, setVendas] = useState([])
  const [mesAtivo, setMesAtivo] = useState(getMesAtual())
  const [rankingModo, setRankingModo] = useState('periodo')
  const [modalAberto, setModalAberto] = useState(false)
  const [modalExcluir, setModalExcluir] = useState(null)
  const [barrasAnimadasChave, setBarrasAnimadasChave] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [formMeta, setFormMeta] = useState({ metaQtd: '', mes: getMesAtual() })
  const confettiFiredRef = useRef(new Set())

  // --- Estado de Upgrades ---
  const [metasUpgrade, setMetasUpgrade] = useState([])
  const [mesAtivoUpgrade, setMesAtivoUpgrade] = useState(getMesAtual())
  const [modalUpgradeAberto, setModalUpgradeAberto] = useState(false)
  const [modalUpgradeExcluir, setModalUpgradeExcluir] = useState(null)
  const [barrasUpgradeAnimadasChave, setBarrasUpgradeAnimadasChave] = useState(null)
  const [salvandoUpgrade, setSalvandoUpgrade] = useState(false)
  const [excluindoUpgrade, setExcluindoUpgrade] = useState(false)
  const [formMetaUpgrade, setFormMetaUpgrade] = useState({ metaQtd: '', mes: getMesAtual() })
  const confettiUpgradeFiredRef = useRef(new Set())

  useEffect(() => {
    const unsubMetas = onSnapshot(collection(db, 'metas'), snap => {
      setMetas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    const unsubMetasUpgrade = onSnapshot(collection(db, 'metas_upgrade'), snap => {
      setMetasUpgrade(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    const q = query(collection(db, 'vendas'), orderBy('criadoEm', 'desc'))
    const unsubVendas = onSnapshot(q, snap => {
      setVendas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsubMetas(); unsubMetasUpgrade(); unsubVendas() }
  }, [])

  // As barras só animam 80ms depois que (mês, qtd. de metas) muda: a flag é derivada da chave
  const chaveBarras = `${mesAtivo}|${metas.length}`
  const barrasAnimadas = barrasAnimadasChave === chaveBarras
  useEffect(() => {
    const t = setTimeout(() => setBarrasAnimadasChave(chaveBarras), 80)
    return () => clearTimeout(t)
  }, [chaveBarras])

  const chaveBarrasUpgrade = `${mesAtivoUpgrade}|${metasUpgrade.length}`
  const barrasUpgradeAnimadas = barrasUpgradeAnimadasChave === chaveBarrasUpgrade
  useEffect(() => {
    const t = setTimeout(() => setBarrasUpgradeAnimadasChave(chaveBarrasUpgrade), 80)
    return () => clearTimeout(t)
  }, [chaveBarrasUpgrade])

  // --- Helpers de Vendas ---
  const { inicio, fim } = getPeriodoParaMes(mesAtivo)
  const periodoLabel = `${inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} → ${fim.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`

  const contarVendasVendedor = (email) =>
    vendas.filter(v => {
      if (!v.criadoEm || v.vendedorEmail?.toLowerCase() !== email.toLowerCase()) return false
      if (v.tipo === 'upgrade') return false
      const d = v.criadoEm.toDate()
      return d >= inicio && d <= fim
    }).length

  const totalVendasSetor = vendas.filter(v => {
    if (!v.criadoEm || v.tipo === 'upgrade') return false
    const d = v.criadoEm.toDate()
    return d >= inicio && d <= fim
  }).length
  const metaSetor = metas.find(m => m.id === `setor__${mesAtivo}`)
  const metaVendasQtd = metaSetor?.metaQtd || 0

  useEffect(() => {
    if (!metaVendasQtd) return
    const key = `vendas__${mesAtivo}`
    if (totalVendasSetor >= metaVendasQtd && !confettiFiredRef.current.has(key)) {
      confettiFiredRef.current.add(key)
      dispararConfete()
    }
  }, [totalVendasSetor, metaVendasQtd, mesAtivo])

  // --- Helpers de Upgrades ---
  const { inicio: inicioUpg, fim: fimUpg } = getPeriodoParaMes(mesAtivoUpgrade)
  const periodoUpgradeLabel = `${inicioUpg.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} → ${fimUpg.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`

  const contarUpgradesVendedor = (email) =>
    vendas.filter(v => {
      if (!v.criadoEm || v.vendedorEmail?.toLowerCase() !== email.toLowerCase()) return false
      if (v.tipo !== 'upgrade') return false
      const d = v.criadoEm.toDate()
      return d >= inicioUpg && d <= fimUpg
    }).length

  const totalUpgradesSetor = vendas.filter(v => {
    if (!v.criadoEm || v.tipo !== 'upgrade') return false
    const d = v.criadoEm.toDate()
    return d >= inicioUpg && d <= fimUpg
  }).length
  const metaSetorUpg = metasUpgrade.find(m => m.id === `setor__${mesAtivoUpgrade}`)
  const metaUpgradesQtd = metaSetorUpg?.metaQtd || 0

  useEffect(() => {
    if (!metaUpgradesQtd) return
    const key = `upg__${mesAtivoUpgrade}`
    if (totalUpgradesSetor >= metaUpgradesQtd && !confettiUpgradeFiredRef.current.has(key)) {
      confettiUpgradeFiredRef.current.add(key)
      dispararConfete()
    }
  }, [totalUpgradesSetor, metaUpgradesQtd, mesAtivoUpgrade])

  // --- Ranking ---
  const hoje = new Date()
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`

  const totalEquipeHoje = vendas.filter(v => {
    if (!v.criadoEm) return false
    const d = v.criadoEm.toDate()
    const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    return dStr === hojeStr
  }).length

  const contarVendasVendedorHoje = (email) =>
    vendas.filter(v => {
      if (!v.criadoEm || v.vendedorEmail?.toLowerCase() !== email.toLowerCase()) return false
      if (v.tipo === 'upgrade') return false
      const d = v.criadoEm.toDate()
      const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      return dStr === hojeStr
    }).length

  const ranking = vendedoresDasVendas(vendas.filter(v => v.tipo !== 'upgrade'))
    .map(({ email, nome }) => ({
      email,
      nome,
      qtd: rankingModo === 'hoje' ? contarVendasVendedorHoje(email) : contarVendasVendedor(email),
    }))
    .sort((a, b) => b.qtd - a.qtd)

  const rankingUpgrades = vendedoresDasVendas(vendas.filter(v => v.tipo === 'upgrade'))
    .map(({ email, nome }) => ({
      email,
      nome,
      qtd: contarUpgradesVendedor(email),
    }))
    .sort((a, b) => b.qtd - a.qtd)

  // --- Handlers de Vendas ---
  const abrirModal = () => {
    setFormMeta({ metaQtd: metaVendasQtd ? String(metaVendasQtd) : '', mes: mesAtivo })
    setModalAberto(true)
  }

  const handleSalvar = async () => {
    if (!formMeta.metaQtd || !formMeta.mes) return
    setSalvando(true)
    try {
      await setDoc(doc(db, 'metas', `setor__${formMeta.mes}`), {
        tipo: 'setor',
        metaQtd: Number(formMeta.metaQtd),
        mes: formMeta.mes,
        criadoEm: serverTimestamp(),
      })
      setMesAtivo(formMeta.mes)
      setModalAberto(false)
    } catch {
      console.error('Erro ao salvar meta')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    setExcluindo(true)
    try {
      await deleteDoc(doc(db, 'metas', `setor__${mesAtivo}`))
      setModalExcluir(null)
    } catch {
      console.error('Erro ao excluir meta')
    } finally {
      setExcluindo(false)
    }
  }

  // --- Handlers de Upgrades ---
  const abrirModalUpgrade = () => {
    setFormMetaUpgrade({ metaQtd: metaUpgradesQtd ? String(metaUpgradesQtd) : '', mes: mesAtivoUpgrade })
    setModalUpgradeAberto(true)
  }

  const handleSalvarUpgrade = async () => {
    if (!formMetaUpgrade.metaQtd || !formMetaUpgrade.mes) return
    setSalvandoUpgrade(true)
    try {
      await setDoc(doc(db, 'metas_upgrade', `setor__${formMetaUpgrade.mes}`), {
        tipo: 'setor',
        metaQtd: Number(formMetaUpgrade.metaQtd),
        mes: formMetaUpgrade.mes,
        criadoEm: serverTimestamp(),
      })
      setMesAtivoUpgrade(formMetaUpgrade.mes)
      setModalUpgradeAberto(false)
    } catch {
      console.error('Erro ao salvar meta de upgrade')
    } finally {
      setSalvandoUpgrade(false)
    }
  }

  const handleExcluirUpgrade = async () => {
    setExcluindoUpgrade(true)
    try {
      await deleteDoc(doc(db, 'metas_upgrade', `setor__${mesAtivoUpgrade}`))
      setModalUpgradeExcluir(null)
    } catch {
      console.error('Erro ao excluir meta de upgrade')
    } finally {
      setExcluindoUpgrade(false)
    }
  }

  const mesesOptions = Array.from({ length: 9 }, (_, i) => {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - 5 + i)
    return {
      val: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: `${MESES[d.getMonth()]} de ${d.getFullYear()}`,
    }
  })

  const medalColors = [
    { text: 'oklch(0.72 0.18 85)', badgeBg: 'oklch(0.78 0.19 85 / 0.14)', rowBg: 'oklch(0.78 0.19 85 / 0.06)' },
    { text: 'oklch(0.67 0.03 220)', badgeBg: 'oklch(0.67 0.02 220 / 0.12)', rowBg: 'oklch(0.67 0.02 220 / 0.05)' },
    { text: 'oklch(0.59 0.12 50)', badgeBg: 'oklch(0.60 0.12 50 / 0.12)', rowBg: 'oklch(0.60 0.12 50 / 0.06)' },
  ]

  // Card de meta do setor com marcadores de 80% / 100% / 120%
  const renderMetaSetorCard = ({ hue, realizadas, meta, unidade, animar, onEditar, onExcluir }) => {
    const pctReal = (realizadas / meta) * 100
    const fillPct = Math.min(100, (pctReal / 120) * 100)
    const atingida = realizadas >= meta
    const excedente = realizadas - meta
    const corText = `oklch(0.6 0.2 ${hue})`
    const corStrong = `oklch(0.65 0.22 ${hue})`
    const marcos = [80, 100, 120]

    return (
      <div
        className="rounded-2xl border bg-base-100 max-w-xl mx-auto w-full"
        style={{
          animation: 'slideDown 0.4s ease forwards',
          padding: '32px',
          borderColor: atingida ? `oklch(0.55 0.2 ${hue} / 0.28)` : undefined,
          boxShadow: atingida
            ? `0 0 0 1px oklch(0.55 0.2 ${hue} / 0.08), 0 4px 24px oklch(0.5 0.18 ${hue} / 0.1)`
            : undefined,
        }}
      >
        <div className="flex items-start justify-between mb-5 gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-35 mb-1">Meta do Setor</p>
            <p className="text-sm opacity-45 font-medium">Objetivo: {meta} {unidade}{meta !== 1 ? 's' : ''}</p>
          </div>
          {atingida ? (
            <div
              className="flex items-center gap-1 px-2 py-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: `oklch(0.6 0.2 ${hue} / 0.12)`, border: `1px solid oklch(0.6 0.2 ${hue} / 0.3)`, color: corText }}
            >
              <IconCheck />
              <span className="text-xs font-bold">Atingida</span>
            </div>
          ) : (
            <span className="text-2xl font-black tabular-nums leading-none flex-shrink-0" style={{ color: corText }}>
              {pctReal.toFixed(0)}%
            </span>
          )}
        </div>

        <div className="flex items-baseline gap-2 mb-6">
          <span className="text-7xl font-black leading-none tabular-nums" style={{ color: atingida ? corStrong : undefined }}>
            {realizadas}
          </span>
          <div className="flex flex-col">
            <span className="opacity-25 font-semibold leading-none text-lg">/ {meta}</span>
            {atingida && excedente > 0 && (
              <span className="font-bold mt-0.5 text-sm" style={{ color: corText }}>+{excedente} acima</span>
            )}
          </div>
        </div>

        {/* Marcadores 80 / 100 / 120% */}
        <div className="relative h-9">
          {marcos.map((mc, idx) => {
            const left = (mc / 120) * 100
            const reached = pctReal >= mc
            const target = Math.round((meta * mc) / 100)
            const tx = idx === marcos.length - 1 ? '-100%' : idx === 0 ? '0%' : '-50%'
            return (
              <div key={mc} className="absolute bottom-0 flex flex-col items-center" style={{ left: `${left}%`, transform: `translateX(${tx})` }}>
                <span className="text-[11px] font-bold leading-none" style={{ color: reached ? corText : 'oklch(var(--bc) / 0.3)' }}>{mc}%</span>
                <span className="text-[11px] font-semibold tabular-nums leading-none mt-0.5" style={{ opacity: reached ? 0.65 : 0.3 }}>{target}</span>
                <div className="w-px h-2 mt-1" style={{ background: reached ? corText : 'oklch(var(--bc) / 0.18)' }} />
              </div>
            )
          })}
        </div>

        {/* Barra (escala até 120%) */}
        <div className="relative rounded-full bg-base-300 overflow-hidden h-3">
          {marcos.map(mc => (
            <div
              key={mc}
              className="absolute top-0 bottom-0 w-px z-10"
              style={{ left: `${(mc / 120) * 100}%`, transform: 'translateX(-0.5px)', background: 'oklch(var(--b1) / 0.55)' }}
            />
          ))}
          <div
            style={{
              height: '100%',
              borderRadius: '9999px',
              width: animar ? `${fillPct}%` : '0%',
              transition: 'width 1.1s cubic-bezier(0.4, 0, 0.2, 1)',
              background: atingida
                ? `linear-gradient(90deg, oklch(0.42 0.15 ${hue}), oklch(0.62 0.22 ${hue}), oklch(0.72 0.2 ${hue}))`
                : `linear-gradient(90deg, oklch(0.38 0.13 ${hue}), oklch(0.55 0.2 ${hue}))`,
              boxShadow: atingida
                ? `0 0 14px oklch(0.58 0.2 ${hue} / 0.6)`
                : `0 0 8px oklch(0.5 0.18 ${hue} / 0.35)`,
            }}
          />
        </div>

        <div className="flex items-center justify-between gap-2 mt-3">
          <p className="text-xs font-medium" style={atingida ? { color: corText } : { opacity: 0.35 }}>
            {atingida
              ? `Meta batida${excedente > 0 ? ` · +${excedente} acima do esperado` : ''}`
              : `Faltam ${meta - realizadas} ${unidade}${(meta - realizadas) !== 1 ? 's' : ''} · ${pctReal.toFixed(1)}%`}
          </p>
          {isGestor && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={onEditar}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-base-content/45 hover:text-base-content hover:bg-base-200 transition-all duration-150"
              >
                <IconPencil />
                Editar
              </button>
              <button
                onClick={onExcluir}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-base-content/45 hover:text-error hover:bg-error/10 transition-all duration-150"
              >
                <IconTrash />
                Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto w-full" style={{ animation: 'slideDown 0.4s ease forwards' }}>

      {/* Modal — criar/editar meta de vendas */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-sm mx-4 rounded-3xl border border-base-300 overflow-hidden"
            style={{
              animation: 'slideDown 0.3s ease forwards',
              backdropFilter: 'blur(20px)',
              backgroundColor: 'oklch(var(--b1) / 0.97)',
              boxShadow: '0 0 48px rgba(0,0,0,0.45)',
            }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
              <div>
                <h2 className="font-bold text-sm">Definir Meta do Setor</h2>
                <p className="text-xs opacity-35 mt-0.5">Cria ou substitui a meta de vendas do setor no mês</p>
              </div>
              <button
                onClick={() => setModalAberto(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-200 transition-all duration-200"
              >
                <IconX />
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold opacity-40 uppercase tracking-widest">Meta de vendas (qtd. do setor)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 20"
                  className="input input-bordered w-full rounded-2xl"
                  value={formMeta.metaQtd}
                  onChange={e => setFormMeta(f => ({ ...f, metaQtd: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold opacity-40 uppercase tracking-widest">Mês de referência</label>
                <select
                  className="select select-bordered w-full rounded-2xl"
                  value={formMeta.mes}
                  onChange={e => setFormMeta(f => ({ ...f, mes: e.target.value }))}
                >
                  {mesesOptions.map(({ val, label }) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button className="btn btn-ghost flex-1 rounded-xl" onClick={() => setModalAberto(false)} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary flex-1 rounded-xl" onClick={handleSalvar} disabled={salvando || !formMeta.metaQtd}>
                {salvando ? <span className="loading loading-spinner loading-xs" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — confirmar exclusão de venda */}
      {modalExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-sm mx-4 rounded-3xl border border-base-300 p-6"
            style={{
              animation: 'slideDown 0.3s ease forwards',
              backdropFilter: 'blur(20px)',
              backgroundColor: 'oklch(var(--b1) / 0.97)',
              boxShadow: '0 0 48px rgba(0,0,0,0.45)',
            }}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center text-error">
                <IconTrash size={22} />
              </div>
              <h2 className="text-lg font-bold">Excluir meta?</h2>
              <p className="text-sm opacity-50">
                A meta de vendas do setor para {formatarMes(mesAtivo)} será removida permanentemente.
              </p>
              <div className="flex gap-3 mt-2 w-full">
                <button className="btn btn-ghost flex-1 rounded-xl" onClick={() => setModalExcluir(null)} disabled={excluindo}>Cancelar</button>
                <button className="btn btn-error flex-1 rounded-xl" onClick={handleExcluir} disabled={excluindo}>
                  {excluindo ? <span className="loading loading-spinner loading-xs" /> : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal — criar/editar meta de upgrade */}
      {modalUpgradeAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-sm mx-4 rounded-3xl border border-base-300 overflow-hidden"
            style={{
              animation: 'slideDown 0.3s ease forwards',
              backdropFilter: 'blur(20px)',
              backgroundColor: 'oklch(var(--b1) / 0.97)',
              boxShadow: '0 0 48px rgba(0,0,0,0.45)',
            }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
              <div>
                <h2 className="font-bold text-sm">Definir Meta de Upgrade do Setor</h2>
                <p className="text-xs opacity-35 mt-0.5">Cria ou substitui a meta de upgrade do setor no mês</p>
              </div>
              <button
                onClick={() => setModalUpgradeAberto(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-200 transition-all duration-200"
              >
                <IconX />
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold opacity-40 uppercase tracking-widest">Meta de upgrades (qtd. do setor)</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 10"
                  className="input input-bordered w-full rounded-2xl"
                  value={formMetaUpgrade.metaQtd}
                  onChange={e => setFormMetaUpgrade(f => ({ ...f, metaQtd: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold opacity-40 uppercase tracking-widest">Mês de referência</label>
                <select
                  className="select select-bordered w-full rounded-2xl"
                  value={formMetaUpgrade.mes}
                  onChange={e => setFormMetaUpgrade(f => ({ ...f, mes: e.target.value }))}
                >
                  {mesesOptions.map(({ val, label }) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button className="btn btn-ghost flex-1 rounded-xl" onClick={() => setModalUpgradeAberto(false)} disabled={salvandoUpgrade}>Cancelar</button>
              <button className="btn btn-primary flex-1 rounded-xl" onClick={handleSalvarUpgrade} disabled={salvandoUpgrade || !formMetaUpgrade.metaQtd}>
                {salvandoUpgrade ? <span className="loading loading-spinner loading-xs" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — confirmar exclusão de upgrade */}
      {modalUpgradeExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-sm mx-4 rounded-3xl border border-base-300 p-6"
            style={{
              animation: 'slideDown 0.3s ease forwards',
              backdropFilter: 'blur(20px)',
              backgroundColor: 'oklch(var(--b1) / 0.97)',
              boxShadow: '0 0 48px rgba(0,0,0,0.45)',
            }}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center text-error">
                <IconTrash size={22} />
              </div>
              <h2 className="text-lg font-bold">Excluir meta de upgrade?</h2>
              <p className="text-sm opacity-50">
                A meta de upgrade do setor para {formatarMes(mesAtivoUpgrade)} será removida permanentemente.
              </p>
              <div className="flex gap-3 mt-2 w-full">
                <button className="btn btn-ghost flex-1 rounded-xl" onClick={() => setModalUpgradeExcluir(null)} disabled={excluindoUpgrade}>Cancelar</button>
                <button className="btn btn-error flex-1 rounded-xl" onClick={handleExcluirUpgrade} disabled={excluindoUpgrade}>
                  {excluindoUpgrade ? <span className="loading loading-spinner loading-xs" /> : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest opacity-35 mb-1">Metas</p>
            <h1 className="text-2xl font-bold">Metas Mensais</h1>
            <div className="flex items-center gap-2.5 mt-1">
              <p className="text-xs opacity-40 font-medium">
                {abaAtiva === 'vendas' ? periodoLabel : periodoUpgradeLabel}
              </p>
              {totalEquipeHoje > 0 && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0" style={{ animation: 'pulse 2s infinite' }} />
                  <span className="text-xs font-semibold text-success">{totalEquipeHoje} venda{totalEquipeHoje !== 1 ? 's' : ''} hoje</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Navegação de mês */}
            <div className="flex items-center rounded-2xl border border-base-300 bg-base-100 overflow-hidden">
              <button
                onClick={() => abaAtiva === 'vendas' ? setMesAtivo(navMes(mesAtivo, -1)) : setMesAtivoUpgrade(navMes(mesAtivoUpgrade, -1))}
                className="w-9 h-9 flex items-center justify-center text-base-content/35 hover:text-base-content hover:bg-base-200 transition-all duration-150"
              >
                <IconChevronLeft />
              </button>
              <span className="text-sm font-semibold px-2 min-w-[148px] text-center">
                {abaAtiva === 'vendas' ? formatarMes(mesAtivo) : formatarMes(mesAtivoUpgrade)}
              </span>
              <button
                onClick={() => abaAtiva === 'vendas' ? setMesAtivo(navMes(mesAtivo, 1)) : setMesAtivoUpgrade(navMes(mesAtivoUpgrade, 1))}
                className="w-9 h-9 flex items-center justify-center text-base-content/35 hover:text-base-content hover:bg-base-200 transition-all duration-150"
              >
                <IconChevronRight />
              </button>
            </div>

            {isGestor && abaAtiva === 'vendas' && (
              <button
                onClick={abrirModal}
                className="flex items-center gap-1.5 px-3 h-9 rounded-2xl bg-primary text-primary-content text-xs font-semibold hover:opacity-90 active:scale-95 transition-all duration-200"
              >
                <IconPlus />
                Nova Meta
              </button>
            )}

            {isGestor && abaAtiva === 'upgrades' && (
              <button
                onClick={abrirModalUpgrade}
                className="flex items-center gap-1.5 px-3 h-9 rounded-2xl bg-primary text-primary-content text-xs font-semibold hover:opacity-90 active:scale-95 transition-all duration-200"
              >
                <IconPlus />
                Nova Meta de Upgrade
              </button>
            )}
          </div>
        </div>

        {/* Toggle Vendas / Upgrades */}
        <div className="flex items-center gap-1 p-1 rounded-2xl border border-base-300 bg-base-100 w-fit">
          {[
            { valor: 'vendas', label: 'Vendas' },
            { valor: 'upgrades', label: 'Upgrades' },
          ].map(({ valor, label }) => (
            <button
              key={valor}
              onClick={() => setAbaAtiva(valor)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                abaAtiva === valor
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-base-content/45 hover:text-base-content hover:bg-base-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ===== ABA VENDAS ===== */}
      {abaAtiva === 'vendas' && (
        <>
          {!metaVendasQtd ? (
            <div className="rounded-2xl border border-base-300 bg-base-100 py-20 flex flex-col items-center gap-3">
              <div className="opacity-20"><IconTarget /></div>
              <div className="text-center opacity-25">
                <p className="text-sm font-semibold">Nenhuma meta do setor para {formatarMes(mesAtivo)}</p>
                {isGestor && <p className="text-xs mt-0.5">Clique em "Nova Meta" para definir</p>}
              </div>
            </div>
          ) : (
            renderMetaSetorCard({
              hue: 150,
              realizadas: totalVendasSetor,
              meta: metaVendasQtd,
              unidade: 'venda',
              animar: barrasAnimadas,
              onEditar: abrirModal,
              onExcluir: () => setModalExcluir(true),
            })
          )}

          {/* Ranking de Vendedores */}
          <div className="mt-8 rounded-2xl border border-base-300 bg-base-100 overflow-hidden" style={{ animation: 'slideDown 0.5s ease forwards' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest opacity-35 mb-0.5">Ranking</p>
                <h2 className="text-sm font-bold">Ranking de Vendedores</h2>
              </div>
              <div className="flex items-center gap-1.5">
                {[
                  { valor: 'periodo', label: 'Período' },
                  { valor: 'hoje', label: 'Hoje' },
                ].map(({ valor, label }) => (
                  <button
                    key={valor}
                    onClick={() => setRankingModo(valor)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      rankingModo === valor
                        ? 'bg-primary text-primary-content shadow-sm'
                        : 'bg-base-200 text-base-content/55 hover:bg-base-300 hover:text-base-content'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              {ranking.map(({ email, nome, qtd }, i) => {
                const isMe = email.toLowerCase() === user?.email?.toLowerCase()
                const medal = i < 3 ? medalColors[i] : null
                return (
                  <div
                    key={email}
                    className={`flex items-center gap-3.5 px-5 py-3 border-b border-base-300/50 last:border-0 transition-colors duration-150${!medal && isMe ? ' bg-base-200/60' : ''}`}
                    style={medal ? { backgroundColor: medal.rowBg } : undefined}
                  >
                    <div
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black flex-shrink-0"
                      style={medal ? { backgroundColor: medal.badgeBg, color: medal.text } : { color: 'oklch(var(--bc) / 0.22)' }}
                    >
                      {i + 1}º
                    </div>
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=1a2e1a&color=4ade80&size=40&bold=true&format=png`}
                      alt={nome}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <span className="flex-1 text-sm font-semibold">
                      {nome}
                      {isMe && <span className="ml-1.5 text-xs font-medium opacity-35">você</span>}
                    </span>
                    <div className="flex items-baseline gap-1 flex-shrink-0">
                      <span className="text-sm font-black tabular-nums" style={medal ? { color: medal.text } : undefined}>{qtd}</span>
                      <span className="text-xs font-medium opacity-30">{qtd === 1 ? 'venda' : 'vendas'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ===== ABA UPGRADES ===== */}
      {abaAtiva === 'upgrades' && (
        <>
          {!metaUpgradesQtd ? (
            <div className="rounded-2xl border border-base-300 bg-base-100 py-20 flex flex-col items-center gap-3">
              <div className="opacity-20"><IconArrowUp /></div>
              <div className="text-center opacity-25">
                <p className="text-sm font-semibold">Nenhuma meta de upgrade do setor para {formatarMes(mesAtivoUpgrade)}</p>
                {isGestor && <p className="text-xs mt-0.5">Clique em "Nova Meta de Upgrade" para definir</p>}
              </div>
            </div>
          ) : (
            renderMetaSetorCard({
              hue: 240,
              realizadas: totalUpgradesSetor,
              meta: metaUpgradesQtd,
              unidade: 'upgrade',
              animar: barrasUpgradeAnimadas,
              onEditar: abrirModalUpgrade,
              onExcluir: () => setModalUpgradeExcluir(true),
            })
          )}

          {/* Ranking de Upgrades */}
          <div className="mt-8 rounded-2xl border border-base-300 bg-base-100 overflow-hidden" style={{ animation: 'slideDown 0.5s ease forwards' }}>
            <div className="px-5 py-4 border-b border-base-300">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-35 mb-0.5">Ranking</p>
              <h2 className="text-sm font-bold">Ranking de Upgrades</h2>
              <p className="text-xs opacity-35 mt-0.5 font-medium">{periodoUpgradeLabel}</p>
            </div>
            <div>
              {rankingUpgrades.slice(0, 2).map(({ email, nome, qtd }, i) => {
                const isMe = email.toLowerCase() === user?.email?.toLowerCase()
                return (
                  <div
                    key={email}
                    className={`flex items-center gap-3.5 px-5 py-3 border-b border-base-300/50 last:border-0 transition-colors duration-150${isMe ? ' bg-base-200/60' : ''}`}
                  >
                    <div
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-black flex-shrink-0"
                      style={{ color: 'oklch(var(--bc) / 0.22)' }}
                    >
                      {i + 1}º
                    </div>
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=1a1a2e&color=60a5fa&size=40&bold=true&format=png`}
                      alt={nome}
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <span className="flex-1 text-sm font-semibold">
                      {nome}
                      {isMe && <span className="ml-1.5 text-xs font-medium opacity-35">você</span>}
                    </span>
                    <div className="flex items-baseline gap-1 flex-shrink-0">
                      <span className="text-sm font-black tabular-nums">{qtd}</span>
                      <span className="text-xs font-medium opacity-30">{qtd === 1 ? 'upgrade' : 'upgrades'}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
