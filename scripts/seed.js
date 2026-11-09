// Seed de demonstração do AmoSales Demo.
// Usa o SDK web do Firebase (sem service account / Admin SDK) e a config de .env.local.
// Execução: npm run seed   (carrega .env.local via `node --env-file`)
// Idempotente: ids determinísticos + PRNG com semente fixa.
import process from 'node:process'
import { initializeApp, deleteApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
  terminate,
  Timestamp,
} from 'firebase/firestore'

// ---------------------------------------------------------------- config ---
const VARS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]
// --dry-run: só gera e resume os dados, sem tocar no Firebase (nem exigir .env.local).
const DRY_RUN = process.argv.includes('--dry-run')

let app
let auth
let db
if (!DRY_RUN) {
  const faltando = VARS.filter(nome => !process.env[nome])
  if (faltando.length) {
    console.error(`Variáveis ausentes no .env.local: ${faltando.join(', ')}`)
    console.error('Rode com: npm run seed (o script usa node --env-file=.env.local).')
    process.exit(1)
  }
  app = initializeApp({
    apiKey: process.env.VITE_FIREBASE_API_KEY,
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.VITE_FIREBASE_APP_ID,
  })
  auth = getAuth(app)
  db = getFirestore(app)
}

const SENHA_DEMO = 'Demo123!'
const TOTAL_VENDAS = 200
const DIAS_PERIODO = 60 // últimos 60 dias, incluindo hoje
const FUSO_BRASILIA = 3 // UTC-3: hora local + 3 = UTC

// "Agora" no relógio de Brasília (campos UTC deste Date = hora de Brasília).
// As datas são relativas ao dia da execução; o PRNG e os ids continuam fixos.
const AGORA_BR = new Date(Date.now() - FUSO_BRASILIA * 3600 * 1000)
const HOJE_BR_UTC = Date.UTC(AGORA_BR.getUTCFullYear(), AGORA_BR.getUTCMonth(), AGORA_BR.getUTCDate())

// -------------------------------------------------------------- dados -------
// Mesmos planos de src/pages/NovaVenda/index.jsx
const PLANOS = [
  { nome: 'Fibra 100', valor: 79.9, categoria: 'residencial' },
  { nome: 'Fibra 300', valor: 99.9, categoria: 'residencial' },
  { nome: 'Fibra 500', valor: 119.9, categoria: 'residencial' },
  { nome: 'Fibra 1G', valor: 149.9, categoria: 'residencial' },
  { nome: 'Empresa 300', valor: 139.9, categoria: 'empresa' },
  { nome: 'Empresa 600', valor: 199.9, categoria: 'empresa' },
  { nome: 'Empresa 1G', valor: 289.9, categoria: 'empresa' },
]

const CONTAS_FIXAS = [
  { email: 'admin@exemplo.com', nome: 'Admin Demo', role: 'admin' },
  { email: 'gestor@exemplo.com', nome: 'Gestor Demo', role: 'gestor' },
]

// peso = participação relativa nas vendas (gera ranking variado)
const VENDEDORES = [
  { email: 'vendedor1@exemplo.com', nome: 'Bianca Lemos', peso: 1.6 },
  { email: 'caio@exemplo.com', nome: 'Caio Ventura', peso: 1.3 },
  { email: 'dora@exemplo.com', nome: 'Dora Pinheiro', peso: 1.2 },
  { email: 'elias@exemplo.com', nome: 'Elias Montenegro', peso: 1.0 },
  { email: 'fabricio@exemplo.com', nome: 'Fabricio Lago', peso: 1.0 },
  { email: 'gloria@exemplo.com', nome: 'Gloria Sampaio', peso: 0.9 },
  { email: 'heitor@exemplo.com', nome: 'Heitor Brandao', peso: 0.7 },
  { email: 'isis@exemplo.com', nome: 'Isis Valadares', peso: 0.5 },
].map(v => ({ ...v, role: 'vendedor' }))

const TODAS_AS_CONTAS = [...CONTAS_FIXAS, ...VENDEDORES]

// Mapeia o status da venda para o statusUpgrade usado em src/pages/Upgrades
const STATUS_UPGRADE_POR_STATUS = {
  assinado: 'assinado',
  aguardando_bko: 'aguardando_bko',
  aguardando_instalacao: 'aguardando_bko',
  instalado: 'concluido',
  cancelado: 'cancelado',
}

// ----------------------------------------------------------- utilidades -----
// PRNG determinístico (mulberry32) — mesma sequência a cada execução.
function criarPrng(semente) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const rand = criarPrng(20260825)
const inteiro = (min, max) => min + Math.floor(rand() * (max - min + 1))
const escolher = lista => lista[Math.floor(rand() * lista.length)]
const arredondar = n => Math.round(n * 100) / 100
const pad = (n, tam = 2) => String(n).padStart(tam, '0')

function escolherPonderado(itens, pesoDe) {
  const total = itens.reduce((acc, i) => acc + pesoDe(i), 0)
  let sorteio = rand() * total
  for (const item of itens) {
    sorteio -= pesoDe(item)
    if (sorteio <= 0) return item
  }
  return itens[itens.length - 1]
}

function dataDoDia(offsetDias) {
  // offset 0 = primeiro dia da janela (hoje - 59); offset 59 = hoje (Brasília).
  const d = new Date(HOJE_BR_UTC + (offsetDias - (DIAS_PERIODO - 1)) * 86400000)
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() }
}

function timestampLocal({ ano, mes, dia }, hora, minuto) {
  return Timestamp.fromDate(new Date(Date.UTC(ano, mes - 1, dia, hora + FUSO_BRASILIA, minuto)))
}

const dataISO = ({ ano, mes, dia }) => `${ano}-${pad(mes)}-${pad(dia)}`

// Mês do ciclo 25→24 (dia >= 25 pertence ao mês seguinte), igual às telas.
function mesDoCiclo({ ano, mes, dia }) {
  const ref = dia >= 25 ? new Date(Date.UTC(ano, mes, 1)) : new Date(Date.UTC(ano, mes - 1, 1))
  return `${ref.getUTCFullYear()}-${pad(ref.getUTCMonth() + 1)}`
}

function sortearStatus(offsetDias) {
  // Vendas recentes ainda estão em andamento; as antigas tendem a estar instaladas.
  const recente = offsetDias >= DIAS_PERIODO - 12
  const pesos = recente
    ? { assinado: 30, aguardando_bko: 25, aguardando_instalacao: 25, instalado: 12, cancelado: 8 }
    : { assinado: 5, aguardando_bko: 8, aguardando_instalacao: 12, instalado: 62, cancelado: 13 }
  return escolherPonderado(Object.keys(pesos), s => pesos[s])
}

function contatoFicticio() {
  return `(11) 9${pad(inteiro(0, 9999), 4)}-${pad(inteiro(0, 9999), 4)}`
}

// ------------------------------------------------------------- geração ------
function gerarVendas() {
  const vendas = []
  for (let i = 1; i <= TOTAL_VENDAS; i++) {
    const vendedor = escolherPonderado(VENDEDORES, v => v.peso)
    const offset = inteiro(0, DIAS_PERIODO - 1)
    const dia = dataDoDia(offset)
    let hora = inteiro(9, 18)
    let minuto = inteiro(0, 59)
    if (offset === DIAS_PERIODO - 1) {
      // Hoje: nunca gera horário no futuro.
      hora = Math.min(hora, AGORA_BR.getUTCHours())
      if (hora === AGORA_BR.getUTCHours()) minuto = Math.min(minuto, AGORA_BR.getUTCMinutes())
    }
    const criadoEm = timestampLocal(dia, hora, minuto)
    const status = sortearStatus(offset)

    // 30 de 200 (15%) são upgrades, espalhados de forma determinística.
    const ehUpgrade = (i * 7) % 20 < 3

    const base = {
      contratoId: String(100000 + i),
      nome: `Cliente ${pad(i, 3)}`,
      contato: contatoFicticio(),
      vendedorEmail: vendedor.email,
      vendedorNome: vendedor.nome,
      criadoEm,
      status,
    }

    if (ehUpgrade) {
      const categoria = escolher(['residencial', 'empresa'])
      const doGrupo = PLANOS.filter(p => p.categoria === categoria)
      const idxNovo = inteiro(1, doGrupo.length - 1)
      const novo = doGrupo[idxNovo]
      const anterior = doGrupo[idxNovo - 1]
      vendas.push({
        id: `demo-venda-${pad(i, 3)}`,
        ...base,
        tipo: 'upgrade',
        servico: novo.nome,
        valor: novo.valor,
        valorAnterior: anterior.valor,
        produtoVendido: novo.nome,
        dataAssinatura: dataISO(dia),
        diferenca: arredondar(novo.valor - anterior.valor),
        categoriaUpgrade: rand() < 0.2 ? 'tecnologia' : 'padrao',
        statusUpgrade: STATUS_UPGRADE_POR_STATUS[status],
      })
      continue
    }

    const plano = escolher(PLANOS)
    const venda = {
      id: `demo-venda-${pad(i, 3)}`,
      ...base,
      tipo: 'nova_venda',
      servico: plano.nome,
      valor: plano.valor,
    }
    if (rand() < 0.2) {
      const adicional = { tipo: 'Chip', descricao: 'Chip', valor: 29.9 }
      venda.servicosAdicionais = [adicional]
      venda.servicoAdicional = adicional.descricao
      venda.valorAdicional = adicional.valor
    }
    vendas.push(venda)
  }
  return vendas
}

// --------------------------------------------------------------- Firebase ---
async function garantirContaEntrar(email) {
  try {
    await createUserWithEmailAndPassword(auth, email, SENHA_DEMO)
    return 'criada'
  } catch (error) {
    if (error.code !== 'auth/email-already-in-use') throw error
    await signInWithEmailAndPassword(auth, email, SENHA_DEMO)
    return 'já existia'
  }
}

async function emLotes(itens, tamanho, fn) {
  for (let i = 0; i < itens.length; i += tamanho) {
    await Promise.all(itens.slice(i, i + tamanho).map(fn))
  }
}

const META_VENDAS = 100
const META_UPGRADES = 15

function ciclosDasVendas(vendas) {
  return [...new Set(vendas.map(v => mesDoCiclo(parseISODoTimestamp(v.criadoEm))))].sort()
}

function resumir(vendas) {
  const datas = vendas.map(v => v.criadoEm.toDate().getTime()).sort((a, b) => a - b)
  const iso = ms => dataISO(parseISODoTimestamp({ toDate: () => new Date(ms) }))
  const upgrades = vendas.filter(v => v.tipo === 'upgrade').length
  const porCiclo = vendas.reduce((acc, v) => {
    const c = mesDoCiclo(parseISODoTimestamp(v.criadoEm))
    acc[c] = (acc[c] || 0) + 1
    return acc
  }, {})
  const porStatus = vendas.reduce((acc, v) => ({ ...acc, [v.status]: (acc[v.status] || 0) + 1 }), {})
  return `${vendas.length} vendas (${upgrades} upgrades) de ${iso(datas[0])} a ${iso(datas[datas.length - 1])}\n` +
    `  por ciclo: ${JSON.stringify(porCiclo)}\n  por status: ${JSON.stringify(porStatus)}`
}

async function main() {
  const vendas = gerarVendas()
  if (DRY_RUN) {
    console.log(`[dry-run] ${resumir(vendas)}`)
    console.log(`[dry-run] metas: ${ciclosDasVendas(vendas).join(', ')}`)
    return
  }

  // Fase 1 — contas: cria (ou entra) e grava o próprio perfil se ainda não existir.
  // As regras só deixam criar o próprio perfil como vendedor/pendente/ativo
  // (o mesmo que o cadastro do app). Papéis e aprovação são ajustados na fase 2.
  for (const conta of TODAS_AS_CONTAS) {
    const situacao = await garantirContaEntrar(conta.email)
    const ref = doc(db, 'users', conta.email)
    const existente = await getDoc(ref)
    if (!existente.exists()) {
      await setDoc(ref, {
        nome: conta.nome,
        email: conta.email,
        role: 'vendedor',
        aprovacao: 'pendente',
        status: 'ativo',
        criadoEm: serverTimestamp(),
      })
    }
    console.log(`Conta ${situacao}: ${conta.email}`)
  }

  // Fase 2 — como admin: normaliza perfis, grava metas e vendas.
  await signInWithEmailAndPassword(auth, 'admin@exemplo.com', SENHA_DEMO)

  // Só um admin altera papéis. O primeiro admin não pode se promover sozinho
  // (as regras barram), então precisa ser promovido uma vez no Console do Firebase.
  const perfilAdmin = await getDoc(doc(db, 'users', 'admin@exemplo.com'))
  if (perfilAdmin.data()?.role !== 'admin') {
    throw new Error(
      'admin@exemplo.com ainda não é admin. No Console do Firebase (Firestore > users > admin@exemplo.com), ' +
      "defina role = 'admin' e aprovacao = 'aprovado' e rode o seed de novo."
    )
  }

  for (const conta of TODAS_AS_CONTAS) {
    await setDoc(doc(db, 'users', conta.email), {
      nome: conta.nome,
      email: conta.email,
      role: conta.role,
      aprovacao: 'aprovado',
      status: 'ativo',
    }, { merge: true })
  }
  console.log(`Perfis gravados: ${TODAS_AS_CONTAS.length}`)

  // Metas de setor para cada ciclo 25→24 em que as vendas caem (ids como em src/pages/Metas).
  for (const mes of ciclosDasVendas(vendas)) {
    const [ano, m] = mes.split('-').map(Number)
    // criadoEm fixo por ciclo (dia 25 do mês anterior) para a regravação ser idempotente.
    const criadoEm = Timestamp.fromDate(new Date(Date.UTC(ano, m - 2, 25, 12)))
    await setDoc(doc(db, 'metas', `setor__${mes}`), { tipo: 'setor', metaQtd: META_VENDAS, mes, criadoEm })
    await setDoc(doc(db, 'metas_upgrade', `setor__${mes}`), { tipo: 'setor', metaQtd: META_UPGRADES, mes, criadoEm })
  }
  console.log(`Metas gravadas: ${ciclosDasVendas(vendas).join(', ')} (vendas e upgrades)`)

  await emLotes(vendas, 10, ({ id, ...dados }) => setDoc(doc(db, 'vendas', id), dados))

  console.log(`Vendas gravadas: ${resumir(vendas)}`)
}

function parseISODoTimestamp(ts) {
  // Converte de volta para data civil de Brasília para o resumo.
  const d = new Date(ts.toDate().getTime() - FUSO_BRASILIA * 3600 * 1000)
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() }
}

let codigoSaida = 0
try {
  await main()
  console.log('Seed concluído.')
} catch (error) {
  codigoSaida = 1
  console.error(`Seed falhou: ${error.code || error.message}`)
} finally {
  if (db) await terminate(db).catch(() => {})
  if (app) await deleteApp(app).catch(() => {})
  process.exit(codigoSaida)
}
