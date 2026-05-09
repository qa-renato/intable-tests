const { test, expect } = require('playwright/test')
const { TabelasPage } = require('../../pages/intable/tabelas.page')

/**
 * InTable — Visualização @readonly
 *
 * Abre a primeira tabela da lista em modo visualização e valida a estrutura.
 * Não realiza nenhuma escrita: sem adição de linha, edição de célula,
 * criação de coluna, exclusão, importação ou exportação.
 * Não clica em menus de ação nem em botões destrutivos.
 */

test.describe('InTable — Visualização @readonly', () => {
  test('deve abrir primeira tabela e exibir estrutura em modo visualização @readonly', async ({ page }) => {
    const tabelasPage = new TabelasPage(page)

    // HOME → empresa inbot → /tables
    await tabelasPage.goto()
    await tabelasPage.selecionarEmpresa('inbot')

    // Aguarda dados carregados — Abrir só aparece com células preenchidas
    await expect(tabelasPage.primeiroAbrirButton).toBeVisible({ timeout: 10_000 })

    // ─── Fase 1: abre a primeira tabela ──────────────────────────────────────
    await tabelasPage.abrirPrimeiraTabela()

    // Confirma que saiu da lista: buscarTabelasInput é exclusivo de /tables
    await expect(tabelasPage.buscarTabelasInput).not.toBeVisible({ timeout: 10_000 })

    // Tela de detalhe deve ter algum grid de dados OU empty state explícito
    try {
      await expect(tabelasPage.tabelaGrid).toBeVisible({ timeout: 10_000 })
    } catch {
      const emptyState = page.getByText(/nenhuma|sem colunas|sem linhas|empty|no data/i)
      await expect(emptyState).toBeVisible({ timeout: 5_000 })
    }

    // ─── Fase 2: volta para a lista ──────────────────────────────────────────
    await tabelasPage.voltarParaLista()

    // /tables carregada novamente
    await expect(tabelasPage.buscarTabelasInput).toBeVisible({ timeout: 15_000 })
    await expect(tabelasPage.tabelaGrid).toBeVisible()
  })
})
