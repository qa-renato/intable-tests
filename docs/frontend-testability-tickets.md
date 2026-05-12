# Cards de Testabilidade e Acessibilidade — InTable

## Card 1 — Dropdown de empresas no painel Filtros

**Título:**
`[InTable][A11y/Testability] Melhorar dropdown de empresas no painel Filtros`

**Prioridade:** Alta

**Contexto:**
A suíte E2E Playwright tentou cobrir o filtro por empresa em `/tables > Filtros`, mas o componente atual não expõe seletores acessíveis/estáveis.

**Problema observado:**
O campo `Selecione as empresas...` abre o dropdown, mas os itens são renderizados como `div`s simples. Estes seletores não encontram elementos:

```js
page.getByRole('option')
page.getByRole('listbox')
```

O codegen gera seletores frágeis, como:

```js
page.getByText('azul').click()
page.locator('div').filter({ hasText: /^inbot$/ }).click()
```

Além disso, o overlay do multi-select permanece aberto e pode interceptar elementos da tabela.

**Pedido ao front-end:**
Implementar semântica acessível:

```html
<div role="listbox" aria-label="Empresas">
  <div role="option" aria-selected="false">azul</div>
  <div role="option" aria-selected="true">inbot</div>
</div>
```

Adicionar no trigger/input:

```html
aria-expanded="true|false"
```

Alternativa aceitável:

```html
<div data-testid="empresa-option-azul">azul</div>
<div data-testid="empresa-option-inbot">inbot</div>
```

**Critério de aceite:**

```js
await page.getByRole('textbox', { name: 'Selecione as empresas...' }).click()
await page.getByRole('option', { name: 'azul', exact: true }).click()
```

ou:

```js
await page.getByTestId('empresa-option-azul').click()
```

**Benefício:**
Permite automatizar o filtro por empresa sem seletores frágeis por texto/classe CSS.

---

## Card 2 — Dropdown de departamentos no painel Filtros

**Título:**
`[InTable][A11y/Testability] Garantir role="option" no dropdown de departamentos`

**Prioridade:** Alta

**Contexto:**
Hoje existe teste para filtrar por departamento `testes`, mas o page object precisa manter fallback porque o dropdown customizado não é totalmente confiável via ARIA.

**Problema observado:**
O teste tenta usar:

```js
page.getByRole('option', { name: 'testes', exact: true })
```

mas precisa de fallback com `div.filter(...)`.

**Pedido ao front-end:**
Garantir estrutura acessível:

```html
<div role="listbox" aria-label="Departamentos">
  <div role="option" aria-selected="false">testes</div>
</div>
```

ou adicionar:

```html
data-testid="departamento-option-testes"
```

**Critério de aceite:**

```js
await page.getByRole('textbox', { name: 'Selecione os departamentos...' }).click()
await page.getByRole('option', { name: 'testes', exact: true }).click()
```

**Benefício:**
Remove fallback frágil e permite evoluir testes de múltiplos departamentos.

---

## Card 3 — Card de empresa na Home

**Título:**
`[InTable][Testability] Adicionar seletor estável no card da empresa`

**Prioridade:** Alta

**Contexto:**
A suíte precisa selecionar a empresa `inbot` na Home antes de acessar `/tables`.

**Problema observado:**
Hoje o teste usa seletor frágil:

```js
page.locator('div').filter({ hasText: /^inbot$/ }).nth(1)
```

Esse seletor depende da posição no DOM.

**Pedido ao front-end:**
Adicionar seletor estável ao card clicável da empresa.

Opção com test id:

```html
data-testid="empresa-card-inbot"
```

Opção acessível:

```html
role="button"
aria-label="Selecionar empresa inbot"
```

**Critério de aceite:**

```js
await page.getByTestId('empresa-card-inbot').click()
```

ou:

```js
await page.getByRole('button', { name: 'Selecionar empresa inbot' }).click()
```

**Benefício:**
Elimina dependência de `nth(1)`.

---

## Card 4 — Combobox de itens por página

**Título:**
`[InTable][A11y/Testability] Adicionar label acessível na combobox de itens por página`

**Prioridade:** Média

**Contexto:**
A suíte já cobre alteração de tamanho de página `10 itens` → `25 itens` → `10 itens`.

**Problema observado:**
Hoje o teste usa:

```js
page.getByRole('combobox')
```

Funciona porque há apenas uma combobox na tela, mas pode ficar ambíguo se outro combobox for adicionado.

**Pedido ao front-end:**

```html
aria-label="Itens por página"
```

**Critério de aceite:**

```js
await page.getByRole('combobox', { name: 'Itens por página' }).click()
```

**Benefício:**
Evita ambiguidade futura e melhora acessibilidade.

---

## Card 5 — Cabeçalhos ordenáveis com aria-sort

**Título:**
`[InTable][A11y/Testability] Expor aria-sort nos cabeçalhos ordenáveis`

**Prioridade:** Média

**Contexto:**
A suíte cobre ordenação por `Nome da Tabela`, mas hoje precisa inferir mudança lendo dados da primeira linha.

**Problema observado:**
Sem `aria-sort`, o teste depende de efeito indireto na lista. Se a lista já estiver ordenada, a mudança pode não ser observável.

**Pedido ao front-end:**
Adicionar `aria-sort` nos cabeçalhos ordenáveis.

Exemplo:

```html
<th aria-sort="ascending">Nome da Tabela</th>
```

Valores esperados:

```txt
none
ascending
descending
```

**Critério de aceite:**

```js
const header = page.getByRole('columnheader', { name: 'Nome da Tabela' })
await header.click()
await expect(header).toHaveAttribute('aria-sort', /ascending|descending/)
```

**Benefício:**
Transforma o teste de ordenação em uma validação determinística.

---

## Card 6 — Botões de ação/menu com ícone sem nome acessível

**Título:**
`[InTable][A11y/Testability] Adicionar aria-label nos botões de ação com ícone`

**Prioridade:** Média

**Contexto:**
Alguns menus de ação aparecem no codegen como botões sem texto, por exemplo:

```js
page.getByRole('button').filter({ hasText: /^$/ }).nth(2)
```

**Problema observado:**
Botões sem nome acessível exigem uso de `nth()` ou estrutura DOM, o que é frágil.

**Pedido ao front-end:**
Adicionar nomes acessíveis aos botões.

Exemplos:

```html
<button aria-label="Abrir menu de ações da tabela TesteAut">
<button aria-label="Editar descrição da tabela">
<button aria-label="Gerenciar chaves de API">
```

**Critério de aceite:**

```js
await page.getByRole('button', { name: /Abrir menu de ações/i }).click()
```

**Benefício:**
Permite automatizar menus sem seletores posicionais.

---

## Card 7 — Datepicker dos filtros de data

**Título:**
`[InTable][A11y/Testability] Melhorar acessibilidade do datepicker em Filtros`

**Prioridade:** Média/Baixa

**Contexto:**
O codegen mostrou filtros por `Data inicial` e `Data final`.

**Problema observado:**
O codegen usa seletores frágeis por número de dia:

```js
page.getByRole('gridcell', { name: '8', exact: true }).click()
page.getByRole('gridcell', { name: '6' }).nth(1).click()
```

Isso depende do mês, da posição no calendário e de dias repetidos no grid.

**Pedido ao front-end:**
Expor data completa nos dias do calendário.

Exemplo:

```html
<button role="gridcell" aria-label="08/05/2026">8</button>
```

ou:

```html
data-testid="datepicker-day-2026-05-08"
```

**Critério de aceite:**

```js
await page.getByRole('gridcell', { name: '08/05/2026' }).click()
```

ou:

```js
await page.getByTestId('datepicker-day-2026-05-08').click()
```

**Benefício:**
Permite criar testes de filtro por data sem depender de números ambíguos.

---

## Card 8 — Botão que abre o menu de ações da tabela (bloqueador de exportação)

**Título:**
`[InTable][Testability] Adicionar seletor estável no botão de ações/exportação da tabela`

**Prioridade:** Alta

**Contexto:**
A suíte `@export` já foi criada em `tests/export/export-table.spec.js`, mas a execução real está bloqueada porque o botão que abre o menu de ações da tabela (onde está a opção "Exportar (CSV)") não possui seletor estável no DOM.

**Problema observado:**
O Playwright Codegen gerou o seletor:

```js
page.getByRole('button').filter({ hasText: /^$/ }).nth(4)
```

Esse seletor é posicional, depende da ordem dos elementos na tela e não deve ser usado em teste automatizado. Qualquer mudança de layout — novo botão, reordenação ou ajuste responsive — quebra o seletor silenciosamente.

O teste usa `getByTestId('table-actions-menu-button')` e falha com mensagem clara enquanto o atributo não existir:

```
BLOQUEIO: botão do menu de ações não encontrado.
Adicionar data-testid="table-actions-menu-button" (ou aria-label="Ações da tabela")
ao botão que abre o menu de ações/exportação da tabela.
```

**Impacto:**
Sem esse ajuste, o teste não consegue abrir o menu onde aparece a opção "Exportar (CSV)".
Isso bloqueia o fluxo completo:

```
Abrir tabela → abrir menu de ações → Exportar (CSV) →
Notificações → Baixar CSV → validar download .csv
```

**Pedido ao front-end:**
Adicionar ao botão que abre o menu de ações da tabela (na tela de detalhe da tabela):

```html
<button
  data-testid="table-actions-menu-button"
  aria-label="Ações da tabela"
>
  <!-- ícone existente — sem alteração visual -->
</button>
```

Qualquer uma das duas é suficiente para desbloquear:
- `data-testid="table-actions-menu-button"` ← preferida
- `aria-label="Ações da tabela"` ou `aria-label="Abrir menu de ações"`

**Critério de aceite:**

```js
await page.getByTestId('table-actions-menu-button').click()
// ou
await page.getByRole('button', { name: 'Ações da tabela' }).click()
// após o clique: menuitem 'Exportar (CSV)' deve estar visível
await expect(page.getByRole('menuitem', { name: 'Exportar (CSV)' })).toBeVisible()
```

**Seletores já confirmados via Codegen (2026-05-11):**

Os demais seletores do fluxo de exportação já foram observados e estão estáveis — não precisam de ajuste no front-end:

| Seletor | Passo |
|---|---|
| `getByRole('menuitem', { name: 'Exportar (CSV)' })` | Item do menu de exportação |
| `getByRole('button', { name: 'Notificações' })` | Botão de notificações no header |
| `getByRole('button', { name: 'Baixar CSV' })` | Botão de download no painel |

**Observação:**
O seletor `nth(4)` pode aparecer em documentação como exemplo do que **não** usar.
Ele **não aparece em nenhum código executável** da suíte.

---

## Card 9 — Botão que abre o menu de API Keys (bloqueador de @api-key)

**Título:**
`[InTable][Testability] Adicionar seletor estável no botão que abre o menu de API Keys`

**Prioridade:** Alta

**Contexto:**
A suíte `@api-key` já foi criada em `tests/api-keys/api-key-management.spec.js`, mas a execução real está bloqueada porque o botão que abre o menu de API Keys (onde está o item "Gerenciar Chaves de API") não possui seletor estável no DOM.

**Problema observado:**
O Playwright Codegen gerou seletor posicional para este botão. Esse seletor é frágil, depende da ordem dos elementos na tela e não deve ser usado em teste automatizado. Qualquer mudança de layout o quebra silenciosamente.

O teste usa `getByTestId('api-keys-menu-button')` e falha com mensagem clara enquanto o atributo não existir:

```
BLOQUEIO: botão que abre o menu de API Keys não encontrado.
Adicionar data-testid="api-keys-menu-button" ao botão de acesso ao menu.
Consulte docs/frontend-testability-tickets.md — Card 9.
```

**Impacto:**
Sem esse ajuste, o teste não consegue abrir o menu onde aparece "Gerenciar Chaves de API".
Isso bloqueia o fluxo completo:

```
Selecionar empresa → abrir menu de API Keys → Gerenciar Chaves de API →
Nova API Key → Gerar Chave → Voltar para listagem → Revogar
```

**Pedido ao front-end:**
Adicionar ao botão que abre o menu de API Keys:

```html
<button
  data-testid="api-keys-menu-button"
  aria-label="Ações de API Keys"
>
  <!-- ícone existente — sem alteração visual -->
</button>
```

Qualquer uma das duas é suficiente para desbloquear:
- `data-testid="api-keys-menu-button"` ← preferida
- `aria-label="Ações de API Keys"` ou `aria-label="Menu de API Keys"`

**Critério de aceite:**

```js
await page.getByTestId('api-keys-menu-button').click()
// ou
await page.getByRole('button', { name: 'Ações de API Keys' }).click()
// após o clique: menuitem 'Gerenciar Chaves de API' deve estar visível
await expect(page.getByRole('menuitem', { name: 'Gerenciar Chaves de API' })).toBeVisible()
```

**Seletores já avaliados via Codegen (a confirmar no DOM real):**

| Seletor | Passo |
|---|---|
| `getByRole('menuitem', { name: 'Gerenciar Chaves de API' })` | Item do menu de API Keys |
| `getByRole('button', { name: 'Nova API Key' })` | Iniciar criação de chave |
| `getByRole('button', { name: 'Gerar Chave' })` | Confirmar geração |
| `getByRole('button', { name: 'Copiar para área de transferência' })` | Validar criação |
| `getByRole('button', { name: 'Voltar para listagem' })` | Retornar à lista |
| `getByRole('button', { name: 'Revogar acesso desta chave' })` | Revogar chave |
| `getByRole('button', { name: 'Sim, Excluir' })` | Confirmar revogação |

**Seletores adicionais desejados (formulário de criação):**

| data-testid | Elemento |
|---|---|
| `api-key-department-select` | Dropdown de departamento |
| `api-key-department-option-testes` | Opção "testes" no dropdown |

**Observação:**
O seletor posicional gerado pelo Codegen para este botão pode aparecer em documentação como exemplo do que **não** usar. Ele **não aparece em nenhum código executável** da suíte.

---

## Resumo de prioridade

| Prioridade  | Card                                                      |
| ----------- | --------------------------------------------------------- |
| Alta        | Dropdown de empresas                                      |
| Alta        | Dropdown de departamentos                                 |
| Alta        | Card da empresa na Home                                   |
| Alta        | Botão menu de ações da tabela (bloqueador @export)        |
| Alta        | Botão menu de API Keys (bloqueador @api-key)              |
| Média       | Combobox de itens por página                              |
| Média       | Cabeçalhos com aria-sort                                  |
| Média       | Botões de ação com aria-label                             |
| Média/Baixa | Datepicker acessível                                      |

---

## Observação

Essas melhorias não mudam regra de negócio. Elas melhoram:

* acessibilidade;
* estabilidade dos testes E2E;
* manutenção da suíte Playwright;
* redução de flakiness;
* clareza dos componentes para usuários e automação.
