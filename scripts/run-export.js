#!/usr/bin/env node
// Wrapper para a suíte de exportação.
// Playwright NÃO é invocado se ENABLE_EXPORT_TESTS !== "true".

const ENABLE_EXPORT = process.env.ENABLE_EXPORT_TESTS === 'true'
const EMAIL_VALIDATION = process.env.EMAIL_VALIDATION_ENABLED === 'true'

// ── Guard principal ───────────────────────────────────────────────────────────
if (!ENABLE_EXPORT) {
  console.log(
    '\nSuíte @export desativada — Playwright não será iniciado.\n' +
      '\nPara executar sem validação de e-mail:\n' +
      '  ENABLE_EXPORT_TESTS=true \\\n' +
      '  EXPORT_RECIPIENT="email@dominio.com" \\\n' +
      '  npm run test:export\n' +
      '\nPara executar com validação de e-mail (Microsoft Graph):\n' +
      '  ENABLE_EXPORT_TESTS=true \\\n' +
      '  EMAIL_VALIDATION_ENABLED=true \\\n' +
      '  EXPORT_RECIPIENT="email@dominio.com" \\\n' +
      '  MS_MAILBOX_USER="email@dominio.com" \\\n' +
      '  MS_TENANT_ID="..." \\\n' +
      '  MS_CLIENT_ID="..." \\\n' +
      '  MS_CLIENT_SECRET="..." \\\n' +
      '  npm run test:export\n'
  )
  process.exit(0)
}

// ── Validações de variáveis obrigatórias ──────────────────────────────────────
const errors = []

if (!process.env.EXPORT_RECIPIENT) {
  errors.push('EXPORT_RECIPIENT não definido (destinatário do e-mail de exportação)')
}

if (EMAIL_VALIDATION) {
  const msVars = ['MS_TENANT_ID', 'MS_CLIENT_ID', 'MS_CLIENT_SECRET', 'MS_MAILBOX_USER']
  const missing = msVars.filter(k => !process.env[k])
  if (missing.length) {
    errors.push(
      `EMAIL_VALIDATION_ENABLED=true mas variáveis Microsoft Graph ausentes: ${missing.join(', ')}\n` +
        '  Consulte docs/export-tests.md para configurar o App Registration no Microsoft Entra.'
    )
  }
}

if (errors.length) {
  console.error('\n[run-export] Variáveis obrigatórias ausentes:\n')
  errors.forEach(e => console.error(`  ✗ ${e}`))
  console.error('')
  process.exit(1)
}

// ── Executa Playwright ────────────────────────────────────────────────────────
const { execSync } = require('child_process')

console.log('\n[run-export] Iniciando suíte @export...')
if (EMAIL_VALIDATION) {
  console.log('[run-export] Validação de e-mail via Microsoft Graph: ATIVA')
} else {
  console.log('[run-export] Validação de e-mail: desativada (EMAIL_VALIDATION_ENABLED não definido)')
}
console.log('')

execSync('npx playwright test tests/export --grep "@export" --reporter=line', {
  stdio: 'inherit',
  env: {
    ...process.env,
    BASE_URL: process.env.BASE_URL || 'https://intable.inbot.com.br',
  },
})
