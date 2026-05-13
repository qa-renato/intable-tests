# InTable QA — Checklist Pré-Execução

_Verificar todos os itens antes de rodar qualquer suíte. Especialmente obrigatório para suítes destrutivas._

---

## Checklist @readonly

Suíte segura, sem efeitos. Verificações mínimas.

- [ ] `git status` limpo — sem arquivos modificados ou não rastreados inesperados
- [ ] Sessão válida em `fixtures/.auth/user.json` (ou credenciais prontas para renovação)
- [ ] Ambiente correto: `BASE_URL=https://intable.inbot.com.br` (default do script)
- [ ] Nenhuma flag destrutiva exportada no shell corrente (`echo $ENABLE_DESTRUCTIVE`)
- [ ] Comando a executar: `npm run test:readonly`

---

## Checklist @export

- [ ] `git status` limpo
- [ ] Sessão válida
- [ ] Card 8 implementado pelo front-end: `data-testid="table-actions-menu-button"` presente no DOM
- [ ] `EXPORT_RECIPIENT` definido com o e-mail correto
- [ ] `ENABLE_EXPORT_TESTS=true` será passado explicitamente (não exportado no shell por padrão)
- [ ] Se `EMAIL_VALIDATION_ENABLED=true`: variáveis `MS_TENANT_ID`, `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_MAILBOX_USER` configuradas no `.env`
- [ ] `.env` não está sendo commitado (`git status` não mostra `.env`)
- [ ] Não há cleanup pendente de execução anterior (verificar relatório HTML)
- [ ] Tabela de referência existe e tem dados para exportar
- [ ] Efeito externo aprovado: exportação dispara e-mail — ciência da equipe
- [ ] Comando a executar:
  ```bash
  ENABLE_EXPORT_TESTS=true \
  EXPORT_RECIPIENT="email@inbot.com.br" \
  npm run test:export
  ```

---

## Checklist @api-key

- [ ] `git status` limpo
- [ ] Sessão válida
- [ ] Card 9 implementado pelo front-end: `data-testid="api-keys-menu-button"` presente no DOM
- [ ] `ENABLE_API_KEY_TESTS=true` será passado explicitamente
- [ ] Massa autorizada confirmada: empresa `inbot`, departamento `testes`, tabela `TesteAut`
- [ ] Não há API Key com prefixo `qa-api-key-` não revogada de execução anterior
- [ ] Trace, screenshot e video estão desabilitados no spec (`test.use({ trace: 'off', ... })`)
- [ ] Cleanup no `finally` está implementado e funcional
- [ ] Ciência do risco: a chave existirá entre criação e revogação — executar em horário de baixo uso
- [ ] `.env` não está sendo commitado
- [ ] Comando a executar:
  ```bash
  ENABLE_API_KEY_TESTS=true \
  API_KEY_TEST_COMPANY="inbot" \
  API_KEY_TEST_DEPARTMENT="testes" \
  API_KEY_TEST_TABLE="TesteAut" \
  npm run test:api-keys
  ```

---

## Checklist @table-create

- [ ] `git status` limpo
- [ ] Sessão válida
- [ ] Card 10 implementado pelo front-end: todos os 7 `data-testid` presentes no DOM
  - [ ] `create-table-button`
  - [ ] `table-name-input`
  - [ ] `table-department-select`
  - [ ] `table-department-option-testes`
  - [ ] `confirm-create-table`
  - [ ] `delete-table-button`
  - [ ] `confirm-delete-table`
- [ ] `ENABLE_DESTRUCTIVE=true` será passado explicitamente
- [ ] `ENABLE_TABLE_CREATE_TESTS=true` será passado explicitamente
- [ ] Massa autorizada: empresa `inbot`, departamento `testes`
- [ ] Não há tabela com prefixo `qa_tabela_aut_` de execução anterior sem cleanup
- [ ] Regra de prefixo confirmada: cleanup só atua em tabelas com `qa_tabela_aut_`
- [ ] `.env` não está sendo commitado
- [ ] Ciência do risco: tabela ficará visível para outros usuários durante o teste
- [ ] Comando a executar:
  ```bash
  ENABLE_DESTRUCTIVE=true \
  ENABLE_TABLE_CREATE_TESTS=true \
  TABLE_CREATE_COMPANY="inbot" \
  TABLE_CREATE_DEPARTMENT="testes" \
  npm run test:table-create
  ```

---

## Checklist de segurança (antes de qualquer commit)

- [ ] `git status` — confirmar que apenas os arquivos esperados aparecem
- [ ] `git diff --stat` — confirmar escopo do commit
- [ ] Nenhum `.env` ou `.env.*` listado (exceto `.env.example`)
- [ ] Nenhum `fixtures/.auth/user.json` listado
- [ ] Nenhum arquivo em `evidencias/` listado
- [ ] Nenhum arquivo em `downloads/` listado
- [ ] Nenhum arquivo `*.webm`, `*.zip`, `*.png` de evidência listado
- [ ] Nenhum valor real de senha, token, API Key ou secret no diff
- [ ] Mensagem de commit clara e no formato `tipo: descrição` (ex: `test:`, `docs:`, `fix:`)

---

## Referência de ambientes

| Parâmetro | Valor padrão | Onde configurar |
|---|---|---|
| `BASE_URL` | `https://intable.inbot.com.br` | `.env` ou inline no comando |
| `USER_EMAIL` | — | export no shell antes do setup |
| `USER_PASSWORD` | — | `read -s` no shell antes do setup |
| Credenciais MS Graph | — | `.env` (nunca inline, nunca commitado) |

---

## Referência de documentação

| Documento | Conteúdo |
|---|---|
| `docs/execution-runbook.md` | Passo a passo operacional completo |
| `docs/test-data-strategy.md` | Regras de massa, prefixos e cleanup |
| `docs/automation-roadmap.md` | Matriz de funcionalidades e backlog |
| `docs/frontend-testability-tickets.md` | Cards de testabilidade para o front-end |
| `docs/export-tests.md` | Documentação detalhada da suíte @export |
| `docs/api-key-tests.md` | Documentação detalhada da suíte @api-key |
| `docs/table-create-tests.md` | Documentação detalhada da suíte @table-create |
