const { test, expect } = require('playwright/test')
const { TabelasPage } = require('../../pages/intable/tabelas.page')

/**
 * InTable — Filtros @readonly
 *
 * Valida o painel de filtros da tela de tabelas.
 * Não realiza nenhuma escrita: sem criação, edição, exclusão, importação ou exportação.
 */

test.describe('InTable — Filtros @readonly', () => {
  test('deve filtrar tabelas pelo departamento testes @readonly', async ({ page }) => {
    const tabelasPage = new TabelasPage(page)

    // HOME → empresa inbot → /tables
    await tabelasPage.goto()
    await tabelasPage.selecionarEmpresa('inbot')

    // Expandir Filtros → selecionar departamento testes → Buscar
    await tabelasPage.filtrarPorDepartamento('testes')

    // Tabela deve continuar carregada após o filtro
    await expect(tabelasPage.tabelaGrid).toBeVisible()
    await expect(tabelasPage.colDepartamento).toBeVisible()

    // Resultado: pelo menos uma linha com departamento "testes" OU empty state.
    // Aguarda até 10s pelas linhas (React pode renderizar após networkidle).
    const primeiraLinhaTestes = page.getByRole('cell', { name: 'testes', exact: true }).first()
    try {
      await expect(primeiraLinhaTestes).toBeVisible({ timeout: 10_000 })
    } catch {
      const emptyState = page.getByText(/nenhuma tabela|no tables|sem resultado/i)
      await expect(emptyState).toBeVisible({ timeout: 5_000 })
    }
  })
})
