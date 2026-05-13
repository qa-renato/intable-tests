# InTable QA — Inventário de Locators

_Gerado via inspeção DOM read-only em 2026-05-13._
_Referência para avaliar fragilidade dos seletores existentes e priorizar pedidos ao front-end._

---

## Classificação

| Classe | Critério |
|---|---|
| **Estável** | `data-testid`, `aria-label` explícito, ou role semântico único e imutável |
| **Funcional** | `getByRole` + texto visível — funciona, sem garantia se texto mudar |
| **Frágil** | Posicional (`nth()`), classe CSS, ou único por acidente (ex.: único combobox da tela) |
| **Ausente** | Nenhum seletor estável ou funcional disponível — elemento opaco ao Playwright |

---

## Área 1 — Home (`/`)

| Elemento | Locator atual | Classe | Motivo | Sugestão |
|---|---|---|---|---|
| Heading "Selecione uma empresa" | `getByRole('heading', { name: 'Selecione uma empresa para visualizar', level: 3 })` | Funcional | Texto fixo, role semântico | Adicionar `data-testid="select-company-heading"` |
| Input "Buscar empresa..." | `getByRole('textbox', { name: 'Buscar empresa...' })` | Funcional | Placeholder usado como âncora ARIA | Adicionar `aria-label="Buscar empresa"` ou testid |
| Card empresa "inbot" | `locator('div').filter({ hasText: /^inbot$/ }).nth(1)` | **Frágil** | Depende de posição (`nth`) e texto; `<div>` sem role | Adicionar `data-testid="empresa-inbot"` ou `role="button"` + `aria-label` |
| Card empresa "azul" | `locator('div').filter({ hasText: /^azul$/ }).nth(0)` | **Frágil** | Mesma fragilidade — derivado do padrão anterior | Adicionar `data-testid="empresa-azul"` |
| Botão "Nova Base" (criar tabela) | `getByRole('button', { name: 'Nova Base' })` | Funcional | Texto único na home — funciona hoje | Adicionar `data-testid="create-table-button"` (Card 10) |
| Botão "Ver todas" (→ /tables) | `getByRole('button', { name: 'Ver todas' })` | Funcional | Texto visível, sem ambiguidade | Adicionar `data-testid="view-all-tables-button"` |
| Botão "Limpar filtros" (home) | `getByRole('button', { name: 'Limpar filtros' })` | Funcional | Texto visível | Sem urgência |
| Botão "Notificações" | `getByRole('button', { name: 'Notificações' })` | Funcional | Texto visível | Adicionar `data-testid="notifications-button"` para consistência |
| Botão "Toggle sidebar" | `getByRole('button', { name: 'Toggle sidebar' })` | Funcional | Texto visível (pode ser só ícone) | Adicionar `aria-label="Abrir menu lateral"` |
| Botão "Toggle theme" | `getByRole('button', { name: 'Toggle theme' })` | Funcional | Texto visível | Adicionar `aria-label="Alternar tema"` |
| Botões ícone-only dos cards (home) | `???` | **Ausente** | ~12 botões `class="p-1 hover:bg-muted rounded"` sem aria-label, testid ou texto | Adicionar `aria-label` por ação (ex.: "Abrir tabela X", "Editar", "Excluir") |
| Heading H3 nome das tabelas recentes | `getByRole('heading', { level: 3, name: nomeTabela })` | Funcional | Texto é o nome da tabela | Estrutura ok — sem urgência |

---

## Área 2 — Lista de tabelas (`/tables`)

### Toolbar

| Elemento | Locator atual | Classe | Motivo | Sugestão |
|---|---|---|---|---|
| Input "Buscar tabelas..." | `getByRole('textbox', { name: 'Buscar tabelas...' })` | Funcional | Placeholder único na tela | Adicionar `aria-label="Buscar tabelas"` |
| Botão "Atualizar tabelas" | `getByRole('button', { name: 'Atualizar tabelas' })` | Funcional | Texto único e estável | Adicionar `data-testid="refresh-tables-button"` |
| Botão "Criar Nova" (/tables) | `getByRole('button', { name: 'Criar Nova' })` | Funcional | Texto visível; capturado como `disabled:true` | Adicionar `data-testid="create-table-button"` (Card 10); investigar condição de disabled |

> **Observação:** "Criar Nova" em `/tables` e "Nova Base" na Home são botões distintos.
> Ambos direcionam para o fluxo de criação. Card 10 deve cobrir os dois.

### Painel Filtros

| Elemento | Locator atual | Classe | Motivo | Sugestão |
|---|---|---|---|---|
| Toggle "Filtros" | `getByRole('heading', { name: 'Filtros', level: 3 })` | Funcional | Heading com role claro | Adicionar `data-testid="filters-toggle"` ou `aria-expanded` |
| Input empresas | `getByRole('textbox', { name: 'Selecione as empresas...' })` | Funcional | Placeholder único | Adicionar `aria-label="Filtrar por empresa"` |
| Input departamentos | `getByRole('textbox', { name: 'Selecione os departamentos...' })` | Funcional | Placeholder único | Adicionar `aria-label="Filtrar por departamento"` |
| Botão "Buscar" | `getByRole('button', { name: 'Buscar' })` | Funcional | Único botão "Buscar" no painel | Adicionar `data-testid="apply-filters-button"` |
| Botão "Limpar" (filtros) | `getByRole('button', { name: 'Limpar' })` | Funcional | Único; começa `disabled` | Sem urgência |
| Botão "Data inicial" | `getByRole('button', { name: 'Data inicial' })` | Funcional | Texto de placeholder no botão | Investigar se é date picker nativo ou custom |
| Botão "Data final" | `getByRole('button', { name: 'Data final' })` | Funcional | Texto de placeholder no botão | Investigar se é date picker nativo ou custom |

### Grid de tabelas

| Elemento | Locator atual | Classe | Motivo | Sugestão |
|---|---|---|---|---|
| Tabela (`<table>`) | `getByRole('table')` | **Estável** | HTML semântico nativo | Nenhuma mudança necessária |
| Columnheader "Nome da Tabela" | `getByRole('columnheader', { name: 'Nome da Tabela' })` | **Estável** | Role semântico + texto | Adicionar `aria-sort` para validação de ordenação (Card 11) |
| Columnheader "Empresa" | `getByRole('columnheader', { name: 'Empresa' })` | **Estável** | Idem | Adicionar `aria-sort` |
| Columnheader "Departamento" | `getByRole('columnheader', { name: 'Departamento' })` | **Estável** | Idem | Adicionar `aria-sort` |
| Columnheader "Linhas" | `getByRole('columnheader', { name: 'Linhas' })` | **Estável** | Idem | — |
| Columnheader "Criada em" | `getByRole('columnheader', { name: 'Criada em' })` | **Estável** | Idem | Adicionar `aria-sort` |
| Columnheader "Alterada em" | `getByRole('columnheader', { name: 'Alterada em' })` | **Estável** | Idem | Adicionar `aria-sort` |
| Columnheader "Ações" | `getByRole('columnheader', { name: 'Ações' })` | **Estável** | Idem | — |
| Primeiro botão "Abrir" | `getByRole('button', { name: 'Abrir' }).first()` | Funcional | Texto único por linha; `.first()` é posicional | Adicionar `data-testid="open-table-button"` por linha |
| Botão "Abrir" por linha nomeada | `getByRole('row').filter({ hasText: nome }).getByRole('button', { name: 'Abrir' })` | Funcional | Sem testId, mas ARIA scoping funciona | Adicionar `data-testid` por linha (Card 10 abrange) |
| Empty state lista | `getByRole('cell', { name: 'Nenhuma tabela encontrada' })` | **Estável** | Célula com texto único | Nenhuma mudança necessária |
| Primeira célula da primeira linha | `getByRole('row').nth(1).getByRole('cell').first()` | Frágil | Posicional; captura nome da tabela | Adicionar `data-testid="table-name-cell"` |

> **Observação técnica:** seletores CSS `[role="row"]:nth-child(2) button` falham neste contexto
> porque a tabela usa o motor ARIA do Playwright internamente. Usar sempre `getByRole('row')`
> em vez de seletores CSS de atributo `[role="row"]`.

### Paginação

| Elemento | Locator atual | Classe | Motivo | Sugestão |
|---|---|---|---|---|
| Informação de paginação | `getByText(/Mostrando \d+-\d+ de \d+ itens/)` | Funcional | Regex com padrão estável | Adicionar `data-testid="pagination-info"` para assert exato |
| Botão "Prox" | `getByRole('button', { name: 'Prox' })` | Funcional | Texto fixo | Adicionar `aria-label="Próxima página"` |
| Botão "Ant" | `getByRole('button', { name: 'Ant' })` | Funcional | Texto fixo | Adicionar `aria-label="Página anterior"` |
| Combobox "N itens" | `getByRole('combobox')` | **Frágil** | Único combobox na tela — funciona por acidente | Adicionar `aria-label="Itens por página"` (Card sugerido) |

---

## Área 3 — Painel de notificações/downloads

| Elemento | Locator atual | Classe | Motivo | Sugestão |
|---|---|---|---|---|
| Região do painel | `getByRole('region', { name: 'Notifications (F8)' })` | Funcional | `aria-label` presente no DOM | Manter; adicionar testid para consistência |
| Botão "Marcar todas como lidas" | `getByRole('button', { name: 'Marcar todas como lidas' })` | Funcional | Texto único | Adicionar `data-testid="mark-all-read-button"` |
| Botão "Abrir" (item de download) | `getByRole('button', { name: 'Abrir' })` (dentro da região) | Funcional | Scoped pela região do painel | Adicionar `data-testid` por item se automação for necessária |
| Botão "Prox" (paginação do painel) | Ambíguo com "Prox" da lista | **Frágil** | Mesmo texto, dois contextos simultâneos | Scoping pelo painel resolveria; ou testid distinto |

---

## Área 4 — Detalhe da tabela (não mapeado nesta rodada)

_Requer captura separada com timeout aumentado (>10s para carregamento da grid)._

| Elemento | Locator atual | Classe | Motivo | Sugestão |
|---|---|---|---|---|
| Menu de ações da tabela | `getByTestId('table-actions-menu-button')` | **Ausente** | `data-testid` inexistente no DOM | Card 8: adicionar `data-testid="table-actions-menu-button"` |
| Itens do menu de ações | N/A | **Ausente** | Dependente do Card 8 | Adicionar `data-testid` por item de menu (exportar, importar, etc.) |
| Abas da tabela | `getByRole('tab', { name: nomeDaAba })` | Funcional | Role semântico — funciona se `role="tab"` estiver correto | — |
| Botão de importação | `???` | **Ausente** | Nenhum candidato encontrado por testid ou aria | Sugerir Card 12 (`import-button`) |

---

## Área 5 — API Keys (não mapeado)

| Elemento | Locator atual | Classe | Motivo | Sugestão |
|---|---|---|---|---|
| Botão de acesso a API Keys | `getByTestId('api-keys-menu-button')` | **Ausente** | `data-testid` inexistente no DOM | Card 9: adicionar `data-testid="api-keys-menu-button"` |

---

## Resumo de criticidade

### Locators críticos para automação imediata (Frágeis — risco de quebra silenciosa)

| Elemento | Risco | Ação recomendada |
|---|---|---|
| Card empresa (`nth(1)`) | Alto — posição muda se uma empresa for adicionada antes de "inbot" | Solicitar `data-testid="empresa-{nome}"` no Card 11 ou Card adicional |
| Combobox "N itens" (único na tela) | Médio — quebra se um segundo combobox for adicionado | Solicitar `aria-label="Itens por página"` |
| `.first()` no botão "Abrir" | Médio — seleciona outra tabela se a ordem mudar | OK para smoke; usar row-scoped para testes de dados específicos |

### Locators totalmente ausentes (bloqueadores conhecidos)

| Elemento | Card | Prioridade |
|---|---|---|
| `table-actions-menu-button` | Card 8 | Alta (@export bloqueado) |
| `api-keys-menu-button` | Card 9 | Alta (@api-key bloqueado) |
| 7 testids de criação/deleção | Card 10 | Alta (@table-create bloqueado) |
| Botões ícone-only dos cards da home | Card a sugerir | Média (novas suítes futuras) |
| Paginação de itens por página (`aria-label`) | Card a sugerir | Baixa (workaround funcional) |

---

## Referência de cards de front-end

Todos os pedidos de testabilidade estão documentados em `docs/frontend-testability-tickets.md`.
Mapeamento entre achados desta inspeção e os cards existentes:

| Achado nesta inspeção | Card existente |
|---|---|
| Combobox "N itens" sem aria-label | Card 4 |
| `aria-sort` ausente nos columnheaders | Card 5 |
| Botões ícone-only sem aria-label (home + detail) | Card 6 |
| Card de empresa sem testid (`nth(1)` frágil) | Card 3 |
| Menu de ações da tabela (bloqueador @export) | Card 8 |
| Menu de API Keys (bloqueador @api-key) | Card 9 |
| Criação e deleção de tabela | Card 10 |

### Achados novos desta inspeção (sem card existente)

**"Criar Nova" aparece como `disabled: true` no carregamento inicial de `/tables`.**
Investigar se é restrição de permissão (o usuário de teste não tem permissão de criar)
ou estado temporário de loading. Se for permissão, não há card a criar — é comportamento esperado.

**"Nova Base" (home) e "Criar Nova" (/tables) são dois botões distintos para o mesmo fluxo.**
O Card 10 menciona apenas "create-table-button" em `/tables`. A home também tem um botão
de criação ("Nova Base") que deveria receber o mesmo `data-testid` ou um equivalente para
que testes de criação via home sejam possíveis no futuro.
