# InTable — Suíte de Criação de Tabela (@table-create)

## Status

**Base técnica criada — execução real bloqueada por seletores de front-end ausentes.**

A suíte `@table-create` foi estruturada com guard duplo de flags, cleanup robusto via `finally`,
regra de segurança de prefixo e seletores bloqueados documentados como `data-testid` ausentes.

Nenhuma execução real foi realizada. Nenhuma tabela foi criada. Sem cleanup pendente.

### Bloqueadores atuais

Os seletores abaixo não existem no DOM e bloqueiam a execução real:

| Seletor | Passo |
|---|---|
| `data-testid="create-table-button"` | Abrir formulário de criação |
| `data-testid="table-name-input"` | Preencher nome da tabela |
| `data-testid="table-department-select"` | Dropdown de departamento |
| `data-testid="table-department-option-{nome}"` | Opção no dropdown |
| `data-testid="confirm-create-table"` | Confirmar criação |
| `data-testid="delete-table-button"` | Botão de deleção no row |
| `data-testid="confirm-delete-table"` | Confirmar deleção |

Documentado em `docs/frontend-testability-tickets.md` — Card 10.

---

## 1. Objetivo

Validar o fluxo de criação e remoção de tabela no InTable:

1. Usuário autenticado acessa a empresa `TABLE_CREATE_COMPANY`.
2. Está na tela `/tables` com a lista de tabelas.
3. Clica no botão "Nova Tabela" (ou equivalente).
4. Preenche nome único com prefixo `qa_tabela_aut_` + timestamp.
5. Seleciona o departamento `TABLE_CREATE_DEPARTMENT`.
6. Confirma a criação.
7. Valida que a tabela aparece na lista.
8. Localiza o botão de deleção na linha da tabela criada.
9. Clica em deletar e confirma.
10. Valida que a tabela não aparece mais na lista.
11. Garante deleção no bloco `finally`, mesmo em caso de falha intermediária.

---

## 2. Por que é @destructive?

A criação de uma tabela **cria um registro real no ambiente**:
- Altera o estado persistente do banco de dados.
- A tabela pode aparecer para outros usuários enquanto existir.
- A deleção é uma ação irreversível — não há "lixeira".

Por isso, a suíte é classificada como `@crud @table-create @destructive @integration`:
- Executada em suíte isolada, nunca como parte do default.
- Protegida por **duas flags explícitas** (`ENABLE_DESTRUCTIVE=true` e `ENABLE_TABLE_CREATE_TESTS=true`).
- Com cleanup obrigatório no `finally`.
- Prefixo de segurança `qa_tabela_aut_` em todos os nomes — nunca deletar fora desse padrão.

---

## 3. Flags de controle

| Flag | Tipo | Comportamento |
|---|---|---|
| `ENABLE_DESTRUCTIVE=true` | Obrigatória | Habilita qualquer suíte com `@destructive`. Ausente: Playwright não sobe. |
| `ENABLE_TABLE_CREATE_TESTS=true` | Obrigatória | Habilita especificamente esta suíte. Ambas são necessárias. |

Ambas as flags são verificadas no wrapper Node.js antes de invocar o Playwright.
Se qualquer uma estiver ausente, o processo termina com exit 0 e mensagem explicativa.

---

## 4. Variáveis de ambiente

| Variável | Default | Descrição |
|---|---|---|
| `TABLE_CREATE_COMPANY` | `inbot` | Empresa onde criar a tabela. |
| `TABLE_CREATE_DEPARTMENT` | `testes` | Departamento associado à tabela. |

Não há variáveis obrigatórias além das flags. Nunca commitar variáveis de ambiente.

**Massa sugerida para execução controlada:**
- `TABLE_CREATE_COMPANY="inbot"`
- `TABLE_CREATE_DEPARTMENT="testes"`

---

## 5. Comandos

### Execução básica (defaults)

```bash
ENABLE_DESTRUCTIVE=true \
ENABLE_TABLE_CREATE_TESTS=true \
npm run test:table-create
```

### Execução explícita (todos os parâmetros)

```bash
ENABLE_DESTRUCTIVE=true \
ENABLE_TABLE_CREATE_TESTS=true \
TABLE_CREATE_COMPANY="inbot" \
TABLE_CREATE_DEPARTMENT="testes" \
npm run test:table-create
```

### Coleta de evidências

```bash
ENABLE_DESTRUCTIVE=true \
ENABLE_TABLE_CREATE_TESTS=true \
TABLE_CREATE_COMPANY="inbot" \
TABLE_CREATE_DEPARTMENT="testes" \
npm run evidence:table-create
```

### Sem flags (não roda)

```bash
npm run test:table-create
# → Suíte @table-create desativada — Playwright não será iniciado.

ENABLE_TABLE_CREATE_TESTS=true npm run test:table-create
# → Flag ausente: ENABLE_DESTRUCTIVE=true — Playwright não será iniciado.
```

---

## 6. Regra de cleanup

- **Toda tabela criada pelo teste deve ser deletada.**
- O nome usa `qa_tabela_aut_${Date.now()}` — único, rastreável, vinculado ao teste.
- O cleanup **só atua em tabelas cujo nome começa com `qa_tabela_aut_`** — proteção contra deleção acidental de tabelas reais.
- O bloco `finally` tenta deletar a tabela se `tableCreated && !tableDeleted`.
- Se o cleanup automático falhar, o teste anota um `warning` no relatório:

  ```
  CLEANUP PENDENTE: a tabela "qa_tabela_aut_..." pode não ter sido deletada.
  Verificar manualmente na lista de tabelas e excluir se necessário.
  ```

- O teste nunca tenta deletar tabelas criadas fora do próprio fluxo.

---

## 7. Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Tabela não deletada em caso de falha | Média | Cleanup obrigatório no bloco `finally` com annotation de warning |
| Deleção acidental de tabela real | Baixa (se prefixo respeitado) | Cleanup restrito a nomes com `qa_tabela_aut_` — verificação explícita |
| Seletor frágil na listagem para localizar a tabela | Alta (sem data-testid) | Usa `getByRole('row').filter({ hasText: tableName })` |
| Formulário com campos diferentes dos esperados | Alta (sem DOM real) | Seletores condicionais com fallback + anotação de info |
| Tabela visível para outros usuários durante o teste | Baixa | Nome único com timestamp — reconhecível como artefato de teste |
| Bloqueio total nos seletores de criação | Alta | Bloqueadores documentados em Card 10 — teste falha com mensagem clara |

---

## 8. Pendências de front-end e testabilidade

### Bloqueadores (Card 10)

| data-testid | Elemento | Passo |
|---|---|---|
| `create-table-button` | Botão que abre o formulário | Iniciar criação |
| `table-name-input` | Input de nome da tabela | Preencher nome |
| `table-department-select` | Dropdown de departamento | Selecionar departamento |
| `table-department-option-{nome}` | Opção no dropdown | Selecionar opção |
| `confirm-create-table` | Botão que submete o formulário | Confirmar criação |
| `delete-table-button` | Botão de deleção na linha da tabela | Iniciar deleção |
| `confirm-delete-table` | Botão de confirmação de deleção | Confirmar deleção |

Todos documentados em `docs/frontend-testability-tickets.md` — Card 10.

---

## Arquitetura da suíte

```
scripts/run-table-create.js           Wrapper — guard duplo de flags, exibe contexto, invoca Playwright
scripts/evidence-table-create.sh      Coleta evidências com JSON + HTML (guard duplo incluído)
tests/tables-create/
  create-table.spec.js                Spec principal — criação, listagem e deleção
docs/
  table-create-tests.md               Este arquivo
```

---

## Isolamento das demais suítes

- `npm run test:readonly` usa `--grep "@readonly"` → não captura `@table-create`
- `npm run test:export` usa `--grep "@export"` → não captura `@table-create`
- `npm run test:api-keys` usa `--grep "@api-key"` → não captura `@table-create`
- `npm run test:table-create` sem flags → Playwright **não sobe**
- As specs em `tests/tabelas/`, `tests/export/` e `tests/api-keys/` não foram modificadas

---

## Fora do escopo — primeira versão

- Criar tabela com configurações avançadas (colunas, visibilidade, permissões).
- Editar tabela existente.
- Testar importação de dados na tabela criada.
- Criar múltiplas tabelas em sequência.
- Validar tabela criada via API (GET /tables ou similar).
- Testar com usuários de permissão restrita.
