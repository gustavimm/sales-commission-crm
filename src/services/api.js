import { collection, query, orderBy, getDocs } from 'firebase/firestore'
import { db } from './firebase'

function vendedoresDasVendas(vendas) {
  const mapa = new Map()
  vendas.forEach(venda => {
    const email = venda.vendedorEmail?.toLowerCase()
    if (email) mapa.set(email, venda.vendedorNome || email.split('@')[0])
  })
  return mapa
}

// Ciclo 25→24: dado um string "YYYY-MM", retorna { inicio, fim }
function getPeriodoCiclo(mesStr) {
  const [ano, mes] = mesStr.split('-').map(Number)
  return {
    inicio: new Date(ano, mes - 2, 25, 0, 0, 0),
    fim: new Date(ano, mes - 1, 24, 23, 59, 59),
  }
}

// Inferir o mês de ciclo atual (se dia >= 25 já pertence ao próximo ciclo)
function getMesCicloAtual() {
  const hoje = new Date()
  const ref = hoje.getDate() >= 25
    ? new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    : hoje
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

async function fetchTodasVendas() {
  const q = query(collection(db, 'vendas'), orderBy('criadoEm', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

async function fetchTodasMetas() {
  const snap = await getDocs(collection(db, 'metas'))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

/**
 * Busca vendas filtradas.
 *
 * @param {object} params
 * @param {string} [params.mes]           - Mês do ciclo no formato "YYYY-MM". Padrão: ciclo atual.
 * @param {string} [params.vendedorEmail] - Filtra por email do vendedor. Omitir para todos.
 * @param {'mes'|'hoje'|'7dias'|'todos'} [params.periodo] - Atalho de período. Sobrescreve `mes` se fornecido.
 * @returns {Promise<Array>} Array de vendas com todos os campos do Firestore.
 */
export async function getVendas({ mes, vendedorEmail, periodo } = {}) {
  const todasVendas = await fetchTodasVendas()
  const hoje = new Date()
  const hojeStr = toDateStr(hoje)

  return todasVendas.filter(venda => {
    if (!venda.criadoEm) return false
    const dataVenda = venda.criadoEm.toDate()

    if (vendedorEmail && venda.vendedorEmail?.toLowerCase() !== vendedorEmail.toLowerCase()) {
      return false
    }

    if (periodo === 'hoje') {
      return toDateStr(dataVenda) === hojeStr
    }

    if (periodo === '7dias') {
      const seteDiasAtras = new Date()
      seteDiasAtras.setDate(seteDiasAtras.getDate() - 7)
      return dataVenda >= seteDiasAtras
    }

    if (periodo === 'todos') {
      return true
    }

    // Padrão: filtro por ciclo mensal 25→24
    const { inicio, fim } = getPeriodoCiclo(mes || getMesCicloAtual())
    return dataVenda >= inicio && dataVenda <= fim
  })
}

/**
 * Busca o ranking de vendedores por quantidade de vendas.
 *
 * @param {object} params
 * @param {Date|string} [params.data] - Data de referência (Date ou "YYYY-MM-DD"). Padrão: hoje.
 * @returns {Promise<Array<{ nome: string, email: string, vendas: number }>>} Array ordenado do maior para o menor.
 */
export async function getRanking({ data } = {}) {
  const todasVendas = await fetchTodasVendas()

  let refStr
  if (data) {
    const d = typeof data === 'string' ? new Date(data + 'T12:00:00') : data
    refStr = toDateStr(d)
  } else {
    refStr = toDateStr(new Date())
  }

  const vendasDoDia = todasVendas.filter(v => {
    if (!v.criadoEm) return false
    return toDateStr(v.criadoEm.toDate()) === refStr
  })

    return [...vendedoresDasVendas(vendasDoDia)].map(([email, nome]) => ({
      nome,
      email,
      vendas: vendasDoDia.filter(v => v.vendedorEmail?.toLowerCase() === email.toLowerCase()).length,
    }))
    .sort((a, b) => b.vendas - a.vendas)
}

/**
 * Busca metas do mês e cruza com vendas realizadas.
 *
 * @param {object} params
 * @param {string} [params.mes] - Mês no formato "YYYY-MM". Padrão: ciclo atual.
 * @returns {Promise<Array<{ vendedor: string, email: string, meta: number, realizado: number, percentual: number }>>}
 */
export async function getMetas({ mes } = {}) {
  const mesRef = mes || getMesCicloAtual()
  const { inicio, fim } = getPeriodoCiclo(mesRef)

  const [todasMetas, todasVendas] = await Promise.all([
    fetchTodasMetas(),
    fetchTodasVendas(),
  ])

  const metasDoMes = todasMetas.filter(m => m.mes === mesRef)

  const vendasDoPeriodo = todasVendas.filter(v => {
    if (!v.criadoEm) return false
    const d = v.criadoEm.toDate()
    return d >= inicio && d <= fim
  })

  return metasDoMes.map(meta => {
    const realizado = vendasDoPeriodo.filter(
      v => v.vendedorEmail?.toLowerCase() === meta.vendedorEmail?.toLowerCase()
    ).length

    return {
        vendedor: meta.vendedorNome || meta.vendedorEmail?.split('@')[0] || meta.vendedorEmail,
      email: meta.vendedorEmail,
      meta: meta.metaQtd,
      realizado,
      percentual: meta.metaQtd > 0 ? Math.round((realizado / meta.metaQtd) * 100) : 0,
    }
  }).sort((a, b) => b.percentual - a.percentual)
}

/**
 * Retorna um resumo consolidado das vendas do dia atual.
 *
 * @returns {Promise<{ data: string, totalVendas: number, valorTotal: number, porVendedor: Array<{ nome: string, email: string, vendas: number, valor: number }> }>}
 */
export async function getResumoHoje() {
  const todasVendas = await fetchTodasVendas()
  const hoje = new Date()
  const hojeStr = toDateStr(hoje)

  const vendasHoje = todasVendas.filter(v => {
    if (!v.criadoEm) return false
    return toDateStr(v.criadoEm.toDate()) === hojeStr
  })

  const porVendedor = [...vendedoresDasVendas(vendasHoje)].map(([email, nome]) => {
    const vendasDoVendedor = vendasHoje.filter(
      v => v.vendedorEmail?.toLowerCase() === email.toLowerCase()
    )
    return {
      nome,
      email,
      vendas: vendasDoVendedor.length,
      valor: vendasDoVendedor.reduce((acc, v) => acc + Number(v.valor || 0), 0),
    }
  }).sort((a, b) => b.vendas - a.vendas)

  return {
    data: hojeStr,
    totalVendas: vendasHoje.length,
    valorTotal: vendasHoje.reduce((acc, v) => acc + Number(v.valor || 0), 0),
    porVendedor,
  }
}
