#!/usr/bin/env node
// Wrapper para a suíte de API Keys.
// Playwright NÃO é invocado se ENABLE_API_KEY_TESTS !== "true".

const ENABLE_API_KEY_TESTS = process.env.ENABLE_API_KEY_TESTS === 'true'

// ── Guard principal ───────────────────────────────────────────────────────────
if (!ENABLE_API_KEY_TESTS) {
  console.log(
    '\nSuíte @api-key desativada — Playwright não será iniciado.\n' +
      '\nPara executar:\n' +
      '  ENABLE_API_KEY_TESTS=true \\\n' +
      '  API_KEY_TEST_COMPANY="inbot" \\\n' +
      '  API_KEY_TEST_DEPARTMENT="testes" \\\n' +
      '  npm run test:api-keys\n' +
      '\nVariáveis API_KEY_TEST_COMPANY e API_KEY_TEST_DEPARTMENT são opcionais.\n' +
      'Defaults: COMPANY=inbot, DEPARTMENT=testes.\n' +
      '\nConsulte docs/api-key-tests.md para pré-requisitos e riscos.\n'
  )
  process.exit(0)
}

// ── Executa Playwright ────────────────────────────────────────────────────────
const { execSync } = require('child_process')

const company = process.env.API_KEY_TEST_COMPANY || 'inbot'
const department = process.env.API_KEY_TEST_DEPARTMENT || 'testes'

console.log('\n[run-api-keys] Iniciando suíte @api-key...')
console.log(`[run-api-keys] Empresa     : ${company}`)
console.log(`[run-api-keys] Departamento: ${department}`)
console.log('[run-api-keys] AVISO: trace, screenshot e video desabilitados nesta suíte.')
console.log('[run-api-keys] Toda chave criada será revogada ao final do teste.\n')

execSync('npx playwright test tests/api-keys --grep "@api-key" --reporter=line', {
  stdio: 'inherit',
  env: {
    ...process.env,
    BASE_URL: process.env.BASE_URL || 'https://intable.inbot.com.br',
    API_KEY_TEST_COMPANY: company,
    API_KEY_TEST_DEPARTMENT: department,
  },
})
