import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, setPersistence, browserLocalPersistence } from 'firebase/auth'
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../services/firebase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Perfil do usuário no Firestore (role, páginas permitidas, status)
  useEffect(() => {
    if (!user?.email) return
    const unsub = onSnapshot(doc(db, 'users', user.email.toLowerCase()), (snap) => {
      setPerfil(snap.exists() ? snap.data() : null)
    }, () => setPerfil(null))
    return () => unsub()
  }, [user?.email])

  const login = async (email, password) => {
    // Mantém o usuário logado mesmo fechando o navegador
    await setPersistence(auth, browserLocalPersistence)
    const cred = await signInWithEmailAndPassword(auth, email, password)
    // Cadastros feitos pelo app precisam de aprovação de um gestor
    const snap = await getDoc(doc(db, 'users', email.toLowerCase()))
    const dados = snap.exists() ? snap.data() : null
    if (dados?.aprovacao === 'pendente' || dados?.aprovacao === 'recusado') {
      await signOut(auth)
      const err = new Error('Cadastro não aprovado')
      err.code = dados.aprovacao === 'pendente' ? 'app/aguardando-aprovacao' : 'app/cadastro-recusado'
      throw err
    }
    // Usuários desativados pelo gestor não entram
    if (dados?.status === 'inativo') {
      await signOut(auth)
      const err = new Error('Acesso desativado')
      err.code = 'app/acesso-desativado'
      throw err
    }
    return cred
  }

  const cadastrar = async (nome, email, password) => {
    const emailLower = email.toLowerCase()
    const cred = await createUserWithEmailAndPassword(auth, emailLower, password)
    await setDoc(doc(db, 'users', emailLower), {
      nome: nome.trim(),
      email: emailLower,
      role: 'vendedor',
      aprovacao: 'pendente',
      status: 'ativo',
      criadoEm: serverTimestamp(),
    }, { merge: true })
    // O createUser autentica automaticamente — desloga até um gestor aprovar
    await signOut(auth)
    return cred
  }

  const logout = () => {
    return signOut(auth)
  }

  // Sem usuário logado não há perfil (evita resetar o estado dentro do efeito)
  const value = { user, perfil: user?.email ? perfil : null, login, cadastrar, logout }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook e provider ficam juntos de propósito
export function useAuth() {
  return useContext(AuthContext)
}