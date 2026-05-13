// @ts-check
const { test, expect } = require('playwright/test')
const { TabelasPage } = require('../../pages/intable/tabelas.page')

/**
 * InTable — Home: estrutura e navegação @readonly
 *
 * Valida a integridade das seções da home e a navegação via "Ver todas".
 * Não realiza nenhuma escrita: sem criação, edição, exclusão, importação ou exportação.
 * Não clica em empresa, não acessa /tables diretamente.
 */

test.describe('InTable — Home: estrutura e navegação @readonly', () => {
  test('deve exibir seções principais da home @readonly', async ({ page }) => {
    const tabelasPage = new TabelasPage(page)
    await tabelasPage.goto()

    // Heading de seleção de empresa — ancora que confirma home autenticada
    await expect(tabelasPage.selectEmpresaHeading).toBeVisible()

    // Seção de tabelas recentes (visível sem precisar selecionar empresa)
    await expect(
      page.getByRole('heading', { name: 'Suas bases de dados', level: 2 })
    ).toBeVisible()

    // Seção de estatísticas do ecossistema — confirma que o bloco de métricas existe
    await expect(
      page.getByRole('heading', { name: 'Pulsos do ecossistema', level: 3 })
    ).toBeVisible()

    // Controles globais do header
    await expect(page.getByRole('button', { name: 'Notificações' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Ver todas' })).toBeVisible()
  })

  test('deve navegar para a lista de tabelas ao clicar em "Ver todas" @readonly', async ({ page }) => {
    const tabelasPage = new TabelasPage(page)
    await tabelasPage.goto()

    await page.getByRole('button', { name: 'Ver todas' }).click()
    await page.waitForLoadState('networkidle')

    // buscarTabelasInput é exclusivo da tela /tables — confirma navegação correta
    await expect(tabelasPage.buscarTabelasInput).toBeVisible({ timeout: 10_000 })
  })
})
