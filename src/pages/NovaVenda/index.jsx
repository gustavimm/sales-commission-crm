import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import confetti from 'canvas-confetti'
import { nomeDoUsuario } from '../../config/roles'

const PLANOS = [
  { nome: 'Fibra 100', valor: 79.90, categoria: 'residencial' },
  { nome: 'Fibra 300', valor: 99.90, categoria: 'residencial' },
  { nome: 'Fibra 500', valor: 119.90, categoria: 'residencial' },
  { nome: 'Fibra 1G', valor: 149.90, categoria: 'residencial' },
  { nome: 'Empresa 300', valor: 139.90, categoria: 'empresa' },
  { nome: 'Empresa 600', valor: 199.90, categoria: 'empresa' },
  { nome: 'Empresa 1G', valor: 289.90, categoria: 'empresa' },
]

const FRASES = [
  'Venda registrada com sucesso!',
  'Mais uma conquista para o time!',
  'Excelente trabalho!',
  'Bora para a próxima!',
  'Ótimo ritmo de vendas!',
  'Cliente bem atendido!',
  'Registro concluído!',
  'Mandou bem!',
]

function dispararConfete() {
  confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#22c55e', '#16a34a', '#4ade80', '#fbbf24', '#ffffff'] })
  setTimeout(() => confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors: ['#22c55e', '#fbbf24', '#ffffff'] }), 200)
  setTimeout(() => confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors: ['#22c55e', '#fbbf24', '#ffffff'] }), 400)
}

function formatarContato(valor) {
  const nums = valor.replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 2) return `(${nums}`
  if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
  if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
}

const Field = ({ label, children, hint, hintExiting, noGlow }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-xs font-semibold opacity-40 uppercase tracking-widest ml-0.5">
      {label}
    </label>
    <div className="relative">
      {noGlow ? children : <div className="field-glow rounded-2xl">{children}</div>}
      {hint && (
        <p
          className="absolute top-full left-0 flex items-center gap-1 mt-1 ml-1 pointer-events-none"
          style={{
            animation: hintExiting ? 'slideUp 0.22s ease forwards' : 'slideDown 0.25s ease forwards',
            fontSize: '0.7rem',
            color: 'oklch(0.65 0.1 80)',
            opacity: 0.7,
            letterSpacing: '0.01em',
            zIndex: 10,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.8 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {hint}
        </p>
      )}
    </div>
  </div>
)

const cardStyle = {
  backdropFilter: 'blur(48px)',
  WebkitBackdropFilter: 'blur(48px)',
  backgroundColor: 'oklch(var(--b1) / 0.55)',
  border: '1px solid oklch(1 0 0 / 0.07)',
  boxShadow: [
    '0 0 0 1px oklch(0.55 0.2 150 / 0.13)',
    '0 0 120px oklch(0.55 0.2 150 / 0.09)',
    '0 1px 0 0 oklch(1 0 0 / 0.1) inset',
    '0 48px 96px -24px rgba(0,0,0,0.65)',
    '0 20px 40px -10px rgba(0,0,0,0.4)',
  ].join(', '),
}

const headerStyle = {
  background: 'linear-gradient(135deg, oklch(0.55 0.18 150 / 0.14) 0%, oklch(0.55 0.18 150 / 0.03) 100%)',
  borderBottom: '1px solid oklch(1 0 0 / 0.06)',
}

const TITULO = 'Registrar Nova Venda'

const criarItemAdicional = () => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  tipo: 'Chip',
  descricao: 'Chip',
  valor: '',
})

export default function NovaVenda() {
  const { user, perfil } = useAuth()
  const navigate = useNavigate()
  const temAcessoUpgrade = perfil?.role === 'gestor' || perfil?.role === 'admin'

  const [displayText, setDisplayText] = useState('')
  const [typewriterDone, setTypewriterDone] = useState(false)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayText(TITULO.slice(0, i))
      if (i === TITULO.length) {
        clearInterval(interval)
        setTypewriterDone(true)
      }
    }, 55)
    return () => clearInterval(interval)
  }, [])

  const [form, setForm] = useState({ contratoId: '', nome: '', contato: '', servico: '', valor: '' })
  const [categoriaPlano, setCategoriaPlano] = useState('residencial')
  const [loading, setLoading] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [frase, setFrase] = useState('')
  const [error, setError] = useState('')
  const [tipoRegistro, setTipoRegistro] = useState('nova_venda')
  const [valorAnterior, setValorAnterior] = useState('')
  const [produtoVendido, setProdutoVendido] = useState('')
  const [categoriaUpgrade, setCategoriaUpgrade] = useState('padrao')
  const [dataAssinatura, setDataAssinatura] = useState(() => {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  })
  const [dataVenda, setDataVenda] = useState(() => {
    const hoje = new Date()
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
  })
  const [ultimoTipo, setUltimoTipo] = useState('nova_venda')
  const [avisoClienteId, setAvisoClienteId] = useState(false)
  const [avisoClienteIdSaindo, setAvisoClienteIdSaindo] = useState(false)
  const [avisoNome, setAvisoNome] = useState(false)
  const [avisoNomeSaindo, setAvisoNomeSaindo] = useState(false)
  const [temServAdicional, setTemServAdicional] = useState(false)
  const [servicosAdicionais, setServicosAdicionais] = useState(() => [criarItemAdicional()])

  const handleClienteId = (e) => {
    const raw = e.target.value
    if (/\D/.test(raw)) {
      setAvisoClienteId(true)
      setAvisoClienteIdSaindo(false)
      clearTimeout(handleClienteId._timer)
      clearTimeout(handleClienteId._exitTimer)
      handleClienteId._timer = setTimeout(() => {
        setAvisoClienteIdSaindo(true)
        handleClienteId._exitTimer = setTimeout(() => {
          setAvisoClienteId(false)
          setAvisoClienteIdSaindo(false)
        }, 250)
      }, 2000)
    }
    setForm({ ...form, contratoId: raw.replace(/\D/g, '') })
  }

  const handleNome = (e) => {
    const raw = e.target.value
    if (/[^a-zA-ZÀ-ÿ\s]/.test(raw)) {
      setAvisoNome(true)
      setAvisoNomeSaindo(false)
      clearTimeout(handleNome._timer)
      clearTimeout(handleNome._exitTimer)
      handleNome._timer = setTimeout(() => {
        setAvisoNomeSaindo(true)
        handleNome._exitTimer = setTimeout(() => {
          setAvisoNome(false)
          setAvisoNomeSaindo(false)
        }, 250)
      }, 2000)
    }
    setForm({ ...form, nome: raw.replace(/[^a-zA-ZÀ-ÿ\s]/g, '') })
  }

  const handleContato = (e) => setForm({ ...form, contato: formatarContato(e.target.value) })

  const handlePlanoChange = (e) => {
    const plano = PLANOS.find(p => p.nome === e.target.value)
    setForm({ ...form, servico: plano?.nome || '', valor: plano?.valor || '' })
  }

  const handleTipoChange = (tipo) => {
    setTipoRegistro(tipo)
    if (tipo !== 'upgrade') {
      setValorAnterior('')
      setProdutoVendido('')
    }
    setTemServAdicional(false)
    setServicosAdicionais([criarItemAdicional()])
    setForm({ contratoId: '', nome: '', contato: '', servico: '', valor: '' })
  }

  const atualizarServicoAdicional = (id, campo, valor) => {
    setServicosAdicionais(items => items.map(item => {
      if (item.id !== id) return item
      const atualizado = { ...item, [campo]: valor }
      if (campo === 'tipo' && item.descricao === item.tipo) {
        atualizado.descricao = valor
      }
      return atualizado
    }))
  }

  const adicionarServicoAdicional = () => {
    setServicosAdicionais(items => [...items, criarItemAdicional()])
  }

  const removerServicoAdicional = (id) => {
    setServicosAdicionais(items => items.length > 1 ? items.filter(item => item.id !== id) : items)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSaindo(false)
    setSucesso(false)

    try {
      const hoje = new Date()
      const hojeISO = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`
      let criadoEm = serverTimestamp()
      if (tipoRegistro === 'nova_venda' && dataVenda && dataVenda !== hojeISO) {
        const [ano, mes, dia] = dataVenda.split('-').map(Number)
        const agora = new Date()
        criadoEm = Timestamp.fromDate(
          new Date(ano, mes - 1, dia, agora.getHours(), agora.getMinutes(), agora.getSeconds())
        )
      }

      const docData = {
        ...form,
        vendedorEmail: user.email,
        criadoEm,
        tipo: tipoRegistro,
      }

      if (tipoRegistro === 'upgrade') {
        docData.valorAnterior = Number(valorAnterior)
        docData.produtoVendido = produtoVendido
        docData.dataAssinatura = dataAssinatura
        docData.diferenca = Number(form.valor) - Number(valorAnterior)
        docData.categoriaUpgrade = categoriaUpgrade
      }

      if (tipoRegistro === 'nova_venda' && temServAdicional) {
        const adicionaisValidos = servicosAdicionais
          .map(item => ({
            tipo: item.tipo,
            descricao: item.descricao.trim(),
            valor: Number(item.valor),
          }))
          .filter(item => item.descricao && item.valor > 0)

        if (adicionaisValidos.length > 0) {
          docData.servicosAdicionais = adicionaisValidos
          docData.servicoAdicional = adicionaisValidos.map(item => item.descricao).join(' + ')
          docData.valorAdicional = adicionaisValidos.reduce((acc, item) => acc + item.valor, 0)
        }
      }

      await addDoc(collection(db, 'vendas'), docData)
      const fraseSorteada = FRASES[Math.floor(Math.random() * FRASES.length)]
      setFrase(fraseSorteada)
      setUltimoTipo(tipoRegistro)
      setSucesso(true)
      dispararConfete()
      setForm({ contratoId: '', nome: '', contato: '', servico: '', valor: '' })
      setCategoriaPlano('residencial')
      setValorAnterior('')
      setProdutoVendido('')
      setCategoriaUpgrade('padrao')
      setTemServAdicional(false)
      setServicosAdicionais([criarItemAdicional()])
      setDataAssinatura(hojeISO)
      setDataVenda(hojeISO)
      setTimeout(() => {
        setSaindo(true)
        setTimeout(() => { setSucesso(false); setSaindo(false) }, 400)
      }, 4600)
    } catch {
      setError('Erro ao salvar venda. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const btnStyle = {
    background: loading
      ? 'oklch(0.42 0.13 150)'
      : tipoRegistro === 'upgrade'
      ? 'linear-gradient(135deg, oklch(0.52 0.2 290) 0%, oklch(0.4 0.16 290) 100%)'
      : 'linear-gradient(135deg, oklch(0.54 0.19 150) 0%, oklch(0.44 0.15 150) 100%)',
    boxShadow: loading ? 'none' : '0 4px 22px oklch(0.45 0.16 150 / 0.42), 0 1px 0 oklch(1 0 0 / 0.14) inset',
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    letterSpacing: '0.02em',
    transition: 'transform 0.18s ease, box-shadow 0.18s ease',
  }

  const valueFieldStyle = {
    backgroundColor: 'oklch(var(--b2) / 0.45)',
    borderColor: 'transparent',
    color: form.valor ? 'oklch(0.62 0.2 150)' : undefined,
    fontWeight: form.valor ? '600' : undefined,
    fontSize: form.valor ? '0.9375rem' : undefined,
  }

  const tipos = [
    { valor: 'nova_venda', label: 'Nova Venda' },
    ...(temAcessoUpgrade ? [{ valor: 'upgrade', label: '↑ Upgrade' }] : []),
  ]

  const diferenca = valorAnterior !== '' && form.valor
    ? Number(form.valor) - Number(valorAnterior)
    : null

  return (
    <div
      className="min-h-screen p-6 relative flex flex-col"
      style={{ animation: 'slideDown 0.4s ease forwards' }}
    >
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: 'absolute', top: '-12%', right: '-6%',
          width: '640px', height: '640px', borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.55 0.2 150 / 0.11), transparent 70%)',
          animation: 'pulse 7s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-12%', left: '-6%',
          width: '720px', height: '720px', borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.55 0.2 150 / 0.07), transparent 70%)',
          animation: 'pulse 9s ease-in-out infinite reverse',
        }} />
        <div style={{
          position: 'absolute', top: '45%', left: '35%',
          width: '320px', height: '320px', borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.55 0.15 150 / 0.04), transparent 70%)',
          animation: 'pulse 13s ease-in-out infinite',
        }} />
      </div>

      {/* Toast de sucesso */}
      {sucesso && (
        <div
          className="fixed bottom-6 right-6 z-50 rounded-2xl p-4 max-w-sm flex items-center gap-3"
          style={{
            animation: saindo ? 'slideUp 0.4s ease forwards' : 'slideDown 0.4s ease forwards',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            background: 'linear-gradient(135deg, oklch(0.42 0.14 150 / 0.97), oklch(0.34 0.11 150 / 0.99))',
            border: '1px solid oklch(0.6 0.18 150 / 0.28)',
            boxShadow: [
              '0 0 0 1px oklch(0.6 0.2 150 / 0.1)',
              '0 20px 48px rgba(0,0,0,0.45)',
              '0 0 36px oklch(0.5 0.2 150 / 0.2)',
            ].join(', '),
          }}
        >
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
            background: 'oklch(0.55 0.18 150 / 0.22)',
            border: '1px solid oklch(0.65 0.18 150 / 0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
          }}>🤑</div>
          <div>
            <div className="font-bold text-white text-sm tracking-tight">
              {ultimoTipo === 'upgrade' ? 'Upgrade registrado!' : 'Venda registrada!'}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'oklch(0.84 0.1 150)' }}>{frase}</div>
          </div>
        </div>
      )}

      {/* Header da página */}
      <div className="max-w-lg w-full mx-auto mb-8 relative z-10">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 mb-3 text-xs font-medium text-base-content/40 hover:text-base-content/70 transition-colors duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/>
            <polyline points="12 19 5 12 12 5"/>
          </svg>
          Voltar
        </button>
        <h1 className="text-2xl font-bold tracking-tight">
          {displayText}
          {!typewriterDone && (
            <span
              className="inline-block w-0.5 h-6 ml-0.5 rounded-full bg-primary align-middle"
              style={{ animation: 'blink 0.9s step-end infinite' }}
            />
          )}
        </h1>
        <p className="text-xs opacity-40 mt-1 tracking-wide">Preencha os dados abaixo para salvar no sistema.</p>
      </div>

      {/* Card */}
      <div className="max-w-lg w-full mx-auto relative z-10">

        {error && (
          <div className="alert alert-error text-sm mb-4 rounded-2xl">
            <span>⚠️ {error}</span>
          </div>
        )}

        <div className="rounded-3xl overflow-hidden" style={cardStyle}>

          {/* Card header */}
          <div className="px-6 py-5" style={headerStyle}>
            <h2 className="font-bold text-sm tracking-tight">
              {tipoRegistro === 'upgrade' ? 'Upgrade de Plano' : 'Nova Venda'}
            </h2>
            <p className="text-xs opacity-40 mt-0.5">
              Vendedor: {nomeDoUsuario(user, perfil)}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">

            {/* Toggle tipo */}
            <div
              className="flex p-1 rounded-2xl gap-1"
              style={{ backgroundColor: 'oklch(var(--b2) / 0.6)', border: '1px solid oklch(1 0 0 / 0.07)' }}
            >
              {tipos.map(({ valor, label }) => {
                const isActive = tipoRegistro === valor
                return (
                  <button
                    key={valor}
                    type="button"
                    onClick={() => handleTipoChange(valor)}
                    className="flex-1 h-9 rounded-xl text-xs font-semibold transition-all duration-200"
                    style={isActive ? {
                      background: valor === 'upgrade'
                        ? 'linear-gradient(135deg, oklch(0.52 0.2 290) 0%, oklch(0.4 0.16 290) 100%)'
                        : 'linear-gradient(135deg, oklch(0.54 0.19 150) 0%, oklch(0.44 0.15 150) 100%)',
                      color: 'white',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                    } : { color: 'oklch(var(--bc) / 0.4)' }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {/* ID do Contrato */}
            <Field
              label="ID do Contrato"
              hint={(avisoClienteId || avisoClienteIdSaindo) ? 'Apenas números são permitidos' : null}
              hintExiting={avisoClienteIdSaindo}
            >
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex: 123456"
                className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
                value={form.contratoId}
                onChange={handleClienteId}
                required
              />
            </Field>

            {/* Nome do Cliente */}
            <Field
              label="Nome do Cliente"
              hint={(avisoNome || avisoNomeSaindo) ? 'Apenas letras são permitidas' : null}
              hintExiting={avisoNomeSaindo}
            >
              <input
                type="text"
                placeholder="Ex: João da Silva"
                className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
                value={form.nome}
                onChange={handleNome}
                required
              />
            </Field>

            {/* Contato */}
            <Field label="Contato">
              <input
                type="text"
                placeholder="(00) 00000-0000"
                className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
                value={form.contato}
                onChange={handleContato}
                required
              />
            </Field>

            {/* Campos específicos do Upgrade */}
            {tipoRegistro === 'upgrade' && (
  <>
    <Field label="Tipo de Upgrade" noGlow>
      <div
        className="flex p-1 rounded-2xl gap-1"
        style={{ backgroundColor: 'oklch(var(--b2) / 0.6)', border: '1px solid oklch(1 0 0 / 0.07)' }}
      >
        {[
          { v: 'padrao', l: 'Upgrade padrão' },
          { v: 'tecnologia', l: 'Migração por tecnologia' },
        ].map(({ v, l }) => {
          const active = categoriaUpgrade === v
          return (
            <button
              key={v}
              type="button"
              onClick={() => setCategoriaUpgrade(v)}
              className="flex-1 h-9 rounded-xl text-xs font-semibold transition-all duration-200"
              style={active ? {
                background: 'linear-gradient(135deg, oklch(0.52 0.2 290) 0%, oklch(0.4 0.16 290) 100%)',
                color: 'white',
                boxShadow: '0 2px 10px oklch(0.45 0.2 290 / 0.35)',
              } : { color: 'oklch(var(--bc) / 0.4)' }}
            >
              {l}
            </button>
          )
        })}
      </div>
    </Field>

    <Field label="Valor Atual">
      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="Ex: 79.99"
        className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
        value={valorAnterior}
        onChange={(e) => setValorAnterior(e.target.value)}
        required
      />
    </Field>

    <Field label="Valor Novo">
      <input
        type="number"
        step="0.01"
        min="0"
        placeholder="Ex: 99.99"
        className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
        value={form.valor}
        onChange={(e) => setForm({ ...form, valor: e.target.value })}
        required
      />
    </Field>

    <Field label="Produto Vendido">
      <input
        type="text"
        placeholder="Ex: Fibra + TV"
        className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
        value={produtoVendido}
        onChange={(e) => setProdutoVendido(e.target.value)}
        required
      />
    </Field>

    <Field label="Data de Assinatura">
      <input
        type="date"
        className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
        value={dataAssinatura}
        onChange={(e) => setDataAssinatura(e.target.value)}
        required
      />
    </Field>
  </>
)}

            {/* Tipo de Plano — apenas na nova venda */}
            {tipoRegistro === 'nova_venda' && (
              <Field label="Tipo de Plano" noGlow>
                <div
                  className="flex p-1 rounded-2xl gap-1"
                  style={{ backgroundColor: 'oklch(var(--b2) / 0.6)', border: '1px solid oklch(1 0 0 / 0.07)' }}
                >
                  {[
                    { v: 'residencial', l: 'Residencial' },
                    { v: 'empresa', l: 'Empresa' },
                  ].map(({ v, l }) => {
                    const active = categoriaPlano === v
                    return (
                      <button
                        key={v}
                        type="button"
                        onClick={() => { setCategoriaPlano(v); setForm(f => ({ ...f, servico: '', valor: '' })) }}
                        className="flex-1 h-9 rounded-xl text-xs font-semibold transition-all duration-200"
                        style={active ? {
                          background: 'linear-gradient(135deg, oklch(0.54 0.19 150) 0%, oklch(0.44 0.15 150) 100%)',
                          color: 'white',
                          boxShadow: '0 2px 10px oklch(0.45 0.16 150 / 0.35)',
                        } : { color: 'oklch(var(--bc) / 0.4)' }}
                      >
                        {l}
                      </button>
                    )
                  })}
                </div>
              </Field>
            )}

            {/* Plano — apenas na nova venda */}
            {tipoRegistro === 'nova_venda' && (
              <Field label="Plano">
                <select
                  className="select select-bordered w-full rounded-2xl focus:select-primary transition-all duration-200"
                  onChange={handlePlanoChange}
                  value={form.servico}
                  required
                >
                  <option value="">Selecione um plano</option>
                  {PLANOS.filter(p => p.categoria === categoriaPlano).map(plano => (
                    <option key={plano.nome} value={plano.nome}>
                      {plano.nome} — R$ {plano.valor.toFixed(2)}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {/* Chips e Produtos - apenas na nova venda */}
            {tipoRegistro === 'nova_venda' && (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTemServAdicional(v => !v)
                    setServicosAdicionais([criarItemAdicional()])
                  }}
                  className="flex items-center gap-2.5 w-fit transition-opacity duration-200 hover:opacity-80"
                >
                  <div
                    className="relative w-9 h-5 rounded-full transition-all duration-250 flex-shrink-0"
                    style={{
                      background: temServAdicional
                        ? 'linear-gradient(135deg, oklch(0.54 0.19 150) 0%, oklch(0.44 0.15 150) 100%)'
                        : 'oklch(var(--b3) / 0.8)',
                      border: '1px solid oklch(1 0 0 / 0.08)',
                      boxShadow: temServAdicional ? '0 0 12px oklch(0.5 0.18 150 / 0.35)' : 'none',
                      transition: 'background 0.22s ease, box-shadow 0.22s ease',
                    }}
                  >
                    <span
                      className="absolute top-0.5 rounded-full bg-white"
                      style={{
                        width: '14px',
                        height: '14px',
                        left: temServAdicional ? 'calc(100% - 16px)' : '2px',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                        transition: 'left 0.22s ease',
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold opacity-50 uppercase tracking-widest">
                    Chips e Produtos
                  </span>
                </button>

                {temServAdicional && (
                  <div className="flex flex-col gap-3" style={{ animation: 'slideDown 0.25s ease forwards' }}>
                    {servicosAdicionais.map((item, index) => (
                      <div
                        key={item.id}
                        className="rounded-2xl p-3 flex flex-col gap-3"
                        style={{
                          backgroundColor: 'oklch(var(--b2) / 0.34)',
                          border: '1px solid oklch(1 0 0 / 0.07)',
                        }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold opacity-40 uppercase tracking-widest">
                            Item {index + 1}
                          </span>
                          {servicosAdicionais.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removerServicoAdicional(item.id)}
                              className="w-8 h-8 rounded-xl flex items-center justify-center text-base-content/35 hover:text-error hover:bg-error/10 transition-colors duration-200"
                              aria-label="Remover item"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18"/>
                                <path d="m6 6 12 12"/>
                              </svg>
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-3">
                          <Field label="Tipo">
                            <select
                              className="select select-bordered w-full rounded-2xl focus:select-primary transition-all duration-200"
                              value={item.tipo}
                              onChange={(e) => atualizarServicoAdicional(item.id, 'tipo', e.target.value)}
                              required
                            >
                              <option value="Chip">Chip</option>
                              <option value="Produto">Produto</option>
                            </select>
                          </Field>

                          <Field label="Descricao">
                            <input
                              type="text"
                              placeholder={item.tipo === 'Chip' ? 'Ex: Chip' : 'Ex: Roteador'}
                              className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
                              value={item.descricao}
                              onChange={(e) => atualizarServicoAdicional(item.id, 'descricao', e.target.value)}
                              required
                            />
                          </Field>
                        </div>

                        <Field label="Valor">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Ex: 29.99"
                            className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
                            value={item.valor}
                            onChange={(e) => atualizarServicoAdicional(item.id, 'valor', e.target.value)}
                            required
                          />
                        </Field>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={adicionarServicoAdicional}
                      className="h-10 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 hover:opacity-85"
                      style={{
                        backgroundColor: 'oklch(0.54 0.19 150 / 0.12)',
                        border: '1px solid oklch(0.54 0.19 150 / 0.24)',
                        color: 'oklch(0.72 0.18 150)',
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14"/>
                        <path d="M5 12h14"/>
                      </svg>
                      Adicionar chip ou produto
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Valor readonly — apenas na nova venda */}
            {tipoRegistro === 'nova_venda' && (
              <Field label="Valor" noGlow>
                <input
                  type="text"
                  placeholder="Preenchido automaticamente"
                  className="input w-full rounded-2xl cursor-not-allowed transition-all duration-200"
                  style={valueFieldStyle}
                  value={form.valor ? `R$ ${Number(form.valor).toFixed(2)}` : ''}
                  readOnly
                />
              </Field>
            )}

            {/* Data da Venda — apenas na nova venda (permite registrar venda retroativa) */}
            {tipoRegistro === 'nova_venda' && (
              <Field label="Data da Venda">
                <input
                  type="date"
                  max={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                  className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
                  value={dataVenda}
                  onChange={(e) => setDataVenda(e.target.value)}
                  required
                />
              </Field>
            )}

            {/* Diferença — só no upgrade */}
            {tipoRegistro === 'upgrade' && (
              <Field label="Diferença" noGlow>
                <input
                  type="text"
                  placeholder="Calculado automaticamente"
                  className="input w-full rounded-2xl cursor-not-allowed transition-all duration-200"
                  style={{
                    backgroundColor: 'oklch(var(--b2) / 0.45)',
                    borderColor: 'transparent',
                    color: diferenca !== null ? (diferenca >= 0 ? 'oklch(0.62 0.2 150)' : 'oklch(0.55 0.2 25)') : undefined,
                    fontWeight: diferenca !== null ? '600' : undefined,
                    fontSize: diferenca !== null ? '0.9375rem' : undefined,
                  }}
                  value={diferenca !== null ? `${diferenca >= 0 ? '+' : ''}R$ ${diferenca.toFixed(2)}` : ''}
                  readOnly
                />
              </Field>
            )}

            <div className="pt-1">
              <button
                type="submit"
                className="btn-shimmer w-full rounded-2xl h-12 text-sm font-bold text-white flex items-center justify-center gap-2 relative overflow-hidden"
                style={btnStyle}
                disabled={loading}
                onMouseEnter={e => {
                  if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {loading
                  ? <span className="loading loading-spinner" />
                  : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {tipoRegistro === 'upgrade' ? 'Registrar Upgrade' : 'Registrar Venda'}
                    </>
                  )
                }
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  )
}
