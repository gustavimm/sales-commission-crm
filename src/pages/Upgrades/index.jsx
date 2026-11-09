import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { isGestorOuAdmin, vendedoresDasVendas } from '../../config/roles'

const STATUS_UPGRADE = [
  { valor: 'assinado', label: 'Assinado' },
  { valor: 'aguardando_bko', label: 'Aguardando liberação do BKO' },
  { valor: 'concluido', label: 'Concluído' },
  { valor: 'cancelado', label: 'Cancelado' },
]

const STATUS_STYLES = {
  assinado: 'bg-info text-info-content',
  aguardando_bko: 'bg-warning text-warning-content',
  concluido: 'bg-success text-success-content',
  cancelado: 'bg-error text-error-content',
}

const PERIODOS = { mes: 'Este mês', hoje: 'Hoje', todos: 'Todos', custom: 'Personalizado' }

function getPeriodoAtual() {
  const hoje = new Date()
  const dia = hoje.getDate()
  const mes = hoje.getMonth()
  const ano = hoje.getFullYear()
  if (dia >= 25) return { inicio: new Date(ano, mes, 25), fim: new Date(ano, mes + 1, 24, 23, 59, 59) }
  return { inicio: new Date(ano, mes - 1, 25), fim: new Date(ano, mes, 24, 23, 59, 59) }
}

function brl(v) {
  return `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function dataLocalISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const IconTrash = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
)

const IconPencil = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const IconX = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const IconInbox = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
)

const IconNote = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>
  </svg>
)

export default function Upgrades() {
  const { user, perfil } = useAuth()
  const email = user?.email?.toLowerCase()
  const isGestor = isGestorOuAdmin(perfil)
  const isAnalista = perfil?.role === 'analista'
  const isUpgradeSeller = perfil?.role === 'vendedor'
  const liberadoPorPaginas = Array.isArray(perfil?.paginas) && perfil.paginas.includes('upgrades')
  const podeVer = isGestor || isUpgradeSeller || isAnalista || liberadoPorPaginas
  // Analista vê os upgrades de todos, mas só acompanha — não edita nem exclui
  const verTudo = isGestor || isAnalista
  const podeGerenciar = isGestor || isUpgradeSeller

  const [vendas, setVendas] = useState([])
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroVendedor, setFiltroVendedor] = useState('todos')
  const [filtroProduto, setFiltroProduto] = useState('todos')
  // Datas do filtro personalizado — começam no período de apuração atual (25 → 24)
  const [dataInicio, setDataInicio] = useState(() => dataLocalISO(getPeriodoAtual().inicio))
  const [dataFim, setDataFim] = useState(() => dataLocalISO(getPeriodoAtual().fim))
  const [modalEditar, setModalEditar] = useState(null)
  const [modalExcluir, setModalExcluir] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [editForm, setEditForm] = useState(null)

  useEffect(() => {
    const q = query(collection(db, 'vendas'), orderBy('criadoEm', 'desc'))
    return onSnapshot(q, snap => {
      setVendas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [])

  if (!podeVer) {
    return (
      <div className="p-6 max-w-3xl mx-auto w-full">
        <div className="rounded-2xl border border-base-300 bg-base-100 py-20 flex flex-col items-center gap-3 opacity-30">
          <IconInbox />
          <p className="text-sm font-semibold">Você não tem acesso à gestão de upgrades.</p>
        </div>
      </div>
    )
  }

  const { inicio, fim } = getPeriodoAtual()
  const hojeStr = dataLocalISO()

  const getDif = (v) => v.diferenca != null ? Number(v.diferenca) : (Number(v.valor || 0) - Number(v.valorAnterior || 0))

  let upgrades = vendas.filter(v => v.tipo === 'upgrade')

  // Vendedor de upgrade vê só os seus; gestor e analista veem todos (com filtro opcional)
  if (!verTudo) {
    upgrades = upgrades.filter(v => v.vendedorEmail?.toLowerCase() === email)
  } else if (filtroVendedor !== 'todos') {
    upgrades = upgrades.filter(v => v.vendedorEmail?.toLowerCase() === filtroVendedor)
  }

  // Produtos disponíveis para o filtro (antes dos filtros de período/status/produto)
  const produtosDisponiveis = [...new Set(upgrades.map(v => v.produtoVendido).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  upgrades = upgrades.filter(v => {
    if (filtroPeriodo === 'todos') return true
    if (!v.criadoEm) return false
    const d = v.criadoEm.toDate()
    if (filtroPeriodo === 'hoje') return dataLocalISO(d) === hojeStr
    if (filtroPeriodo === 'custom') {
      if (!dataInicio || !dataFim) return true
      return d >= new Date(dataInicio + 'T00:00:00') && d <= new Date(dataFim + 'T23:59:59')
    }
    return d >= inicio && d <= fim
  })

  if (filtroStatus !== 'todos') {
    upgrades = upgrades.filter(v => (v.statusUpgrade || 'assinado') === filtroStatus)
  }

  if (filtroProduto !== 'todos') {
    upgrades = upgrades.filter(v => v.produtoVendido === filtroProduto)
  }

  const handleStatus = async (id, novoStatus) => {
    try {
      await updateDoc(doc(db, 'vendas', id), { statusUpgrade: novoStatus })
    } catch {
      console.error('Erro ao atualizar status do upgrade')
    }
  }

  const abrirEditar = (v) => {
    setEditForm({
      valorAnterior: String(v.valorAnterior ?? ''),
      valor: String(v.valor ?? ''),
      produtoVendido: v.produtoVendido || '',
      categoriaUpgrade: v.categoriaUpgrade || 'padrao',
      dataAssinatura: v.dataAssinatura || dataLocalISO(),
      observacao: v.observacao || '',
    })
    setModalEditar(v)
  }

  const handleSalvar = async () => {
    if (!modalEditar || !editForm) return
    setSalvando(true)
    try {
      const valorNovo = Number(editForm.valor) || 0
      const valorAnt = Number(editForm.valorAnterior) || 0
      await updateDoc(doc(db, 'vendas', modalEditar.id), {
        valorAnterior: valorAnt,
        valor: valorNovo,
        produtoVendido: editForm.produtoVendido,
        categoriaUpgrade: editForm.categoriaUpgrade,
        dataAssinatura: editForm.dataAssinatura,
        observacao: editForm.observacao,
        diferenca: valorNovo - valorAnt,
      })
      setModalEditar(null)
      setEditForm(null)
    } catch {
      console.error('Erro ao salvar upgrade')
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async () => {
    if (!modalExcluir) return
    setExcluindo(true)
    try {
      await deleteDoc(doc(db, 'vendas', modalExcluir.id))
      setModalExcluir(null)
    } catch {
      console.error('Erro ao excluir upgrade')
    } finally {
      setExcluindo(false)
    }
  }

  const setEf = (campo, valor) => setEditForm(f => ({ ...f, [campo]: valor }))

  return (
    <div className="p-6 max-w-6xl mx-auto w-full" style={{ animation: 'slideDown 0.4s ease forwards' }}>

      {/* Modal Editar */}
      {modalEditar && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" style={{ padding: '24px' }}>
          <div
            className="w-full max-w-md rounded-3xl border border-base-300 overflow-hidden flex flex-col"
            style={{ animation: 'slideDown 0.3s ease forwards', backgroundColor: 'oklch(var(--b1) / 0.98)', boxShadow: '0 0 48px rgba(0,0,0,0.45)', maxHeight: 'calc(100vh - 48px)' }}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 flex-shrink-0">
              <div>
                <h2 className="font-bold text-sm">Editar Upgrade</h2>
                <p className="text-xs opacity-35 mt-0.5">{modalEditar.nome}</p>
              </div>
              <button onClick={() => { setModalEditar(null); setEditForm(null) }} className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-200 transition-all duration-200">
                <IconX />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4 overflow-auto">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold opacity-40 uppercase tracking-widest">Tipo de Upgrade</label>
                <div className="flex p-1 rounded-2xl gap-1" style={{ backgroundColor: 'oklch(var(--b2) / 0.6)', border: '1px solid oklch(1 0 0 / 0.07)' }}>
                  {[{ v: 'padrao', l: 'Upgrade padrão' }, { v: 'tecnologia', l: 'Migração tecnologia' }].map(({ v, l }) => {
                    const active = editForm.categoriaUpgrade === v
                    return (
                      <button key={v} type="button" onClick={() => setEf('categoriaUpgrade', v)}
                        className="flex-1 h-9 rounded-xl text-xs font-semibold transition-all duration-200"
                        style={active ? { background: 'linear-gradient(135deg, oklch(0.52 0.2 290), oklch(0.4 0.16 290))', color: 'white' } : { color: 'oklch(var(--bc) / 0.4)' }}>
                        {l}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold opacity-40 uppercase tracking-widest">Valor Atual</label>
                  <input type="number" step="0.01" min="0" className="input input-bordered w-full rounded-2xl" value={editForm.valorAnterior} onChange={e => setEf('valorAnterior', e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold opacity-40 uppercase tracking-widest">Valor Novo</label>
                  <input type="number" step="0.01" min="0" className="input input-bordered w-full rounded-2xl" value={editForm.valor} onChange={e => setEf('valor', e.target.value)} />
                </div>
              </div>

              <div className="text-xs opacity-45">
                Diferença: <span className="font-bold text-success">{brl((Number(editForm.valor) || 0) - (Number(editForm.valorAnterior) || 0))}</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold opacity-40 uppercase tracking-widest">Produto Vendido</label>
                <input type="text" className="input input-bordered w-full rounded-2xl" value={editForm.produtoVendido} onChange={e => setEf('produtoVendido', e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold opacity-40 uppercase tracking-widest">Data de Assinatura</label>
                <input type="date" className="input input-bordered w-full rounded-2xl" value={editForm.dataAssinatura} onChange={e => setEf('dataAssinatura', e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold opacity-40 uppercase tracking-widest">Observação</label>
                <textarea rows={3} className="textarea textarea-bordered w-full rounded-2xl text-sm" placeholder="Anotações sobre este upgrade..." value={editForm.observacao} onChange={e => setEf('observacao', e.target.value)} />
              </div>
            </div>

            <div className="px-6 pb-6 pt-2 flex gap-3 flex-shrink-0">
              <button className="btn btn-ghost flex-1 rounded-xl" onClick={() => { setModalEditar(null); setEditForm(null) }} disabled={salvando}>Cancelar</button>
              <button className="btn btn-primary flex-1 rounded-xl" onClick={handleSalvar} disabled={salvando}>
                {salvando ? <span className="loading loading-spinner loading-xs" /> : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excluir */}
      {modalExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 rounded-3xl border border-base-300 p-6" style={{ animation: 'slideDown 0.3s ease forwards', backgroundColor: 'oklch(var(--b1) / 0.97)', boxShadow: '0 0 48px rgba(0,0,0,0.45)' }}>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center text-error"><IconTrash size={22} /></div>
              <h2 className="text-lg font-bold">Excluir upgrade?</h2>
              <p className="text-sm opacity-50">O upgrade de <span className="font-semibold opacity-80">{modalExcluir.nome}</span> será removido permanentemente.</p>
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

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-35 mb-1">Esteira</p>
          <h1 className="text-2xl font-bold">Gestão de Upgrades</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs opacity-40 font-medium">Período de apuração (25 → 24)</span>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-base-200 tabular-nums">
              {inicio.toLocaleDateString('pt-BR')} → {fim.toLocaleDateString('pt-BR')}
            </span>
            <span className="text-xs opacity-30 font-medium">· {upgrades.length} no filtro</span>
          </div>
        </div>
        {verTudo && (
          <div className="flex items-center gap-3 flex-shrink-0">
            <label className="text-xs font-semibold uppercase tracking-wider opacity-40 whitespace-nowrap">Vendedor</label>
            <select className="select select-bordered select-sm rounded-xl text-sm" value={filtroVendedor} onChange={e => setFiltroVendedor(e.target.value)}>
              <option value="todos">Todos</option>
              {vendedoresDasVendas(vendas.filter(v => v.tipo === 'upgrade')).map(({ email: em, nome }) => <option key={em} value={em}>{nome}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="rounded-2xl border border-base-300 bg-base-100 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest opacity-35 mr-1">Período</span>
          {Object.entries(PERIODOS).map(([valor, label]) => (
            <button key={valor} onClick={() => setFiltroPeriodo(valor)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${filtroPeriodo === valor ? 'bg-primary text-primary-content shadow-sm' : 'bg-base-200 text-base-content/55 hover:bg-base-300 hover:text-base-content'}`}>
              {label}
            </button>
          ))}
          {filtroPeriodo === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap ml-1" style={{ animation: 'slideDown 0.2s ease forwards' }}>
              <div className="w-px h-5 bg-base-300 flex-shrink-0" />
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider opacity-40">De</label>
                <input type="date" className="input input-bordered input-sm rounded-xl text-sm" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider opacity-40">Até</label>
                <input type="date" className="input input-bordered input-sm rounded-xl text-sm" value={dataFim} onChange={e => setDataFim(e.target.value)} />
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-base-300 pt-3 flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-xs font-semibold uppercase tracking-widest opacity-35 mr-1">Status</span>
          {[{ valor: 'todos', label: 'Todos' }, ...STATUS_UPGRADE].map(({ valor, label }) => (
            <button key={valor} onClick={() => setFiltroStatus(valor)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${filtroStatus === valor ? 'bg-primary text-primary-content shadow-sm' : 'bg-base-200 text-base-content/55 hover:bg-base-300 hover:text-base-content'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="border-t border-base-300 pt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest opacity-35 mr-1">Produto</span>
          <select
            className="select select-bordered select-sm rounded-xl text-sm"
            value={filtroProduto}
            onChange={e => setFiltroProduto(e.target.value)}
          >
            <option value="todos">Todos os produtos</option>
            {produtosDisponiveis.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {filtroProduto !== 'todos' && (
            <button
              onClick={() => setFiltroProduto('todos')}
              className="text-xs font-semibold opacity-40 hover:opacity-100 hover:text-error transition-all duration-200"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-2xl border border-base-300 bg-base-100 overflow-hidden">
        <div className="overflow-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider opacity-40">
                <th className="bg-base-200/60">Cliente</th>
                <th className="bg-base-200/60">Data</th>
                <th className="bg-base-200/60">Tipo</th>
                <th className="bg-base-200/60">Atual → Novo</th>
                <th className="bg-base-200/60">Diferença</th>
                {verTudo && <th className="bg-base-200/60">Vendedor</th>}
                <th className="bg-base-200/60">Status</th>
                {podeGerenciar && <th className="bg-base-200/60 w-20" />}
              </tr>
            </thead>
            <tbody>
              {upgrades.map(v => {
                const dataVenda = v.criadoEm?.toDate()
                const ehMigracao = v.categoriaUpgrade === 'tecnologia'
                const statusAtual = v.statusUpgrade || 'assinado'
                return (
                  <tr key={v.id} className="border-b border-base-200 hover:bg-base-200/40 transition-colors duration-150">
                    <td className="min-w-[170px]">
                      <div className="font-semibold text-sm">{v.nome}</div>
                      <div className="text-xs opacity-40 mt-0.5">{v.produtoVendido || v.contato}</div>
                      {v.observacao && (
                        <div className="flex items-center gap-1 mt-1 text-[11px] opacity-55" title={v.observacao}>
                          <IconNote />
                          <span className="truncate max-w-[180px]">{v.observacao}</span>
                        </div>
                      )}
                    </td>
                    <td className="min-w-[100px]"><span className="text-sm">{dataVenda ? dataVenda.toLocaleDateString('pt-BR') : '—'}</span></td>
                    <td className="min-w-[110px]">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                        style={ehMigracao
                          ? { backgroundColor: 'oklch(0.6 0.13 220 / 0.18)', color: '#22d3ee', border: '1px solid oklch(0.6 0.13 220 / 0.3)' }
                          : { backgroundColor: 'oklch(0.55 0.2 290 / 0.18)', color: '#a78bfa', border: '1px solid oklch(0.55 0.2 290 / 0.3)' }}>
                        {ehMigracao ? 'Migração' : 'Padrão'}
                      </span>
                    </td>
                    <td className="min-w-[150px]"><span className="text-sm opacity-70">{brl(v.valorAnterior)} → {brl(v.valor)}</span></td>
                    <td className="min-w-[100px]"><span className="text-sm font-semibold">{brl(getDif(v))}</span></td>
                    {verTudo && <td className="min-w-[100px]"><span className="text-sm">{v.vendedorNome || v.vendedorNomeExibicao || v.vendedorEmail?.split('@')[0]}</span></td>}
                    <td className="w-[210px] max-w-[210px]">
                      {podeGerenciar ? (
                        <select
                          className={`select select-xs font-semibold border-0 rounded-full w-full cursor-pointer ${STATUS_STYLES[statusAtual] || 'bg-base-300 text-base-content'}`}
                          style={{ fontSize: '11px' }}
                          value={statusAtual}
                          onChange={e => handleStatus(v.id, e.target.value)}
                        >
                          {STATUS_UPGRADE.map(s => <option key={s.valor} value={s.valor}>{s.label}</option>)}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${STATUS_STYLES[statusAtual] || 'bg-base-300 text-base-content/60'}`}>
                          {STATUS_UPGRADE.find(s => s.valor === statusAtual)?.label || statusAtual}
                        </span>
                      )}
                    </td>
                    {podeGerenciar && (
                      <td className="w-20">
                        <div className="flex items-center gap-1">
                          <button onClick={() => abrirEditar(v)} className="w-7 h-7 rounded-lg flex items-center justify-center text-base-content/30 hover:text-base-content hover:bg-base-200 transition-all duration-200" title="Editar">
                            <IconPencil />
                          </button>
                          <button onClick={() => setModalExcluir(v)} className="w-7 h-7 rounded-lg flex items-center justify-center text-base-content/25 hover:text-error hover:bg-error/10 transition-all duration-200" title="Excluir">
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}

              {upgrades.length === 0 && (
                <tr>
                  <td colSpan={6 + (verTudo ? 1 : 0) + (podeGerenciar ? 1 : 0)} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 opacity-20"><IconInbox /><span className="text-sm font-medium">Nenhum upgrade encontrado</span></div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
