const { test: setup } = require('playwright/test')
const path = require('path')
const fs = require('fs')

const AUTH_DIR = path.join(__dirname, '.auth')

/**
 * Autenticação via Azure/Inbot SSO (fluxo federado).
 *
 * Alvo: https://intable.inbot.com.br/
 *
 * Fluxo esperado:
 *   intable.inbot.com.br → Keycloak (kc.inbot.com.br) → Azure/Inbot link
 *   → Microsoft (login.microsoftonline.com) → redirect de volta para intable.inbot.com.br
 *
 * Seletores Microsoft confirmados em 2026-05-07 (mesmo IdP da InBot):
 *   email    → getByRole('textbox', { name: 'Insira o seu email, telefone' })
 *   next     → getByRole('button', { name: 'Avançar' })
 *   password → getByRole('textbox', { name: /Insira a senha/i })
 *   signin   → getByRole('button', { name: 'Entrar' })
 *   keepme   → getByText('Não mostrar isso novamente') + getByRole('button', { name: 'Sim' })
 *
 * Credenciais via variáveis de ambiente:
 *   USER_EMAIL    — e-mail da conta Azure/Inbot
 *   USER_PASSWORD — senha (nunca hardcoded, nunca em log)
 *
 * TODO: após autenticação, verificar se intable.inbot.com.br tem seleção de
 * empresa/departamento (inbot / testes). Executar codegen com --load-storage
 * para mapear o fluxo real antes de criar page objects.
 */
async function microsoftLogin(page, email, password) {
  await page.getByRole('textbox', { name: 'Insira o seu email, telefone' }).fill(email)
  await page.getByRole('button', { name: 'Avançar' }).click()
  await page.getByRole('textbox', { name: /Insira a senha/i }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()

  const simBtn = page.getByRole('button', { name: 'Sim' })
  await Promise.race([
    page.waitForURL(url => url.toString().includes('intable.inbot.com.br'), { timeout: 30_000 }),
    simBtn.waitFor({ state: 'visible', timeout: 30_000 }),
  ]).catch(() => {})

  if (await simBtn.isVisible().catch(() => false)) {
    await page.getByText('Não mostrar isso novamente').click().catch(() => {})
    await simBtn.click()
    await page.waitForURL(url => url.toString().includes('intable.inbot.com.br'), { timeout: 30_000 })
  }
}

setup('autenticação global via Azure/Inbot SSO → intable.inbot.com.br', async ({ page }) => {
  setup.setTimeout(120_000)

  fs.mkdirSync(AUTH_DIR, { recursive: true })

  /* Reutiliza storageState existente somente se o servidor ainda aceita os cookies.
     Carrega os cookies no contexto, navega para / e verifica a URL resultante.
     Se redirecionar para kc.inbot.com.br, a sessão expirou — prossegue com login.
     Força novo login: delete fixtures/.auth/user.json antes de rodar. */
  const authFile = path.join(AUTH_DIR, 'user.json')
  if (fs.existsSync(authFile)) {
    try {
      const cached = JSON.parse(fs.readFileSync(authFile, 'utf8'))
      if (cached.cookies && cached.cookies.length > 0) {
        await page.context().addCookies(cached.cookies)
        await page.goto('/', { waitUntil: 'networkidle' })
        if (page.url().includes('intable.inbot.com.br')) {
          console.log(`✓ Auth reutilizada (${cached.cookies.length} cookies em cache)`)
          return
        }
        await page.context().clearCookies()
        console.log('⚠ Cookies em cache expirados — executando novo login')
      }
    } catch (_) { /* arquivo corrompido — continua para login */ }
  }

  if (!process.env.USER_EMAIL || !process.env.USER_PASSWORD) {
    throw new Error(
      'Credenciais ausentes e sem storageState válido em fixtures/.auth/user.json.\n' +
      'Exporte USER_EMAIL e USER_PASSWORD antes de rodar o setup.\n' +
      'Exemplo:\n' +
      '  export USER_EMAIL="renato.paulino@inbot.com.br"\n' +
      '  read -s USER_PASSWORD && export USER_PASSWORD',
    )
  }

  /* networkidle garante que redirect JavaScript da SPA para Keycloak termina
     antes de lermos a URL — sem isso goto() pode retornar antes do redirect */
  await page.goto('/', { waitUntil: 'networkidle' })

  const startUrl = page.url()

  if (startUrl.includes('kc.inbot.com.br')) {
    await page.getByRole('link', { name: 'Azure/Inbot' }).click()
    await page.waitForURL(/login\.microsoftonline\.com/, { timeout: 20_000 })
    await microsoftLogin(page, process.env.USER_EMAIL, process.env.USER_PASSWORD)
  } else if (startUrl.includes('microsoftonline.com')) {
    await microsoftLogin(page, process.env.USER_EMAIL, process.env.USER_PASSWORD)
  }
  /* else: sessão já ativa, já está em intable.inbot.com.br */

  const finalUrl = page.url()
  if (!finalUrl.includes('intable.inbot.com.br')) {
    throw new Error(`Setup falhou: URL inesperada após SSO — ${finalUrl}`)
  }

  const state = await page.context().storageState()
  fs.writeFileSync(path.join(AUTH_DIR, 'user.json'), JSON.stringify(state))
  console.log(`✓ Auth salva em fixtures/.auth/user.json (${state.cookies.length} cookies)`)
})
