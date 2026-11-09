# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O Projeto

**AmoSales Demo** é um CRM fictício para demonstração de registro e acompanhamento de vendas. Todos os nomes, planos, valores e usuários da demo são fictícios.

## Comandos

```bash
npm run dev       # servidor de desenvolvimento
npm run build     # build de produção
npm run preview   # visualizar build local
npm run lint      # ESLint
```

## Stack

- **React 19** + **Vite 6**
- **Tailwind CSS v4** via plugin Vite (não usa `tailwind.config.js`)
- **DaisyUI v5** — componentes de UI (btn, select, input, badge, card, table, modal, etc.)
- **Firebase 12**: Auth (email/password) + Firestore (banco de dados)
- **React Router v7**
- **canvas-confetti** — efeito de confete ao registrar venda

## Arquitetura

### Autenticação e proteção de rotas

`AuthContext` (`src/context/AuthContext.jsx`) expõe `user`, `login` e `logout`. Usa `browserLocalPersistence` para manter a sessão mesmo ao fechar o navegador. O estado `loading` evita renderizar filhos antes de o Firebase confirmar a sessão.

`ProtectedRoute` redireciona para `/login` se não houver usuário autenticado.

### Layout e roteamento

`App.jsx` define o roteamento: `/login` é pública, todas as outras rotas ficam aninhadas sob `Layout`, que renderiza o `<Outlet />`. A rota `/` redireciona para `/dashboard`. Qualquer URL inválida vai para `/login`.

`Layout.jsx` contém a sidebar retrátil (colapsa para 64px, expande para 256px no hover). O tema (`forest` escuro / `light` claro) é persistido no `localStorage` e aplicado via `data-theme` no `<html>`.

### Roles (papéis)

Há dois tipos de usuário, definidos por listas hardcoded no `Dashboard`:

- **GESTORES** — veem todas as vendas, podem filtrar por vendedor e excluir qualquer venda
- **Vendedores** — veem apenas as próprias vendas

A lista `GESTORES` e o mapa `VENDEDORES` ficam no topo de `src/pages/Dashboard/index.jsx`.

### Firestore — coleção `vendas`

Cada documento tem:

| Campo | Tipo | Descrição |
|---|---|---|
| `clienteId` | string | ID numérico do cliente |
| `nome` | string | Nome do cliente |
| `contato` | string | Telefone formatado `(DD XXXXX-XXXX)` |
| `servico` | string | Nome do plano fictício |
| `valor` | number | Valor do plano |
| `vendedorEmail` | string | Email de quem registrou |
| `criadoEm` | Timestamp | `serverTimestamp()` do Firestore |

O `Dashboard` faz `onSnapshot` na coleção inteira ordenada por `criadoEm desc` — toda filtragem (por vendedor, por período) é feita no cliente.

### Período de apuração

O "mês atual" vai do **dia 25 do mês anterior até o dia 24 do mês corrente** (ciclo de fechamento da empresa). Essa lógica está em `getPeriodoAtual()` no `Dashboard`.

### Planos disponíveis

Os planos (nome + valor) são um array estático em `src/pages/NovaVenda/index.jsx`. Para adicionar ou alterar planos, edite o array `PLANOS` nesse arquivo.

## Temas DaisyUI

O app usa dois temas: `forest` (escuro, padrão) e `light`. Não crie classes de cores hardcoded — use variáveis semânticas do DaisyUI (`bg-base-100`, `text-base-content`, `bg-primary`, etc.) para garantir compatibilidade com ambos os temas.

## Padrões Visuais Obrigatórios

- Design no nível de produtos como Linear, Vercel, Stripe e Raycast
- Glassmorphism elegante (backdrop-blur, transparência, border sutil)
- Bordas arredondadas: `rounded-2xl` e `rounded-3xl`
- Fonte: Poppins (Google Fonts)
- Cards com gradiente verde sutil
- Uppercase labels com `tracking-widest`
- Animações suaves: `slideDown`, `slideUp`, `pulse`
- Microinterações refinadas nos hovers
- Sem `window.confirm` ou `window.alert` — usar modais customizados
- Sidebar recolhível com barra lateral verde no item ativo

## Restrições Técnicas

- **Não atualizar o Vite para v8** — causa incompatibilidade com DaisyUI v5
- DaisyUI v5 configurado via `@plugin "daisyui"` no `index.css`
- Deploy sem projeto fixo no código: configure o projeto Firebase localmente e execute `npm run deploy`.
- Sempre verificar projeto ativo com `firebase use` antes do deploy
- Nunca usar `window.confirm` ou `window.alert`

## Regras de Código

- Preferir componentes reutilizáveis
- Nomenclatura semântica
- Preservar arquitetura existente
- Não reescrever o que já funciona
- Manter consistência visual entre todas as páginas
- Transitions suaves por padrão
- Pensar como Senior Product Designer + Senior Frontend Engineer

## Deploy

```bash
npm run build
npm run deploy
```

## Demo pública

As credenciais e os dados de demonstração são criados pelo seed documentado na próxima etapa. Não coloque credenciais reais em arquivos versionados.