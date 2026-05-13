# InTable QA — Estratégia de Massa de Teste

_Define as regras de criação, uso, identificação e cleanup de dados sintéticos nas suítes E2E._

---

## 1. Massas autorizadas para execução controlada

Estas são as massas de dados aprovadas para uso nas suítes destrutivas controladas.
Representam ambientes de teste dentro do InTable — não contêm dados de produção.

| Parâmetro | Valor | Suíte que usa |
|---|---|---|
| Empresa | `inbot` | @export, @api-key, @table-create |
| Departamento | `testes` | @export, @api-key, @table-create |
| Tabela de referência | `TesteAut` | @api-key (rastreabilidade no nome da chave) |

**Regra:** qualquer expansão de massa (nova empresa, novo departamento) deve ser discutida e documentada antes da execução. Nunca usar empresa ou departamento de produção como massa de teste.

---

## 2. Prefixos de segurança

Toda massa criada pelo teste usa um prefixo fixo que permite identificação e cleanup seguro.
O prefixo nunca é compartilhado com dados reais do ambiente.

| Prefixo | Usado em | Formato completo |
|---|---|---|
| `qa_tabela_aut_` | @table-create | `qa_tabela_aut_${Date.now()}` |
| `qa-api-key-` | @api-key | `qa-api-key-{tabela}-${Date.now()}` |

### Exemplos de nomes gerados

```
qa_tabela_aut_1747089600000
qa-api-key-testeaut-1747089600000
```

O timestamp (`Date.now()`) garante unicidade entre execuções e rastreabilidade temporal.

---

## 3. Regra de nunca usar dado real como massa

- **Nunca** usar tabela, linha, coluna ou chave de API de produção como alvo de testes destrutivos.
- **Nunca** usar conta de usuário real (além da conta de QA autorizada) para gerar dados.
- **Nunca** usar dados de clientes, parceiros ou colaboradores como entrada de teste.
- Se um teste precisa de dado específico (ex: tabela com colunas), criar a massa sintética primeiro — não reutilizar dado existente sem prefixo de segurança.

---

## 4. Regra de cleanup

### O que é cleanup

Cleanup é a remoção de toda massa criada pelo teste ao final da execução, independentemente de sucesso ou falha.

### Como é implementado

Cada suíte destrutiva usa um bloco `try/finally`:

```javascript
let massaCriada = false
let massaRemovida = false

try {
  // ... fluxo do teste ...
  massaCriada = true
  // ... remoção como parte do fluxo ...
  massaRemovida = true
} finally {
  if (massaCriada && !massaRemovida) {
    // tenta remover automaticamente
    // se falhar, anota warning no relatório
  }
}
```

### Regras do cleanup

1. **Sempre no `finally`** — garantido mesmo se o teste falhar.
2. **Escopo restrito** — o cleanup só atua em registros identificados pelo nome exato gerado no teste, jamais em outros registros.
3. **Verificação de prefixo** — antes de qualquer delete, verifica que o nome começa com o prefixo de segurança.
4. **Falha silenciosa** — se o cleanup falhar, não relança a exceção (preserva o erro original do teste).
5. **Warning obrigatório** — se o cleanup não concluir, anota `warning` no relatório com o identificador do registro.

### Cleanup nunca:
- Remove registros que não foram criados pelo próprio teste.
- Usa "Excluir tudo" ou equivalente.
- Atua fora do escopo da linha/chave identificada pelo nome único.

---

## 5. Regra de rollback

Algumas suítes criam registros que não podem ser desfeitos automaticamente (ex: notificação de exportação já enviada, e-mail já disparado). Para esses casos:

| Ação | Rollback automático | Ação manual necessária |
|---|---|---|
| Tabela criada (`qa_tabela_aut_*`) | Sim — via `finally` | Somente se cleanup automático falhar |
| API Key gerada (`qa-api-key-*`) | Sim — revogação no `finally` | Somente se revogação automática falhar |
| Exportação CSV solicitada | Não (processo assíncrono no servidor) | Nenhuma — arquivo gerado não afeta estado do sistema |
| E-mail de exportação enviado | Não | Nenhuma — e-mail não pode ser "desfeito" |
| Notificação interna gerada | Não | Nenhuma — não afeta dados do sistema |

---

## 6. Regra de identificação para cleanup manual

Se o cleanup automático falhar, o relatório anotará um `warning` com o identificador exato:

```
CLEANUP PENDENTE: a tabela "qa_tabela_aut_1747089600000" pode não ter sido deletada.
CLEANUP PENDENTE: a API Key "qa-api-key-testeaut-1747089600000" pode não ter sido revogada.
```

**Passo a passo para cleanup manual:**

1. Abrir o relatório HTML: `npm run report`
2. Localizar o teste com status `warning` na anotação.
3. Copiar o nome exato do registro (inclui timestamp).
4. Acessar a tela correspondente no InTable com a conta autorizada.
5. Localizar o registro pelo nome exato.
6. Confirmar que o nome começa com o prefixo de segurança (`qa_tabela_aut_` ou `qa-api-key-`).
7. Remover o registro.
8. Documentar a ação (canal de QA, nota no relatório ou comentário no PR).

---

## 7. Regra de não excluir fora do prefixo

**Esta é a regra mais crítica de segurança de dados.**

> Nunca excluir, revogar, editar ou sobrescrever qualquer registro que não comece com o prefixo de segurança do teste (`qa_tabela_aut_` ou `qa-api-key-`).

Essa regra vale para:
- Código de spec e cleanup automático.
- Cleanup manual após falha.
- Scripts utilitários.
- Qualquer ação manual realizada sob contexto de QA.

Se houver dúvida sobre a origem de um registro, **não excluir** — investigar primeiro.

---

## 8. Regra de registro de cleanup pendente

Todo cleanup manual executado deve ser registrado. Mínimo necessário:

| Campo | Exemplo |
|---|---|
| Data/hora | 2026-05-12 14:30 |
| Registro | `qa_tabela_aut_1747089600000` |
| Tipo | Tabela |
| Motivo do cleanup manual | Cleanup automático falhou — timeout na deleção |
| Ação tomada | Excluída manualmente na tela /tables |
| Executado por | Renato Paulino |

Registrar no canal de QA ou como anotação no relatório da rodada correspondente.

---

## 9. Expansão futura de massa

Para fases futuras do roadmap (Fase 6 — edição, importação, colunas), será necessário:

1. **Tabela de massa dedicada** — criada e mantida exclusivamente para testes destrutivos. Nome com prefixo `qa_tabela_aut_` e estrutura de colunas controlada.
2. **Colunas de massa** — prefixo `qa_coluna_` para identificação segura durante cleanup de estrutura.
3. **Linhas de massa** — prefixo ou valor fixo identificável (ex: `qa_linha_` no campo de nome, se houver).
4. **Arquivo de importação** — CSV/XLSX sintético armazenado em `fixtures/test-data/` (nunca em `evidencias/`).

Nenhuma dessas expansões deve ser implementada sem planejamento prévio e documentação atualizada neste arquivo.
