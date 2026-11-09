import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { isGestorOuAdmin, podeVerTudo as perfilPodeVerTudo, nomeDoUsuario, vendedoresDasVendas } from '../../config/roles'

const STATUS_OPCOES = [
  { valor: 'assinado', label: 'Assinado' },
  { valor: 'aguardando_bko', label: 'Ag. BKO' },
  { valor: 'aguardando_instalacao', label: 'Ag. Instalação' },
  { valor: 'instalado', label: 'Instalado' },
  { valor: 'cancelado', label: 'Cancelado' },
]

const STATUS_STYLES = {
  assinado: { pill: 'bg-info text-info-content', dot: 'bg-info-content' },
  aguardando_bko: { pill: 'bg-warning text-warning-content', dot: 'bg-warning-content' },
  aguardando_instalacao: { pill: 'bg-secondary text-secondary-content', dot: 'bg-secondary-content' },
  instalado: { pill: 'bg-success text-success-content', dot: 'bg-success-content' },
  cancelado: { pill: 'bg-error text-error-content', dot: 'bg-error-content' },
}

const PERIODO_LABELS = {
  hoje: 'Hoje',
  '7dias': '7 dias',
  mes: 'Este mês',
  todos: 'Todos',
  custom: 'Personalizado',
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

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const IconTrash = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/>
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
    <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
)

const IconTrendingUp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
    <polyline points="16 7 22 7 22 13"/>
  </svg>
)

const IconSunCard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
)

const IconBarChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
)

const IconZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
)

const IconInbox = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
    <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
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

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/>
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

const IconList = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)

const IconX = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const ITENS_POR_PAGINA = 10

function buildPageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

function ModalConfirmacao({ titulo, mensagem, onConfirmar, onCancelar, loading }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-sm mx-4 rounded-3xl border border-base-300 p-6"
        style={{
          animation: 'slideDown 0.3s ease forwards',
          backdropFilter: 'blur(20px)',
          backgroundColor: 'oklch(var(--b1) / 0.97)',
          boxShadow: '0 0 40px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center text-error">
            <IconTrash size={22} />
          </div>
          <h2 className="text-lg font-bold">{titulo}</h2>
          <p className="text-sm opacity-50">{mensagem}</p>
          <div className="flex gap-3 mt-2 w-full">
            <button className="btn btn-ghost flex-1 rounded-xl" onClick={onCancelar} disabled={loading}>
              Cancelar
            </button>
            <button className="btn btn-error flex-1 rounded-xl" onClick={onConfirmar} disabled={loading}>
              {loading ? <span className="loading loading-spinner loading-xs" /> : 'Excluir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ModalMinhasVendas({ vendas, user, isGestor, podeVerTudo, onClose, asPage = false }) {
  // Quem vê tudo sem ser gestor (analista) só acompanha: sem excluir nem mudar status
  const podeGerenciar = isGestor || !podeVerTudo
  const mostrarVendedor = isGestor || podeVerTudo
  const totalColunas = 6 + (mostrarVendedor ? 1 : 0) + (podeGerenciar ? 2 : 0)

  const [filtroVendedor, setFiltroVendedor] = useState('todos')
  const [filtroPeriodo, setFiltroPeriodo] = useState('mes')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [selecionados, setSelecionados] = useState([])
  const [deletando, setDeletando] = useState(false)
  const [modalDelete, setModalDelete] = useState(null)
  const [paginaAtual, setPaginaAtual] = useState(1)

  const mostrarFiltroCustom = filtroPeriodo === 'custom'

  const hoje = new Date()
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  const { inicio: inicioMes, fim: fimMes } = getPeriodoAtual()

  const vendasPorVendedor = vendas.filter(venda => {
    if (podeVerTudo && filtroVendedor !== 'todos') return venda.vendedorEmail?.toLowerCase() === filtroVendedor
    if (!podeVerTudo) return venda.vendedorEmail?.toLowerCase() === user?.email?.toLowerCase()
    return true
  })

  const vendasFiltradas = vendasPorVendedor.filter(venda => {
    if (!venda.criadoEm) return false
    const dataVenda = venda.criadoEm.toDate()
    if (filtroPeriodo === 'hoje') {
      const dataStr = `${dataVenda.getFullYear()}-${String(dataVenda.getMonth() + 1).padStart(2, '0')}-${String(dataVenda.getDate()).padStart(2, '0')}`
      return dataStr === hojeStr
    }
    if (filtroPeriodo === '7dias') {
      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
      return dataVenda >= seteDiasAtras
    }
    if (filtroPeriodo === 'mes') return dataVenda >= inicioMes && dataVenda <= fimMes
    if (filtroPeriodo === 'custom' && dataInicio && dataFim) {
      const inicio = new Date(dataInicio + 'T00:00:00')
      const fim = new Date(dataFim + 'T23:59:59')
      return dataVenda >= inicio && dataVenda <= fim
    }
    return true
  })

  const vendasFiltradasPorTipo = filtroTipo === 'todos'
    ? vendasFiltradas
    : filtroTipo === 'upgrade'
    ? vendasFiltradas.filter(v => v.tipo === 'upgrade')
    : vendasFiltradas.filter(v => !v.tipo || v.tipo === 'nova_venda')

  const contagemTipo = {
    todos: vendasFiltradas.length,
    nova_venda: vendasFiltradas.filter(v => !v.tipo || v.tipo === 'nova_venda').length,
    upgrade: vendasFiltradas.filter(v => v.tipo === 'upgrade').length,
  }

  const contagemStatus = {
    todos: vendasFiltradasPorTipo.length,
    assinado: vendasFiltradasPorTipo.filter(v => v.status === 'assinado').length,
    aguardando_bko: vendasFiltradasPorTipo.filter(v => v.status === 'aguardando_bko').length,
    aguardando_instalacao: vendasFiltradasPorTipo.filter(v => v.status === 'aguardando_instalacao').length,
    instalado: vendasFiltradasPorTipo.filter(v => v.status === 'instalado').length,
    cancelado: vendasFiltradasPorTipo.filter(v => v.status === 'cancelado').length,
    sem_status: vendasFiltradasPorTipo.filter(v => !v.status).length,
  }

  const vendasFiltradasPorStatus = filtroStatus === 'todos'
    ? vendasFiltradasPorTipo
    : filtroStatus === 'sem_status'
    ? vendasFiltradasPorTipo.filter(v => !v.status)
    : vendasFiltradasPorTipo.filter(v => v.status === filtroStatus)

  const totalFiltrado = vendasFiltradasPorStatus.reduce((acc, v) => acc + Number(v.valor), 0)

  const totalPaginas = Math.max(1, Math.ceil(vendasFiltradasPorStatus.length / ITENS_POR_PAGINA))
  const paginaSegura = Math.min(paginaAtual, totalPaginas)
  const vendasPaginadas = vendasFiltradasPorStatus.slice(
    (paginaSegura - 1) * ITENS_POR_PAGINA,
    paginaSegura * ITENS_POR_PAGINA
  )

  const idsPaginaAtual = vendasPaginadas.map(v => v.id)
  const todosDaPaginaSelecionados = idsPaginaAtual.length > 0 && idsPaginaAtual.every(id => selecionados.includes(id))
  const algunsDaPaginaSelecionados = idsPaginaAtual.some(id => selecionados.includes(id)) && !todosDaPaginaSelecionados

  const toggleSelecionado = (id) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const toggleTodosNaPagina = () => {
    if (todosDaPaginaSelecionados) {
      setSelecionados(prev => prev.filter(id => !idsPaginaAtual.includes(id)))
    } else {
      setSelecionados(prev => [...new Set([...prev, ...idsPaginaAtual])])
    }
  }

  const confirmarDelete = async () => {
    setDeletando(true)
    try {
      if (modalDelete.tipo === 'single') {
        await deleteDoc(doc(db, 'vendas', modalDelete.id))
        setSelecionados(prev => prev.filter(s => s !== modalDelete.id))
      } else {
        const batch = writeBatch(db)
        selecionados.forEach(id => batch.delete(doc(db, 'vendas', id)))
        await batch.commit()
        setSelecionados([])
      }
      setModalDelete(null)
    } catch {
      console.error('Erro ao excluir venda')
    } finally {
      setDeletando(false)
    }
  }

  const handleStatusChange = async (id, novoStatus) => {
    try {
      await updateDoc(doc(db, 'vendas', id), { status: novoStatus })
    } catch {
      console.error('Erro ao atualizar status da venda')
    }
  }

  const labelPeriodo = () => {
    if (filtroPeriodo === 'hoje') return 'Hoje'
    if (filtroPeriodo === '7dias') return 'Últimos 7 dias'
    if (filtroPeriodo === 'mes') return `${inicioMes.toLocaleDateString('pt-BR')} → ${fimMes.toLocaleDateString('pt-BR')}`
    if (filtroPeriodo === 'custom' && dataInicio && dataFim) return `${new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} → ${new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}`
    return 'Todos os períodos'
  }

  return (
    <>
      {modalDelete && (
        <ModalConfirmacao
          titulo={modalDelete.tipo === 'single' ? 'Excluir venda?' : `Excluir ${selecionados.length} venda${selecionados.length > 1 ? 's' : ''}?`}
          mensagem={modalDelete.tipo === 'single'
            ? 'Esta ação não pode ser desfeita.'
            : `Você está prestes a excluir ${selecionados.length} venda${selecionados.length > 1 ? 's' : ''} de uma vez. Esta ação não pode ser desfeita.`}
          onConfirmar={confirmarDelete}
          onCancelar={() => setModalDelete(null)}
          loading={deletando}
        />
      )}

      <div
        className={asPage
          ? "w-full flex justify-center p-6"
          : "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"}
        style={asPage ? { animation: 'slideDown 0.4s ease forwards' } : { padding: '40px 16px' }}
        onClick={asPage ? undefined : (e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className="w-full max-w-[1400px] flex flex-col rounded-3xl border border-base-300 overflow-hidden"
          style={{
            animation: 'slideDown 0.3s ease forwards',
            backdropFilter: asPage ? undefined : 'blur(20px)',
            backgroundColor: asPage ? 'oklch(var(--b1))' : 'oklch(var(--b1) / 0.98)',
            boxShadow: asPage ? undefined : '0 0 80px rgba(0,0,0,0.5)',
            maxHeight: 'calc(100vh - 48px)',
            margin: 'auto',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-base-300 flex-shrink-0">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest opacity-35 mb-0.5">Registros</p>
              <h2 className="text-lg font-bold">Minhas Vendas</h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs opacity-35 font-medium hidden sm:block">{labelPeriodo()}</span>
              {!asPage && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-base-content/40 hover:text-base-content hover:bg-base-200 transition-all duration-200"
                >
                  <IconX />
                </button>
              )}
            </div>
          </div>

          <div className="flex-shrink-0 px-6 py-4 border-b border-base-300">
            {/* Filtros */}
            <div className="rounded-2xl border border-base-300 bg-base-100 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(PERIODO_LABELS).map(([valor, label]) => (
                    <button
                      key={valor}
                      onClick={() => { if (valor !== filtroPeriodo) setSelecionados([]); setFiltroPeriodo(valor); setPaginaAtual(1) }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        filtroPeriodo === valor
                          ? 'bg-primary text-primary-content shadow-sm'
                          : 'bg-base-200 text-base-content/55 hover:bg-base-300 hover:text-base-content'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {podeVerTudo && (
                  <>
                    <div className="w-px h-5 bg-base-300 flex-shrink-0" />
                    <div className="flex items-center gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wider opacity-40 whitespace-nowrap">Vendedor</label>
                      <select
                        className="select select-bordered select-sm rounded-xl text-sm"
                        value={filtroVendedor}
                        onChange={(e) => { setFiltroVendedor(e.target.value); setPaginaAtual(1) }}
                      >
                        <option value="todos">Todos</option>
                        {vendedoresDasVendas(vendas).map(({ email, nome }) => (
                          <option key={email} value={email}>{nome}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {mostrarFiltroCustom && (
                  <>
                    <div className="w-px h-5 bg-base-300 flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wider opacity-40">De</label>
                        <input type="date" className="input input-bordered input-sm rounded-xl text-sm" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setPaginaAtual(1) }} />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold uppercase tracking-wider opacity-40">Até</label>
                        <input type="date" className="input input-bordered input-sm rounded-xl text-sm" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setPaginaAtual(1) }} />
                      </div>
                    </div>
                  </>
                )}

                <div className="ml-auto flex-shrink-0 px-4 py-1.5 rounded-xl border border-primary/25 bg-primary/10 text-sm font-bold text-primary">
                  R$ {totalFiltrado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className="font-normal opacity-60 ml-1">· {vendasFiltradasPorStatus.length} venda{vendasFiltradasPorStatus.length !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="border-t border-base-300 mt-3 pt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-widest opacity-35 mr-1">Tipo</span>
                {[
                  { valor: 'todos', label: 'Todos', count: contagemTipo.todos },
                  { valor: 'nova_venda', label: 'Nova Venda', count: contagemTipo.nova_venda },
                  { valor: 'upgrade', label: 'Upgrade', count: contagemTipo.upgrade },
                ].map(({ valor, label, count }) => (
                  <button
                    key={valor}
                    onClick={() => { if (valor !== filtroTipo) setSelecionados([]); setFiltroTipo(valor); setPaginaAtual(1) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      filtroTipo === valor && valor !== 'upgrade'
                        ? 'bg-primary text-primary-content shadow-sm'
                        : filtroTipo !== valor
                        ? 'bg-base-200 text-base-content/55 hover:bg-base-300 hover:text-base-content'
                        : ''
                    }`}
                    style={filtroTipo === valor && valor === 'upgrade' ? {
                      backgroundColor: 'oklch(0.55 0.2 290 / 0.2)',
                      color: 'oklch(0.72 0.18 290)',
                      border: '1px solid oklch(0.55 0.2 290 / 0.3)',
                    } : undefined}
                  >
                    {label}
                    <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full leading-none ${
                      filtroTipo === valor ? 'bg-white/20 text-current' : 'bg-base-300 text-base-content/50'
                    }`}>
                      {count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="border-t border-base-300 mt-3 pt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-widest opacity-35 mr-1">Status</span>
                {[
                  { valor: 'todos', label: 'Todos' },
                  { valor: 'assinado', label: 'Assinado' },
                  { valor: 'aguardando_bko', label: 'Ag. BKO' },
                  { valor: 'aguardando_instalacao', label: 'Ag. Instalação' },
                  { valor: 'instalado', label: 'Instalado' },
                  { valor: 'cancelado', label: 'Cancelado' },
                  { valor: 'sem_status', label: 'Sem status' },
                ].map(({ valor, label }) => (
                  <button
                    key={valor}
                    onClick={() => { setFiltroStatus(valor); setPaginaAtual(1) }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                      filtroStatus === valor
                        ? 'bg-primary text-primary-content shadow-sm'
                        : 'bg-base-200 text-base-content/55 hover:bg-base-300 hover:text-base-content'
                    }`}
                  >
                    {label}
                    <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-full leading-none ${
                      filtroStatus === valor ? 'bg-white/20 text-current' : 'bg-base-300 text-base-content/50'
                    }`}>
                      {contagemStatus[valor]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div className="flex-1 min-h-0 flex flex-col px-6 py-4">
            <div className="flex flex-col flex-1 min-h-0 rounded-2xl border border-base-300 bg-base-100 overflow-hidden">
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-base-300">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-base">Vendas</h3>
                  <span className="text-xs font-semibold opacity-35 uppercase tracking-wider">
                    {vendasFiltradasPorStatus.length} resultado{vendasFiltradasPorStatus.length !== 1 ? 's' : ''}
                  </span>
                  {totalPaginas > 1 && (
                    <span className="text-xs opacity-25 font-medium">· página {paginaSegura} de {totalPaginas}</span>
                  )}
                </div>
                {selecionados.length > 0 && (
                  <div style={{ animation: 'slideDown 0.2s ease forwards' }}>
                    <button
                      onClick={() => setModalDelete({ tipo: 'massa' })}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-error/10 text-error text-xs font-semibold hover:bg-error/20 transition-colors duration-200"
                    >
                      <IconTrash size={13} />
                      Excluir {selecionados.length} selecionada{selecionados.length > 1 ? 's' : ''}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-auto min-h-0">
                <table className="table w-full">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider opacity-40">
                      {podeGerenciar && (
                        <th className="bg-base-200/60 w-8">
                          <input
                            type="checkbox"
                            className="checkbox checkbox-error checkbox-sm"
                            checked={todosDaPaginaSelecionados}
                            ref={el => { if (el) el.indeterminate = algunsDaPaginaSelecionados }}
                            onChange={toggleTodosNaPagina}
                            disabled={vendasPaginadas.length === 0}
                          />
                        </th>
                      )}
                      <th className="bg-base-200/60">Cliente</th>
                      <th className="bg-base-200/60">Data</th>
                      <th className="bg-base-200/60">Serviço</th>
                      <th className="bg-base-200/60">Produto</th>
                      <th className="bg-base-200/60">Valor</th>
                      {mostrarVendedor && <th className="bg-base-200/60">Vendedor</th>}
                      <th className="bg-base-200/60">Status</th>
                      {podeGerenciar && <th className="bg-base-200/60 w-10" />}
                    </tr>
                  </thead>
                  <tbody>
                    {vendasPaginadas.map((venda) => {
                      const dataVenda = venda.criadoEm?.toDate()
                      const dataStr = dataVenda
                        ? `${dataVenda.getFullYear()}-${String(dataVenda.getMonth() + 1).padStart(2, '0')}-${String(dataVenda.getDate()).padStart(2, '0')}`
                        : null
                      const isHoje = dataStr === hojeStr
                      const isSelecionado = selecionados.includes(venda.id)
                      const statusStyle = STATUS_STYLES[venda.status] || null

                      return (
                        <tr
                          key={venda.id}
                          className={`border-b border-base-200 transition-colors duration-150 ${
                            isSelecionado ? 'bg-error/8'
                            : isHoje ? 'bg-success/5'
                            : 'hover:bg-base-200/40'
                          }`}
                        >
                          {podeGerenciar && (
                            <td className="w-8">
                              <input
                                type="checkbox"
                                className="checkbox checkbox-error checkbox-sm"
                                checked={isSelecionado}
                                onChange={() => toggleSelecionado(venda.id)}
                              />
                            </td>
                          )}
                          <td className="min-w-[150px]">
                            <div className="font-semibold text-sm">{venda.nome}</div>
                            <div className="text-xs opacity-40 mt-0.5">{venda.contato}</div>
                          </td>
                          <td className="min-w-[120px]">
                            <div className="text-sm">{dataVenda ? dataVenda.toLocaleDateString('pt-BR') : '—'}</div>
                            {isHoje && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                                <span className="text-xs text-success font-medium">hoje</span>
                              </div>
                            )}
                          </td>
                          <td className="min-w-[130px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm">{venda.servico}</span>
                              {venda.tipo === 'upgrade' && (
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0"
                                  style={{
                                    backgroundColor: 'oklch(0.55 0.2 290 / 0.18)',
                                    color: 'oklch(0.72 0.18 290)',
                                    border: '1px solid oklch(0.55 0.2 290 / 0.28)',
                                  }}
                                >
                                  Upgrade
                                </span>
                              )}
                            </div>
                            {venda.tipo === 'upgrade' && venda.planoAnterior && (
                              <div className="text-xs opacity-40 mt-0.5">↑ de {venda.planoAnterior}</div>
                            )}
                          </td>
                          <td className="min-w-[120px]">
                            <span className="text-sm">
                              {venda.produtoVendido || venda.servicoAdicional || '—'}
                            </span>
                          </td>
                          <td className="min-w-[100px]">
                            <span className="text-sm font-semibold">
                              R$ {Number(venda.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </td>
                          {mostrarVendedor && (
                            <td className="min-w-[110px]">
                              <span className="text-sm">
                                {venda.vendedorNome || venda.vendedorNomeExibicao || venda.vendedorEmail?.split('@')[0]}
                              </span>
                            </td>
                          )}
                          <td className="w-[155px] max-w-[155px]">
                            {podeGerenciar ? (
                              <select
                                className={`select select-xs font-semibold border-0 rounded-full w-full cursor-pointer ${
                                  statusStyle ? statusStyle.pill : 'bg-base-300 text-base-content'
                                }`}
                                style={{ fontSize: '11px' }}
                                value={venda.status || ''}
                                onChange={(e) => handleStatusChange(venda.id, e.target.value)}
                              >
                                <option value="">Sem status</option>
                                {STATUS_OPCOES.map(s => (
                                  <option key={s.valor} value={s.valor}>{s.label}</option>
                                ))}
                              </select>
                            ) : (
                              <span
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                  statusStyle ? statusStyle.pill : 'bg-base-300 text-base-content/60'
                                }`}
                              >
                                {STATUS_OPCOES.find(s => s.valor === venda.status)?.label || 'Sem status'}
                              </span>
                            )}
                          </td>
                          {podeGerenciar && (
                            <td className="w-10">
                              <button
                                onClick={() => setModalDelete({ tipo: 'single', id: venda.id })}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-base-content/25 hover:text-error hover:bg-error/10 transition-all duration-200"
                              >
                                <IconTrash size={13} />
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })}

                    {vendasFiltradasPorStatus.length === 0 && (
                      <tr>
                        <td colSpan={totalColunas} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3 opacity-20">
                            <IconInbox />
                            <span className="text-sm font-medium">Nenhuma venda encontrada</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {vendasFiltradasPorStatus.length > 0 && (
                <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-t border-base-300">
                  <span className="text-xs opacity-35 font-medium tabular-nums">
                    {(paginaSegura - 1) * ITENS_POR_PAGINA + 1}–{Math.min(paginaSegura * ITENS_POR_PAGINA, vendasFiltradasPorStatus.length)} de {vendasFiltradasPorStatus.length}
                  </span>

                  {totalPaginas > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                        disabled={paginaSegura === 1}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-base-200 text-base-content/60"
                      >
                        <IconChevronLeft />
                      </button>

                      {buildPageNumbers(paginaSegura, totalPaginas).map((item, idx) =>
                        item === '...' ? (
                          <span key={`dots-${idx}`} className="w-7 h-7 flex items-center justify-center text-xs opacity-25 select-none">…</span>
                        ) : (
                          <button
                            key={item}
                            onClick={() => setPaginaAtual(item)}
                            className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-all duration-150 ${
                              item === paginaSegura
                                ? 'bg-primary text-primary-content shadow-sm'
                                : 'opacity-40 hover:opacity-100 hover:bg-base-200'
                            }`}
                          >
                            {item}
                          </button>
                        )
                      )}

                      <button
                        onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                        disabled={paginaSegura === totalPaginas}
                        className="w-7 h-7 flex items-center justify-center rounded-lg transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-base-200 text-base-content/60"
                      >
                        <IconChevronRight />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Dashboard() {
  const { user, perfil } = useAuth()
  const navigate = useNavigate()
  const isGestor = isGestorOuAdmin(perfil)
  const podeVerTudo = perfilPodeVerTudo(perfil)

  const [vendas, setVendas] = useState([])
  const [modalVendas, setModalVendas] = useState(false)
  const [diaRanking, setDiaRanking] = useState('hoje')

  useEffect(() => {
    const q = query(collection(db, 'vendas'), orderBy('criadoEm', 'desc'))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const arrayVendas = []
      querySnapshot.forEach((doc) => {
        arrayVendas.push({ id: doc.id, ...doc.data() })
      })
      setVendas(arrayVendas)
    }, () => console.error('Erro ao buscar vendas'))
    return () => unsubscribe()
  }, [])

  const hoje = new Date()
  const hojeStr = toDateStr(hoje)
  const ontem = new Date(hoje)
  ontem.setDate(hoje.getDate() - 1)
  const ontemStr = toDateStr(ontem)
  const { inicio: inicioMes, fim: fimMes } = getPeriodoAtual()

  const vendasVisiveis = vendas.filter(venda =>
    podeVerTudo
      ? true
      : venda.vendedorEmail?.toLowerCase() === user?.email?.toLowerCase()
  )

  const vendasDoDia = (dStr) => vendasVisiveis.filter(venda =>
    venda.criadoEm && toDateStr(venda.criadoEm.toDate()) === dStr
  )
  const vendasHoje = vendasDoDia(hojeStr)
  const vendasOntem = vendasDoDia(ontemStr)

  const vendasMes = vendasVisiveis.filter(venda => {
    if (!venda.criadoEm) return false
    const dataVenda = venda.criadoEm.toDate()
    return dataVenda >= inicioMes && dataVenda <= fimMes
  })

  const upgradesHoje = vendasHoje.filter(v => v.tipo === 'upgrade').length
  const novasHoje = vendasHoje.filter(v => !v.tipo || v.tipo === 'nova_venda').length
  const upgradesOntem = vendasOntem.filter(v => v.tipo === 'upgrade').length
  const novasOntem = vendasOntem.filter(v => !v.tipo || v.tipo === 'nova_venda').length
  const dataHojeFmt = hoje.toLocaleDateString('pt-BR')
  const dataOntemFmt = ontem.toLocaleDateString('pt-BR')
  const totalHoje = vendasHoje.reduce((acc, v) => acc + Number(v.valor), 0)
  const totalMes = vendasMes.reduce((acc, v) => acc + Number(v.valor), 0)

  // Rankings rápidos (time inteiro, hoje ou ontem)
  const diaRankingStr = diaRanking === 'hoje' ? hojeStr : ontemStr
  const contarNoDia = (email, ehUpg) => vendas.filter(v => {
    if (!v.criadoEm || v.vendedorEmail?.toLowerCase() !== email.toLowerCase()) return false
    if (toDateStr(v.criadoEm.toDate()) !== diaRankingStr) return false
    return ehUpg ? v.tipo === 'upgrade' : (!v.tipo || v.tipo === 'nova_venda')
  }).length
  const rankingVendas = vendedoresDasVendas(vendas)
    .map(({ email, nome }) => ({ email, nome, qtd: contarNoDia(email, false) }))
    .sort((a, b) => b.qtd - a.qtd)
  const rankingUpgrades = vendedoresDasVendas(vendas.filter(v => v.tipo === 'upgrade'))
    .map(({ email, nome }) => ({ email, nome, qtd: contarNoDia(email, true) }))
    .sort((a, b) => b.qtd - a.qtd)
  const medalRank = [
    { text: 'oklch(0.72 0.18 85)', bg: 'oklch(0.78 0.19 85 / 0.14)', row: 'oklch(0.78 0.19 85 / 0.06)' },
    { text: 'oklch(0.67 0.03 220)', bg: 'oklch(0.67 0.02 220 / 0.12)', row: 'oklch(0.67 0.02 220 / 0.05)' },
    { text: 'oklch(0.59 0.12 50)', bg: 'oklch(0.60 0.12 50 / 0.12)', row: 'oklch(0.60 0.12 50 / 0.06)' },
  ]
  const renderRanking = (titulo, lista, unidade, avatarBg, avatarColor) => (
    <div className="rounded-2xl border border-base-300 bg-base-100 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-base-300 flex items-center justify-between">
        <h3 className="text-sm font-bold">{titulo}</h3>
        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-35">
          {diaRanking === 'hoje' ? `Hoje · ${dataHojeFmt}` : `Ontem · ${dataOntemFmt}`}
        </span>
      </div>
      <div>
        {lista.map(({ email, nome, qtd }, i) => {
          const isMe = email.toLowerCase() === user?.email?.toLowerCase()
          const medal = i < 3 && qtd > 0 ? medalRank[i] : null
          return (
            <div
              key={email}
              className={`flex items-center gap-3 px-5 py-2.5 border-b border-base-300/40 last:border-0${!medal && isMe ? ' bg-base-200/50' : ''}`}
              style={medal ? { backgroundColor: medal.row } : undefined}
            >
              <div className="w-6 h-6 flex items-center justify-center rounded-md text-[11px] font-black flex-shrink-0" style={medal ? { backgroundColor: medal.bg, color: medal.text } : { color: 'oklch(var(--bc) / 0.25)' }}>{i + 1}</div>
              <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}&background=${avatarBg}&color=${avatarColor}&size=40&bold=true&format=png`} alt={nome} className="w-7 h-7 rounded-full flex-shrink-0" />
              <span className="flex-1 text-sm font-semibold truncate">
                {nome}
                {isMe && <span className="ml-1 text-[10px] font-medium opacity-35">você</span>}
              </span>
              <div className="flex items-baseline gap-1 flex-shrink-0">
                <span className="text-sm font-black tabular-nums" style={medal ? { color: medal.text } : (qtd === 0 ? { color: 'oklch(0.62 0.19 25)', opacity: 0.75 } : undefined)}>{qtd}</span>
                <span className="text-[10px] opacity-30">{unidade}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const nomeUsuario = nomeDoUsuario(user, perfil)

  return (
    <div className="p-6 max-w-6xl mx-auto w-full" style={{ animation: 'slideDown 0.4s ease forwards' }}>

      {modalVendas && (
        <ModalMinhasVendas
          vendas={vendas}
          user={user}
          isGestor={isGestor}
          podeVerTudo={podeVerTudo}
          onClose={() => setModalVendas(false)}
        />
      )}

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-35 mb-1">Dashboard</p>
          <h1 className="text-2xl font-bold">Olá, {nomeUsuario}</h1>
          <p className="text-xs opacity-40 mt-1 font-medium">{inicioMes.toLocaleDateString('pt-BR')} → {fimMes.toLocaleDateString('pt-BR')}</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {vendasHoje.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
              <span className="w-1.5 h-1.5 rounded-full bg-success" style={{ animation: 'pulse 2s infinite' }} />
              <span className="text-xs font-semibold text-success">
                {vendasHoje.length} venda{vendasHoje.length > 1 ? 's' : ''} hoje
              </span>
            </div>
          )}
          <button
            onClick={() => setModalVendas(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-base-200 text-base-content text-xs font-semibold hover:bg-base-300 active:scale-95 transition-all duration-200"
          >
            <IconList />
            Minhas Vendas
          </button>
          <button
            onClick={() => navigate('/nova-venda')}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary text-primary-content text-xs font-semibold shadow-sm hover:opacity-90 active:scale-95 transition-all duration-200"
          >
            <IconPlus />
            Nova venda
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="col-span-2 rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, oklch(0.52 0.18 150), oklch(0.36 0.14 150))' }}
        >
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute bottom-0 right-8 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Total do Mês</p>
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60">
                <IconTrendingUp />
              </div>
            </div>
            <p className="text-4xl font-bold text-white leading-none">
              R$ {totalMes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-white/50 mt-3">
              {vendasMes.length} venda{vendasMes.length !== 1 ? 's' : ''} no período
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-5 border border-base-300 bg-base-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-40">Hoje</p>
            <div className="w-7 h-7 rounded-lg bg-base-200 flex items-center justify-center opacity-40">
              <IconSunCard />
            </div>
          </div>
          <p className="text-2xl font-bold leading-none">
            R$ {totalHoje.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs opacity-35 mt-3">{vendasHoje.length} venda{vendasHoje.length !== 1 ? 's' : ''}</p>
        </div>

        <div className="rounded-2xl p-5 border border-base-300 bg-base-100">
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-40">Qtd. Mês</p>
            <div className="w-7 h-7 rounded-lg bg-base-200 flex items-center justify-center opacity-40">
              <IconBarChart />
            </div>
          </div>
          <p className="text-2xl font-bold leading-none">{vendasMes.length}</p>
          <p className="text-xs opacity-35 mt-3">vendas no período</p>
        </div>

        {/* Vendas Hoje — destaque */}
        <div
          className="col-span-2 rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, oklch(0.5 0.17 150), oklch(0.34 0.13 150))' }}
        >
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute bottom-0 right-8 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Vendas Hoje</p>
                <p className="text-[11px] text-white/45 mt-0.5 font-medium tabular-nums">{dataHojeFmt}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60">
                <IconZap />
              </div>
            </div>
            <p className="text-5xl font-black text-white leading-none">{novasHoje}</p>
            <p className="text-sm text-white/50 mt-3">nova{novasHoje !== 1 ? 's' : ''} venda{novasHoje !== 1 ? 's' : ''} hoje</p>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/45">Ontem · {dataOntemFmt}</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white/85 tabular-nums leading-none">{novasOntem}</span>
                {novasHoje !== novasOntem && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/70 tabular-nums">
                    {novasHoje > novasOntem ? `↑ +${novasHoje - novasOntem} hoje` : `↓ ${novasHoje - novasOntem} hoje`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upgrades Hoje — destaque */}
        <div
          className="col-span-2 rounded-2xl p-6 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, oklch(0.48 0.2 290), oklch(0.33 0.15 290))' }}
        >
          <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute bottom-0 right-8 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Upgrades Hoje</p>
                <p className="text-[11px] text-white/45 mt-0.5 font-medium tabular-nums">{dataHojeFmt}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60">
                <IconTrendingUp />
              </div>
            </div>
            <p className="text-5xl font-black text-white leading-none">{upgradesHoje}</p>
            <p className="text-sm text-white/50 mt-3">upgrade{upgradesHoje !== 1 ? 's' : ''} hoje</p>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/45">Ontem · {dataOntemFmt}</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white/85 tabular-nums leading-none">{upgradesOntem}</span>
                {upgradesHoje !== upgradesOntem && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-white/70 tabular-nums">
                    {upgradesHoje > upgradesOntem ? `↑ +${upgradesHoje - upgradesOntem} hoje` : `↓ ${upgradesHoje - upgradesOntem} hoje`}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ranking rápido — time inteiro */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-35">Ranking do dia</p>
          <div className="flex gap-1 p-1 rounded-full bg-base-200">
            {[
              { valor: 'hoje', label: 'Hoje' },
              { valor: 'ontem', label: 'Ontem' },
            ].map(({ valor, label }) => (
              <button
                key={valor}
                onClick={() => setDiaRanking(valor)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  diaRanking === valor
                    ? 'bg-primary text-primary-content shadow-sm'
                    : 'text-base-content/50 hover:text-base-content'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {renderRanking('Ranking · Vendas', rankingVendas, 'vendas', '1a2e1a', '4ade80')}
          {renderRanking('Ranking · Upgrades', rankingUpgrades, 'upg', '1a1a2e', '60a5fa')}
        </div>
      </div>

    </div>
  )
}
