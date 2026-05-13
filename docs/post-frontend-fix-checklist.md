# InTable QA — Checklist de Retomada Pós-Ajuste do Front-End

_Executar quando o time de front-end confirmar a implementação dos Cards 8, 9 e/ou 10._

---

## Pré-condição

Antes de iniciar, confirmar qual card foi publicado:

- [ ] **Card 8** — `data-testid="table-actions-menu-button"` (desbloqueia `@export`)
- [ ] **Card 9** — `data-testid="api-keys-menu-button"` (desbloqueia `@api-key`)
- [ ] **Card 10** — 7 `data-testid` no fluxo de criação/deleção (desbloqueia `@table-create`)

Cada card pode ser validado de forma independente. Não é necessário aguardar os três.

---

## Fase 1 — Verificação do ambiente

- [ ] `git pull origin main` — repositório local atualizado
- [ ] `git status` — working tree limpa
- [ ] `npm run check:safe` — syntax e guards OK (não requer sessão)
- [ ] Sessão válida ou credenciais disponíveis para renovação
  - Se expirada: seguir seção 1 do `docs/execution-runbook.md`
- [ ] `npm run test:readonly` — 10/10 passando (confirma ambiente sem regressão)

---

## Fase 2 — Validação do Card 8 (@export)

_Executar apenas se Card 8 foi publicado._

- [ ] Confirmar no DOM que `data-testid="table-actions-menu-button"` existe na tela de detalhe da tabela
  ```bash
  npm run codegen:auth
  # inspecionar o botão de ações na tela de detalhe
  ```
- [ ] Confirmar que `aria-label="Ações da tabela"` também está presente (desejável)
- [ ] Verificar `.env` com `EXPORT_RECIPIENT` configurado
- [ ] Executar suíte @export:
  ```bash
  ENABLE_EXPORT_TESTS=true \
  EXPORT_RECIPIENT="renato.paulino@inbot.com.br" \
  npm run test:export
  ```
- [ ] Confirmar que o teste passou
- [ ] Verificar que o arquivo CSV foi baixado em `downloads/export/`
- [ ] Confirmar extensão `.csv`, tamanho > 0, cabeçalho presente (via relatório)
- [ ] Confirmar que `evidencias/html/index.html` mostra sucesso
- [ ] Confirmar que `downloads/` e `evidencias/` **não aparecem** em `git status`
- [ ] Se algum seletor falhou: atualizar spec e documentar em `docs/export-tests.md`
- [ ] Atualizar `docs/frontend-testability-tickets.md` — marcar Card 8 como resolvido
- [ ] Atualizar `docs/reports/` com relatório da rodada

---

## Fase 3 — Validação do Card 9 (@api-key)

_Executar apenas se Card 9 foi publicado._

- [ ] Confirmar no DOM que `data-testid="api-keys-menu-button"` existe na tela pós-seleção de empresa
- [ ] Confirmar massa autorizada: empresa `inbot`, departamento `testes`, tabela `TesteAut`
- [ ] Verificar checklist `@api-key` em `docs/preflight-checklist.md`
- [ ] Executar suíte @api-key:
  ```bash
  ENABLE_API_KEY_TESTS=true \
  API_KEY_TEST_COMPANY="inbot" \
  API_KEY_TEST_DEPARTMENT="testes" \
  API_KEY_TEST_TABLE="TesteAut" \
  npm run test:api-keys
  ```
- [ ] Confirmar que o teste passou
- [ ] Confirmar que **nenhuma API Key** ficou ativa (revogação automática no `finally`)
- [ ] Verificar relatório: ausência de `warning` de CLEANUP PENDENTE
- [ ] Se houver `warning`: executar cleanup manual conforme `docs/test-data-strategy.md` seção 6
- [ ] Confirmar que trace, screenshot e video estão desabilitados (log não mostra artefatos)
- [ ] Se algum seletor falhou no formulário: documentar e atualizar spec
- [ ] Atualizar `docs/frontend-testability-tickets.md` — marcar Card 9 como resolvido
- [ ] Atualizar `docs/reports/` com relatório da rodada

---

## Fase 4 — Validação do Card 10 (@table-create)

_Executar apenas se todos os 7 `data-testid` do Card 10 foram publicados._

- [ ] Confirmar no DOM os 7 seletores:
  - [ ] `data-testid="create-table-button"`
  - [ ] `data-testid="table-name-input"`
  - [ ] `data-testid="table-department-select"`
  - [ ] `data-testid="table-department-option-testes"`
  - [ ] `data-testid="confirm-create-table"`
  - [ ] `data-testid="delete-table-button"`
  - [ ] `data-testid="confirm-delete-table"`
- [ ] Confirmar massa autorizada: empresa `inbot`, departamento `testes`
- [ ] Verificar checklist `@table-create` em `docs/preflight-checklist.md`
- [ ] Executar suíte @table-create:
  ```bash
  ENABLE_DESTRUCTIVE=true \
  ENABLE_TABLE_CREATE_TESTS=true \
  TABLE_CREATE_COMPANY="inbot" \
  TABLE_CREATE_DEPARTMENT="testes" \
  npm run test:table-create
  ```
- [ ] Confirmar que o teste passou
- [ ] Confirmar que **nenhuma tabela** `qa_tabela_aut_` ficou na lista (cleanup automático)
- [ ] Verificar relatório: ausência de `warning` de CLEANUP PENDENTE
- [ ] Se houver `warning`: executar cleanup manual conforme `docs/test-data-strategy.md` seção 6
- [ ] Executar a suíte 3 vezes consecutivas para validar idempotência do cleanup
- [ ] Atualizar `docs/frontend-testability-tickets.md` — marcar Card 10 como resolvido
- [ ] Atualizar `docs/reports/` com relatório da rodada

---

## Fase 5 — Encerramento da rodada

- [ ] `npm run check:safe` — confirmar que tudo ainda passa após ajustes
- [ ] `npm run test:readonly` — 10/10 passando (confirmar ausência de regressão)
- [ ] `git status` — working tree limpa, sem arquivos sensíveis staged
- [ ] Confirmar que `downloads/`, `evidencias/`, `.env` não aparecem no status
- [ ] Commit dos ajustes de spec (se necessários):
  ```bash
  git add tests/ docs/ pages/
  git commit -m "test: adjust selectors after frontend Card 8/9/10 fix"
  git push origin main
  ```
- [ ] Criar relatório em `docs/reports/automation-status-YYYY-MM-DD.md`
- [ ] Notificar o time sobre o status das suítes desbloqueadas

---

## Referência rápida de comandos

```bash
# Verificação segura (sem sessão, sem flags)
npm run check:safe

# Readonly (requer sessão)
npm run check:readonly

# Export (requer Card 8 + flag)
ENABLE_EXPORT_TESTS=true EXPORT_RECIPIENT="..." npm run test:export

# API Key (requer Card 9 + flag)
ENABLE_API_KEY_TESTS=true npm run test:api-keys

# Table create (requer Card 10 + ambas as flags)
ENABLE_DESTRUCTIVE=true ENABLE_TABLE_CREATE_TESTS=true npm run test:table-create

# Evidências
npm run evidence:readonly
npm run report
```
