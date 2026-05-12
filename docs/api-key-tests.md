# InTable — Suíte de API Keys (@api-key)

## Status

**Base técnica criada — execução real de ponta a ponta ainda não realizada.**

A suíte `@api-key` foi estruturada com guard de flag, cleanup robusto via `finally`,
regras de não exposição de chave e seletores estáveis onde disponíveis.
O fluxo **não foi executado de ponta a ponta** por um bloqueador de front-end.

### Bloqueador atual

O botão que abre o menu de API Keys **não tem seletor estável** no DOM.
O teste falhará neste passo com mensagem clara até que o front-end adicione:

```html
<button
  data-testid="api-keys-menu-button"
  aria-label="Ações de API Keys"
>
  <!-- ícone existente — sem alteração visual -->
</button>
```

Documentado em `docs/frontend-testability-tickets.md` — Card 9.

### Seletores avaliados via Codegen (a confirmar no DOM real)

| Seletor | Passo |
|---|---|
| `getByRole('menuitem', { name: 'Gerenciar Chaves de API' })` | Abrir gerenciamento |
| `getByRole('button', { name: 'Nova API Key' })` | Iniciar criação |
| `getByRole('button', { name: 'Gerar Chave' })` | Confirmar geração |
| `getByRole('button', { name: 'Copiar para área de transferência' })` | Validar criação |
| `getByRole('button', { name: 'Voltar para listagem' })` | Retornar à lista |
| `getByRole('button', { name: 'Revogar acesso desta chave' })` | Revogar chave |
| `getByRole('button', { name: 'Sim, Excluir' })` | Confirmar revogação |

---

## 1. Objetivo

Validar o fluxo de gerenciamento de API Keys do InTable:

1. Usuário autenticado acessa a empresa `inbot`.
2. Abre o menu de API Keys → "Gerenciar Chaves de API".
3. Clica em "Nova API Key".
4. Preenche nome único (baseado em timestamp), seleciona departamento e permissões mínimas.
5. Gera a chave — valida que o botão de copiar aparece (confirmação visual, sem ler o valor).
6. Volta para a listagem — valida que a chave aparece.
7. Revoga apenas a chave criada pelo teste.
8. Confirma exclusão.
9. Valida que a chave não aparece mais na listagem.
10. Garante revogação no bloco `finally`, mesmo em caso de falha intermediária.

---

## 2. Por que não é @readonly?

A suíte de API Keys não é somente leitura porque:

- **Cria** um registro real de API Key no sistema.
- **Gera** uma chave de acesso com capacidade real de autenticação.
- **Revoga** o registro criado (ação destrutiva controlada).
- Pode acionar efeitos colaterais no servidor (log de auditoria, notificações).

---

## 3. Por que é @destructive?

A geração de uma API Key **cria uma credencial funcional** no ambiente.
Mesmo que revogada ao final, entre a criação e a revogação a chave existe
e poderia ser usada para autenticação se exposta.

Por isso, a suíte é classificada como `@api-key @integration @destructive`:
- Executada em suíte isolada.
- Protegida por flag explícita (`ENABLE_API_KEY_TESTS=true`).
- Com cleanup obrigatório no `finally`.
- Sem nunca expor o valor da chave em log, relatório, trace ou screenshot.

---

## 4. Flags de controle

| Flag | Tipo | Comportamento |
|---|---|---|
| `ENABLE_API_KEY_TESTS=true` | Obrigatória | Habilita a suíte. Sem ela, Playwright **não é invocado**. |

---

## 5. Variáveis de ambiente

| Variável | Default | Descrição |
|---|---|---|
| `API_KEY_TEST_COMPANY` | `inbot` | Empresa onde gerenciar chaves. |
| `API_KEY_TEST_DEPARTMENT` | `testes` | Departamento associado à chave (se o form exigir). |

Não há variáveis obrigatórias além da flag. Nenhuma chave real deve ser configurada aqui.

Nunca commitar variáveis de ambiente. Salvar em `.env` (protegido pelo `.gitignore`).

---

## 6. Comandos

### Execução básica (empresa e departamento padrão)

```bash
ENABLE_API_KEY_TESTS=true \
npm run test:api-keys
```

### Execução explícita (todos os parâmetros)

```bash
ENABLE_API_KEY_TESTS=true \
API_KEY_TEST_COMPANY="inbot" \
API_KEY_TEST_DEPARTMENT="testes" \
npm run test:api-keys
```

### Coleta de evidências

```bash
ENABLE_API_KEY_TESTS=true \
API_KEY_TEST_COMPANY="inbot" \
API_KEY_TEST_DEPARTMENT="testes" \
npm run evidence:api-keys
```

### Sem flag (não roda)

```bash
npm run test:api-keys
# → Suíte @api-key desativada — Playwright não será iniciado.
```

---

## 7. Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Chave não revogada em caso de falha | Média | Cleanup obrigatório no bloco `finally` com anotação de warning |
| Trace captura valor da chave | Alta (se ativo) | `test.use({ trace: 'off' })` no describe da suíte |
| Screenshot captura valor da chave | Alta (se ativo) | `test.use({ screenshot: 'off' })` no describe da suíte |
| Seletor frágil na identificação da chave para revogação | Alta | Usa nome único por timestamp + `getByRole('row').filter({ hasText: keyName })` |
| Campo de nome não existe no form | Baixa | Test anota e falha explicitamente antes de tentar revogar sem identificação |
| Botão de menu sem seletor estável | Alta | Documentado como bloqueio — teste falha com mensagem clara |

---

## 8. Regra de cleanup

- **Toda chave gerada pelo teste deve ser revogada.**
- O nome da chave usa `qa-api-key-${Date.now()}` — único e rastreável.
- O bloco `finally` tenta revogar a chave se `keyCreated && !keyRevoked`.
- Se o cleanup automático falhar, o teste anota um `warning` no relatório:

  ```
  CLEANUP PENDENTE: a API Key "qa-api-key-..." pode não ter sido revogada.
  Verificar manualmente na tela de Gerenciar Chaves de API e revogar se necessário.
  ```

- O teste nunca tenta revogar chaves criadas fora do próprio fluxo.
- Nunca usar a opção "Vincular Chave Existente" — fora do escopo desta suíte.

---

## 9. Regra de não exposição de chave

| O que fazer | O que NUNCA fazer |
|---|---|
| Verificar que o botão "Copiar" está visível | Ler o valor da clipboard |
| Anotar nome, empresa, departamento, timestamp | Anotar o valor da chave |
| Salvar apenas metadados no `test.info().annotations` | Logar `key.value` ou equivalente |
| Desabilitar trace, screenshot e video nesta suíte | Commitar trace/screenshot com chave visível |
| Revogar a chave ao final | Deixar a chave ativa após o teste |

---

## 10. Pendências de front-end e testabilidade

### Bloqueadores

| Bloqueio | Onde | Solicitar ao front-end |
|---|---|---|
| Botão que abre o menu de API Keys | Tela pós-seleção de empresa | `data-testid="api-keys-menu-button"` |

### Seletores do formulário de criação (não confirmados)

| Seletor | Elemento | Por que é necessário |
|---|---|---|
| `data-testid="api-key-department-select"` | Dropdown de departamento | Identificar o campo sem depender de label frágil |
| `data-testid="api-key-department-option-testes"` | Opção no dropdown | Selecionar o departamento por nome estável |
| `getByLabel(/nome da chave/i)` | Campo de nome | Preencher nome único para rastreabilidade e cleanup |
| `getByRole('checkbox', { name: 'Ler Dados' })` | Permissão de leitura | Selecionar permissão mínima — confirmar label real |
| `getByRole('checkbox', { name: 'Ver Estrutura' })` | Permissão de estrutura | Selecionar permissão mínima — confirmar label real |

Todos os seletores do formulário serão confirmados ou ajustados na primeira execução real.
Documentar novos bloqueios em `docs/frontend-testability-tickets.md` se necessário.

---

## Arquitetura da suíte

```
scripts/run-api-keys.js           Wrapper — guarda a flag, exibe contexto, invoca Playwright
scripts/evidence-api-keys.sh      Coleta evidências com JSON + HTML (flag guard incluído)
tests/api-keys/
  api-key-management.spec.js      Spec principal — geração, listagem e revogação
docs/
  api-key-tests.md                Este arquivo
```

---

## Isolamento das demais suítes

- `npm run test:readonly` usa `--grep "@readonly"` → não captura `@api-key`
- `npm run test:export` usa `--grep "@export"` → não captura `@api-key`
- `npm run test:api-keys` sem flag → Playwright **não sobe**
- As specs em `tests/tabelas/` e `tests/export/` não foram modificadas

---

## Fora do escopo — primeira versão

- Vincular chave existente via "Chave Existente".
- Usar ou validar uma chave real já existente.
- Testar permissões destrutivas (Criar/Editar/Excluir Registros, Gerenciar Tabela).
- Validar chamadas de API autenticadas com a chave gerada.
- Alternar status Ativa/Inativa.
- Commitar evidências, traces ou screenshots.
