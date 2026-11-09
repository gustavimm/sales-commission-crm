import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { isGestorOuAdmin, vendedoresDasVendas } from '../../config/roles'
import { COMISSAO_CONFIG } from '../../config/comissao'

const TABELA_COMISSAO = [
  { min: 0, max: Infinity, label: 'Todos os planos', rates: { BRONZE: COMISSAO_CONFIG.percentualVendaInstalada, PRATA: COMISSAO_CONFIG.percentualVendaInstalada, OURO: COMISSAO_CONFIG.percentualVendaInstalada, DIAMANTE: COMISSAO_CONFIG.percentualVendaInstalada, BLACK: COMISSAO_CONFIG.percentualVendaInstalada } },
]

const CATEGORIA_CONFIG = {
  BRONZE:   { gradient: 'linear-gradient(135deg, #78350f, #b45309)', color: '#f59e0b', shadow: '0 0 50px rgba(180,83,9,0.2)' },
  PRATA:    { gradient: 'linear-gradient(135deg, #374151, #6b7280)', color: '#d1d5db', shadow: '0 0 50px rgba(107,114,128,0.15)' },
  OURO:     { gradient: 'linear-gradient(135deg, #713f12, #ca8a04)', color: '#fbbf24', shadow: '0 0 50px rgba(202,138,4,0.25)' },
  DIAMANTE: { gradient: 'linear-gradient(135deg, #164e63, #0891b2)', color: '#22d3ee', shadow: '0 0 50px rgba(8,145,178,0.25)' },
  BLACK:    { gradient: 'linear-gradient(135deg, #1e1b4b, #5b21b6)', color: '#a78bfa', shadow: '0 0 50px rgba(139,92,246,0.3)' },
}

const CAT_MIN = { BRONZE: 0, PRATA: COMISSAO_CONFIG.metaMensal, OURO: COMISSAO_CONFIG.metaMensal, DIAMANTE: COMISSAO_CONFIG.metaMensal, BLACK: COMISSAO_CONFIG.metaMensal }

// Tabela de comissão de UPGRADE PADRÃO: faixa pela QUANTIDADE de upgrades padrão no período;
// o % resultante incide sobre o montante completo (soma das diferenças). Migração é 50% à parte.
const TABELA_UPGRADE = [{ min: 0, max: Infinity, pct: COMISSAO_CONFIG.percentualUpgrade, label: 'Regra demo' }]
const UPGRADE_MINIMO = 0
const UPGRADE_META = COMISSAO_CONFIG.metaMensal
const PCT_MIGRACAO = COMISSAO_CONFIG.percentualUpgrade

function getFaixaUpgrade(qtd) {
  return TABELA_UPGRADE.find(t => qtd >= t.min && qtd <= t.max) || TABELA_UPGRADE[0]
}

function getPeriodoAtual() {
  const hoje = new Date()
  const dia = hoje.getDate()
  const mes = hoje.getMonth()
  const ano = hoje.getFullYear()
  let inicio, fim
  if (dia >= 25) {
    inicio = new Date(ano, mes, 25)
    fim = new Date(ano, mes + 1, 24, 23, 59, 59)
  } else {
    inicio = new Date(ano, mes - 1, 25)
    fim = new Date(ano, mes, 24, 23, 59, 59)
  }
  return { inicio, fim }
}

function getCategoria(qtd) {
  return qtd >= COMISSAO_CONFIG.metaMensal ? 'OURO' : 'BRONZE'
}

function getProximaCategoria(qtd) {
  return qtd >= COMISSAO_CONFIG.metaMensal ? null : { nome: 'OURO', min: COMISSAO_CONFIG.metaMensal }
}

function getPercentualComissao(valor, categoria) {
  if (!categoria) return 0
  const v = Number(valor)
  const faixa = TABELA_COMISSAO.find(f => v >= f.min && (f.max === Infinity || v <= f.max))
  return faixa ? (faixa.rates[categoria] ?? 0) : 0
}

function getFaixaLabel(valor) {
  const v = Number(valor)
  const faixa = TABELA_COMISSAO.find(f => v >= f.min && (f.max === Infinity || v <= f.max))
  return faixa ? faixa.label : '—'
}

function brl(v) {
  return `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

const IconDollar = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)

const IconTrophy = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
)

const IconArrowUp = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
)

const IconLayers = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
    <polyline points="2 17 12 22 22 17"/>
    <polyline points="2 12 12 17 22 12"/>
  </svg>
)

const IconInbox = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
)

export default function Comissao() {
  const { user, perfil } = useAuth()
  const isGestor = isGestorOuAdmin(perfil)
  const isUpgradeSeller = perfil?.role === 'vendedor'

  const [vendas, setVendas] = useState([])
  const [modo, setModo] = useState(isGestor ? 'plano' : (isUpgradeSeller ? 'upgrade' : 'plano'))
  const [vendedorPlano, setVendedorPlano] = useState(() => {
    return user?.email?.toLowerCase()
  })
  const [vendedorUpgrade, setVendedorUpgrade] = useState(() => {
    return user?.email?.toLowerCase()
  })

  const { inicio, fim } = getPeriodoAtual()

  useEffect(() => {
    const q = query(collection(db, 'vendas'), orderBy('criadoEm', 'desc'))
    return onSnapshot(q, snap => {
      setVendas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  const emailAlvo = isGestor
    ? (modo === 'upgrade' ? vendedorUpgrade : vendedorPlano)
    : user?.email?.toLowerCase()

  const noPeriodo = (v) => {
    if (!v.criadoEm) return false
    if (v.vendedorEmail?.toLowerCase() !== emailAlvo) return false
    const dt = v.criadoEm.toDate()
    return dt >= inicio && dt <= fim
  }

  // ===================== PLANO =====================
  const vendasDoMes = vendas.filter(v => noPeriodo(v) && v.tipo !== 'upgrade')
  const qtdVendas = vendasDoMes.length
  const categoria = getCategoria(qtdVendas)
  const proximaCat = getProximaCategoria(qtdVendas)
  const catConfig = categoria ? CATEGORIA_CONFIG[categoria] : null

  const vendasComComissao = vendasDoMes.map(v => {
    const bonusMeta = qtdVendas >= COMISSAO_CONFIG.metaMensal ? COMISSAO_CONFIG.percentualBonusMetaMensal : 0
    const pct = getPercentualComissao(Number(v.valor), categoria) + bonusMeta
    const comissao = Number(v.valor) * pct / 100
    return { ...v, pct, comissao, faixaLabel: getFaixaLabel(Number(v.valor)) }
  })
  const totalComissao = vendasComComissao.reduce((acc, v) => acc + v.comissao, 0)

  const catAtualMin = categoria ? (CAT_MIN[categoria] ?? 0) : 0
  const proxLimite = proximaCat ? proximaCat.min : null
  const progressPct = proxLimite
    ? Math.min(100, ((qtdVendas - catAtualMin) / (proxLimite - catAtualMin)) * 100)
    : 100

  // ===================== UPGRADE =====================
  const getDif = (v) => v.diferenca != null
    ? Number(v.diferenca)
    : (Number(v.valor || 0) - Number(v.valorAnterior || 0))

  const upgradesDoMes = vendas.filter(v => noPeriodo(v) && v.tipo === 'upgrade' && v.statusUpgrade !== 'cancelado')
  const upgradesPadrao = upgradesDoMes.filter(v => (v.categoriaUpgrade || 'padrao') === 'padrao')
  const migracoes = upgradesDoMes.filter(v => v.categoriaUpgrade === 'tecnologia')

  const qtdPadrao = upgradesPadrao.length
  const financeiroGerado = upgradesPadrao.reduce((a, v) => a + getDif(v), 0)
  const faixaUpg = getFaixaUpgrade(qtdPadrao)
  const comissaoUpgrade = financeiroGerado * faixaUpg.pct / 100

  const financeiroMigracao = migracoes.reduce((a, v) => a + getDif(v), 0)
  const comissaoMigracao = financeiroMigracao * PCT_MIGRACAO / 100

  const comissaoTotalUpg = comissaoUpgrade + comissaoMigracao

  const proxFaixaUpg = TABELA_UPGRADE.find(t => t.min > qtdPadrao) || null
  const faltamProxFaixa = proxFaixaUpg ? proxFaixaUpg.min - qtdPadrao : 0

  const nomeAlvo = vendas.find(v => v.vendedorEmail?.toLowerCase() === emailAlvo)?.vendedorNome
    || emailAlvo?.split('@')[0] || 'Vendedor'

  const listaVendedores = vendedoresDasVendas(
    modo === 'upgrade' ? vendas.filter(v => v.tipo === 'upgrade') : vendas.filter(v => v.tipo !== 'upgrade')
  )
  const vendedorSelecionado = modo === 'upgrade' ? vendedorUpgrade : vendedorPlano
  const setVendedorSelecionado = modo === 'upgrade' ? setVendedorUpgrade : setVendedorPlano

  return (
    <div className="p-6 max-w-6xl mx-auto w-full" style={{ animation: 'slideDown 0.4s ease forwards' }}>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-35 mb-1">Financeiro</p>
          <h1 className="text-2xl font-bold">Calculadora de Comissão</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs opacity-40 font-medium">Período de apuração (25 → 24)</span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-base-200 tabular-nums">
              {inicio.toLocaleDateString('pt-BR')} → {fim.toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
        {isGestor && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <label className="text-xs font-semibold uppercase tracking-wider opacity-40 whitespace-nowrap">Vendedor</label>
            <select
              className="select select-bordered select-sm rounded-xl text-sm"
              value={vendedorSelecionado}
              onChange={e => setVendedorSelecionado(e.target.value)}
            >
              {listaVendedores.map(({ email, nome }) => (
                <option key={email} value={email}>{nome}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Toggle Plano / Upgrade — apenas gestor */}
      {isGestor && (
        <div className="flex items-center gap-1 p-1 rounded-2xl border border-base-300 bg-base-100 w-fit mb-6">
          {[
            { valor: 'plano', label: 'Plano' },
            { valor: 'upgrade', label: 'Upgrade' },
          ].map(({ valor, label }) => (
            <button
              key={valor}
              onClick={() => setModo(valor)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                modo === valor
                  ? 'bg-primary text-primary-content shadow-sm'
                  : 'text-base-content/45 hover:text-base-content hover:bg-base-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* ===================== VIEW PLANO ===================== */}
      {modo === 'plano' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div
              className="col-span-2 rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: catConfig ? catConfig.gradient : 'linear-gradient(135deg, oklch(0.2 0.01 250), oklch(0.28 0.02 250))',
                boxShadow: catConfig ? catConfig.shadow : 'none',
              }}
            >
              <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/8 pointer-events-none" />
              <div className="absolute bottom-2 right-10 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/55">Categoria Atual · {nomeAlvo}</p>
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/55"><IconTrophy /></div>
                </div>
                <p className="text-4xl font-black text-white leading-none tracking-tight">{categoria || 'SEM CATEGORIA'}</p>
                <p className="text-sm text-white/50 mt-2">{qtdVendas} venda{qtdVendas !== 1 ? 's' : ''} no período</p>
              </div>
            </div>

            <div className="rounded-2xl p-5 border border-base-300 bg-base-100">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-40">Comissão</p>
                <div className="w-7 h-7 rounded-lg bg-base-200 flex items-center justify-center opacity-40"><IconDollar size={15} /></div>
              </div>
              <p className="text-2xl font-bold leading-none">{brl(totalComissao)}</p>
              <p className="text-xs opacity-35 mt-3">estimativa do período</p>
            </div>

            <div className="rounded-2xl p-5 border border-base-300 bg-base-100 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest opacity-40">{proximaCat ? 'Próxima' : 'Nível Máximo'}</p>
                  <div className="w-7 h-7 rounded-lg bg-base-200 flex items-center justify-center opacity-40"><IconArrowUp /></div>
                </div>
                {proximaCat ? (
                  <>
                    <p className="text-xl font-bold leading-none mb-1.5" style={{ color: CATEGORIA_CONFIG[proximaCat.nome]?.color }}>{proximaCat.nome}</p>
                    <p className="text-xs opacity-40 mb-3">{proximaCat.min - qtdVendas} venda{(proximaCat.min - qtdVendas) !== 1 ? 's' : ''} para atingir</p>
                    <div className="w-full h-1.5 rounded-full bg-base-300 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${progressPct}%`, background: CATEGORIA_CONFIG[proximaCat.nome]?.gradient }} />
                    </div>
                    <p className="text-[10px] opacity-25 text-right mt-1 tabular-nums">{Math.round(progressPct)}%</p>
                  </>
                ) : (
                  <p className="text-sm font-semibold" style={{ color: CATEGORIA_CONFIG['BLACK']?.color }}>Nível mais alto atingido!</p>
                )}
              </div>
            </div>
          </div>

          {/* Detalhamento por Venda */}
          <div className="rounded-2xl border border-base-300 bg-base-100 overflow-hidden mb-6">
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-base">Detalhamento por Venda</h3>
                <span className="text-xs font-semibold opacity-35 uppercase tracking-wider">{vendasDoMes.length} resultado{vendasDoMes.length !== 1 ? 's' : ''}</span>
              </div>
              {totalComissao > 0 && (
                <div className="px-3 py-1.5 rounded-xl border border-success/25 bg-success/8 text-sm font-bold text-success">{brl(totalComissao)}</div>
              )}
            </div>
            <div className="overflow-auto">
              <table className="table w-full">
                <thead>
                  <tr className="text-xs uppercase tracking-wider opacity-40">
                    <th className="bg-base-200/60">Cliente</th>
                    <th className="bg-base-200/60">Data</th>
                    <th className="bg-base-200/60">Plano</th>
                    <th className="bg-base-200/60">Valor</th>
                    <th className="bg-base-200/60">Faixa</th>
                    <th className="bg-base-200/60 text-center">%</th>
                    <th className="bg-base-200/60">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {vendasComComissao.map(venda => {
                    const dataVenda = venda.criadoEm?.toDate()
                    return (
                      <tr key={venda.id} className="border-b border-base-200 hover:bg-base-200/40 transition-colors duration-150">
                        <td className="min-w-[150px]">
                          <div className="font-semibold text-sm">{venda.nome}</div>
                          <div className="text-xs opacity-40 mt-0.5">{venda.contato}</div>
                        </td>
                        <td className="min-w-[110px]"><span className="text-sm">{dataVenda ? dataVenda.toLocaleDateString('pt-BR') : '—'}</span></td>
                        <td className="min-w-[160px]"><span className="text-sm">{venda.servico}</span></td>
                        <td className="min-w-[110px]"><span className="text-sm font-semibold">{brl(venda.valor)}</span></td>
                        <td className="min-w-[180px]"><span className="text-xs opacity-50">{venda.faixaLabel}</span></td>
                        <td className="min-w-[60px] text-center">
                          {venda.pct > 0 ? <span className="text-sm font-bold" style={{ color: catConfig?.color }}>{venda.pct}%</span> : <span className="text-sm opacity-25">—</span>}
                        </td>
                        <td className="min-w-[120px]">
                          {venda.comissao > 0 ? <span className="text-sm font-bold text-success">{brl(venda.comissao)}</span> : <span className="text-xs opacity-25">—</span>}
                        </td>
                      </tr>
                    )
                  })}

                  {vendasDoMes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3 opacity-20"><IconInbox /><span className="text-sm font-medium">Nenhuma venda no período</span></div>
                      </td>
                    </tr>
                  )}

                  {vendasDoMes.length > 0 && (
                    <tr className="border-t-2 border-base-300">
                      <td colSpan={6} className="text-sm font-semibold opacity-50 text-right pr-4 py-3">Total estimado</td>
                      <td className="py-3"><span className="text-base font-black text-success">{brl(totalComissao)}</span></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabela de Referência */}
          <div className="rounded-2xl border border-base-300 bg-base-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-base-300">
              <h3 className="font-bold text-base">Tabela de Referência</h3>
              <p className="text-xs opacity-35 mt-0.5">Percentuais de comissão por faixa de valor e categoria</p>
            </div>
            <div className="px-5 py-3 border-b border-base-300 flex items-center gap-4 flex-wrap">
              <span className="text-xs opacity-40 font-semibold uppercase tracking-wider">Categorias</span>
              {[
                { nome: 'BRONZE', faixa: '35–54' },
                { nome: 'PRATA', faixa: '55–64' },
                { nome: 'OURO', faixa: '65–74' },
                { nome: 'DIAMANTE', faixa: '75–84' },
                { nome: 'BLACK', faixa: '≥85' },
              ].map(cat => (
                <div key={cat.nome} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CATEGORIA_CONFIG[cat.nome]?.color }} />
                  <span className="text-xs font-semibold" style={{ color: categoria === cat.nome ? CATEGORIA_CONFIG[cat.nome]?.color : undefined, opacity: categoria === cat.nome ? 1 : 0.4 }}>{cat.nome}</span>
                  <span className="text-[10px] opacity-25 font-medium">({cat.faixa} vendas)</span>
                </div>
              ))}
            </div>
            <div className="overflow-auto">
              <table className="table w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider opacity-40">
                    <th className="bg-base-200/60 min-w-[200px]">Faixa de Valor</th>
                    {['BRONZE', 'PRATA', 'OURO', 'DIAMANTE', 'BLACK'].map(cat => (
                      <th key={cat} className="bg-base-200/60 text-center" style={{ color: categoria === cat ? CATEGORIA_CONFIG[cat].color : undefined, opacity: categoria === cat ? 1 : undefined }}>{cat}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TABELA_COMISSAO.map((faixa, i) => (
                    <tr key={i} className="border-b border-base-200 hover:bg-base-200/30 transition-colors">
                      <td className="text-xs font-medium opacity-55">{faixa.label}</td>
                      {['BRONZE', 'PRATA', 'OURO', 'DIAMANTE', 'BLACK'].map(cat => (
                        <td key={cat} className="text-center">
                          <span className="text-sm font-bold" style={{ color: categoria === cat ? CATEGORIA_CONFIG[cat].color : undefined, opacity: categoria === cat ? 1 : 0.25 }}>{faixa.rates[cat]}%</span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===================== VIEW UPGRADE ===================== */}
      {modo === 'upgrade' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Hero — faixa atual */}
            <div
              className="col-span-2 rounded-2xl p-6 relative overflow-hidden"
              style={{
                background: faixaUpg.pct > 0
                  ? 'linear-gradient(135deg, #1e1b4b, #6d28d9)'
                  : 'linear-gradient(135deg, oklch(0.2 0.01 250), oklch(0.28 0.02 250))',
                boxShadow: faixaUpg.pct > 0 ? '0 0 50px rgba(109,40,217,0.3)' : 'none',
              }}
            >
              <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full bg-white/8 pointer-events-none" />
              <div className="absolute bottom-2 right-10 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/55">Comissionamento de Upgrade · {nomeAlvo}</p>
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/55"><IconArrowUp size={18} /></div>
                </div>
                <p className="text-4xl font-black text-white leading-none tracking-tight">{faixaUpg.pct}%</p>
                <p className="text-sm text-white/50 mt-2">
                  {qtdPadrao} upgrade{qtdPadrao !== 1 ? 's' : ''} padrão · faixa {faixaUpg.label}
                </p>
              </div>
            </div>

            {/* Financeiro gerado */}
            <div className="rounded-2xl p-5 border border-base-300 bg-base-100">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-40">Financeiro Gerado</p>
                <div className="w-7 h-7 rounded-lg bg-base-200 flex items-center justify-center opacity-40"><IconDollar size={15} /></div>
              </div>
              <p className="text-2xl font-bold leading-none">{brl(financeiroGerado)}</p>
              <p className="text-xs opacity-35 mt-3">soma das diferenças (padrão)</p>
            </div>

            {/* Comissão total */}
            <div className="rounded-2xl p-5 border border-success/25 bg-success/5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-40">Comissão Total</p>
                <div className="w-7 h-7 rounded-lg bg-success/15 flex items-center justify-center text-success"><IconDollar size={15} /></div>
              </div>
              <p className="text-2xl font-black leading-none text-success">{brl(comissaoTotalUpg)}</p>
              <p className="text-xs opacity-35 mt-3">upgrade + migração</p>
            </div>
          </div>

          {/* Breakdown: upgrade padrão / migração / próxima faixa */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-2xl p-5 border border-base-300 bg-base-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-40">Comissão Upgrade</p>
                <span className="text-xs font-bold" style={{ color: '#a78bfa' }}>{faixaUpg.pct}%</span>
              </div>
              <p className="text-xl font-bold leading-none">{brl(comissaoUpgrade)}</p>
              <p className="text-xs opacity-35 mt-2">{faixaUpg.pct}% de {brl(financeiroGerado)}</p>
            </div>

            <div className="rounded-2xl p-5 border border-base-300 bg-base-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-40">Comissão Migração</p>
                <div className="opacity-40" style={{ color: '#22d3ee' }}><IconLayers size={15} /></div>
              </div>
              <p className="text-xl font-bold leading-none">{brl(comissaoMigracao)}</p>
              <p className="text-xs opacity-35 mt-2">{migracoes.length} migração{migracoes.length !== 1 ? 'ões' : ''} · 50% de {brl(financeiroMigracao)}</p>
            </div>

            <div className="rounded-2xl p-5 border border-base-300 bg-base-100">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest opacity-40">{proxFaixaUpg ? 'Próxima Faixa' : 'Faixa Máxima'}</p>
                <div className="w-7 h-7 rounded-lg bg-base-200 flex items-center justify-center opacity-40"><IconArrowUp /></div>
              </div>
              {proxFaixaUpg ? (
                <>
                  <p className="text-xl font-bold leading-none mb-1" style={{ color: '#a78bfa' }}>{proxFaixaUpg.pct}%</p>
                  <p className="text-xs opacity-40">faltam {faltamProxFaixa} upgrade{faltamProxFaixa !== 1 ? 's' : ''} padrão</p>
                </>
              ) : (
                <p className="text-sm font-semibold" style={{ color: '#a78bfa' }}>100% — faixa máxima atingida!</p>
              )}
            </div>
          </div>

          {/* Detalhamento dos upgrades */}
          <div className="rounded-2xl border border-base-300 bg-base-100 overflow-hidden mb-6">
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-base">Detalhamento dos Upgrades</h3>
                <span className="text-xs font-semibold opacity-35 uppercase tracking-wider">{upgradesDoMes.length} resultado{upgradesDoMes.length !== 1 ? 's' : ''}</span>
              </div>
              {comissaoTotalUpg > 0 && (
                <div className="px-3 py-1.5 rounded-xl border border-success/25 bg-success/8 text-sm font-bold text-success">{brl(comissaoTotalUpg)}</div>
              )}
            </div>
            <div className="overflow-auto">
              <table className="table w-full">
                <thead>
                  <tr className="text-xs uppercase tracking-wider opacity-40">
                    <th className="bg-base-200/60">Cliente</th>
                    <th className="bg-base-200/60">Data</th>
                    <th className="bg-base-200/60">Tipo</th>
                    <th className="bg-base-200/60">Atual → Novo</th>
                    <th className="bg-base-200/60">Diferença</th>
                    <th className="bg-base-200/60 text-center">%</th>
                    <th className="bg-base-200/60">Comissão</th>
                  </tr>
                </thead>
                <tbody>
                  {upgradesDoMes.map(v => {
                    const dataVenda = v.criadoEm?.toDate()
                    const dif = getDif(v)
                    const ehMigracao = v.categoriaUpgrade === 'tecnologia'
                    const pct = ehMigracao ? PCT_MIGRACAO : faixaUpg.pct
                    const comissao = dif * pct / 100
                    return (
                      <tr key={v.id} className="border-b border-base-200 hover:bg-base-200/40 transition-colors duration-150">
                        <td className="min-w-[150px]">
                          <div className="font-semibold text-sm">{v.nome}</div>
                          <div className="text-xs opacity-40 mt-0.5">{v.produtoVendido || v.contato}</div>
                        </td>
                        <td className="min-w-[100px]"><span className="text-sm">{dataVenda ? dataVenda.toLocaleDateString('pt-BR') : '—'}</span></td>
                        <td className="min-w-[120px]">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                            style={ehMigracao
                              ? { backgroundColor: 'oklch(0.6 0.13 220 / 0.18)', color: '#22d3ee', border: '1px solid oklch(0.6 0.13 220 / 0.3)' }
                              : { backgroundColor: 'oklch(0.55 0.2 290 / 0.18)', color: '#a78bfa', border: '1px solid oklch(0.55 0.2 290 / 0.3)' }}
                          >
                            {ehMigracao ? 'Migração' : 'Padrão'}
                          </span>
                        </td>
                        <td className="min-w-[140px]">
                          <span className="text-sm opacity-70">{brl(v.valorAnterior || 0)} → {brl(v.valor || 0)}</span>
                        </td>
                        <td className="min-w-[100px]"><span className="text-sm font-semibold">{brl(dif)}</span></td>
                        <td className="min-w-[55px] text-center">
                          {pct > 0 ? <span className="text-sm font-bold" style={{ color: ehMigracao ? '#22d3ee' : '#a78bfa' }}>{pct}%</span> : <span className="text-sm opacity-25">—</span>}
                        </td>
                        <td className="min-w-[110px]">
                          {comissao > 0 ? <span className="text-sm font-bold text-success">{brl(comissao)}</span> : <span className="text-xs opacity-25">—</span>}
                        </td>
                      </tr>
                    )
                  })}

                  {upgradesDoMes.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-16">
                        <div className="flex flex-col items-center gap-3 opacity-20"><IconInbox /><span className="text-sm font-medium">Nenhum upgrade no período</span></div>
                      </td>
                    </tr>
                  )}

                  {upgradesDoMes.length > 0 && (
                    <tr className="border-t-2 border-base-300">
                      <td colSpan={6} className="text-sm font-semibold opacity-50 text-right pr-4 py-3">Comissão total estimada</td>
                      <td className="py-3"><span className="text-base font-black text-success">{brl(comissaoTotalUpg)}</span></td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabela de Referência — Upgrade padrão */}
          <div className="rounded-2xl border border-base-300 bg-base-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-base-300 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-base">Tabela de Referência — Upgrade Padrão</h3>
                <p className="text-xs opacity-35 mt-0.5">% pela quantidade de upgrades padrão, sobre o financeiro gerado</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-base-200 opacity-70">Mínimo: {UPGRADE_MINIMO}</span>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-base-200 opacity-70">Meta: {UPGRADE_META}</span>
              </div>
            </div>
            <div className="overflow-auto">
              <table className="table w-full text-sm">
                <thead>
                  <tr className="text-xs uppercase tracking-wider opacity-40">
                    <th className="bg-base-200/60">Quantidade</th>
                    <th className="bg-base-200/60 text-center">%</th>
                    <th className="bg-base-200/60 text-right">Estimativa sobre {brl(financeiroGerado)}</th>
                  </tr>
                </thead>
                <tbody>
                  {TABELA_UPGRADE.map((t, i) => {
                    const ativa = t.min === faixaUpg.min
                    const estimativa = financeiroGerado * t.pct / 100
                    return (
                      <tr key={i} className="border-b border-base-200 hover:bg-base-200/30 transition-colors" style={ativa ? { backgroundColor: 'oklch(0.55 0.2 290 / 0.08)' } : undefined}>
                        <td className="text-sm font-medium" style={{ opacity: ativa ? 1 : 0.6 }}>
                          {t.label}
                          {ativa && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: 'oklch(0.55 0.2 290 / 0.2)', color: '#a78bfa' }}>ATUAL</span>}
                        </td>
                        <td className="text-center">
                          <span className="text-sm font-bold" style={{ color: ativa ? '#a78bfa' : undefined, opacity: ativa ? 1 : 0.3 }}>{t.pct}%</span>
                        </td>
                        <td className="text-right">
                          <span className="text-sm font-semibold" style={{ color: ativa ? '#a78bfa' : undefined, opacity: ativa ? 1 : 0.35 }}>{t.pct > 0 ? brl(estimativa) : '—'}</span>
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="border-t-2 border-base-300">
                    <td className="text-sm font-semibold opacity-60" colSpan={2}>Migração por tecnologia · 50% (sem mínimo)</td>
                    <td className="text-right"><span className="text-sm font-bold text-success">{brl(comissaoMigracao)}</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
