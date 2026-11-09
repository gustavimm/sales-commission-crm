import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NovaVenda from './pages/NovaVenda'
import Metas from './pages/Metas'
import TV from './pages/TV'
import Usuarios from './pages/Usuarios'
import Fila from './pages/Fila'
import Comissao from './pages/Comissao'
import MinhasVendas from './pages/MinhasVendas'
import Upgrades from './pages/Upgrades'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Rota pública */}
          <Route path="/login" element={<Login />} />
          
          {/* Rotas protegidas com o Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* O "index" faz o / redirecionar direto para /dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Páginas que vão renderizar dentro do <Outlet /> do Layout */}
            <Route path="dashboard" element={<Dashboard />} />
            
            {/* Página do formulário de vendas */}
            <Route path="nova-venda" element={<NovaVenda />} />

            {/* Página de metas */}
            <Route path="metas" element={<Metas />} />

            {/* Página de comissão */}
            <Route path="comissao" element={<Comissao />} />

            {/* Página de minhas vendas */}
            <Route path="minhas-vendas" element={<MinhasVendas />} />

            {/* Página de gestão de upgrades */}
            <Route path="upgrades" element={<Upgrades />} />

            {/* Página de usuários */}
            <Route path="usuarios" element={<Usuarios />} />
          </Route>

          {/* Fila — protegida, sem sidebar (fullscreen) */}
          <Route
            path="/fila"
            element={
              <ProtectedRoute>
                <Fila />
              </ProtectedRoute>
            }
          />

          {/* Modo TV — exige login para não expor dados de vendas */}
          <Route
            path="/tv"
            element={
              <ProtectedRoute>
                <TV />
              </ProtectedRoute>
            }
          />

          {/* Rota de fallback (qualquer URL inválida vai pro login) */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}