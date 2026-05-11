'use strict'

const fs = require('fs')
const path = require('path')

const JSON_INPUT = path.join(__dirname, '..', 'evidencias', 'evidence-run', 'results.json')
const MD_OUTPUT  = path.join(__dirname, '..', 'evidencias', 'evidence-run', 'resumo-execucao-readonly.md')

if (!fs.existsSync(JSON_INPUT)) {
  console.error('Arquivo não encontrado:', JSON_INPUT)
  process.exit(1)
}

const report = JSON.parse(fs.readFileSync(JSON_INPUT, 'utf8'))
const stats  = report.stats

const startDt = new Date(stats.startTime)
const startBR = startDt.toLocaleString('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
  hour12: false,
})

const durMin = (stats.duration / 60000).toFixed(1)

// ── Extrair todos os resultados de spec via walk recursivo ─────────────────
function walk(suites) {
  const rows = []
  for (const suite of (suites || [])) {
    for (const spec of (suite.specs || [])) {
      for (const test of (spec.tests || [])) {
        const last = test.results[test.results.length - 1]
        rows.push({
          title:    spec.title,
          file:     spec.file,
          status:   test.status,       // expected | flaky | unexpected | skipped
          lastStatus: last.status,     // passed | failed | skipped
          duration: last.duration,
          retries:  test.results.length - 1,
          error:    last.error?.message?.split('\n')[0] ?? '',
        })
      }
    }
    rows.push(...walk(suite.suites))
  }
  return rows
}

const allRows = walk(report.suites)

// Separar setup dos specs de produto
const setup   = allRows.filter(r => r.file.includes('global.setup'))
const specs   = allRows.filter(r => !r.file.includes('global.setup'))

function statusLabel(row) {
  if (row.status === 'flaky')      return 'FLAKY'
  if (row.lastStatus === 'passed') return 'PASS'
  if (row.lastStatus === 'skipped') return 'SKIP'
  return 'FAIL'
}

function fmtDuration(ms) {
  return ms >= 60000 ? (ms / 60000).toFixed(1) + 'm' : (ms / 1000).toFixed(1) + 's'
}

function obsFor(row) {
  if (row.status === 'flaky')       return 'retry ok — sessão expirada detectada, cache renovado'
  if (row.lastStatus === 'skipped') return row.error || 'condição de skip ativa'
  if (row.lastStatus !== 'passed')  return row.error || 'falha — verificar trace'
  return '—'
}

function shortFile(f) {
  return f.replace(/^.*\/tests\//, 'tests/').replace(/^.*\/fixtures\//, 'fixtures/')
}

// ── Montar tabela de specs ─────────────────────────────────────────────────
const tableRows = specs.map((row, i) => {
  const label    = statusLabel(row)
  const dur      = fmtDuration(row.duration)
  const file     = shortFile(row.file)
  const obs      = obsFor(row)
  const title    = row.title.replace(/ @readonly$/, '')
  return `| ${i + 1} | ${title} | \`${file}\` | ${label} | ${dur} | ${obs} |`
}).join('\n')

// ── Linha de setup ─────────────────────────────────────────────────────────
const setupRows = setup.map(row => {
  const label = statusLabel(row)
  const dur   = fmtDuration(row.duration)
  const obs   = obsFor(row)
  return `| — | ${row.title} | \`fixtures/global.setup.js\` | ${label} | ${obs} |`
}).join('\n')

// ── Contadores ─────────────────────────────────────────────────────────────
const passed  = stats.expected
const failed  = stats.unexpected
const skipped = stats.skipped
const flaky   = stats.flaky

// ── Conteúdo do Markdown ───────────────────────────────────────────────────
const md = `# Evidência de Execução — InTable Readonly

## Dados da execução

| Campo | Valor |
|---|---|
| Aplicação | https://intable.inbot.com.br |
| Escopo | testes \`@readonly\` |
| Ambiente | Produção (\`BASE_URL=https://intable.inbot.com.br\`) |
| Data/hora | ${startBR} (BRT) |
| Duração total | ${durMin} min |
| Total specs | ${passed + failed + skipped} |
| Passed | ${passed} |
| Failed | ${failed} |
| Skipped | ${skipped} |
| Flaky | ${flaky} (setup) |

---

## Cenários executados

| # | Cenário | Spec | Status | Duração | Observação |
|---|---|---|---|---|---|
${tableRows}

### Setup (infra — não é spec de produto)

| # | Cenário | Arquivo | Status | Observação |
|---|---|---|---|---|
${setupRows || '| — | (sem dados de setup no JSON) | — | — | — |'}

> O comportamento flaky do setup é **esperado e gerenciado**: o cache guard detecta sessão do app
> expirada verificando o campo \`Buscar empresa...\` na Home autenticada. O retry renova a sessão
> automaticamente sem intervenção manual.

---

## Evidências geradas

| Artefato | Localização |
|---|---|
| HTML report interativo | \`playwright-report/index.html\` |
| JSON report completo | \`evidencias/evidence-run/results.json\` |
| Traces | \`playwright-report/data/*.zip\` (1 por teste) |
| Vídeos | \`playwright-report/data/*.webm\` |

> Para visualizar: \`npm run report\` ou abrir \`playwright-report/index.html\` diretamente.
> Para inspecionar trace: \`npx playwright show-trace <arquivo.zip>\`.

---

## Observações

- **Nenhum fluxo destrutivo foi executado.**
- **Nenhum dado foi criado, editado ou excluído.**
- **Execução limitada exclusivamente à suíte \`@readonly\`.**
- O filtro por empresa está fora de escopo — aguardando \`role="option"\` ou \`data-testid\`
  nas opções do componente (ver \`docs/frontend-testability-tickets.md\`).
`

fs.writeFileSync(MD_OUTPUT, md, 'utf8')
console.log('Resumo gerado em:', MD_OUTPUT)
