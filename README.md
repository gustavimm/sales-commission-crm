# AmoSales Demo

CRM fictício para demonstração de registro e acompanhamento de vendas. Nomes, planos, valores e usuários são fictícios.

Copie `.env.example` para `.env.local` e preencha a configuração de um projeto Firebase próprio antes de executar a aplicação.

## Seed de demonstração

Popula o Firebase da demo com contas, metas e vendas fictícias. Usa o SDK web (sem service account nem Admin SDK) e lê as variáveis `VITE_FIREBASE_*` do `.env.local`. Nunca use credenciais de produção.

**Como rodar** (PowerShell ou CMD, na raiz do projeto):

```powershell
npm run seed
```

Equivale a `node --env-file=.env.local scripts/seed.js`. Requer Node 20.6+ e o Auth com e-mail/senha habilitado no projeto Firebase. Para só ver o resumo dos dados que seriam gerados, sem acessar o Firebase: `node scripts/seed.js --dry-run`.

**Primeira execução em um projeto novo:** as regras do Firestore só deixam um usuário se cadastrar como `vendedor` pendente, e só um admin altera papéis. Por isso o seed cria `admin@exemplo.com` como vendedor e para com uma mensagem. Promova esse documento uma única vez no Console do Firebase (Firestore → `users` → `admin@exemplo.com`: `role = admin`, `aprovacao = aprovado`) e rode `npm run seed` de novo.

**O que cria**

- 10 contas (Auth + documento em `users`, `aprovacao: aprovado`): admin, gestor e 8 vendedores.
- 200 documentos em `vendas` (ids `demo-venda-001` … `demo-venda-200`) distribuídos entre os 8 vendedores, com status `assinado`, `aguardando_bko`, `aguardando_instalacao`, `instalado` e `cancelado`, planos do app, clientes `Cliente 001`, `Cliente 002`… e 30 upgrades (15%) com `valorAnterior`, `diferenca`, `categoriaUpgrade` e `statusUpgrade`.
- Metas de setor (`setor__AAAA-MM`) em `metas` (100 vendas) e `metas_upgrade` (15 upgrades), uma por ciclo de apuração coberto pelas vendas.

**Datas relativas ao dia da execução:** as vendas cobrem os últimos 60 dias até hoje (horário de Brasília, sem horários no futuro), então o Dashboard e a Comissão, que usam o ciclo vigente 25→24, sempre têm dados. Como 60 dias podem atravessar até três ciclos 25→24, o seed grava uma meta para cada ciclo em que alguma venda cai (o ciclo `AAAA-MM` vai de 25 do mês anterior a 24 de `MM`).

**Idempotente:** contas existentes só fazem login; perfis, metas e vendas usam ids fixos e o gerador pseudoaleatório tem semente fixa. Rodar de novo no mesmo dia regrava exatamente os mesmos documentos, sem duplicar. Em outro dia, as mesmas 200 vendas (mesmos ids) são regravadas com datas deslocadas; metas de ciclos antigos permanecem. Alterações manuais nas vendas seedadas são sobrescritas.

## Contas de demo

Senha de todas as contas: `Demo123!`

| E-mail | Papel | Nome |
| --- | --- | --- |
| `admin@exemplo.com` | admin | Admin Demo |
| `gestor@exemplo.com` | gestor | Gestor Demo |
| `vendedor1@exemplo.com` | vendedor | Bianca Lemos |
| `caio@exemplo.com` | vendedor | Caio Ventura |
| `dora@exemplo.com` | vendedor | Dora Pinheiro |
| `elias@exemplo.com` | vendedor | Elias Montenegro |
| `fabricio@exemplo.com` | vendedor | Fabricio Lago |
| `gloria@exemplo.com` | vendedor | Gloria Sampaio |
| `heitor@exemplo.com` | vendedor | Heitor Brandao |
| `isis@exemplo.com` | vendedor | Isis Valadares |
