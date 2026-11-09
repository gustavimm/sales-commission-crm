export const ROLES = {
  ADMIN: 'admin',
  GESTOR: 'gestor',
  VENDEDOR: 'vendedor',
}

export function isGestorOuAdmin(perfil) {
  return perfil?.role === ROLES.GESTOR || perfil?.role === ROLES.ADMIN
}

export function podeVerTudo(perfil) {
  return isGestorOuAdmin(perfil) || perfil?.role === 'analista'
}

export function nomeDoUsuario(user, perfil) {
  return perfil?.nome || user?.displayName || user?.email?.split('@')[0] || 'Usuário'
}

export function vendedoresDasVendas(vendas) {
  const vendedores = new Map()
  vendas.forEach(venda => {
    const email = venda.vendedorEmail?.toLowerCase()
    if (!email) return
    vendedores.set(email, venda.vendedorNome || venda.vendedorNomeExibicao || email.split('@')[0])
  })
  return [...vendedores.entries()].map(([email, nome]) => ({ email, nome }))
}