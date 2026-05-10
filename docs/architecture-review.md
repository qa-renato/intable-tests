# Revisão Técnica da Arquitetura — InTable E2E

**Data:** 2026-05-09  
**Suíte:** `intable-tests`  
**Repositório:** https://github.com/qa-renato/intable-tests  

---

## 1. Resumo da suíte atual

| Item | Detalhe |
|---|---|
| Testes ativos | 10 specs `@readonly` |
| Escopo | Somente leitura — nenhuma criação, edição, exclusão, importação ou exportação destrutiva |
| URL alvo | `https://intable.inbot.com.br` |
| Autenticação | Azure/Inbot SSO (Keycloak → Microsoft → redirect); `storageState` em `fixtures/.auth/user.json` |
| Estabilidade | 30/30 na última validação, sem flake |
| Workers | 1 (serial) — necessário pela dependência de sessão compartilhada |
| Retries | 1 — cobre blips de rede esporádicos (`ERR_NETWORK_CHANGED`) |

---

## 2. Estrutura atual

```
intable/
├── fixtures/
│   ├── global.setup.js          # Auth Azure/Inbot SSO + cache guard (valida sessão no servidor → reutiliza ou refaz login)
│   └── .auth/                   # gitignored — storageState gerado em runtime
├── pages/
│   └── intable/
│       └── tabelas.page.js      # Page Object único; todos os locators e métodos da tela /tables
├── tests/
│   └── tabelas/
│       ├── smoke.spec.js        # Carregamento da tela + painel Filtros
│       ├── filtros.spec.js      # Filtro por departamento
│       ├── busca.spec.js        # Busca por nome e limpeza
│       ├── paginacao.spec.js    # Navegação Prox/Ant
│       ├── visualizacao.spec.js # Abrir tabela e retornar à lista
│       ├── empty-state.spec.js  # Busca sem resultado e recuperação
│       ├── tamanho-pagina.spec.js # Combobox de itens por página
│       └── ordenacao.spec.js    # Ordenação por cabeçalho de coluna
├── docs/
│   └── architecture-review.md  # Este arquivo
├── playwright.config.js         # fullyParallel: false, workers: 1, retries: 1
├── package.json
├── README.md
└── .gitignore                   # Exclui .auth/, evidencias/, traces, vídeos, screenshots, .env
```

---

## 3. Pontos fortes

- **Suíte readonly estável.** Nenhum teste modifica estado da aplicação — podem ser executados em produção sem risco, em qualquer frequência.
- **Page Object centralizado.** `tabelas.page.js` concentra todos os locators e encapsula interações; specs ficam limpos e legíveis.
- **storageState ignorado no Git.** Cookies de sessão nunca chegam ao repositório — `.gitignore` cobre `fixtures/.auth/`.
- **Specs separados por comportamento.** Um arquivo por funcionalidade; fácil isolar falhas e rodar subconjuntos.
- **`expect.poll` para renderização assíncrona.** Sem sleeps fixos — testes esperam o estado real, não um timeout arbitrário.
- **`primeiroAbrirButton` como âncora de skeleton loading.** Padrão consistente: só lê célula após confirmar que dados reais chegaram.
- **`test.skip` documentado.** Quando uma feature não é detectável (paginação única, opção de combobox ausente, `aria-sort` faltando), o skip registra o motivo — não silencia o problema.
- **Validação de segurança antes de cada commit.** `git ls-files` confirma ausência de arquivos sensíveis.

---

## 4. Riscos atuais

### 4.1 Locators frágeis

| Locator | Risco | Mitigação recomendada |
|---|---|---|
| `page.locator('div').filter({ hasText: /^inbot$/ }).nth(1)` | Posição `nth(1)` quebra se o DOM mudar | `data-testid="empresa-inbot"` ou `aria-label` no card |
| `page.getByRole('combobox')` — tamanho de página | Sem label; único combobox na tela hoje, mas pode mudar | `aria-label="Itens por página"` na combobox |
| Ordenação detectada via leitura de célula | Sem `aria-sort`, qualquer lista já ordenada não produz diff | `aria-sort` nos `<th>` ordenáveis |

### 4.2 Autenticação

- ~~O storageState expira silenciosamente~~ — **mitigado em `1ea83de`**: o setup injeta os cookies no contexto, navega para `/` e verifica se o campo `Buscar empresa...` está visível na Home. Esse campo só existe em sessão válida do aplicativo.
- **Por que não basta verificar a URL:** o app exibe "Conecte Novamente" em `intable.inbot.com.br` quando a sessão do aplicativo expira, mesmo que os cookies do Keycloak ainda estejam presentes. Verificação por URL retornaria falso-positivo. A verificação pelo elemento confirma que o aplicativo reconhece a sessão.
- **Se a validação falhar:** cookies são descartados e o login é refeito via SSO automaticamente.
- **Risco residual:** a validação adiciona ~5–8s ao setup quando a sessão está válida (custo da navegação real). Aceitável dado que o setup roda uma vez por sessão de CI.
- Se a sessão expirar e as credenciais (`USER_EMAIL`/`USER_PASSWORD`) não estiverem disponíveis, o setup falhará com mensagem clara — não silenciosamente.

### 4.3 Flakiness de rede

- `ERR_NETWORK_CHANGED` em `goto()` é tratado pelo `retries: 1`, mas é sintoma de instabilidade de VPN/rede local.
- Se a frequência aumentar, investigar infraestrutura — não adicionar mais retries.

### 4.4 Cobertura de ordenação incompleta

- `ordenacao.spec.js` pode terminar em `test.skip` se a lista já estiver ordenada ou se todos os itens tiverem o mesmo nome. Sem `aria-sort`, não há como diferenciar "ordenação aplicada" de "lista idempotente".

### 4.5 Sem projeto de fixture por spec

- Todos os specs compartilham a mesma sessão. Um spec que altera estado de UI (ex: expande filtros, muda tamanho de página) pode afetar o próximo se a ordem de execução mudar.
- **Status atual:** aceitável com `workers: 1` e specs independentes. Monitorar ao escalar.

---

## 5. Melhorias recomendadas no front-end

Essas mudanças eliminam locators frágeis e permitem assertions mais robustas — sem alterar comportamento visual:

1. **Card de empresa:** `data-testid="empresa-{slug}"` ou `aria-label="Selecionar empresa {nome}"`.
2. **Combobox de itens por página:** `aria-label="Itens por página"`.
3. **Cabeçalhos ordenáveis:** `aria-sort="ascending"` / `aria-sort="descending"` / `aria-sort="none"` conforme estado.
4. **Itens de dropdown:** garantir `role="option"` nos itens de selects customizados (departamento, tamanho de página).
5. **Empty states:** manter texto literal estável; evitar variações ("Nenhuma tabela encontrada" vs "Sem resultados") entre versões.

---

## 6. Antes de fluxos destrutivos

Os fluxos com escrita (`ENABLE_DESTRUCTIVE=true`) requerem controles que ainda não existem:

### 6.1 Massa de dados sintética

- Criar tabelas/linhas com prefixo identificável (`qa-auto-`, timestamp) para isolamento.
- Nunca operar sobre dados de produção reais ou compartilhados entre testes.

### 6.2 Rollback e cleanup

- Cada spec destrutivo deve fazer cleanup após si mesmo (`afterEach` ou `afterAll`).
- Se o cleanup falhar, o estado sujo não deve bloquear outros testes.
- Considerar `beforeAll` para verificar pré-condições de ambiente antes de criar dados.

### 6.3 Proteção de execução

- Flag `ENABLE_DESTRUCTIVE=true` deve ser verificada dentro de cada spec destrutivo, não apenas no grep.
- `test.skip(process.env.ENABLE_DESTRUCTIVE !== 'true', 'Requer ENABLE_DESTRUCTIVE=true')` no início de cada spec.

### 6.4 Separação de specs

- Diretório dedicado: `tests/tabelas/destructive/` ou tag `@destructive` nos nomes de teste.
- Nunca misturar specs readonly e destrutivos no mesmo arquivo.

### 6.5 Documentação

- Registrar: quais entidades são criadas, em qual ambiente, quem pode fazer cleanup manual se necessário.
- Não rodar destrutivos em produção sem aprovação explícita.

---

## 7. Próxima cobertura sugerida

### Fase 1 — Revisão de locators (sem novos testes)

- Abrir tickets para o time de front-end solicitando `data-testid`/`aria-label`/`aria-sort`.
- Quando implementados, atualizar `tabelas.page.js` e remover os TODOs correspondentes.
- Validar que os 10 testes existentes continuam passando após a troca de locators.

### Fase 2 — Exportação readonly (se segura)

- Avaliar se clicar em "Exportar CSV/XLSX" gera efeito colateral no servidor (log, cobrança, trigger de processamento).
- Se for puramente de leitura, implementar spec que clica no botão e valida download do arquivo.
- Validar: nome do arquivo, extensão, tamanho mínimo (> 0 bytes), encoding.

### Fase 3 — Fluxos destrutivos controlados

- Criar tabela com nome prefixado `qa-auto-{timestamp}`.
- Adicionar coluna, adicionar linha, verificar persistência.
- Excluir a tabela criada (cleanup).
- Executar apenas com `ENABLE_DESTRUCTIVE=true` em ambiente não produtivo.

---

*Gerado em 2026-05-09. Atualizar após cada ciclo de cobertura significativo.*
