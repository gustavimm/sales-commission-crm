'use strict'

const functions = require('firebase-functions')
const admin = require('firebase-admin')
const express = require('express')
const cors = require('cors')

admin.initializeApp()
const db = admin.firestore()

// Ciclo de apuração: dia 25 do mês anterior → dia 24 do mês corrente
function getPeriodoParaMes(mesStr) {
  const [ano, mes] = mesStr.split('-').map(Number)
  return {
    inicio: new Date(ano, mes - 2, 25, 0, 0, 0),
    fim: new Date(ano, mes - 1, 24, 23, 59, 59),
  }
}

// Infere o mês de ciclo atual (se dia >= 25 já pertence ao próximo ciclo)
function getMesAtual() {
  const hoje = new Date()
  const ref = hoje.getDate() >= 25
    ? new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    : hoje
  return `${ref.getFullYear()}-${String(ref.getMonth() + 1).padStart(2, '0')}`
}

function toDateStr(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function nomePorEmail(email) {
  return email?.split('@')[0] || null
}

function serializarVenda(id, data) {
  return {
    id,
    contratoId: data.contratoId || data.clienteId || null,
    nome: data.nome || null,
    contato: data.contato || null,
    servico: data.servico || null,
    valor: Number(data.valor) || 0,
    vendedorEmail: data.vendedorEmail || null,
    vendedorNome: data.vendedorNome || nomePorEmail(data.vendedorEmail),
    tipo: data.tipo || 'nova_venda',
    planoAnterior: data.planoAnterior || null,
    status: data.status || null,
    criadoEm: data.criadoEm ? data.criadoEm.toDate().toISOString() : null,
  }
}

// Middleware de autenticação via x-api-key
async function autenticar(req, res, next) {
  const apiKey = req.headers['x-api-key']
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'Chave inválida' })
  }
  try {
    const snap = await db.collection('users').where('apiKey', '==', apiKey).limit(1).get()
    if (snap.empty) {
      return res.status(401).json({ success: false, error: 'Chave inválida' })
    }
    next()
  } catch {
    console.error('Erro ao validar API key')
    return res.status(500).json({ success: false, error: 'Erro ao validar chave' })
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

const router = express.Router()
router.use(autenticar)

// GET /vendas/resumo-hoje
// Retorna total de vendas do dia, valor total e breakdown por vendedor
router.get('/vendas/resumo-hoje', async (req, res) => {
  try {
    const hojeStr = toDateStr(new Date())
    const snap = await db.collection('vendas').orderBy('criadoEm', 'desc').get()

    const vendasHoje = []
    snap.forEach(doc => {
      const data = doc.data()
      if (!data.criadoEm) return
      if (toDateStr(data.criadoEm.toDate()) === hojeStr) vendasHoje.push(data)
    })

    const total = vendasHoje.reduce((acc, v) => acc + Number(v.valor), 0)
    const breakdownMap = {}
    vendasHoje.forEach(v => {
      const email = v.vendedorEmail
      if (!email) return
      if (!breakdownMap[email]) {
        breakdownMap[email] = { vendedorEmail: email, nome: nomePorEmail(email), quantidade: 0, total: 0 }
      }
      breakdownMap[email].quantidade++
      breakdownMap[email].total += Number(v.valor)
    })

    res.json({
      success: true,
      data: {
        data: hojeStr,
        quantidade: vendasHoje.length,
        total: Math.round(total * 100) / 100,
        breakdown: Object.values(breakdownMap).sort((a, b) => b.quantidade - a.quantidade),
      },
    })
  } catch {
    console.error('Erro ao buscar resumo de vendas')
    res.status(500).json({ success: false, error: 'Erro ao buscar resumo de hoje' })
  }
})

// GET /vendas/resumo-mensal?mes=2026-06
// Retorna total do mês, quantidade e breakdown por vendedor
router.get('/vendas/resumo-mensal', async (req, res) => {
  try {
    const mes = req.query.mes || getMesAtual()
    const { inicio, fim } = getPeriodoParaMes(mes)
    const snap = await db.collection('vendas').orderBy('criadoEm', 'desc').get()

    const vendasMes = []
    snap.forEach(doc => {
      const data = doc.data()
      if (!data.criadoEm) return
      const d = data.criadoEm.toDate()
      if (d >= inicio && d <= fim) vendasMes.push(data)
    })

    const total = vendasMes.reduce((acc, v) => acc + Number(v.valor), 0)
    const breakdownMap = {}
    vendasMes.forEach(v => {
      const email = v.vendedorEmail
      if (!email) return
      if (!breakdownMap[email]) {
        breakdownMap[email] = { vendedorEmail: email, nome: nomePorEmail(email), quantidade: 0, total: 0 }
      }
      breakdownMap[email].quantidade++
      breakdownMap[email].total += Number(v.valor)
    })

    res.json({
      success: true,
      data: {
        mes,
        periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
        quantidade: vendasMes.length,
        total: Math.round(total * 100) / 100,
        breakdown: Object.values(breakdownMap).sort((a, b) => b.quantidade - a.quantidade),
      },
    })
  } catch {
    console.error('Erro ao buscar resumo mensal')
    res.status(500).json({ success: false, error: 'Erro ao buscar resumo mensal' })
  }
})

// GET /vendas?mes=2026-06&data=2026-06-17&vendedorEmail=...
// Retorna lista de vendas filtradas (os filtros são opcionais e combinam)
router.get('/vendas', async (req, res) => {
  try {
    const { mes, data, vendedorEmail } = req.query
    const snap = await db.collection('vendas').orderBy('criadoEm', 'desc').get()

    let inicio, fim
    if (mes) {
      const p = getPeriodoParaMes(mes)
      inicio = p.inicio
      fim = p.fim
    }

    const resultado = []
    snap.forEach(doc => {
      const venda = doc.data()
      if (!venda.criadoEm) return
      const d = venda.criadoEm.toDate()
      if (mes && (d < inicio || d > fim)) return
      if (data && toDateStr(d) !== data) return
      if (vendedorEmail && venda.vendedorEmail?.toLowerCase() !== vendedorEmail.toLowerCase()) return
      resultado.push(serializarVenda(doc.id, venda))
    })

    res.json({ success: true, data: resultado })
  } catch {
    console.error('Erro ao buscar vendas')
    res.status(500).json({ success: false, error: 'Erro ao buscar vendas' })
  }
})

// GET /vendedores
// Lista todos os vendedores cadastrados no sistema
router.get('/vendedores', async (req, res) => {
  try {
    const snap = await db.collection('users').where('role', '==', 'vendedor').get()
    const data = snap.docs.map(doc => {
      const usuario = doc.data()
      return { email: doc.id, nome: usuario.nome || doc.id.split('@')[0] }
    })
    res.json({ success: true, data })
  } catch {
    console.error('Erro ao buscar vendedores')
    res.status(500).json({ success: false, error: 'Erro ao buscar vendedores' })
  }
})

// GET /metas?mes=2026-06
// Retorna metas do mês com progresso calculado em tempo real
router.get('/metas', async (req, res) => {
  try {
    const mes = req.query.mes || getMesAtual()
    const { inicio, fim } = getPeriodoParaMes(mes)

    const [metasSnap, vendasSnap] = await Promise.all([
      db.collection('metas').where('mes', '==', mes).get(),
      db.collection('vendas').orderBy('criadoEm', 'desc').get(),
    ])

    const vendasPeriodo = []
    vendasSnap.forEach(doc => {
      const data = doc.data()
      if (!data.criadoEm) return
      const d = data.criadoEm.toDate()
      if (d >= inicio && d <= fim) vendasPeriodo.push(data)
    })

    const contarVendas = (email) =>
      vendasPeriodo.filter(v => v.vendedorEmail?.toLowerCase() === email.toLowerCase()).length

    const metas = []
    metasSnap.forEach(doc => {
      const meta = doc.data()
      const realizadas = contarVendas(meta.vendedorEmail)
      const pct = meta.metaQtd > 0 ? (realizadas / meta.metaQtd) * 100 : 0
      metas.push({
        id: doc.id,
        vendedorEmail: meta.vendedorEmail,
        vendedorNome: nomePorEmail(meta.vendedorEmail),
        mes: meta.mes,
        metaQtd: meta.metaQtd,
        realizadas,
        faltam: Math.max(0, meta.metaQtd - realizadas),
        percentual: Math.round(pct * 10) / 10,
        atingida: realizadas >= meta.metaQtd,
      })
    })

    res.json({ success: true, data: metas })
  } catch {
    console.error('Erro ao buscar metas')
    res.status(500).json({ success: false, error: 'Erro ao buscar metas' })
  }
})

// GET /ranking?tipo=hoje|mes&mes=2026-06
// Retorna ranking de vendedores ordenado por quantidade de vendas
router.get('/ranking', async (req, res) => {
  try {
    const tipo = req.query.tipo || 'mes'
    const mes = req.query.mes || getMesAtual()
    const hojeStr = toDateStr(new Date())

    let inicio, fim
    if (tipo === 'mes') {
      const p = getPeriodoParaMes(mes)
      inicio = p.inicio
      fim = p.fim
    }

    const snap = await db.collection('vendas').orderBy('criadoEm', 'desc').get()
    const contagem = {}

    snap.forEach(doc => {
      const data = doc.data()
      if (!data.criadoEm || !data.vendedorEmail) return
      const d = data.criadoEm.toDate()

      const incluir = tipo === 'hoje'
        ? toDateStr(d) === hojeStr
        : d >= inicio && d <= fim

      if (!incluir) return

      const email = data.vendedorEmail
      if (!contagem[email]) {
        contagem[email] = { vendedorEmail: email, nome: nomePorEmail(email), quantidade: 0, total: 0 }
      }
      contagem[email].quantidade++
      contagem[email].total += Number(data.valor)
    })

    const ranking = Object.values(contagem)
      .sort((a, b) => b.quantidade - a.quantidade || b.total - a.total)
      .map((v, i) => ({ posicao: i + 1, ...v, total: Math.round(v.total * 100) / 100 }))

    res.json({
      success: true,
      data: {
        tipo,
        ...(tipo === 'mes' && { mes }),
        ranking,
      },
    })
  } catch {
    console.error('Erro ao buscar ranking')
    res.status(500).json({ success: false, error: 'Erro ao buscar ranking' })
  }
})

// 404 para rotas desconhecidas
router.use((req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint não encontrado' })
})

// ─── App Express ──────────────────────────────────────────────────────────────

const app = express()
app.use(cors({ origin: '*' }))
app.use(express.json())
app.use('/', router)

exports.api = functions.https.onRequest(app)
