import { useState, useEffect } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../context/AuthContext'
import { ModalMinhasVendas } from '../Dashboard'
import { isGestorOuAdmin, podeVerTudo } from '../../config/roles'

export default function MinhasVendas() {
  const { user, perfil } = useAuth()
  const isGestor = isGestorOuAdmin(perfil)
  const podeVerTudoNoPerfil = podeVerTudo(perfil)
  const [vendas, setVendas] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'vendas'), orderBy('criadoEm', 'desc'))
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const arrayVendas = []
      querySnapshot.forEach((doc) => {
        arrayVendas.push({ id: doc.id, ...doc.data() })
      })
      setVendas(arrayVendas)
    }, () => console.error('Erro ao buscar vendas'))
    return () => unsubscribe()
  }, [])

  return (
    <ModalMinhasVendas
      vendas={vendas}
      user={user}
      isGestor={isGestor}
      podeVerTudo={podeVerTudoNoPerfil}
      asPage
    />
  )
}
