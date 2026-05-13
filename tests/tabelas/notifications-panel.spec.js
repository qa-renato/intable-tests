// @ts-check
const { test, expect } = require('playwright/test')
const { TabelasPage } = require('../../pages/intable/tabelas.page')

/**
 * InTable — Painel de downloads (Notificações) @readonly
 *
 * Valida a abertura e o fechamento do painel de downloads em modo observacional.
 * Não clica em "Marcar todas como lidas", "Baixar" ou qualquer item de download.
 * Não gera download. Não produz nenhum efeito externo.
 *
 * Achado do diagnóstico (2026-05-13):
 * O popover abre como filho do banner, adjacente ao botão "Notificações".
 * A region "Notifications (F8)" permanece hidden — é um container auxiliar de estado,
 * não o painel visível. O heading "Downloads" (H3) âncora o painel real.
 */

test.describe('InTable — Painel de downloads (Notificações) @readonly', () => {
  test('deve abrir o painel de downloads e validar estrutura @readonly', async ({ page }) => {
    const tabelasPage = new TabelasPage(page)

    // HOME → empresa inbot → /tables
    await tabelasPage.goto()
    await tabelasPage.selecionarEmpresa('inbot')
    await expect(tabelasPage.buscarTabelasInput).toBeVisible()

    // Botão de abertura do painel
    const notifButton = page.getByRole('button', { name: 'Notificações' })
    await expect(notifButton).toBeVisible()
    await notifButton.click()

    // Heading "Downloads" (H3) confirma abertura do popover —
    // é o único H3 com esse texto e só aparece quando o painel está aberto
    const headingDownloads = page.getByRole('heading', { name: 'Downloads', level: 3 })
    await expect(headingDownloads).toBeVisible({ timeout: 5_000 })

    // Botão de limpeza em massa — verifica presença apenas, não clica
    await expect(
      page.getByRole('button', { name: 'Marcar todas como lidas' })
    ).toBeVisible()

    // Fecha clicando novamente no botão "Notificações" (toggle)
    // Escape não fecha este popover — comportamento confirmado em testes (2026-05-13)
    await notifButton.click()

    // Confirma fechamento: heading "Downloads" não mais visível
    await expect(headingDownloads).not.toBeVisible({ timeout: 5_000 })
  })
})
