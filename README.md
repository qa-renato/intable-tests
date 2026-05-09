# InTable Tests

Automação E2E com Playwright para o InTable.
Alvo: `https://intable.inbot.com.br`.
Foco atual: smoke e validações readonly.

---

## Stack

- Node.js
- Playwright
- JavaScript

---

## Estrutura do projeto

```
fixtures/           # Setup global de autenticação e extensões de fixture
pages/              # Page objects (seletores e métodos por tela)
tests/              # Specs organizados por funcionalidade
evidencias/         # Artefatos de teste — NÃO versionado (.gitignore)
playwright.config.js
package.json
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
Na próxima execução, o cache é reutilizado automaticamente enquanto os cookies forem válidos.

```bash
BASE_URL=https://intable.inbot.com.br \
USER_EMAIL="$USER_EMAIL" \
USER_PASSWORD="$USER_PASSWORD" \
npx playwright test --project=setup --reporter=line
```

Para forçar novo login, delete `fixtures/.auth/user.json` antes de rodar o setup.

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

**8 testes `@readonly` estáveis**, todos passando em execuções repetidas (24/24 na última validação).

| Spec | Cenário |
|---|---|
| `smoke.spec.js` | Carregamento de `/tables`: cabeçalhos, botão atualizar, paginação, botão Abrir |
| `smoke.spec.js` | Expansão do painel de filtros e visibilidade dos controles |
| `filtros.spec.js` | Filtro por departamento `testes` e validação de resultado |
| `busca.spec.js` | Busca por nome de tabela e limpeza do campo |
| `paginacao.spec.js` | Navegação para próxima página e retorno (skip automático se uma página só) |
| `visualizacao.spec.js` | Abertura da primeira tabela, validação de grid ou empty state, retorno à lista |
| `empty-state.spec.js` | Busca sem resultado, validação de "Nenhuma tabela encontrada" e recuperação da lista ao limpar busca |

Setup: autenticação via Azure/Inbot SSO com cache guard — `fixtures/.auth/user.json` reutilizado enquanto válido.

---

## Fora do escopo atual

Os testes existentes são **exclusivamente readonly**. Os fluxos abaixo ainda não têm cobertura:

- Criação de tabela
- Criação de coluna
- Adição de linha
- Exclusão
- Importação
- Exportação
- Qualquer fluxo destrutivo

---

## Estabilidade

- Testes readonly passam consistentemente em execuções repetidas.
- `ERR_NETWORK_CHANGED` pode ocorrer esporadicamente por blip de rede/VPN durante `goto()`. O `retries: 1` do config trata esses casos; se o erro se tornar recorrente, investigar a infraestrutura de rede — não mascarar com retries adicionais.

---

## Segurança

- Nunca commitar `fixtures/.auth/user.json` (contém cookies de sessão)
- Nunca commitar `.env`
- Nunca commitar `evidencias/`, traces, vídeos ou screenshots
- Nunca hardcodar senha em código ou mensagem de commit

---

## Scripts disponíveis

| Script | Comando | Descrição |
|---|---|---|
| `setup` | `npm run setup` | Gera `fixtures/.auth/user.json` via SSO |
| `test:readonly` | `npm run test:readonly` | Executa todos os testes `@readonly` |
| `test` | `npm test` | Executa toda a suíte |
| `codegen` | `npm run codegen` | Abre codegen sem autenticação |
| `codegen:auth` | `npm run codegen:auth` | Abre codegen com storageState carregado |
| `report` | `npm run report` | Abre o relatório HTML em `evidencias/html` |

---

## Próximos passos recomendados

1. Tamanho de página readonly (combobox "10 itens" → alterar e validar que a lista recarrega)
2. Ordenação de colunas readonly (clicar no cabeçalho, validar inversão da ordem)
3. Somente após cobrir os itens acima: fluxos com escrita usando `ENABLE_DESTRUCTIVE=true`
