import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { isGestorOuAdmin } from '../../config/roles'

function gerarApiKey() {
  const uuid = crypto.randomUUID().replace(/-/g, '')
  return `amsk_${uuid}`
}

const IconX = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
)

const IconKey = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5"/>
    <path d="M21 2l-9.6 9.6M15.5 7.5l3 3"/>
  </svg>
)

const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2"/>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)

const IconRefresh = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
)

const IconEdit = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const IconWarning = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
)

const PAGINAS_APP = [
  { chave: 'dashboard', label: 'Dashboard', descricao: 'Visão geral de vendas e rankings', fixa: true },
  { chave: 'nova-venda', label: 'Nova Venda', descricao: 'Registrar vendas e upgrades' },
  { chave: 'metas', label: 'Metas', descricao: 'Metas individuais e do setor' },
  { chave: 'comissao', label: 'Comissão', descricao: 'Cálculo de comissões' },
  { chave: 'upgrades', label: 'Upgrades', descricao: 'Esteira de gestão de upgrades' },
  { chave: 'minhas-vendas', label: 'Minhas Vendas', descricao: 'Histórico de vendas registradas' },
  { chave: 'fila', label: 'Fila', descricao: 'Fila de atendimento' },
]

const PAGINAS_PADRAO = PAGINAS_APP.filter(p => p.chave !== 'upgrades').map(p => p.chave)

// Analista acompanha resultados de todo o time, sem operar — tudo menos registrar venda
const PAGINAS_ANALISTA = PAGINAS_APP.filter(p => p.chave !== 'nova-venda').map(p => p.chave)

const PERFIS_SELECIONAVEIS = [
  { valor: 'vendedor', label: 'Vendedor', descricao: 'Registra e acompanha as próprias vendas' },
  { valor: 'analista', label: 'Analista', descricao: 'Acompanha os dados de vendas e metas de todo o time, sem editar' },
]

const ROLE_STYLES = {
  admin:    { label: 'Admin',    cls: 'bg-violet-500/10 text-violet-400 border border-violet-500/20' },
  gestor:   { label: 'Gestor',   cls: 'bg-info/10 text-info border border-info/20' },
  analista: { label: 'Analista', cls: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' },
  vendedor: { label: 'Vendedor', cls: 'bg-base-200 text-base-content/45 border border-base-300' },
}

function RoleBadge({ role }) {
  const s = ROLE_STYLES[role] || ROLE_STYLES.vendedor
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide ${s.cls}`}>
      {s.label}
    </span>
  )
}

export default function Usuarios() {
  const { user, perfil } = useAuth()
  const navigate = useNavigate()

  const [firestoreUsers, setFirestoreUsers] = useState({})
  const [modalApiKey, setModalApiKey] = useState(null)
  const [gerando, setGerando] = useState(new Set())
  const [togglingStatus, setTogglingStatus] = useState(new Set())
  const [copiado, setCopiado] = useState(false)
  const [decidindo, setDecidindo] = useState(new Set())
  const [modalAprovar, setModalAprovar] = useState(null)
  const [paginasSelecionadas, setPaginasSelecionadas] = useState(PAGINAS_PADRAO)
  const [roleSelecionado, setRoleSelecionado] = useState('vendedor')
  const isGestor = isGestorOuAdmin(perfil)

  useEffect(() => {
    if (!isGestor) navigate('/dashboard', { replace: true })
  }, [isGestor, navigate])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      const data = {}
      snap.docs.forEach(d => { data[d.id] = d.data() })
      setFirestoreUsers(data)
    })
    return () => unsub()
  }, [])

  const usuarios = Object.entries(firestoreUsers)
    .filter(([, fs]) => fs.aprovacao === 'aprovado' || fs.role)
    .map(([email, fs]) => ({
      email,
      nome: fs.nome || email.split('@')[0],
      role: fs.role || 'vendedor',
      status: fs.status || 'ativo',
      paginas: Array.isArray(fs.paginas) ? fs.paginas : null,
      temApiKey: Boolean(fs.apiKey),
      apiKeyMasked: fs.apiKey ? `${fs.apiKey.slice(0, 12)}${'•'.repeat(20)}` : null,
    }))

  // Cadastros aguardando aprovação de um gestor
  const pendentes = Object.entries(firestoreUsers)
    .filter(([, fs]) => fs.aprovacao === 'pendente')
    .map(([email, fs]) => ({
      email,
      nome: fs.nome || email.split('@')[0],
      criadoEm: fs.criadoEm,
    }))

  const abrirModalAprovar = (pendente) => {
    setRoleSelecionado('vendedor')
    setPaginasSelecionadas(PAGINAS_PADRAO)
    setModalAprovar({ ...pendente, modo: 'aprovar' })
  }

  const abrirModalEditar = (u) => {
    const role = u.role === 'analista' ? 'analista' : 'vendedor'
    setRoleSelecionado(role)
    setPaginasSelecionadas(u.paginas || (role === 'analista' ? PAGINAS_ANALISTA : PAGINAS_PADRAO))
    setModalAprovar({ email: u.email, nome: u.nome, modo: 'editar' })
  }

  const selecionarRole = (role) => {
    setRoleSelecionado(role)
    setPaginasSelecionadas(role === 'analista' ? PAGINAS_ANALISTA : PAGINAS_PADRAO)
  }

  const togglePagina = (chave) => {
    setPaginasSelecionadas(prev =>
      prev.includes(chave) ? prev.filter(p => p !== chave) : [...prev, chave]
    )
  }

  const salvarAcesso = async () => {
    const { email, modo } = modalAprovar
    setDecidindo(prev => new Set([...prev, email]))
    try {
      const payload = {
        role: roleSelecionado,
        paginas: paginasSelecionadas,
      }
      if (modo === 'aprovar') {
        payload.aprovacao = 'aprovado'
        payload.aprovadoPor = user?.email || null
        payload.aprovadoEm = serverTimestamp()
      } else {
        payload.acessoAtualizadoPor = user?.email || null
        payload.acessoAtualizadoEm = serverTimestamp()
      }
      await setDoc(doc(db, 'users', email), payload, { merge: true })
      setModalAprovar(null)
    } catch {
      console.error('Erro ao salvar acesso')
    } finally {
      setDecidindo(prev => { const s = new Set(prev); s.delete(email); return s })
    }
  }

  const handleRecusar = async (email) => {
    setDecidindo(prev => new Set([...prev, email]))
    try {
      await setDoc(doc(db, 'users', email), {
        aprovacao: 'recusado',
        aprovadoPor: user?.email || null,
        aprovadoEm: serverTimestamp(),
      }, { merge: true })
    } catch {
      console.error('Erro ao recusar usuário')
    } finally {
      setDecidindo(prev => { const s = new Set(prev); s.delete(email); return s })
    }
  }

  const handleToggleStatus = async (email, statusAtual) => {
    setTogglingStatus(prev => new Set([...prev, email]))
    try {
      await setDoc(doc(db, 'users', email), {
        status: statusAtual === 'ativo' ? 'inativo' : 'ativo',
      }, { merge: true })
    } catch {
      console.error('Erro ao atualizar status do usuário')
    } finally {
      setTogglingStatus(prev => { const s = new Set(prev); s.delete(email); return s })
    }
  }

  const handleGerarApiKey = async (email, nome) => {
    setGerando(prev => new Set([...prev, email]))
    try {
      const key = gerarApiKey()
      await setDoc(doc(db, 'users', email), {
        apiKey: key,
        apiKeyCreatedAt: serverTimestamp(),
      }, { merge: true })
      setModalApiKey({ email, nome, key })
      setCopiado(false)
    } catch {
      console.error('Erro ao gerar API key')
    } finally {
      setGerando(prev => { const s = new Set(prev); s.delete(email); return s })
    }
  }

  const handleCopiar = async () => {
    if (!modalApiKey?.key) return
    await navigator.clipboard.writeText(modalApiKey.key)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2500)
  }

  if (!isGestor) return null

  return (
    <div className="p-6 max-w-5xl mx-auto w-full" style={{ animation: 'slideDown 0.4s ease forwards' }}>

      {/* Modal — API Key */}
      {modalApiKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md mx-4 rounded-3xl border border-base-300 overflow-hidden"
            style={{
              animation: 'slideDown 0.3s ease forwards',
              backdropFilter: 'blur(20px)',
              backgroundColor: 'oklch(var(--b1) / 0.97)',
              boxShadow: '0 0 48px rgba(0,0,0,0.45)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-base-300">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
                  <IconKey />
                </div>
                <div>
                  <h2 className="font-bold text-sm">API Key Gerada</h2>
                  <p className="text-xs opacity-40 mt-0.5">{modalApiKey.nome}</p>
                </div>
              </div>
              <button
                onClick={() => setModalApiKey(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-200 transition-all duration-200"
              >
                <IconX />
              </button>
            </div>

            <div className="px-6 py-5 flex flex-col gap-4">
              {/* Aviso */}
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-warning/8 border border-warning/20">
                <span className="text-warning mt-0.5 flex-shrink-0"><IconWarning /></span>
                <p className="text-xs font-medium" style={{ color: 'oklch(0.72 0.15 80)' }}>
                  Copie agora. Esta chave <strong>não será exibida novamente</strong> após fechar este modal.
                </p>
              </div>

              {/* Key display */}
              <div
                className="rounded-2xl border border-base-300 bg-base-200/60 px-4 py-3.5 flex items-center justify-between gap-3"
              >
                <span className="text-xs font-mono tracking-tight break-all leading-relaxed opacity-80 select-all">
                  {modalApiKey.key}
                </span>
              </div>

              {/* Copy button */}
              <button
                onClick={handleCopiar}
                className={`w-full h-11 rounded-2xl flex items-center justify-center gap-2 text-sm font-semibold transition-all duration-200 ${
                  copiado
                    ? 'bg-success/10 text-success border border-success/25'
                    : 'bg-primary text-primary-content hover:opacity-90 active:scale-95'
                }`}
              >
                {copiado ? (
                  <><IconCheck />Copiado!</>
                ) : (
                  <><IconCopy />Copiar chave</>
                )}
              </button>
            </div>

            <div className="px-6 pb-5">
              <button
                onClick={() => setModalApiKey(null)}
                className="w-full btn btn-ghost rounded-xl text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Aprovar usuário */}
      {modalAprovar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-md mx-4 rounded-3xl border border-base-300 overflow-hidden"
            style={{
              animation: 'slideDown 0.3s ease forwards',
              backdropFilter: 'blur(20px)',
              backgroundColor: 'oklch(var(--b1) / 0.97)',
              boxShadow: '0 0 48px rgba(0,0,0,0.45)',
              maxHeight: 'calc(100vh - 48px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 flex-shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(modalAprovar.nome)}&background=1a2e1a&color=4ade80&size=64&bold=true&format=png`}
                  alt={modalAprovar.nome}
                  className="w-9 h-9 rounded-full flex-shrink-0"
                />
                <div>
                  <h2 className="font-bold text-sm">
                    {modalAprovar.modo === 'aprovar' ? `Aprovar ${modalAprovar.nome}?` : `Editar acesso de ${modalAprovar.nome}`}
                  </h2>
                  <p className="text-xs opacity-40 mt-0.5">{modalAprovar.email}</p>
                </div>
              </div>
              <button
                onClick={() => setModalAprovar(null)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-base-content/40 hover:text-base-content hover:bg-base-200 transition-all duration-200"
              >
                <IconX />
              </button>
            </div>

            {/* Seleção de perfil e páginas */}
            <div className="px-6 py-5 overflow-y-auto">
              <p className="text-xs font-semibold uppercase tracking-widest opacity-35 mb-3">Perfil</p>
              <div className="flex flex-col gap-2 mb-5">
                {PERFIS_SELECIONAVEIS.map((perfil) => (
                  <label
                    key={perfil.valor}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-200 ${
                      roleSelecionado === perfil.valor
                        ? 'border-primary/25 bg-primary/5'
                        : 'border-base-300 bg-base-100 hover:bg-base-200/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="perfil-usuario"
                      className="radio radio-primary radio-sm"
                      checked={roleSelecionado === perfil.valor}
                      onChange={() => selecionarRole(perfil.valor)}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        {perfil.label}
                        <RoleBadge role={perfil.valor} />
                      </div>
                      <div className="text-xs opacity-40 mt-0.5">{perfil.descricao}</div>
                    </div>
                  </label>
                ))}
              </div>

              <p className="text-xs font-semibold uppercase tracking-widest opacity-35 mb-3">
                O que este usuário pode ver no menu
              </p>
              <div className="flex flex-col gap-2">
                {PAGINAS_APP.map((pagina) => {
                  const marcada = pagina.fixa || paginasSelecionadas.includes(pagina.chave)
                  return (
                    <label
                      key={pagina.chave}
                      className={`flex items-center gap-3 px-4 py-3 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        marcada
                          ? 'border-primary/25 bg-primary/5'
                          : 'border-base-300 bg-base-100 hover:bg-base-200/60'
                      } ${pagina.fixa ? 'cursor-default opacity-80' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="checkbox checkbox-primary checkbox-sm"
                        checked={marcada}
                        disabled={pagina.fixa}
                        onChange={() => togglePagina(pagina.chave)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold flex items-center gap-2">
                          {pagina.label}
                          {pagina.fixa && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider opacity-35">sempre visível</span>
                          )}
                        </div>
                        <div className="text-xs opacity-40 mt-0.5 truncate">{pagina.descricao}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 pt-1 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setModalAprovar(null)}
                disabled={decidindo.has(modalAprovar.email)}
                className="btn btn-ghost flex-1 rounded-xl text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={salvarAcesso}
                disabled={decidindo.has(modalAprovar.email)}
                className="btn btn-primary flex-1 rounded-xl text-sm font-bold"
              >
                {decidindo.has(modalAprovar.email)
                  ? <span className="loading loading-spinner loading-xs" />
                  : modalAprovar.modo === 'aprovar' ? 'Aprovar acesso' : 'Salvar acesso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest opacity-35 mb-1">Gestão</p>
        <h1 className="text-2xl font-bold">Usuários</h1>
        <p className="text-xs opacity-40 mt-1 font-medium">
          {usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''} cadastrado{usuarios.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Cadastros aguardando aprovação */}
      {pendentes.length > 0 && (
        <div
          className="rounded-2xl border border-warning/25 bg-warning/5 overflow-hidden mb-6"
          style={{ animation: 'slideDown 0.3s ease forwards' }}
        >
          <div className="flex items-center gap-2.5 px-5 py-4 border-b border-warning/15">
            <span className="w-2 h-2 rounded-full bg-warning flex-shrink-0" style={{ animation: 'pulse 2s infinite' }} />
            <h2 className="font-bold text-base">Aguardando aprovação</h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-warning/15 text-warning tabular-nums">
              {pendentes.length}
            </span>
          </div>
          <div>
            {pendentes.map((p) => (
              <div key={p.email} className="flex items-center gap-3 px-5 py-3.5 border-b border-base-300/40 last:border-0">
                <img
                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(p.nome)}&background=2e2a1a&color=facc15&size=64&bold=true&format=png`}
                  alt={p.nome}
                  className="w-10 h-10 rounded-full flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{p.nome}</div>
                  <div className="text-xs opacity-40 truncate">
                    {p.email}
                    {p.criadoEm && ` · solicitado em ${p.criadoEm.toDate().toLocaleDateString('pt-BR')}`}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRecusar(p.email)}
                    disabled={decidindo.has(p.email)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-all duration-200 active:scale-95"
                  >
                    {decidindo.has(p.email)
                      ? <span className="loading loading-spinner loading-xs" />
                      : 'Recusar'}
                  </button>
                  <button
                    onClick={() => abrirModalAprovar(p)}
                    disabled={decidindo.has(p.email)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-success/10 text-success border border-success/25 hover:bg-success/20 transition-all duration-200 active:scale-95"
                  >
                    Aprovar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="rounded-2xl border border-base-300 bg-base-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-base">Todos os Usuários</h2>
            <span className="text-xs font-semibold opacity-35 uppercase tracking-wider">
              {usuarios.length}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr className="text-xs uppercase tracking-wider opacity-40">
                <th className="bg-base-200/60">Usuário</th>
                <th className="bg-base-200/60">Role</th>
                <th className="bg-base-200/60">Status</th>
                <th className="bg-base-200/60">Acesso</th>
                <th className="bg-base-200/60">API Key</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr
                  key={u.email}
                  className="border-b border-base-200 hover:bg-base-200/40 transition-colors duration-150"
                >
                  {/* Usuário */}
                  <td className="min-w-[220px]">
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(u.nome)}&background=1a2e1a&color=4ade80&size=64&bold=true&format=png`}
                        alt={u.nome}
                        className="w-10 h-10 rounded-full flex-shrink-0"
                      />
                      <div>
                        <div className="font-semibold text-sm">{u.nome}</div>
                        <div className="text-xs opacity-35 mt-0.5">{u.email}</div>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="min-w-[110px]">
                    <RoleBadge role={u.role} />
                  </td>

                  {/* Status */}
                  <td className="min-w-[110px]">
                    <button
                      onClick={() => handleToggleStatus(u.email, u.status)}
                      disabled={togglingStatus.has(u.email)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 hover:opacity-80 active:scale-95 ${
                        u.status === 'ativo'
                          ? 'bg-success/8 text-success border-success/20'
                          : 'bg-base-200 text-base-content/35 border-base-300'
                      }`}
                    >
                      {togglingStatus.has(u.email) ? (
                        <span className="loading loading-spinner loading-xs" />
                      ) : (
                        <span
                          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                            u.status === 'ativo' ? 'bg-success' : 'bg-base-content/25'
                          }`}
                          style={u.status === 'ativo' ? { animation: 'pulse 2s infinite' } : undefined}
                        />
                      )}
                      {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>

                  {/* Acesso */}
                  <td className="min-w-[140px]">
                    {u.role === 'admin' || u.role === 'gestor' ? (
                      <span className="text-xs opacity-25 font-medium">Completo</span>
                    ) : (
                      <button
                        onClick={() => abrirModalEditar(u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-base-200 text-base-content/55 hover:bg-base-300 hover:text-base-content transition-all duration-200 active:scale-95"
                      >
                        <IconEdit />
                        Editar acesso
                      </button>
                    )}
                  </td>

                  {/* API Key */}
                  <td className="min-w-[260px]">
                    {u.role === 'admin' || u.role === 'gestor' ? (
                      <div className="flex items-center gap-2.5">
                        {u.temApiKey && (
                          <span className="text-xs font-mono opacity-30 tracking-tight">
                            {u.apiKeyMasked}
                          </span>
                        )}
                        <button
                          onClick={() => handleGerarApiKey(u.email, u.nome)}
                          disabled={gerando.has(u.email)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-95 flex-shrink-0 ${
                            u.temApiKey
                              ? 'bg-base-200 text-base-content/55 hover:bg-base-300'
                              : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/15'
                          }`}
                        >
                          {gerando.has(u.email) ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : u.temApiKey ? (
                            <><IconRefresh />Regenerar</>
                          ) : (
                            <><IconKey />Gerar API Key</>
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs opacity-20">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
