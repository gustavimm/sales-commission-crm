import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isGestorOuAdmin } from '../config/roles'

const IconGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" rx="1.5"/>
    <rect x="14" y="3" width="7" height="7" rx="1.5"/>
    <rect x="3" y="14" width="7" height="7" rx="1.5"/>
    <rect x="14" y="14" width="7" height="7" rx="1.5"/>
  </svg>
)

const IconPlus = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 8v8M8 12h8"/>
  </svg>
)

const IconTarget = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="6"/>
    <circle cx="12" cy="12" r="2"/>
  </svg>
)

const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
)

const IconComissao = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
)

const IconUpgrade = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="17 11 12 6 7 11"/>
    <polyline points="17 18 12 13 7 18"/>
  </svg>
)

const IconList = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/>
    <line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/>
    <line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
)

const IconFila = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="5" cy="8" r="2.5"/>
    <circle cx="12" cy="8" r="2.5"/>
    <circle cx="19" cy="8" r="2.5"/>
    <path d="M1 21v-1a4 4 0 0 1 4-4"/>
    <path d="M8.1 16A4 4 0 0 1 12 14a4 4 0 0 1 3.9 2"/>
    <path d="M19 16a4 4 0 0 1 4 4v1"/>
  </svg>
)

const IconLogout = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

const IconSun = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4"/>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
  </svg>
)

const IconMoon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
)

function NavItem({ to, icon, label }) {
  const { pathname } = useLocation()
  const active = pathname === to
  return (
    <Link
      to={to}
      className={`relative flex items-center gap-3 py-2.5 rounded-xl transition-all duration-200 min-w-max ${
        active
          ? 'text-primary font-medium'
          : 'text-base-content/40 hover:text-base-content/75 hover:bg-base-200'
      }`}
      style={{ paddingLeft: '10px', paddingRight: '12px' }}
    >
      {active && (
        <div className="absolute inset-0 rounded-xl bg-primary/10 transition-all duration-200" />
      )}
      <div
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full transition-all duration-300"
        style={{
          width: '3px',
          height: active ? '60%' : '0%',
          backgroundColor: 'oklch(0.55 0.2 150)',
        }}
      />
      <span className="w-8 flex items-center justify-center flex-shrink-0 z-10">{icon}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm whitespace-nowrap z-10">
        {label}
      </span>
    </Link>
  )
}

export default function Layout() {
  const { user, perfil, logout } = useAuth()
  const isGestor = isGestorOuAdmin(perfil)
  const podeVerUpgrades = isGestor || perfil?.role === 'vendedor'
  const [tema, setTema] = useState(() => localStorage.getItem('tema') || 'forest')
  const [showModal, setShowModal] = useState(false)

  // Usuários com lista de páginas definida pelo gestor veem só o que foi liberado.
  // Usuários antigos (sem doc ou sem lista) e gestores veem o menu completo.
  const restricoes = isGestor || !Array.isArray(perfil?.paginas) ? null : perfil.paginas
  const podeVer = (chave) => !restricoes || restricoes.includes(chave)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', tema)
    localStorage.setItem('tema', tema)
  }, [tema])

  const toggleTema = () => setTema(t => t === 'forest' ? 'light' : 'forest')
  const handleLogout = () => setShowModal(true)
  const confirmarLogout = () => { setShowModal(false); logout() }

  return (
    <div className="flex h-screen bg-base-200">

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div
            className="card bg-base-100 shadow-2xl w-full max-w-sm mx-4 border border-base-300"
            style={{ animation: 'slideDown 0.3s ease forwards' }}
          >
            <div className="card-body items-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center text-error">
                <IconLogout size={24} />
              </div>
              <h2 className="text-xl font-bold">Sair da conta?</h2>
              <p className="text-sm opacity-50">Você precisará fazer login novamente para acessar o sistema.</p>
              <div className="flex gap-3 mt-2 w-full">
                <button className="btn btn-ghost flex-1 rounded-xl" onClick={() => setShowModal(false)}>
                  Cancelar
                </button>
                <button className="btn btn-error flex-1 rounded-xl" onClick={confirmarLogout}>
                  Sair
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="w-16 hover:w-64 bg-base-100 border-r border-base-300 transition-all duration-300 overflow-hidden flex flex-col group z-40">

        {/* Logo */}
        <div className="p-4 flex items-center min-w-max h-16 border-b border-base-300">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-black text-primary-content">A</span>
          </div>
          <div className="ml-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 min-w-max">
            <span className="text-base font-bold">AmoSales</span>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-2 mt-2 flex flex-col gap-1">
          <NavItem to="/dashboard" icon={<IconGrid />} label="Dashboard" />
          {podeVer('nova-venda') && <NavItem to="/nova-venda" icon={<IconPlus />} label="Nova Venda" />}
          {podeVer('metas') && <NavItem to="/metas" icon={<IconTarget />} label="Metas" />}
          {podeVer('comissao') && <NavItem to="/comissao" icon={<IconComissao />} label="Comissão" />}
          {(restricoes ? restricoes.includes('upgrades') : podeVerUpgrades) && (
            <NavItem to="/upgrades" icon={<IconUpgrade />} label="Upgrades" />
          )}
          {podeVer('minhas-vendas') && <NavItem to="/minhas-vendas" icon={<IconList />} label="Minhas Vendas" />}
          {podeVer('fila') && <NavItem to="/fila" icon={<IconFila />} label="Fila" />}
          {isGestor && <NavItem to="/usuarios" icon={<IconUsers />} label="Usuários" />}
        </nav>

        {/* Toggle tema */}
        <div className="p-3 min-w-max border-t border-base-300 flex items-center gap-3">
          <button
            onClick={toggleTema}
            className="relative flex-shrink-0 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            style={{
              width: '44px',
              height: '24px',
              backgroundColor: tema === 'light' ? 'oklch(0.55 0.2 150)' : 'oklch(0.28 0.02 250)',
            }}
            title={tema === 'forest' ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            <span
              className="absolute top-[2px] rounded-full shadow-md transition-all duration-300 flex items-center justify-center"
              style={{
                width: '20px',
                height: '20px',
                left: tema === 'forest' ? '2px' : 'calc(100% - 22px)',
                backgroundColor: tema === 'light' ? '#ffffff' : 'oklch(0.18 0.02 250)',
                color: tema === 'light' ? 'oklch(0.55 0.2 150)' : '#9ca3af',
              }}
            >
              {tema === 'forest' ? <IconMoon /> : <IconSun />}
            </span>
          </button>
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-sm whitespace-nowrap text-base-content/60">
            {tema === 'forest' ? 'Modo escuro' : 'Modo claro'}
          </span>
        </div>

        {/* Usuário */}
        <div className="p-3 min-w-max border-t border-base-300 flex items-center gap-3">
          <button
            onClick={handleLogout}
            className="w-8 h-8 rounded-lg bg-base-200 hover:bg-error/10 hover:text-error transition-all duration-200 flex items-center justify-center flex-shrink-0 text-base-content/40"
            title="Sair da conta"
          >
            <IconLogout />
          </button>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col min-w-max">
            <span className="text-xs font-semibold truncate max-w-[140px]">{user?.email}</span>
            <button
              className="text-xs text-left text-error/60 hover:text-error transition-colors mt-0.5"
              onClick={handleLogout}
            >
              Sair da conta
            </button>
          </div>
        </div>

      </aside>

      <main className="flex-1 overflow-y-auto w-full">
        <Outlet />
      </main>

    </div>
  )
}
