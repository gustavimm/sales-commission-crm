import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState(() => localStorage.getItem('amosales_email') || '')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [lembrar, setLembrar] = useState(() => !!localStorage.getItem('amosales_email'))
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const [modalReset, setModalReset] = useState(false)
  const [emailReset, setEmailReset] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetSucesso, setResetSucesso] = useState(false)
  const [resetErro, setResetErro] = useState('')
  const [modalPrimeiroLogin, setModalPrimeiroLogin] = useState(false)
  const [redirecionarAposReset, setRedirecionarAposReset] = useState(false)
  const [modo, setModo] = useState('login')
  const [nome, setNome] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [cadastroSucesso, setCadastroSucesso] = useState(false)

  const { login, cadastrar } = useAuth()
  const navigate = useNavigate()

  const abrirModalReset = () => {
    setEmailReset(email)
    setResetSucesso(false)
    setResetErro('')
    setModalReset(true)
  }

  const fecharModalReset = () => {
    setModalReset(false)
    setResetSucesso(false)
    setResetErro('')
    setEmailReset('')
    if (redirecionarAposReset) {
      setRedirecionarAposReset(false)
      setSaindo(true)
      setTimeout(() => navigate('/dashboard'), 600)
    }
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setResetLoading(true)
    setResetErro('')
    try {
      await sendPasswordResetEmail(auth, emailReset)
      setResetSucesso(true)
    } catch (err) {
      if (err.code === 'auth/user-not-found') {
        setResetErro('Nenhuma conta encontrada com esse e-mail.')
      } else {
        setResetErro('Erro ao enviar o link. Tente novamente.')
      }
    } finally {
      setResetLoading(false)
    }
  }

  const handleTrocarAgora = () => {
    localStorage.setItem(`amosales_first_login_${email}`, '1')
    setModalPrimeiroLogin(false)
    setEmailReset(email)
    setResetSucesso(false)
    setResetErro('')
    setRedirecionarAposReset(true)
    setModalReset(true)
  }

  const handleAgoraNao = () => {
    localStorage.setItem(`amosales_first_login_${email}`, '1')
    setModalPrimeiroLogin(false)
    setSaindo(true)
    setTimeout(() => navigate('/dashboard'), 600)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(email, password)
      if (lembrar) {
        localStorage.setItem('amosales_email', email)
      } else {
        localStorage.removeItem('amosales_email')
      }

      const chave = `amosales_first_login_${email}`
      if (!localStorage.getItem(chave)) {
        setModalPrimeiroLogin(true)
        setLoading(false)
        return
      }

      setSaindo(true)
      setTimeout(() => navigate('/dashboard'), 600)

    } catch (err) {
      if (err.code === 'app/aguardando-aprovacao') {
        setError('Seu cadastro ainda está aguardando aprovação de um gestor.')
      } else if (err.code === 'app/cadastro-recusado') {
        setError('Seu cadastro não foi aprovado. Fale com um gestor.')
      } else if (err.code === 'app/acesso-desativado') {
        setError('Seu acesso foi desativado. Fale com um gestor.')
      } else {
        setError('E-mail ou senha inválidos. Tente novamente.')
      }
      setLoading(false)
    }
  }

  const trocarModo = (novoModo) => {
    setModo(novoModo)
    setError('')
    setCadastroSucesso(false)
    setPassword('')
    setConfirmarSenha('')
  }

  const handleCadastro = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmarSenha) {
      setError('As senhas não coincidem.')
      return
    }
    setLoading(true)
    try {
      await cadastrar(nome, email, password)
      // Evita o modal de "trocar senha padrão" — a senha foi escolhida pelo próprio usuário
      localStorage.setItem(`amosales_first_login_${email}`, '1')
      setCadastroSucesso(true)
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já possui uma conta.')
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.')
      } else if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.')
      } else {
        setError('Erro ao criar a conta. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-base-200"
      style={{
        transition: 'opacity 0.6s ease',
        opacity: saindo ? 0 : 1,
      }}
    >

      {/* Modal Primeiro Login */}
      {modalPrimeiroLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-sm mx-4 rounded-3xl p-8 border border-base-300 relative"
            style={{
              animation: 'slideDown 0.3s ease forwards',
              backdropFilter: 'blur(40px)',
              backgroundColor: 'oklch(var(--b1) / 0.92)',
              boxShadow: '0 0 60px oklch(0.55 0.2 150 / 0.15), 0 30px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex flex-col items-center gap-4 text-center mb-7">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'oklch(0.55 0.2 150 / 0.12)', border: '1px solid oklch(0.55 0.2 150 / 0.2)' }}
              >
                🔐
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Bem-vindo ao Sales CRM! 👋</h2>
                <p className="text-xs opacity-50 mt-2 leading-relaxed">
                  Por segurança, recomendamos trocar sua senha padrão.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleTrocarAgora}
                className="btn btn-primary w-full rounded-2xl h-11 text-sm font-bold"
              >
                Trocar agora
              </button>
              <button
                onClick={handleAgoraNao}
                className="btn btn-ghost w-full rounded-2xl h-11 text-sm font-semibold opacity-50 hover:opacity-80 transition-opacity duration-200"
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Esqueci Minha Senha */}
      {modalReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-sm mx-4 rounded-3xl p-7 border border-base-300 relative"
            style={{
              animation: 'slideDown 0.3s ease forwards',
              backdropFilter: 'blur(40px)',
              backgroundColor: 'oklch(var(--b1) / 0.92)',
              boxShadow: '0 0 60px oklch(0.55 0.2 150 / 0.15), 0 30px 60px rgba(0,0,0,0.6)',
            }}
          >
            <button
              onClick={fecharModalReset}
              className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center text-base-content/40 hover:text-base-content hover:bg-base-200 transition-all duration-150"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>

            <div className="mb-5">
              <h2 className="text-lg font-bold tracking-tight">Redefinir senha</h2>
              <p className="text-xs opacity-45 mt-1">Enviaremos um link de redefinição para seu e-mail.</p>
            </div>

            {resetSucesso ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ background: 'oklch(0.55 0.2 150 / 0.12)' }}>
                  ✉️
                </div>
                <p className="text-sm font-semibold text-center">Link enviado!</p>
                <p className="text-xs opacity-50 text-center">Verifique sua caixa de entrada em <span className="font-medium opacity-80">{emailReset}</span>.</p>
                <button
                  onClick={fecharModalReset}
                  className="btn btn-primary w-full rounded-2xl mt-2 h-11 text-sm font-bold"
                >
                  Fechar
                </button>
              </div>
            ) : (
              <form onSubmit={handleReset} className="flex flex-col gap-4">
                {resetErro && (
                  <div className="alert alert-error text-xs py-2 rounded-2xl">
                    <span>⚠️ {resetErro}</span>
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold opacity-50 uppercase tracking-widest ml-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
                    value={emailReset}
                    onChange={(e) => setEmailReset(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-full rounded-2xl h-11 text-sm font-bold"
                  disabled={resetLoading}
                >
                  {resetLoading
                    ? <span className="loading loading-spinner loading-sm" />
                    : 'Enviar link de redefinição'
                  }
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Bolinhas animadas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div style={{
          position: 'absolute', top: '-10%', left: '-5%',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.55 0.2 150 / 0.25), transparent 70%)',
          animation: 'pulse 6s ease-in-out infinite'
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', right: '-5%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.55 0.2 150 / 0.2), transparent 70%)',
          animation: 'pulse 8s ease-in-out infinite reverse'
        }} />
        <div style={{
          position: 'absolute', top: '40%', right: '15%',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, oklch(0.55 0.2 150 / 0.15), transparent 70%)',
          animation: 'pulse 5s ease-in-out infinite 2s'
        }} />
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md z-10 mx-4"
        style={{ animation: 'slideDown 0.5s ease forwards' }}
      >
        <div
          className="rounded-3xl p-8 border border-base-300"
          style={{
            backdropFilter: 'blur(20px)',
            backgroundColor: 'oklch(var(--b1) / 0.85)',
            boxShadow: '0 0 60px oklch(0.55 0.2 150 / 0.15), 0 30px 60px rgba(0,0,0,0.6)'
          }}
        >

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
              <span className="text-3xl font-black text-primary-content">S</span>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-semibold tracking-tight">Sales CRM</h1>
              <p className="text-sm opacity-50 mt-2 pb-1">
                {modo === 'login' ? 'Bem-vindo de volta!' : 'Crie sua conta para começar'}
              </p>
            </div>
          </div>

          {error && !cadastroSucesso && (
            <div className="alert alert-error text-sm py-2 mb-4 rounded-2xl">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Cadastro enviado — aguardando aprovação */}
          {cadastroSucesso && (
            <div className="flex flex-col items-center gap-4 py-4 text-center" style={{ animation: 'slideDown 0.3s ease forwards' }}>
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                style={{ background: 'oklch(0.55 0.2 150 / 0.12)', border: '1px solid oklch(0.55 0.2 150 / 0.2)' }}
              >
                ⏳
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight">Cadastro enviado!</h2>
                <p className="text-xs opacity-50 mt-2 leading-relaxed">
                  Sua conta foi criada e está <span className="font-semibold opacity-90">aguardando aprovação</span> de um gestor.
                  Assim que for aprovada, você poderá entrar normalmente.
                </p>
              </div>
              <button
                onClick={() => trocarModo('login')}
                className="btn btn-primary w-full rounded-2xl h-11 text-sm font-bold mt-1"
              >
                Voltar ao login
              </button>
            </div>
          )}

          {/* Formulário de cadastro */}
          {!cadastroSucesso && modo === 'cadastro' && (
            <form onSubmit={handleCadastro} className="flex flex-col gap-4" style={{ animation: 'slideDown 0.3s ease forwards' }}>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold opacity-50 uppercase tracking-widest ml-1">Nome completo</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold opacity-50 uppercase tracking-widest ml-1">E-mail</label>
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold opacity-50 uppercase tracking-widest ml-1">Senha</label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200 pr-12"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    className="absolute right-4 top-1/2 -translate-y-1/2"
                    onClick={() => setMostrarSenha(v => !v)}
                    style={{
                      fontSize: '1.2rem',
                      opacity: mostrarSenha ? 0.8 : 0.4,
                      transition: 'all 0.2s ease',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      lineHeight: 1,
                    }}
                  >
                    {mostrarSenha ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold opacity-50 uppercase tracking-widest ml-1">Confirmar senha</label>
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="Repita a senha"
                  className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full mt-2 rounded-2xl text-base font-bold h-12 shadow-lg transition-all duration-200"
                disabled={loading}
              >
                {loading
                  ? <span className="loading loading-spinner" />
                  : <span className="flex items-center gap-2">Criar conta <span>→</span></span>
                }
              </button>
            </form>
          )}

          {!cadastroSucesso && modo === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold opacity-50 uppercase tracking-widest ml-1">E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold opacity-50 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="input input-bordered w-full rounded-2xl focus:input-primary transition-all duration-200 pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                  onClick={() => setMostrarSenha(v => !v)}
                  onMouseEnter={e => e.currentTarget.style.scale = '1.2'}
                  onMouseLeave={e => e.currentTarget.style.scale = '1'}
                  style={{
                    fontSize: '1.2rem',
                    opacity: mostrarSenha ? 0.8 : 0.4,
                    transition: 'all 0.2s ease',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    lineHeight: 1,
                  }}
                >
                  {mostrarSenha ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer ml-1">
                <input
                  type="checkbox"
                  className="checkbox checkbox-primary checkbox-sm"
                  checked={lembrar}
                  onChange={(e) => setLembrar(e.target.checked)}
                />
                <span className="text-sm opacity-60">Lembrar meu e-mail</span>
              </label>
              <button
                type="button"
                onClick={abrirModalReset}
                className="text-xs opacity-50 hover:opacity-100 transition-opacity duration-200 hover:text-primary"
              >
                Esqueci minha senha
              </button>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full mt-2 rounded-2xl text-base font-bold h-12 shadow-lg transition-all duration-200"
              disabled={loading || saindo}
            >
              {loading
                ? <span className="loading loading-spinner" />
                : <span className="flex items-center gap-2">Entrar <span>→</span></span>
              }
            </button>
          </form>
          )}

          {!cadastroSucesso && (
            <p className="text-center text-sm mt-6">
              {modo === 'login' ? (
                <>
                  <span className="opacity-40">Não tem uma conta?</span>{' '}
                  <button
                    type="button"
                    onClick={() => trocarModo('cadastro')}
                    className="font-semibold text-primary hover:opacity-80 transition-opacity duration-200"
                  >
                    Cadastre-se
                  </button>
                </>
              ) : (
                <>
                  <span className="opacity-40">Já tem uma conta?</span>{' '}
                  <button
                    type="button"
                    onClick={() => trocarModo('login')}
                    className="font-semibold text-primary hover:opacity-80 transition-opacity duration-200"
                  >
                    Entrar
                  </button>
                </>
              )}
            </p>
          )}

          <p className="text-center text-xs opacity-25 mt-6">
            Sales CRM © 2026 · Demo
          </p>

        </div>
      </div>
    </div>
  )
}