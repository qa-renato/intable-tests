const { test, expect } = require('playwright/test')
const { TabelasPage } = require('../../pages/intable/tabelas.page')

/**
 * InTable — Smoke @readonly
 *
 * Valida o fluxo mínimo de acesso ao InTable:
 *   goto('/') → HOME com seleção de empresa
 *   → clicar em "inbot" → /tables carrega lista de tabelas
 *   → painel Filtros disponível
 *
 * Não realiza nenhuma escrita (sem criação, edição, exclusão, importação ou exportação).
 * Fluxos destrutivos ficam para specs separados com ENABLE_DESTRUCTIVE=true.
 */

test.describe('InTable — Smoke @readonly', () => {
  test('deve carregar tela de tabelas após selecionar empresa inbot @readonly', async ({ page }) => {
    const tabelasPage = new TabelasPage(page)

    // HOME → clicar empresa inbot → /tables
    await tabelasPage.goto()
    await tabelasPage.selecionarEmpresa('inbot')

    // Elementos obrigatórios da tela de tabelas
    await expect(tabelasPage.buscarTabelasInput).toBeVisible()
    await expect(tabelasPage.atualizarTabelasButton).toBeVisible()

    // Tabela e cabeçalhos
    await expect(tabelasPage.tabelaGrid).toBeVisible()
    await expect(tabelasPage.colNomeTabela).toBeVisible()
    await expect(tabelasPage.colEmpresa).toBeVisible()
    await expect(tabelasPage.colDepartamento).toBeVisible()
    await expect(tabelasPage.colLinhas).toBeVisible()
    await expect(tabelasPage.colAcoes).toBeVisible()

    // Deve haver pelo menos uma tabela (botão "Abrir")
    await expect(tabelasPage.primeiroAbrirButton).toBeVisible()

    // Paginação visível
    await expect(tabelasPage.paginacaoInfo).toBeVisible()
  })

  test('deve exibir painel de filtros ao expandir Filtros @readonly', async ({ page }) => {
    const tabelasPage = new TabelasPage(page)

    await tabelasPage.goto()
    await tabelasPage.selecionarEmpresa('inbot')

    // Painel Filtros começa colapsado — toggle deve ser visível
    await expect(tabelasPage.filtrosToggle).toBeVisible()

    // Expandir e verificar que os controles de filtro aparecem
    await tabelasPage.expandirFiltros()
    await expect(tabelasPage.departamentoInput).toBeVisible()
    await expect(tabelasPage.buscarButton).toBeVisible()
  })
})
