#!/usr/bin/env node
// Wrapper para a suíte de criação de tabela.
// Playwright NÃO é invocado a menos que AMBAS as flags estejam ativas.

const ENABLE_DESTRUCTIVE = process.env.ENABLE_DESTRUCTIVE === 'true'
const ENABLE_TABLE_CREATE_TESTS = process.env.ENABLE_TABLE_CREATE_TESTS === 'true'

// ── Guard duplo — ambas as flags são obrigatórias ─────────────────────────────
if (!ENABLE_DESTRUCTIVE || !ENABLE_TABLE_CREATE_TESTS) {
  const missing = []
  if (!ENABLE_DESTRUCTIVE) missing.push('ENABLE_DESTRUCTIVE=true')
  if (!ENABLE_TABLE_CREATE_TESTS) missing.push('ENABLE_TABLE_CREATE_TESTS=true')

  console.log(
    '\nSuíte @table-create desativada — Playwright não será iniciado.\n' +
      `\nFlag(s) ausente(s): ${missing.join(', ')}\n` +
      '\nAmbas as flags são obrigatórias. Para executar:\n' +
      '  ENABLE_DESTRUCTIVE=true \\\n' +
      '  ENABLE_TABLE_CREATE_TESTS=true \\\n' +
      '  TABLE_CREATE_COMPANY="inbot" \\\n' +
      '  TABLE_CREATE_DEPARTMENT="testes" \\\n' +
      '  npm run test:table-create\n' +
      '\nVariáveis TABLE_CREATE_COMPANY e TABLE_CREATE_DEPARTMENT são opcionais.\n' +
      'Defaults: COMPANY=inbot, DEPARTMENT=testes.\n' +
      '\nConsulte docs/table-create-tests.md para pré-requisitos e riscos.\n'
  )
  process.exit(0)
}

// ── Executa Playwright ────────────────────────────────────────────────────────
const { execSync } = require('child_process')

const company = process.env.TABLE_CREATE_COMPANY || 'inbot'
const department = process.env.TABLE_CREATE_DEPARTMENT || 'testes'

console.log('\n[run-table-create] Iniciando suíte @table-create...')
console.log(`[run-table-create] Empresa     : ${company}`)
console.log(`[run-table-create] Departamento: ${department}`)
console.log('[run-table-create] AVISO: esta suíte cria e deleta uma tabela real.')
console.log('[run-table-create] Nome da tabela usará prefixo "qa_tabela_aut_" + timestamp.')
console.log('[run-table-create] Toda tabela criada será deletada ao final do teste.\n')

execSync(
  'npx playwright test tests/tables-create --grep "@table-create" --reporter=line',
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      BASE_URL: process.env.BASE_URL || 'https://intable.inbot.com.br',
      ENABLE_DESTRUCTIVE: 'true',
      ENABLE_TABLE_CREATE_TESTS: 'true',
      TABLE_CREATE_COMPANY: company,
      TABLE_CREATE_DEPARTMENT: department,
    },
  }
)
