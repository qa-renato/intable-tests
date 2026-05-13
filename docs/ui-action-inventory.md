# InTable QA — Inventário de Ações da UI

_Gerado via inspeção DOM read-only em 2026-05-13. Nenhum dado foi criado, editado ou excluído._

---

## Legenda de status de automação

| Símbolo | Significado |
|---|---|
| `[COB]` | Coberto — teste existente e passando |
| `[FRAGIL]` | Coberto com locator frágil — funciona, risco de quebra sem aviso |
| `[PEND]` | Não coberto — automação possível, aguarda implementação |
| `[BLOQ]` | Bloqueado por front-end — requer `data-testid` ou `aria-label` ausente |

---

## Tela 1 — Home (`/`)

### Área: Navegação global (header)

| Ação | Tipo | Suíte | Status | Observações |
|---|---|---|---|---|
| Toggle sidebar (abrir/fechar menu lateral) | navegação | N/A | `[PEND]` | Botão sem testId, sem aria-label |
| Toggle theme (claro/escuro) | preferência | N/A | `[PEND]` | Botão sem testId, sem aria-label |
| Abrir painel de notificações/downloads | leitura | @readonly | `[COB]` | `getByRole('button', { name: 'Notificações' })` + heading "Downloads" como âncora |
| Marcar todas notificações como lidas | escrita | @readonly | `[PEND]` | Botão "Marcar todas como lidas" sem testId |
| Navegar para próxima página de notificações | navegação | @readonly | `[PEND]` | Botão "Prox" dentro do painel |

### Área: Seleção de empresa

| Ação | Tipo | Suíte | Status | Observações |
|---|---|---|---|---|
| Buscar empresa pelo nome | leitura | @readonly | `[FRAGIL]` | `getByRole('textbox', { name: 'Buscar empresa...' })` — sem testId |
| Selecionar empresa inbot | navegação | @readonly | `[FRAGIL]` | `locator('div').filter({ hasText: /^inbot$/ }).nth(1)` — depende de posição |
| Limpar filtros da busca de empresa | leitura | @readonly | `[PEND]` | Botão "Limpar filtros" sem testId |

### Área: Cards de tabelas recentes (home)

| Ação | Tipo | Suíte | Status | Observações |
|---|---|---|---|---|
| Ver cards de tabelas recentes da empresa | leitura | @readonly | `[PEND]` | H3 com nome da tabela visível; cards sem testId |
| Ações sobre card de tabela (ícone-only) | escrita | N/A | `[BLOQ]` | ~12 botões `class="p-1 hover:bg-muted rounded"` sem aria-label, sem testId — completamente opacos |
| Criar nova tabela via home | escrita | @table-create | `[BLOQ]` | Botão "Nova Base" sem testId; Card 10 (`create-table-button`) |
| Ver todas as tabelas da empresa | navegação | @readonly | `[COB]` | `getByRole('button', { name: 'Ver todas' })` → verifica buscarTabelasInput visível |

### Estatísticas visíveis na home

| Dado | Valor capturado | Observações |
|---|---|---|
| Total de tabelas (heading H3) | 112 | Dado dinâmico — verificável como smoke de integridade |
| Total de registros (heading H3) | 2.095.281 | Dado dinâmico — verificável como smoke de integridade |

---

## Tela 2 — Lista de tabelas (`/tables?company=inbot`)

### Área: Barra de ações (toolbar)

| Ação | Tipo | Suíte | Status | Observações |
|---|---|---|---|---|
| Buscar tabelas por nome | leitura | @readonly | `[COB]` | `getByRole('textbox', { name: 'Buscar tabelas...' })` |
| Limpar campo de busca | leitura | @readonly | `[COB]` | `.fill('')` no mesmo input |
| Atualizar lista de tabelas | leitura | @readonly | `[COB]` | `getByRole('button', { name: 'Atualizar tabelas' })` |
| Criar nova tabela | escrita | @table-create | `[BLOQ]` | Botão "Criar Nova" presente mas sem testId; Card 10 (`create-table-button`) |

> **Observação:** botão "Criar Nova" foi capturado como `disabled: true` durante a inspeção.
> Pode indicar restrição de permissão ou estado de carregamento. Investigar condição de habilitação.

### Área: Painel de filtros (colapsável)

| Ação | Tipo | Suíte | Status | Observações |
|---|---|---|---|---|
| Expandir/colapsar painel Filtros | navegação | @readonly | `[COB]` | `getByRole('heading', { name: 'Filtros', level: 3 })` |
| Filtrar por empresa | leitura | @readonly | `[PEND]` | `getByRole('textbox', { name: 'Selecione as empresas...' })` — capturado, não testado |
| Filtrar por departamento | leitura | @readonly | `[COB]` | `getByRole('textbox', { name: 'Selecione os departamentos...' })` |
| Aplicar filtros ("Buscar") | leitura | @readonly | `[COB]` | `getByRole('button', { name: 'Buscar' })` |
| Limpar filtros ("Limpar") | leitura | @readonly | `[PEND]` | `getByRole('button', { name: 'Limpar' })` — capturado como `disabled: true` até haver filtro |
| Filtrar por data inicial | leitura | @readonly | `[PEND]` | Botão "Data inicial" sem testId (abre date picker) |
| Filtrar por data final | leitura | @readonly | `[PEND]` | Botão "Data final" sem testId (abre date picker) |

### Área: Grid de tabelas

| Ação | Tipo | Suíte | Status | Observações |
|---|---|---|---|---|
| Ver cabeçalhos da tabela | leitura | @readonly | `[COB]` | Todos 7 columnheaders validados |
| Ordenar por "Nome da Tabela" | leitura | @readonly | `[FRAGIL]` | Click no columnheader funciona; `aria-sort` ausente — validação de resultado indeterminada |
| Ordenar por outras colunas | leitura | @readonly | `[COB]` | Empresa, Departamento, Criada em, Alterada em — verifica grid intacto; direção aguarda aria-sort (Card 5) |
| Abrir primeira tabela | navegação | @readonly | `[COB]` | `getByRole('button', { name: 'Abrir' }).first()` — requer timeout >= 10s |
| Abrir tabela específica por linha | navegação | @readonly | `[PEND]` | `getByRole('row').filter({ hasText: nome }).getByRole('button', { name: 'Abrir' })` |
| Estado vazio — busca sem resultado | leitura | @readonly | `[COB]` | `getByRole('cell', { name: 'Nenhuma tabela encontrada' })` |

> **Observação:** seletores CSS `[role="row"] button` e `tbody tr button` não encontraram elementos
> durante a inspeção. A tabela usa `role="table"` nativo com `getByRole('row')` do Playwright —
> seletores CSS de atributo não funcionam igual ao motor ARIA do Playwright neste contexto.

### Área: Paginação

| Ação | Tipo | Suíte | Status | Observações |
|---|---|---|---|---|
| Ver informação de paginação | leitura | @readonly | `[COB]` | `getByText(/Mostrando \d+-\d+ de \d+ itens/)` |
| Ir para próxima página | navegação | @readonly | `[COB]` | `getByRole('button', { name: 'Prox' })` |
| Voltar para página anterior | navegação | @readonly | `[COB]` | `getByRole('button', { name: 'Ant' })` |
| Alterar tamanho de página | leitura | @readonly | `[FRAGIL]` | `getByRole('combobox')` — único combobox na tela, sem aria-label |

---

## Tela 3 — Painel de notificações/downloads (overlay em `/tables`)

_O painel é identificado no DOM como `role="region" aria-label="Notifications (F8)"`._
_Internamente o heading é "Downloads" — o painel exibe exportações concluídas, não apenas alertas._

| Ação | Tipo | Suíte | Status | Observações |
|---|---|---|---|---|
| Abrir painel de downloads | leitura | @readonly | `[PEND]` | `getByRole('button', { name: 'Notificações' })` funciona |
| Fechar painel (Escape) | navegação | @readonly | `[PEND]` | Keyboard shortcut Escape |
| Marcar todas como lidas | escrita | @readonly | `[PEND]` | Botão sem testId — pode ser seguro (sem side-effect irreversível) |
| Abrir item de download | navegação | @readonly | `[PEND]` | Botão "Abrir" por item — sem testId |
| Navegar entre páginas de downloads | navegação | @readonly | `[PEND]` | Botões "Ant"/"Prox" dentro do painel |

> **Keyboard shortcuts confirmados no DOM:**
> - `F8` — abre/fecha o painel (região com `aria-label="Notifications (F8)"`)
> - `alt+T` — função associada ao painel (seção `aria-label="Notifications alt+T"`)

---

## Tela 4 — Detalhe da tabela (`/tables/:id`)

_Não capturado diretamente nesta rodada de mapeamento (timing: "Abrir" requer espera > 5s)._
_Dados derivados dos specs existentes e documentação anterior._

| Ação | Tipo | Suíte | Status | Observações |
|---|---|---|---|---|
| Ver grid de dados da tabela | leitura | @readonly | `[COB]` | `getByRole('table')` ou empty state |
| Exportar tabela (CSV/XLSX) | escrita | @export | `[BLOQ]` | Card 8: `data-testid="table-actions-menu-button"` ausente |
| Abrir menu de ações da tabela | navegação | @export | `[BLOQ]` | Card 8 — nenhum candidato de menu encontrado |
| Importar dados para tabela | escrita | N/A | `[BLOQ]` | Botão de importação sem testId identificável |
| Ver abas da tabela | leitura | @readonly | `[PEND]` | `role="tab"` confirmado em rodadas anteriores |
| Voltar para lista | navegação | @readonly | `[COB]` | `page.goBack()` |

---

## Tela 5 — Gerenciamento de API Keys

_Não localizado na inspeção. O botão de acesso não possui seletor estável._

| Ação | Tipo | Suíte | Status | Observações |
|---|---|---|---|---|
| Abrir menu de API Keys na home | navegação | @api-key | `[BLOQ]` | Card 9: `data-testid="api-keys-menu-button"` ausente |
| Criar API Key | escrita | @api-key | `[BLOQ]` | Dependente do Card 9 |
| Revogar API Key | destrutivo | @api-key | `[BLOQ]` | Dependente do Card 9 |

---

## Tela 6 — Criação de tabela (modal/formulário)

_Fluxo previsto pela suíte `@table-create`. Não acessível sem os testids do Card 10._

| Ação | Tipo | Suíte | Status | Observações |
|---|---|---|---|---|
| Clicar em "Criar Nova" / "Nova Base" | escrita | @table-create | `[BLOQ]` | Card 10: `create-table-button` ausente |
| Preencher nome da tabela | escrita | @table-create | `[BLOQ]` | Card 10: `table-name-input` ausente |
| Selecionar departamento | escrita | @table-create | `[BLOQ]` | Card 10: `table-department-select` ausente |
| Confirmar criação | escrita | @table-create | `[BLOQ]` | Card 10: `confirm-create-table` ausente |
| Excluir tabela | destrutivo | @table-create | `[BLOQ]` | Card 10: `delete-table-button` + `confirm-delete-table` ausentes |

---

## Resumo por status

| Status | Quantidade | Observações |
|---|---|---|
| `[COB]` — coberto | 22 | Testes estáveis, passando |
| `[FRAGIL]` — coberto com locator frágil | 4 | Funciona; sujeito a quebra sem aviso |
| `[PEND]` — não coberto (possível) | 16 | Ações identificadas, sem bloqueio de front-end |
| `[BLOQ]` — bloqueado por front-end | 12 | Cards 8, 9 e 10 pendentes |

---

## Ações candidatas à próxima fase (`[PEND]` prioritárias)

Ordenadas por valor e risco (menor risco primeiro):

1. **Filtrar por empresa** — input capturado, apenas falta spec (`getByRole('textbox', { name: 'Selecione as empresas...' })`)
2. **Limpar filtros** — validar comportamento quando `disabled: false`
3. **Datas de filtro** — entender se os botões "Data inicial"/"Data final" abrem date pickers nativos ou custom
4. **Ver todas (home → /tables)** — smoke de navegação via botão "Ver todas"
5. **Notificações/downloads** — abrir painel, contar itens, fechar — completamente read-only
6. **Ordenação por outras colunas** — extensão natural dos testes de ordenação existentes
7. **Abrir tabela específica por linha** — locator por texto de linha em vez de `.first()`
8. **Estatísticas da home** — verificar que "112 tabelas" e "2.095.281 registros" são visíveis como smoke de integridade
