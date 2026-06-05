# InTable — Roadmap de Automação E2E

_Atualizado em 2026-05-13 após expansão da suíte @readonly (10 → 14 testes). Gerado a partir da análise do código existente, documentação e inspeção das telas. Nenhuma execução destrutiva foi realizada._

---

## Nota de manutenção — 2026-06-04

Execução real da suíte `@readonly` contra produção após renovar a sessão. Resultado: **14/14 verde** em execução normal. Correções e achados desta rodada:

- **Seletores endurecidos (Cards 3 e 4 já implementados pelo front):** card de empresa migrado de `nth(1)` para `getByTestId('empresa-card-inbot')`; combobox de itens/página de `getByRole('combobox')` genérico para `getByRole('combobox', { name: 'Itens por página' })`.
- **`notifications-panel.spec.js`:** seletor `getByRole('button', { name: 'Notificações' })` passou a casar 2 elementos quando o painel abre (surgiu "Ver todas as notificações"). Corrigido com `exact: true`.
- **`TabelasPage.goto()` — espera robusta:** removido `waitUntil: 'networkidle'` (a InTable faz polling ao vivo, a rede nunca fica ociosa → timeout intermitente). Navegar para `/` ainda dispara um **round-trip de SSO Keycloak** (refresh de token) que `domcontentloaded` sozinho não cobre; a espera agora ancora no campo "Buscar empresa..." da Home autenticada — determinístico contra polling e redirect. Os 4 `waitForLoadState('networkidle')` pós-ação viraram `domcontentloaded` (os specs já têm web-first assertions).
- **Achado de fragilidade de infra (não da suíte):** sob estresse (`--repeat-each=3`, dezenas de re-autenticações SSO em sequência) o app volta do Keycloak com `?code` e por vezes **não renderiza a Home** — coerente com o bug de refresh de token Keycloak/CORS já visto no stack Inbot. Recomendação: não martelar o SSO em CI; rodar a suíte 1x por execução.

---

## 1. Resumo executivo

### Estado atual

| Métrica | Valor |
|---|---|
| Specs existentes | 14 arquivos |
| Testes automatizados (estáveis) | 14 (`@readonly`) |
| Suítes com base técnica criada | 3 (`@export`, `@api-key`, `@table-create`) |
| Suítes em execução real | 1 (`@readonly`) |
| Suítes bloqueadas por front-end | 3 |
| Cards de testabilidade abertos | 10 |
| Bloqueadores críticos | 3 (Cards 8, 9, 10) |

### Suítes existentes

| Suíte | Tags | Status | Flags necessárias |
|---|---|---|---|
| `tests/tabelas/` | `@readonly` | Estável — 14/14 passando (11 spec files) | nenhuma |
| `tests/export/` | `@export @integration @notification @download` | Base técnica criada — bloqueado | `ENABLE_EXPORT_TESTS=true` |
| `tests/api-keys/` | `@api-key @integration @destructive` | Base técnica criada — bloqueado | `ENABLE_API_KEY_TESTS=true` |
| `tests/tables-create/` | `@crud @table-create @destructive @integration` | Base técnica criada — bloqueado | `ENABLE_DESTRUCTIVE=true` + `ENABLE_TABLE_CREATE_TESTS=true` |

### Bloqueios principais

1. **Card 8** — `data-testid="table-actions-menu-button"` → desbloqueia `@export`
2. **Card 9** — `data-testid="api-keys-menu-button"` → desbloqueia `@api-key`
3. **Card 10** — 7 `data-testid` no fluxo de criação/deleção → desbloqueia `@table-create`

### Próximos focos (por ordem de impacto)

1. Resolver Cards 8, 9 e 10 junto ao time de front-end.
2. Executar a primeira rodada real de `@export` assim que Card 8 for implementado.
3. Executar a primeira rodada real de `@api-key` assim que Card 9 for implementado.
4. Ampliar `@readonly` com filtro por empresa (requer Card 1) e filtro por data (requer Card 7). _(3 novas specs entregues em 2026-05-13: `home-stats`, `notifications-panel`, `ordenacao-colunas` — ver Seção 3.)_
5. Planejar `@table-create` com massa sintética após Card 10.

---

## 2. Matriz de funcionalidades

Legenda de **tipo de fluxo**:
- `readonly` — apenas leitura, sem efeito no servidor
- `efeito externo` — dispara processo assíncrono, notificação ou e-mail
- `destrutivo controlado` — cria ou exclui dado real com prefixo de segurança e cleanup
- `sensível` — manipula credencial ou token de acesso
- `fora do escopo` — não recomendado agora por risco, complexidade ou ausência de massa

Legenda de **status**:
- `automatizado` — spec existente, estável
- `base técnica criada` — spec existe, bloqueado por seletor de front-end
- `bloqueado por front` — candidato identificado, seletor ausente
- `candidato futuro` — viável, ainda não iniciado
- `não recomendado agora` — risco alto ou sem massa controlada

### 2.1 Home (/)

| Área | Ação | Tipo | Risco | Status | Flag | Cleanup | Massa sint. | Bloqueio front | data-testid sugerido | Prioridade | Observação |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Home | Carregar tela de seleção de empresa | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `smoke.spec.js` |
| Home | Selecionar empresa inbot | readonly | Baixo | automatizado | nenhuma | não | não | não | `empresa-card-inbot` (Card 3) | Alta | Usa `nth(1)` frágil; Card 3 pendente |
| Home | Verificar seções da home (Suas bases de dados, Pulsos do ecossistema, Notificações, Ver todas) | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `home-stats.spec.js` |
| Home | Navegar para lista de tabelas via "Ver todas" | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `home-stats.spec.js` |
| Home | Buscar empresa pelo campo de texto | readonly | Baixo | candidato futuro | nenhuma | não | não | não | `empresa-card-{nome}` (Card 3) | Média | Depende de Card 3 para seleção estável |
| Home | Selecionar empresa diferente de inbot | readonly | Baixo | candidato futuro | nenhuma | não | não | não | `empresa-card-{nome}` (Card 3) | Baixa | Requer empresa de massa sintética |

### 2.2 Lista de tabelas (/tables)

| Área | Ação | Tipo | Risco | Status | Flag | Cleanup | Massa sint. | Bloqueio front | data-testid sugerido | Prioridade | Observação |
|---|---|---|---|---|---|---|---|---|---|---|---|
| /tables | Validar colunas da lista (Nome, Empresa, Dept, Linhas, Criada em, Alterada em, Ações) | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `smoke.spec.js` |
| /tables | Validar botão Atualizar tabelas | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `smoke.spec.js` |
| /tables | Buscar tabela por nome | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `busca.spec.js` |
| /tables | Limpar busca e restaurar lista | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `busca.spec.js` |
| /tables | Empty state quando busca não retorna resultado | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `empty-state.spec.js` |
| /tables | Paginar para próxima página | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `paginacao.spec.js` |
| /tables | Paginar para página anterior | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `paginacao.spec.js` |
| /tables | Alterar tamanho de página (10 → 25 → 10) | readonly | Baixo | automatizado | nenhuma | não | não | não | `aria-label="Itens por página"` (Card 4) | — | Coberto em `tamanho-pagina.spec.js`; Card 4 para robustez |
| /tables | Ordenar por "Nome da Tabela" | readonly | Baixo | automatizado | nenhuma | não | não | não | `aria-sort` (Card 5) | — | Coberto em `ordenacao.spec.js`; skip se não detectável sem `aria-sort` |
| /tables | Ordenar por colunas adicionais (Empresa, Departamento, Criada em, Alterada em) | readonly | Baixo | automatizado | nenhuma | não | não | não | `aria-sort` (Card 5) | — | Coberto em `ordenacao-colunas.spec.js`; valida grid íntegro após cada clique; direção aguarda Card 5 |
| /tables | Abrir painel de downloads (Notificações) e validar estrutura | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `notifications-panel.spec.js`; fecha via toggle (Escape não fecha — achado de a11y) |
| /tables | Expandir painel de Filtros | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `smoke.spec.js` |
| /tables | Filtrar por departamento (ex: testes) | readonly | Baixo | automatizado | nenhuma | não | não | não | `departamento-option-testes` (Card 2) | — | Coberto em `filtros.spec.js`; usa fallback por enquanto |
| /tables | Filtrar por empresa (dropdown) | readonly | Baixo | bloqueado por front | nenhuma | não | não | **sim** | `empresa-option-{nome}` (Card 1) | Alta | Dropdown não tem semântica ARIA/role=option |
| /tables | Filtrar por data de criação (datepicker) | readonly | Baixo | bloqueado por front | nenhuma | não | não | **sim** | `datepicker-day-YYYY-MM-DD` (Card 7) | Média | Seleção de dia ambígua sem data completa no aria-label |
| /tables | Filtrar por data de alteração (datepicker) | readonly | Baixo | bloqueado por front | nenhuma | não | não | **sim** | `datepicker-day-YYYY-MM-DD` (Card 7) | Média | Igual ao filtro por criação |
| /tables | Filtro combinado (dept + empresa) | readonly | Baixo | candidato futuro | nenhuma | não | não | **sim** | Cards 1 + 2 | Média | Depende de Cards 1 e 2 |
| /tables | Abrir primeira tabela | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `visualizacao.spec.js` |
| /tables | Criar nova tabela | destrutivo controlado | Médio | base técnica criada | `ENABLE_DESTRUCTIVE` + `ENABLE_TABLE_CREATE_TESTS` | **sim** | **sim** | **sim** | `create-table-button` (Card 10) | Alta | Spec em `tests/tables-create/`; 7 seletores ausentes |
| /tables | Deletar tabela (da lista) | destrutivo controlado | Alto | base técnica criada | `ENABLE_DESTRUCTIVE` + `ENABLE_TABLE_CREATE_TESTS` | **sim** | **sim** | **sim** | `delete-table-button` (Card 10) | Alta | Parte do fluxo de `@table-create`; prefixo de segurança obrigatório |

### 2.3 Detalhe da tabela (/tables/:id)

| Área | Ação | Tipo | Risco | Status | Flag | Cleanup | Massa sint. | Bloqueio front | data-testid sugerido | Prioridade | Observação |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Detalhe | Visualizar grid de dados (ou empty state) | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `visualizacao.spec.js` |
| Detalhe | Voltar para lista de tabelas | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Coberto em `visualizacao.spec.js` |
| Detalhe | Abrir menu de ações da tabela | efeito externo | Médio | base técnica criada | `ENABLE_EXPORT_TESTS` | não | não | **sim** | `table-actions-menu-button` (Card 8) | Alta | Primeiro passo do fluxo @export — bloqueado |
| Detalhe | Exportar CSV via menu de ações | efeito externo | Médio | base técnica criada | `ENABLE_EXPORT_TESTS` | não | não | **sim** | `table-actions-menu-button` (Card 8) | Alta | Depende de Card 8; seletores pós-menu confirmados |
| Detalhe | Abrir painel de notificações | efeito externo | Baixo | base técnica criada | `ENABLE_EXPORT_TESTS` | não | não | não | `notifications-panel` (adicional) | Alta | Seletor `getByRole('button', { name: 'Notificações' })` confirmado |
| Detalhe | Baixar CSV via notificação | efeito externo | Baixo | base técnica criada | `ENABLE_EXPORT_TESTS` | não | não | não | — | Alta | Seletor `getByRole('button', { name: 'Baixar CSV' })` confirmado |
| Detalhe | Validar extensão e integridade do CSV | efeito externo | Baixo | base técnica criada | `ENABLE_EXPORT_TESTS` | não | não | não | — | Alta | Download capturado via `waitForEvent('download')` |
| Detalhe | Validar e-mail de exportação (Microsoft Graph) | efeito externo | Médio | base técnica criada | `ENABLE_EXPORT_TESTS` + `EMAIL_VALIDATION_ENABLED` | não | não | não | — | Baixa | Requer App Registration Azure; opcional no fluxo |
| Detalhe | Adicionar linha de dados | destrutivo controlado | Médio | não recomendado agora | — | **sim** | **sim** | **sim** | `add-row-button` (Card 11 sugerido) | Baixa | Sem seletor estável; sem massa controlada |
| Detalhe | Editar célula de dado | destrutivo controlado | Médio | não recomendado agora | — | **sim** | **sim** | **sim** | — | Baixa | Altamente dependente do tipo de coluna |
| Detalhe | Excluir linha de dado | destrutivo controlado | Alto | não recomendado agora | — | **sim** | **sim** | **sim** | `delete-row-button` (Card 11 sugerido) | Baixa | Risco de perda de dado sem prefixo de segurança |
| Detalhe | Importar arquivo de dados | efeito externo | Médio | não recomendado agora | — | **sim** | **sim** | **sim** | `import-data-button` (Card 12 sugerido) | Baixa | Depende de arquivo de entrada controlado |

### 2.4 Gerenciamento de colunas

| Área | Ação | Tipo | Risco | Status | Flag | Cleanup | Massa sint. | Bloqueio front | data-testid sugerido | Prioridade | Observação |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Colunas | Visualizar colunas da tabela | readonly | Baixo | candidato futuro | nenhuma | não | não | não | — | Baixa | Grid já verificado em `visualizacao.spec.js` |
| Colunas | Adicionar coluna | destrutivo controlado | Médio | não recomendado agora | — | **sim** | **sim** | **sim** | `add-column-button` (Card 13 sugerido) | Baixa | Sem massa de tabela controlada |
| Colunas | Editar coluna (nome, tipo) | destrutivo controlado | Médio | não recomendado agora | — | **sim** | **sim** | **sim** | — | Baixa | Requer tabela de massa com coluna de teste |
| Colunas | Excluir coluna | destrutivo controlado | Alto | não recomendado agora | — | **sim** | **sim** | **sim** | — | Baixa | Risco de perda de estrutura sem coluna de massa |

### 2.5 API Keys

| Área | Ação | Tipo | Risco | Status | Flag | Cleanup | Massa sint. | Bloqueio front | data-testid sugerido | Prioridade | Observação |
|---|---|---|---|---|---|---|---|---|---|---|---|
| API Keys | Abrir menu de API Keys | sensível | Médio | base técnica criada | `ENABLE_API_KEY_TESTS` | não | não | **sim** | `api-keys-menu-button` (Card 9) | Alta | Primeiro passo do fluxo @api-key — bloqueado |
| API Keys | Navegar para Gerenciar Chaves de API | sensível | Médio | base técnica criada | `ENABLE_API_KEY_TESTS` | não | não | **sim** | `api-keys-menu-button` (Card 9) | Alta | Depende de Card 9 |
| API Keys | Criar API Key (nome + departamento + permissões mínimas) | sensível | Alto | base técnica criada | `ENABLE_API_KEY_TESTS` | **sim** | **sim** | **sim** | `api-keys-menu-button` (Card 9) | Alta | trace/screenshot/video desabilitados; cleanup no finally |
| API Keys | Validar criação (botão Copiar visível) | sensível | Alto | base técnica criada | `ENABLE_API_KEY_TESTS` | não | não | **sim** | — | Alta | Nunca ler ou logar o valor da chave |
| API Keys | Listar chave criada na tabela | sensível | Alto | base técnica criada | `ENABLE_API_KEY_TESTS` | não | não | **sim** | — | Alta | Identificação por nome com timestamp |
| API Keys | Revogar chave criada | sensível | Alto | base técnica criada | `ENABLE_API_KEY_TESTS` | **sim** | **sim** | **sim** | — | Alta | Seletor `getByRole('row').filter({ hasText: keyName })` |
| API Keys | Confirmar revogação | sensível | Alto | base técnica criada | `ENABLE_API_KEY_TESTS` | **sim** | **sim** | **sim** | — | Alta | Confirmação via `Sim, Excluir` |
| API Keys | Validar remoção da chave da lista | sensível | Alto | base técnica criada | `ENABLE_API_KEY_TESTS` | não | não | **sim** | — | Alta | Parte do fluxo principal |
| API Keys | Listar chaves existentes (sem criar) | sensível | Baixo | não recomendado agora | — | não | não | **sim** | `api-keys-menu-button` (Card 9) | Baixa | Bloqueado por Card 9; read-only mas acessa área sensível |
| API Keys | Alternar status Ativa/Inativa | sensível | Médio | fora do escopo | — | **sim** | **sim** | **sim** | — | — | Fora do escopo da primeira versão |
| API Keys | Vincular chave existente | sensível | Médio | fora do escopo | — | não | não | **sim** | — | — | Fora do escopo da primeira versão |

### 2.6 Autenticação e sessão

| Área | Ação | Tipo | Risco | Status | Flag | Cleanup | Massa sint. | Bloqueio front | data-testid sugerido | Prioridade | Observação |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Auth | Login SSO (Keycloak → Microsoft) | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Tratado em `fixtures/global.setup.js`; reutiliza storageState |
| Auth | Validação de sessão antes de reutilizar cache | readonly | Baixo | automatizado | nenhuma | não | não | não | — | — | Verifica `Buscar empresa...` — não depende apenas de URL |
| Auth | Renovação automática de sessão expirada | readonly | Médio | automatizado | nenhuma | não | não | não | — | — | Setup faz novo login se sessão inválida |
| Auth | Logout | fora do escopo | Baixo | não recomendado agora | — | não | não | não | — | Baixa | Invalidaria a sessão compartilhada com outros testes |

---

## 3. Cobertura atual

### @readonly — 14 testes estáveis (11 spec files)

**Localização:** `tests/tabelas/`  
**Status:** Estável. 14/14 passando. Expandida em 2026-05-13 com 3 novos specs.  
**Flag:** nenhuma. Executam por padrão.  
**Commit:** `91adcdf`

| Spec | Cenários cobertos |
|---|---|
| `smoke.spec.js` | Carregamento de `/tables`, todos os cabeçalhos, botão Atualizar, paginação, botão Abrir; painel Filtros e controles internos |
| `filtros.spec.js` | Filtro por departamento `testes`, resultado com célula ou empty state |
| `busca.spec.js` | Busca por nome de tabela, limpeza do campo e restauração |
| `paginacao.spec.js` | Próxima página e retorno; skip automático se apenas uma página |
| `visualizacao.spec.js` | Abertura da primeira tabela, validação de grid ou empty state, retorno à lista |
| `empty-state.spec.js` | Busca sem resultado, empty state "Nenhuma tabela encontrada", recuperação ao limpar |
| `tamanho-pagina.spec.js` | Alterar para 25 itens, validar paginação, restaurar para 10 |
| `ordenacao.spec.js` | Clique em "Nome da Tabela", validação de reordenação; skip documentado quando mudança não é observável |
| `home-stats.spec.js` _(novo)_ | Seções da home: "Suas bases de dados", "Pulsos do ecossistema", botão Notificações, botão "Ver todas"; navegação para `/tables` via "Ver todas" |
| `notifications-panel.spec.js` _(novo)_ | Abertura do painel de downloads, heading "Downloads", botão "Marcar todas como lidas" (presença apenas), fechamento via toggle |
| `ordenacao-colunas.spec.js` _(novo)_ | Colunas Empresa, Departamento, Criada em, Alterada em — verifica grid intacto após cada clique; direção aguarda `aria-sort` (Card 5) |

**Limitações atuais:**
- Filtro por empresa bloqueado por Card 1 (dropdown sem semântica ARIA).
- Filtro por data bloqueado por Card 7 (datepicker sem data completa no `aria-label`).
- Ordenação de colunas valida integridade do grid mas não a direção — aguarda `aria-sort` (Card 5).
- Seleção de empresa usa `nth(1)` frágil — Card 3 pendente.

**Achado de acessibilidade (2026-05-13):**  
O popover de Notificações não fecha ao pressionar `Escape` — comportamento não conforme com WAI-ARIA.  
O fechamento correto é via segundo clique no botão "Notificações" (toggle).  
Documentado em `docs/locator-inventory.md` — Área 3. Sugestão de correção ao time de front-end.

---

### @export — base técnica criada

**Localização:** `tests/export/export-table.spec.js`  
**Status:** Bloqueado por `data-testid="table-actions-menu-button"` (Card 8).  
**Flag:** `ENABLE_EXPORT_TESTS=true`  
**Execução real:** não realizada.

**O que está pronto:**
- Spec completa com fluxo de ponta a ponta estruturado.
- Helper de notificações (`helpers/notifications.js`).
- Helper de e-mail Microsoft Graph (`helpers/emailClient.js`).
- Guard de flag no wrapper Node.js e no `test.skip()` interno.
- Seletores confirmados via Codegen: `Exportar (CSV)`, `Notificações`, `Baixar CSV`.
- Captura de download via `waitForEvent('download')`, validação de extensão e tamanho.
- Validação de e-mail (opcional) via Microsoft Graph com OData `$filter` por data.

**O que falta:**
- `data-testid="table-actions-menu-button"` no front-end → desbloqueia imediatamente.
- `data-testid="notifications-panel"` e `data-testid="notification-item"` → robustez adicional (não bloqueadores).

**Comando assim que Card 8 for implementado:**
```bash
ENABLE_EXPORT_TESTS=true \
EXPORT_RECIPIENT="email@inbot.com.br" \
npm run test:export
```

---

### @api-key — base técnica criada

**Localização:** `tests/api-keys/api-key-management.spec.js`  
**Status:** Bloqueado por `data-testid="api-keys-menu-button"` (Card 9).  
**Flag:** `ENABLE_API_KEY_TESTS=true`  
**Execução real:** realizada em 2026-05-11 — sessão válida (24 cookies), falhou no passo do menu de API Keys. Nenhuma chave criada. Sem cleanup pendente.

**O que está pronto:**
- Spec completa com geração, listagem e revogação de chave.
- `test.use({ trace: 'off', screenshot: 'off', video: 'off' })` no nível do arquivo (segurança).
- `try/finally` com cleanup e `warning` annotation se cleanup falhar.
- Nome de chave com timestamp para rastreabilidade.
- Seletores pós-menu avaliados via Codegen (a confirmar no DOM real).
- Regra de não exposição: nunca ler, logar ou salvar o valor da chave.

**O que falta:**
- `data-testid="api-keys-menu-button"` → desbloqueia o primeiro passo.
- `data-testid="api-key-department-select"` e `api-key-department-option-testes` → robustez no form.
- Confirmação dos demais seletores no DOM real após Card 9 implementado.

---

### @table-create — base técnica criada

**Localização:** `tests/tables-create/create-table.spec.js`  
**Status:** Bloqueado por 7 `data-testid` ausentes (Card 10).  
**Flags:** `ENABLE_DESTRUCTIVE=true` **e** `ENABLE_TABLE_CREATE_TESTS=true`  
**Execução real:** não realizada. Nenhuma tabela criada. Sem cleanup pendente.

**O que está pronto:**
- Guard duplo de flags no wrapper e no `test.skip()`.
- Nome de tabela com prefixo `qa_tabela_aut_` + timestamp.
- Regra de segurança: cleanup só atua em tabelas com esse prefixo.
- `try/finally` com cleanup e `warning` annotation.
- Seletores condicionais com fallback por role/text onde plausível.

**O que falta:**
- 7 `data-testid` do Card 10 → desbloqueiam o fluxo completo.

---

## 4. Backlog sugerido de automação

### Fase 1 — Consolidar readonly (em andamento)

Objetivo: maximizar a cobertura sem risco, sem depender de front-end.

| Ação | Spec alvo | Dependência | Status |
|---|---|---|---|
| ~~Adicionar spec de home (seções e navegação)~~ | ~~`home-stats.spec.js`~~ | ~~nenhuma~~ | **Entregue** (2026-05-13) |
| ~~Adicionar spec do painel de downloads~~ | ~~`notifications-panel.spec.js`~~ | ~~nenhuma~~ | **Entregue** (2026-05-13) |
| ~~Adicionar spec de ordenação por colunas adicionais~~ | ~~`ordenacao-colunas.spec.js`~~ | ~~nenhuma~~ | **Entregue** (2026-05-13) |
| Ampliar `smoke.spec.js` com validação da contagem de linhas por página | `tests/tabelas/smoke.spec.js` | nenhuma | Pendente |
| Adicionar spec de filtro combinado (dept + empresa) | `tests/tabelas/filtros.spec.js` | Card 1 (empresa) | Pendente (bloqueado) |
| ~~Substituir `nth(1)` da empresa por seletor estável~~ | `pages/intable/tabelas.page.js` | Card 3 ✅ | **Entregue (2026-06-04)** — `getByTestId('empresa-card-inbot')` |
| ~~Adicionar `aria-label="Itens por página"` e usar no test~~ | `pages/intable/tabelas.page.js` | Card 4 ✅ | **Entregue (2026-06-04)** — `getByRole('combobox', { name: 'Itens por página' })` |
| Tornar `ordenacao.spec.js` determinístico | `tests/tabelas/ordenacao.spec.js` | Card 5 | Pendente (bloqueado) |
| Spec de filtro por data (criada em / alterada em) | `tests/tabelas/filtros.spec.js` | Card 7 | Pendente (bloqueado) |

---

### Fase 2 — Desbloquear testabilidade do front

Objetivo: apresentar os Cards 8, 9 e 10 ao time de front-end e acompanhar implementação.

| Card | Atributo | Desbloqueia |
|---|---|---|
| Card 8 | `data-testid="table-actions-menu-button"` | Toda a suíte `@export` |
| Card 9 | `data-testid="api-keys-menu-button"` | Toda a suíte `@api-key` |
| Card 10 | 7 `data-testid` (criação/deleção) | Toda a suíte `@table-create` |
| Card 1 | `role="option"` / `data-testid="empresa-option-{nome}"` | Filtro por empresa |
| Card 3 | `data-testid="empresa-card-{nome}"` | Seleção estável de empresa |

---

### Fase 3 — Exportação CSV (após Card 8)

Objetivo: primeira execução real do fluxo de exportação.

Pré-requisitos:
1. Card 8 implementado pelo front-end.
2. `EXPORT_RECIPIENT` configurado no `.env`.
3. Tabela de massa com dados conhecidos para validar o CSV.

Etapas:
1. Executar `npm run test:export` com `ENABLE_EXPORT_TESTS=true`.
2. Confirmar e ajustar seletores pós-menu no DOM real.
3. Validar extensão `.csv`, tamanho > 0, cabeçalho presente.
4. (Opcional) Ativar `EMAIL_VALIDATION_ENABLED=true` com App Registration Azure.

---

### Fase 4 — API Keys controlado (após Card 9)

Objetivo: primeira execução real do fluxo de criação e revogação.

Pré-requisitos:
1. Card 9 implementado pelo front-end.
2. Massa autorizada: empresa `inbot`, departamento `testes`, tabela `TesteAut`.
3. Confirmar seletores do formulário de criação no DOM real.

Etapas:
1. Executar `npm run test:api-keys` com `ENABLE_API_KEY_TESTS=true`.
2. Confirmar e ajustar seletores `Nova API Key`, `Gerar Chave`, `Copiar`, `Revogar`, `Sim, Excluir`.
3. Confirmar comportamento do dropdown de departamento.
4. Verificar que o relatório mostra apenas metadados (nunca o valor da chave).

---

### Fase 5 — Criação/deleção de tabela com massa sintética (após Card 10)

Objetivo: primeira execução real do fluxo destrutivo controlado.

Pré-requisitos:
1. Card 10 completo (7 `data-testid`) implementado pelo front-end.
2. Confirmar que o prefixo `qa_tabela_aut_` identifica univocamente as tabelas de teste.
3. Validar que o botão de deleção não aparece para tabelas sem o prefixo (proteção visual).

Etapas:
1. Executar `npm run test:table-create` com `ENABLE_DESTRUCTIVE=true` e `ENABLE_TABLE_CREATE_TESTS=true`.
2. Confirmar e ajustar seletores do formulário de criação no DOM real.
3. Confirmar seletor do botão de deleção por linha.
4. Verificar que o relatório anota metadados e warnings de cleanup quando necessário.
5. Executar 3 rodadas consecutivas para validar idempotência do cleanup.

---

### Fase 6 — Edição, importação e outros fluxos controlados (futuro)

Objetivo: ampliar cobertura destrutiva com fluxos mais complexos.

| Fluxo | Pré-requisito | Observação |
|---|---|---|
| Adicionar coluna em tabela de massa | Card 10 + tabela `qa_tabela_aut_` existente | Requer coluna com prefixo de segurança |
| Adicionar linha em tabela de massa | Card 11 sugerido (ver seção 7) | Tipo de dado varia por coluna |
| Editar célula de dado | Card 11 + linha de massa | Alta variabilidade — depende do tipo de coluna |
| Excluir linha de dado | Card 11 + linha de massa | Prefixo de segurança no dado |
| Importar arquivo CSV/XLSX | Card 12 sugerido (ver seção 7) | Arquivo de entrada controlado necessário |
| Exportar XLSX (se disponível) | Card 8 + pesquisa de menu | Verificar se existe opção além de CSV |

---

## 5. Regras de segurança

### Execução

- **Nunca rodar suíte destrutiva por padrão.** Toda suíte que cria, edita ou exclui dado real requer flag explícita.
- **Toda suíte destrutiva requer flag específica.** `ENABLE_API_KEY_TESTS`, `ENABLE_TABLE_CREATE_TESTS`, `ENABLE_EXPORT_TESTS` — nunca misturar.
- **`@table-create` exige duas flags.** `ENABLE_DESTRUCTIVE=true` + `ENABLE_TABLE_CREATE_TESTS=true` — ambas obrigatórias.
- **Toda suíte destrutiva precisa de cleanup.** Bloco `finally` obrigatório. Se cleanup falhar, anotar `warning` no relatório — nunca silenciar.

### Dados e massa

- **Nunca usar dado real como massa de teste.** Criar dados sintéticos com prefixos rastreáveis (`qa_tabela_aut_`, `qa-api-key-`, etc.).
- **Prefixo de segurança é a última linha de defesa.** Cleanup só atua em registros com o prefixo esperado — verificação explícita no código.
- **Nunca expor API Key.** Valor da chave nunca é lido, logado, salvo ou anotado. `trace`, `screenshot` e `video` desabilitados na suíte `@api-key`.

### Artefatos e versionamento

- **Nunca commitar evidências.** `evidencias/`, `downloads/`, `test-results/`, `playwright-report/` estão no `.gitignore`.
- **Nunca commitar `.env`.** Apenas `.env.example` (sem valores reais) é versionado.
- **Nunca commitar `fixtures/.auth/user.json`.** Contém cookies de sessão reais.
- **Nunca commitar traces ou screenshots com dado sensível.**

### Seletores

- **Nunca usar seletor posicional (`nth()`)** a menos que documentado como temporário com TODO.
- **Nunca usar seletor por classe CSS** — frágil a mudanças de estilo.
- **Preferência de seletor:** `getByTestId()` > `getByRole()` > `getByLabel()` > `getByText()` > fallback com TODO.
- **Se o seletor estável não existir:** criar Card para o time de front-end e bloquear o teste com mensagem clara — nunca usar workaround posicional em spec executável.

---

## 6. Pendências do front-end

### Bloqueadores críticos (impedem execução real das suítes)

#### Card 8 — `table-actions-menu-button` (desbloqueia @export)

```html
<button
  data-testid="table-actions-menu-button"
  aria-label="Ações da tabela"
>
  <!-- ícone existente — sem alteração visual -->
</button>
```

Elemento: botão que abre o menu de ações na tela de detalhe da tabela.  
Detalhe completo: `docs/frontend-testability-tickets.md` — Card 8.

---

#### Card 9 — `api-keys-menu-button` (desbloqueia @api-key)

```html
<button
  data-testid="api-keys-menu-button"
  aria-label="Ações de API Keys"
>
  <!-- ícone existente — sem alteração visual -->
</button>
```

Elemento: botão que abre o menu de API Keys na tela pós-seleção de empresa.  
Detalhe completo: `docs/frontend-testability-tickets.md` — Card 9.

---

#### Card 10 — Seletores de criação/deleção de tabela (desbloqueia @table-create)

```html
<button data-testid="create-table-button">Nova Tabela</button>
<input  data-testid="table-name-input" />
<div    data-testid="table-department-select">...</div>
<div    data-testid="table-department-option-testes">testes</div>
<button data-testid="confirm-create-table">Criar</button>
<button data-testid="delete-table-button" aria-label="Excluir tabela">...</button>
<button data-testid="confirm-delete-table">Sim, Excluir</button>
```

Elementos: formulário de criação e botões de deleção na lista `/tables`.  
Detalhe completo: `docs/frontend-testability-tickets.md` — Card 10.

---

### Cards pendentes de menor impacto (não bloqueadores de suítes críticas)

| Card | Atributo | Impacto |
|---|---|---|
| Card 1 | `role="option"` ou `data-testid="empresa-option-{nome}"` no dropdown de empresas | Filtro por empresa em @readonly |
| Card 2 | `data-testid="departamento-option-{nome}"` | Filtro de departamento mais robusto |
| Card 3 | `data-testid="empresa-card-{nome}"` | Remove `nth(1)` frágil na seleção de empresa |
| Card 4 | `aria-label="Itens por página"` no combobox | Robustez em `tamanho-pagina.spec.js` |
| Card 5 | `aria-sort` nos cabeçalhos ordenáveis | Validação determinística de ordenação |
| Card 7 | `aria-label="DD/MM/YYYY"` nos dias do datepicker | Filtro por data em @readonly |

---

## 7. Sugestão de novos cards

As áreas abaixo foram identificadas como candidatas a futuros Cards de testabilidade. **Ainda não criados — apresentar ao time de front-end antes de formalizar.**

---

### Card 11 sugerido — Seletores para adicionar/editar/excluir linha de dados

**Contexto:** quando a Fase 6 do roadmap for iniciada, o fluxo de adicionar, editar e excluir registros precisará de seletores estáveis na tela de detalhe da tabela.

**Atributos necessários (estimativa):**

```html
<button data-testid="add-row-button">Adicionar Linha</button>
<button data-testid="delete-row-button">Excluir Linha</button>
<button data-testid="confirm-delete-row">Sim, Excluir</button>
```

**Observação:** a edição de célula provavelmente exige `data-testid` por coluna ou por tipo de campo — a discussão com o front-end deve acontecer quando a Fase 6 for planejada.

---

### Card 12 sugerido — Seletor para importação de dados

**Contexto:** o fluxo de importação de arquivo CSV/XLSX na tela de detalhe da tabela não possui seletor estável identificado.

**Atributos necessários (estimativa):**

```html
<button data-testid="import-data-button">Importar</button>
<input  data-testid="import-file-input" type="file" />
<button data-testid="confirm-import">Confirmar Importação</button>
```

**Observação:** o teste de importação exige um arquivo de entrada controlado (CSV/XLSX com dados sintéticos). Planejar junto com o Card antes de implementar a spec.

---

### Card 13 sugerido — Seletores para gestão de colunas

**Contexto:** adicionar, editar e excluir colunas de uma tabela é um fluxo destrutivo que requer seletores estáveis para automação controlada.

**Atributos necessários (estimativa):**

```html
<button data-testid="add-column-button">Adicionar Coluna</button>
<input  data-testid="column-name-input" />
<select data-testid="column-type-select">...</select>
<button data-testid="confirm-add-column">Salvar</button>
<button data-testid="delete-column-button">Excluir Coluna</button>
<button data-testid="confirm-delete-column">Sim, Excluir</button>
```

**Observação:** excluir coluna é irreversível se não houver massa sintética dedicada. Requer tabela `qa_tabela_aut_` com coluna de teste antes de qualquer execução real.

---

## 8. Checks seguros executados

Os comandos abaixo foram executados sem flags destrutivas para confirmar que os guards funcionam:

```
npm run test:export       → Suíte @export desativada — Playwright não será iniciado.
npm run test:api-keys     → Suíte @api-key desativada — Playwright não será iniciado.
npm run test:table-create → Suíte @table-create desativada — Playwright não será iniciado.
                           Flag(s) ausente(s): ENABLE_DESTRUCTIVE=true, ENABLE_TABLE_CREATE_TESTS=true
```

Nenhum teste real foi executado. Nenhum dado foi criado, editado ou excluído.

---

_Próxima revisão recomendada: após a implementação de qualquer Card pela equipe de front-end._
