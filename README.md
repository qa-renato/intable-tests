# InTable Tests

Automação E2E com Playwright para o InTable.
Alvo: `https://intable.inbot.com.br`.

Suítes existentes:
- **@readonly** — 10 testes estáveis, execução padrão, sem side effects.
- **@export** — base técnica criada, protegida por `ENABLE_EXPORT_TESTS=true`, bloqueada por seletor de front-end.
- **@api-key** — base técnica criada, protegida por `ENABLE_API_KEY_TESTS=true`, bloqueada por seletor de front-end.
- **@table-create** — base técnica criada, protegida por `ENABLE_DESTRUCTIVE=true` **e** `ENABLE_TABLE_CREATE_TESTS=true`, bloqueada por seletores de front-end.

---

## Documentação útil

| Documento | Conteúdo |
|---|---|
| [`docs/execution-runbook.md`](docs/execution-runbook.md) | Como renovar sessão, rodar suítes, agir em falhas destrutivas |
| [`docs/preflight-checklist.md`](docs/preflight-checklist.md) | Checklist pré-execução por suíte |
| [`docs/test-data-strategy.md`](docs/test-data-strategy.md) | Regras de massa sintética, prefixos e cleanup |
| [`docs/automation-roadmap.md`](docs/automation-roadmap.md) | Matriz de 52 funcionalidades e backlog por fase |
| [`docs/frontend-testability-tickets.md`](docs/frontend-testability-tickets.md) | Cards de testabilidade para o time de front-end |
| [`docs/post-frontend-fix-checklist.md`](docs/post-frontend-fix-checklist.md) | Checklist de retomada após ajustes do front-end |
| [`docs/export-tests.md`](docs/export-tests.md) | Documentação detalhada da suíte @export |
| [`docs/api-key-tests.md`](docs/api-key-tests.md) | Documentação detalhada da suíte @api-key |
| [`docs/table-create-tests.md`](docs/table-create-tests.md) | Documentação detalhada da suíte @table-create |
| [`docs/ui-action-inventory.md`](docs/ui-action-inventory.md) | Inventário de ações da UI por tela — status de cobertura e priorização |
| [`docs/locator-inventory.md`](docs/locator-inventory.md) | Inventário de locators — classificação estável/frágil/ausente por elemento |

---

## Stack

- Node.js
- Playwright
- JavaScript

---

## Estrutura do projeto

```
fixtures/           # Setup global de autenticação (storageState)
pages/              # Page objects (seletores e métodos por tela)
tests/
  tabelas/          # Suíte @readonly (10 specs)
  export/           # Suíte @export — base técnica, requer flag
  api-keys/         # Suíte @api-key — base técnica, requer flag
  tables-create/    # Suíte @table-create — base técnica, requer duas flags
helpers/            # Helpers reutilizáveis (emailClient, notifications)
scripts/            # Wrappers de execução com flag guard
docs/               # Documentação de suítes, tickets de testabilidade
evidencias/         # Artefatos de teste — NÃO versionado (.gitignore)
playwright.config.js
package.json
.env.example        # Template de variáveis de ambiente (sem valores reais)
```

---

## Autenticação

O login usa Azure/Inbot SSO (Keycloak → Microsoft → redirect para o app).
As credenciais são passadas **exclusivamente por variáveis de ambiente** — nunca em código ou arquivos versionados.

```bash
export USER_EMAIL="seu.email@empresa.com"
read -s USER_PASSWORD && export USER_PASSWORD
```

---

## Gerar sessão autenticada

Executa o setup e salva o `storageState` em `fixtures/.auth/user.json`.

Na próxima execução, o setup **valida a sessão no servidor** antes de reutilizar o cache:

1. Injeta os cookies salvos no contexto do browser.
2. Navega para `/` com `waitUntil: 'networkidle'`.
3. Verifica se o campo `Buscar empresa...` está visível — esse campo só existe na Home autenticada.
4. Se estiver visível: reutiliza a sessão (retorna imediatamente).
5. Se não estiver visível: limpa os cookies e refaz o login completo via SSO.

> **Por que não basta verificar a URL?**
> O app exibe uma página "Conecte Novamente" em `intable.inbot.com.br` quando a sessão do aplicativo expira, mesmo que os cookies do Keycloak ainda estejam presentes. Verificar a URL retornaria falso-positivo nesse cenário. A verificação pelo campo `Buscar empresa...` confirma que o app em si reconhece a sessão como válida.

Se a sessão estiver expirada e as variáveis `USER_EMAIL`/`USER_PASSWORD` não estiverem disponíveis, o setup falhará com mensagem explicando como exportá-las.

```bash
BASE_URL=https://intable.inbot.com.br \
USER_EMAIL="$USER_EMAIL" \
USER_PASSWORD="$USER_PASSWORD" \
npx playwright test --project=setup --reporter=line
```

Para forçar novo login sem aguardar a validação, delete `fixtures/.auth/user.json` antes de rodar o setup.

---

## Rodar testes readonly

```bash
BASE_URL=https://intable.inbot.com.br \
ENABLE_DESTRUCTIVE=false \
npx playwright test --grep "@readonly" --reporter=line
```

---

## Rodar codegen autenticado

Abre o browser com a sessão já ativa, sem precisar logar de novo:

```bash
npx playwright codegen \
  --load-storage=fixtures/.auth/user.json \
  https://intable.inbot.com.br/
```

---

## Cobertura atual

**10 testes `@readonly` estáveis**, todos passando em execuções repetidas (30/30 na última validação, sem flake).

| Spec | Cenário |
|---|---|
| `smoke.spec.js` | Carregamento de `/tables`: cabeçalhos (incl. `Criada em` e `Alterada em`), botão atualizar, paginação, botão Abrir |
| `smoke.spec.js` | Expansão do painel de filtros e visibilidade dos controles |
| `filtros.spec.js` | Filtro por departamento `testes` e validação de resultado |
| `busca.spec.js` | Busca por nome de tabela e limpeza do campo |
| `paginacao.spec.js` | Navegação para próxima página e retorno (skip automático se uma página só) |
| `visualizacao.spec.js` | Abertura da primeira tabela, validação de grid ou empty state, retorno à lista |
| `empty-state.spec.js` | Busca sem resultado, validação de "Nenhuma tabela encontrada" e recuperação da lista ao limpar busca |
| `tamanho-pagina.spec.js` | Altera quantidade de itens por página para 25, valida mudança na paginação e restaura para 10 itens |
| `ordenacao.spec.js` | Clique no cabeçalho "Nome da Tabela", valida reordenação da lista; skip documentado quando mudança não for observável (aguardando `aria-sort` do front-end) |

Setup: autenticação via Azure/Inbot SSO com cache guard — `fixtures/.auth/user.json` reutilizado enquanto válido.

---

## Fora do escopo atual

Os testes existentes são **exclusivamente readonly**, com exceção das suítes controladas abaixo (bases criadas, aguardando ajustes de front-end). Os fluxos abaixo ainda não têm cobertura:

- Criação de tabela
- Criação de coluna
- Adição de linha
- Exclusão
- Importação
- Qualquer fluxo destrutivo não controlado

**Suítes controladas criadas (bloqueadas por front-end):**
- `@export` — base criada em `tests/export/`, bloqueada por `data-testid="table-actions-menu-button"` (Card 8)
- `@api-key` — base criada em `tests/api-keys/`, bloqueada por `data-testid="api-keys-menu-button"` (Card 9)
- `@table-create` — base criada em `tests/tables-create/`, bloqueada por seletores de criação/deleção (Card 10); requer `ENABLE_DESTRUCTIVE=true` + `ENABLE_TABLE_CREATE_TESTS=true`

---

## Estabilidade

- Testes readonly passam consistentemente em execuções repetidas.
- `ERR_NETWORK_CHANGED` pode ocorrer esporadicamente por blip de rede/VPN durante `goto()`. O `retries: 1` do config trata esses casos; se o erro se tornar recorrente, investigar a infraestrutura de rede — não mascarar com retries adicionais.

---

## Segurança

- Nunca commitar `fixtures/.auth/user.json` (contém cookies de sessão)
- Nunca commitar `.env` ou qualquer variante `.env.*` (exceto `.env.example`)
- Nunca commitar `evidencias/`, traces, vídeos ou screenshots
- Nunca commitar `downloads/` (arquivos CSV/XLSX gerados nos testes)
- Nunca hardcodar senha, token ou API Key em código ou mensagem de commit
- Nunca imprimir API Key completa em log, relatório ou annotation

---

## Quality gate

```bash
npm run check:safe     # sintaxe JS + guards — sem sessão, sem flags, roda no CI
npm run check:readonly # testes @readonly — requer sessão autenticada válida
```

`check:safe` verifica sintaxe de todos os arquivos JS e confirma que nenhuma suíte controlada inicia Playwright sem as flags corretas. Não requer autenticação, não cria dados e pode rodar no GitHub Actions. O workflow `.github/workflows/safe-checks.yml` executa `check:safe` em todo push e pull request.

`check:readonly` é um alias para `npm run test:readonly` e requer `fixtures/.auth/user.json` válido. Deve ser rodado localmente antes de cada release ou quando houver suspeita de regressão.

---

## Scripts disponíveis

| Script | Comando | Descrição |
|---|---|---|
| `check:safe` | `npm run check:safe` | Syntax check + guards — sem sessão, roda no CI |
| `check:readonly` | `npm run check:readonly` | Alias para `test:readonly` — requer sessão |
| `setup` | `npm run setup` | Gera `fixtures/.auth/user.json` via SSO |
| `test:readonly` | `npm run test:readonly` | Executa todos os testes `@readonly` |
| `evidence:readonly` | `npm run evidence:readonly` | Coleta evidências da suíte `@readonly` |
| `test:export` | `npm run test:export` | Executa suíte `@export` (requer `ENABLE_EXPORT_TESTS=true`) |
| `evidence:export` | `npm run evidence:export` | Coleta evidências da exportação (requer `ENABLE_EXPORT_TESTS=true`) |
| `test:api-keys` | `npm run test:api-keys` | Executa suíte `@api-key` (requer `ENABLE_API_KEY_TESTS=true`) |
| `evidence:api-keys` | `npm run evidence:api-keys` | Coleta evidências de API Keys (requer `ENABLE_API_KEY_TESTS=true`) |
| `test:table-create` | `npm run test:table-create` | Executa suíte `@table-create` (requer `ENABLE_DESTRUCTIVE=true` e `ENABLE_TABLE_CREATE_TESTS=true`) |
| `evidence:table-create` | `npm run evidence:table-create` | Coleta evidências de criação de tabela (requer ambas as flags) |
| `test` | `npm test` | Executa toda a suíte (inclui setup) |
| `codegen` | `npm run codegen` | Abre codegen sem autenticação |
| `codegen:auth` | `npm run codegen:auth` | Abre codegen com storageState carregado |
| `report` | `npm run report` | Abre o relatório HTML em `evidencias/html` |

---

## Próxima fase

1. **Revisão de locators frágeis** — substituir `nth(1)` do card de empresa e combobox sem label por seletores estáveis, após solicitação ao time de front-end (`data-testid`, `aria-label`, `aria-sort`).
2. **Desbloqueio da suíte @export** — base criada em `tests/export/`. Bloqueada por `data-testid="table-actions-menu-button"` ausente no front-end (Card 8 em `docs/frontend-testability-tickets.md`).
3. **Desbloqueio da suíte @api-key** — base criada em `tests/api-keys/`. Bloqueada por `data-testid="api-keys-menu-button"` ausente no front-end (Card 9 em `docs/frontend-testability-tickets.md`). Execução real validada até o ponto do bloqueio em 2026-05-11 — sessão ok, empresa selecionada, nenhuma chave criada.
4. **Desbloqueio da suíte @table-create** — base criada em `tests/tables-create/`. Bloqueada por 7 seletores ausentes no front-end (Card 10 em `docs/frontend-testability-tickets.md`). Nenhuma execução real realizada. Protegida por `ENABLE_DESTRUCTIVE=true` + `ENABLE_TABLE_CREATE_TESTS=true`.
5. **Fluxos destrutivos controlados** — suíte `@table-create` é o primeiro exemplo: nome com prefixo de segurança, cleanup no `finally`, deleção restrita ao prefixo `qa_tabela_aut_`.
