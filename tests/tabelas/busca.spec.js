const { test, expect } = require('playwright/test')
const { TabelasPage } = require('../../pages/intable/tabelas.page')

/**
 * InTable — Busca @readonly
 *
 * Valida o campo "Buscar tabelas..." na tela de tabelas.
 * Não realiza nenhuma escrita: sem criação, edição, exclusão, importação ou exportação.
 * Não clica em "Abrir".
 */

test.describe('InTable — Busca @readonly', () => {
  test('deve buscar tabela por nome e limpar o campo @readonly', async ({ page }) => {
    const tabelasPage = new TabelasPage(page)

    // HOME → empresa inbot → /tables
    await tabelasPage.goto()
    await tabelasPage.selecionarEmpresa('inbot')

    // Aguarda o botão "Abrir" — só aparece quando as células têm dados reais.
    // Evita ler durante skeleton loading (células vazias presentes no DOM antes dos dados).
    await expect(tabelasPage.primeiroAbrirButton).toBeVisible({ timeout: 10_000 })

    // Captura o nome da primeira tabela visível para usar como termo de busca
    const primeiraLinhaDados = page.getByRole('row').nth(1)
    const primeiraCelulaNome = primeiraLinhaDados.getByRole('cell').first()
    const nomeCompleto = ((await primeiraCelulaNome.textContent()) || '').trim()
    const termo = nomeCompleto.substring(0, 4)
    expect(termo.length).toBeGreaterThan(0)

    // ─── Fase 1: busca ────────────────────────────────────────────────────────
    await tabelasPage.buscarTabelasInput.fill(termo)

    // Tabela deve permanecer visível após digitar o termo
    await expect(tabelasPage.tabelaGrid).toBeVisible()

    // Pelo menos uma linha de resultado OU mensagem de empty state
    try {
      await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 10_000 })
    } catch {
      const emptyState = page.getByText(/nenhuma tabela|no tables|sem resultado/i)
      await expect(emptyState).toBeVisible({ timeout: 5_000 })
    }

    // ─── Fase 2: limpar ───────────────────────────────────────────────────────
    await tabelasPage.buscarTabelasInput.fill('')

    // Lista deve voltar a renderizar com pelo menos uma linha
    await expect(tabelasPage.tabelaGrid).toBeVisible()
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 10_000 })
  })
})
