# InTable QA — Runbook Operacional

_Referência rápida para execução segura das suítes. Consultar antes de qualquer rodada._

---

## 1. Como renovar a sessão autenticada

A sessão é salva em `fixtures/.auth/user.json` e reutilizada automaticamente.
O setup valida a sessão antes de cada execução — se estiver expirada, faz novo login.

Para renovar manualmente (necessário quando as credenciais não estão no ambiente):

```bash
cd /Users/nato/qa-testes/intable

export USER_EMAIL="renato.paulino@inbot.com.br"
read -s USER_PASSWORD && export USER_PASSWORD   # digita a senha sem exibir

BASE_URL=https://intable.inbot.com.br \
USER_EMAIL="$USER_EMAIL" \
USER_PASSWORD="$USER_PASSWORD" \
npx playwright test --project=setup --reporter=line
```

**Resultado esperado:**
```
✓ Auth reutilizada (24 cookies em cache)
```
ou, se fez novo login:
```
✓ Login concluído — sessão salva em fixtures/.auth/user.json
```

**Se a sessão estiver válida e quiser forçar novo login:**
```bash
rm fixtures/.auth/user.json
# depois rode o setup acima
```

**Regra:** nunca hardcodar senha em código, script ou commit.
Sempre usar `read -s USER_PASSWORD` para captura interativa.

---

## 2. Como rodar a suíte @readonly

```bash
npm run test:readonly
```

O setup valida a sessão automaticamente antes de executar os testes.

**Resultado esperado:**
```
10 passed
```

**Se a sessão estiver expirada:** o setup emite erro com instrução.
Renove a sessão (seção 1) e rode novamente.

---

## 3. Como gerar evidências da suíte @readonly

```bash
npm run evidence:readonly
```

Gera:
- `evidencias/evidence-run/results-readonly.json` — resultado em JSON
- `evidencias/html/index.html` — relatório HTML interativo

Nenhum desses arquivos deve ser commitado (cobertos pelo `.gitignore`).

---

## 4. Como abrir o relatório HTML

```bash
npm run report
```

Abre o último relatório HTML gerado em `evidencias/html/index.html`.
Requer que `npm run evidence:readonly` (ou outra suíte) tenha sido executado antes.

---

## 5. Como rodar suítes controladas (apenas quando autorizadas)

### @export

Requer: `ENABLE_EXPORT_TESTS=true` + `EXPORT_RECIPIENT` + Card 8 implementado pelo front-end.

```bash
ENABLE_EXPORT_TESTS=true \
EXPORT_RECIPIENT="renato.paulino@inbot.com.br" \
npm run test:export
```

**Status atual:** bloqueado por `data-testid="table-actions-menu-button"` (Card 8).

---

### @api-key

Requer: `ENABLE_API_KEY_TESTS=true` + Card 9 implementado pelo front-end.

```bash
ENABLE_API_KEY_TESTS=true \
API_KEY_TEST_COMPANY="inbot" \
API_KEY_TEST_DEPARTMENT="testes" \
API_KEY_TEST_TABLE="TesteAut" \
npm run test:api-keys
```

**Status atual:** bloqueado por `data-testid="api-keys-menu-button"` (Card 9).

---

### @table-create

Requer: `ENABLE_DESTRUCTIVE=true` + `ENABLE_TABLE_CREATE_TESTS=true` + Card 10 implementado.

```bash
ENABLE_DESTRUCTIVE=true \
ENABLE_TABLE_CREATE_TESTS=true \
TABLE_CREATE_COMPANY="inbot" \
TABLE_CREATE_DEPARTMENT="testes" \
npm run test:table-create
```

**Status atual:** bloqueado pelos 7 `data-testid` do Card 10.

---

## 6. Flags de controle — referência rápida

| Flag | Suíte | Obrigatória | Default |
|---|---|---|---|
| `ENABLE_EXPORT_TESTS=true` | @export | sim | false |
| `EMAIL_VALIDATION_ENABLED=true` | @export (e-mail) | não | false |
| `ENABLE_API_KEY_TESTS=true` | @api-key | sim | false |
| `ENABLE_DESTRUCTIVE=true` | qualquer @destructive | sim | false |
| `ENABLE_TABLE_CREATE_TESTS=true` | @table-create | sim | false |

**Regra:** sem as flags, o Playwright não é invocado. Exit 0 com mensagem explicativa.
Nunca adicionar essas flags a scripts padrão ou ao `npm test`.

---

## 7. O que nunca deve ser commitado

| O que | Por quê |
|---|---|
| `.env` | Contém credenciais reais |
| `fixtures/.auth/user.json` | Contém cookies de sessão reais |
| `evidencias/` | Contém artefatos e relatórios de execução |
| `downloads/` | Contém arquivos CSV/XLSX exportados |
| `test-results/` | Resultados brutos do Playwright |
| `playwright-report/` | Relatório padrão do Playwright |
| Qualquer `*.webm`, `*.zip`, `*.png` de evidência | Artefatos de execução |
| Valor real de API Key | Mesmo em comentário, annotation ou log |

Todos esses padrões estão no `.gitignore`. Verificar com `git status` antes de todo commit.

---

## 8. Como agir se a sessão expirar durante uma rodada

O setup detecta sessão expirada automaticamente e tenta fazer novo login.
Se as credenciais não estiverem no ambiente, o setup falha com:

```
Error: Credenciais ausentes e sem storageState válido em fixtures/.auth/user.json.
```

**Ação:**
1. Verificar os artefatos gerados em `evidencias/test-results/` (screenshot e vídeo do erro).
2. Renovar a sessão (seção 1 deste runbook).
3. Rodar novamente a suíte — não precisa de nenhuma alteração de código.

**Não fazer:** nunca adicionar as credenciais diretamente ao código ou ao commit para "resolver" o erro de sessão.

---

## 9. Como agir se um teste destrutivo falhar após criar massa

### @api-key — chave não revogada

1. O relatório anotará um `warning`:
   ```
   CLEANUP PENDENTE: a API Key "qa-api-key-..." pode não ter sido revogada.
   Verificar manualmente na tela de Gerenciar Chaves de API e revogar se necessário.
   ```
2. Acesse manualmente a tela de API Keys da empresa `inbot`.
3. Localize a chave pelo nome (prefixo `qa-api-key-` + timestamp).
4. Revogue a chave manualmente.
5. Documente a ocorrência e a ação tomada na anotação do relatório ou em comentário no canal de QA.

### @table-create — tabela não deletada

1. O relatório anotará um `warning`:
   ```
   CLEANUP PENDENTE: a tabela "qa_tabela_aut_..." pode não ter sido deletada.
   ```
2. Acesse manualmente a lista de tabelas da empresa `inbot`.
3. Localize a tabela pelo prefixo `qa_tabela_aut_` + timestamp.
4. Exclua manualmente **somente** essa tabela.
5. Documente a ocorrência.

**Regra de ouro:** só deletar manualmente o que tiver o prefixo de segurança do teste. Nunca excluir outras tabelas, linhas ou chaves.

---

## 10. Scripts disponíveis — referência completa

| Script | Comando | Requer flag |
|---|---|---|
| Setup de autenticação | `npm run setup` | credenciais no env |
| Suíte @readonly | `npm run test:readonly` | não |
| Evidências @readonly | `npm run evidence:readonly` | não |
| Suíte @export | `npm run test:export` | `ENABLE_EXPORT_TESTS=true` |
| Evidências @export | `npm run evidence:export` | `ENABLE_EXPORT_TESTS=true` |
| Suíte @api-key | `npm run test:api-keys` | `ENABLE_API_KEY_TESTS=true` |
| Evidências @api-key | `npm run evidence:api-keys` | `ENABLE_API_KEY_TESTS=true` |
| Suíte @table-create | `npm run test:table-create` | `ENABLE_DESTRUCTIVE=true` + `ENABLE_TABLE_CREATE_TESTS=true` |
| Evidências @table-create | `npm run evidence:table-create` | ambas as flags acima |
| Abrir relatório HTML | `npm run report` | não |
| Codegen sem auth | `npm run codegen` | não |
| Codegen com auth | `npm run codegen:auth` | sessão válida |
