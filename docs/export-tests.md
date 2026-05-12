# InTable — Suíte de Exportação (@export)

## Status

**Base técnica criada — execução real de ponta a ponta ainda não realizada.**

A suíte `@export` foi estruturada com todos os seletores, guards de flag, helpers de notificação
e download necessários. O fluxo **não foi executado de ponta a ponta** por um único bloqueador de front-end.

### Bloqueador atual

O botão que abre o menu de ações da tabela **não tem seletor estável** no DOM.
O teste falhará neste passo com mensagem clara até que o front-end adicione:

```html
<button
  data-testid="table-actions-menu-button"
  aria-label="Ações da tabela"
>
  <!-- ícone existente — sem alteração visual -->
</button>
```

O Playwright Codegen gerou para esse botão o seletor:

```
page.getByRole('button').filter({ hasText: /^$/ }).nth(4)
```

**Esse seletor NÃO deve ser usado.** É posicional e quebra com qualquer mudança de layout.
O teste usa `getByTestId('table-actions-menu-button')` e aguarda o atributo ser adicionado.

### Seletores confirmados via Codegen (2026-05-11)

Os demais seletores do fluxo foram observados e estão estáveis:

| Seletor | Passo |
|---|---|
| `getByRole('menuitem', { name: 'Exportar (CSV)' })` | Acionar exportação CSV no menu |
| `getByRole('button', { name: 'Notificações' })` | Abrir painel de notificações |
| `getByRole('button', { name: 'Baixar CSV' })` | Acionar download no painel |

### Fluxo que ficará validável após ajuste do front-end

```
abrir tabela → abrir menu de ações (BLOQUEADO) →
clicar "Exportar (CSV)" → abrir "Notificações" → aguardar "Baixar CSV" →
download → validar extensão .csv, tamanho > 0, cabeçalho presente
```

### Validação de e-mail (fase posterior)

A validação de e-mail via Outlook/Microsoft 365 usando Microsoft Graph é **opcional**,
controlada por `EMAIL_VALIDATION_ENABLED=true`, e depende de configuração de App Registration no Azure AD.
Não faz parte da primeira validação real do fluxo de download.

---

## Objetivo

Validar o fluxo completo de exportação de dados do InTable:

1. Usuário autenticado acessa `/tables`.
2. Seleciona empresa `inbot` e abre uma tabela estável.
3. Abre menu de ações → clica em "Exportar (CSV)".
4. Abre painel de notificações → aguarda botão "Baixar CSV".
5. Clica "Baixar CSV" → captura o download.
6. Valida: extensão `.csv`, tamanho > 0, cabeçalho presente.
7. (Opcional) Sistema envia e-mail de exportação via Microsoft Graph.

---

## Por que não é `@readonly`?

A exportação **não é somente leitura**:

- Aciona um processo assíncrono no servidor.
- Gera notificações internas.
- Dispara envio de e-mail externo.
- Pode consumir recursos de geração de arquivo (CSV, XLSX).

Por isso é classificada como `@export @integration @notification`, executada em suíte isolada e protegida por flags de controle explícitas.

---

## Flags de controle

| Flag | Tipo | Comportamento |
|---|---|---|
| `ENABLE_EXPORT_TESTS=true` | Obrigatória | Habilita a suíte. Sem ela, Playwright **não é invocado**. |
| `EMAIL_VALIDATION_ENABLED=true` | Opcional | Habilita validação de e-mail via Microsoft Graph. Sem ela, o passo de e-mail é anotado como pulado. |

---

## Variáveis de ambiente

### Sempre obrigatórias quando a suíte está ativa

| Variável | Descrição |
|---|---|
| `EXPORT_RECIPIENT` | E-mail esperado do destinatário da exportação |

### Obrigatórias apenas se `EMAIL_VALIDATION_ENABLED=true`

| Variável | Descrição |
|---|---|
| `MS_TENANT_ID` | Directory (tenant) ID do Microsoft Entra / Azure AD |
| `MS_CLIENT_ID` | Application (client) ID do App Registration |
| `MS_CLIENT_SECRET` | Client secret gerado no App Registration |
| `MS_MAILBOX_USER` | UPN da caixa de correio a ser consultada via Graph API |

### Opcional

| Variável | Default | Descrição |
|---|---|---|
| `EXPORT_EMAIL_SUBJECT_KEYWORDS` | `export,exportação,intable,tabela` | Palavras-chave separadas por vírgula para filtrar o assunto do e-mail. Ajustar conforme o assunto real enviado pelo sistema. |

Nunca commitar variáveis de ambiente. Salvar em `.env` (protegido pelo `.gitignore`).
Usar `.env.example` como referência de quais variáveis configurar.

---

## Comandos

### Exportação sem validação de e-mail

```bash
ENABLE_EXPORT_TESTS=true \
EXPORT_RECIPIENT="renato.paulino@inbot.com.br" \
npm run test:export
```

### Exportação com validação de e-mail (Microsoft Graph)

```bash
ENABLE_EXPORT_TESTS=true \
EMAIL_VALIDATION_ENABLED=true \
EXPORT_RECIPIENT="renato.paulino@inbot.com.br" \
MS_MAILBOX_USER="renato.paulino@inbot.com.br" \
MS_TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
MS_CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
MS_CLIENT_SECRET="seu-client-secret" \
npm run test:export
```

### Coleta de evidências

```bash
ENABLE_EXPORT_TESTS=true \
EXPORT_RECIPIENT="renato.paulino@inbot.com.br" \
npm run evidence:export
```

### Sem flag (não roda)

```bash
npm run test:export
# → Suíte @export desativada — Playwright não será iniciado.
```

---

## Pré-requisitos Microsoft Graph

A validação de e-mail usa a Microsoft Graph API com autenticação app-only (Client Credentials).
A caixa de correio consultada é `MS_MAILBOX_USER` (Outlook/Microsoft 365).
Não abre o browser do Outlook — apenas consulta a API.

### 1. Criar App Registration no Microsoft Entra

1. Acessar: **Azure Portal → Microsoft Entra ID → App registrations → New registration**
2. Nome sugerido: `intable-qa-email-reader`
3. Tipo de conta: contas somente neste diretório organizacional

### 2. Adicionar permissão de leitura de e-mail

1. No App Registration → **API permissions → Add permission**
2. **Microsoft Graph → Application permissions**
3. Selecionar: `Mail.Read` (ou `Mail.ReadBasic` para acesso mínimo)
4. Clicar em **Add permissions**
5. Clicar em **Grant admin consent for `<tenant>`** — **requer conta de administrador do tenant**

> **Sem admin consent a API retorna 403 Forbidden.**
> Confirmar com o administrador do tenant Microsoft 365 antes de executar.

### 3. Criar Client Secret

1. No App Registration → **Certificates & secrets → New client secret**
2. Definir validade (90 dias, 1 ano etc.)
3. **Copiar o valor imediatamente** — não é exibido novamente
4. Salvar em `.env` como `MS_CLIENT_SECRET`

### 4. Coletar IDs

Na aba **Overview** do App Registration:

- **Application (client) ID** → `MS_CLIENT_ID`
- **Directory (tenant) ID** → `MS_TENANT_ID`

### 5. Restringir acesso à mailbox (recomendado)

Por padrão, `Mail.Read` com Application permission concede acesso a **todas as caixas do tenant**.
Para restringir ao `MS_MAILBOX_USER` apenas, o admin Exchange pode aplicar uma `ApplicationAccessPolicy`:

```powershell
# Executar no Exchange Online PowerShell
New-ApplicationAccessPolicy `
  -AppId "<MS_CLIENT_ID>" `
  -PolicyScopeGroupId "<MS_MAILBOX_USER ou grupo de distribuição>" `
  -AccessRight RestrictAccess `
  -Description "Restringe leitura de e-mail do app de QA à mailbox de teste"
```

Esta etapa é opcional mas recomendada para reduzir o escopo de acesso.

### 6. Não implementar Mail.Send

Este helper é **somente leitura**. Não solicitar nem configurar a permissão `Mail.Send`.

---

## Seletores confirmados (Codegen 2026-05-11)

| Seletor | Onde |
|---|---|
| `getByRole('menuitem', { name: 'Exportar (CSV)' })` | Item do menu de exportação |
| `getByRole('button', { name: 'Notificações' })` | Botão de notificações no header |
| `getByRole('button', { name: 'Baixar CSV' })` | Botão de download no painel |

## Bloqueios de testabilidade (front-end pendente)

| Bloqueio | Onde | Solicitar ao front-end |
|---|---|---|
| Botão que abre o menu de ações | Tela de detalhe da tabela | `data-testid="table-actions-menu-button"` ou `aria-label="Ações da tabela"` |
| Container do painel de notificações | Painel após clique | `data-testid="notifications-panel"` |
| Cada item de notificação | Lista no painel | `data-testid="notification-item"` |

O Codegen gerou para o menu de ações:
```
page.getByRole('button').filter({ hasText: /^$/ }).nth(4)
```
Esse seletor é posicional e frágil — **não usar**. O teste falhará neste passo até que o `data-testid` seja adicionado.

---

## Arquitetura da suíte

```
scripts/run-export.js          Wrapper — guarda a flag, valida vars, invoca Playwright
tests/export/
  export-table.spec.js         Spec principal — fluxo completo de exportação
helpers/
  notifications.js             Helper de notificações internas (polling)
  emailClient.js               Helper Microsoft Graph (polling de e-mail)
docs/
  export-tests.md              Este arquivo
.env.example                   Template de variáveis (sem valores reais)
```

---

## Isolamento da suíte @readonly

- `npm run test:readonly` usa `--grep "@readonly"` → não captura `@export`
- `npm run test:export` sem flag → Playwright **não sobe**
- As 8 specs em `tests/tabelas/` não foram modificadas
