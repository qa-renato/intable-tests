const { test, expect } = require('playwright/test')
const { TabelasPage } = require('../../pages/intable/tabelas.page')

/**
 * InTable — Empty State @readonly
 *
 * Valida que a busca sem resultado exibe empty state explícito.
 * Não realiza nenhuma escrita: sem criação, edição, exclusão, importação ou exportação.
 * Não clica em "Abrir".
 */

test.describe('InTable — Empty State @readonly', () => {
  test('deve exibir estado vazio ao buscar tabela inexistente e recuperar lista ao limpar busca @readonly', async ({ page }) => {
    const tabelasPage = new TabelasPage(page)

    // HOME → empresa inbot → /tables
    await tabelasPage.goto()
    await tabelasPage.selecionarEmpresa('inbot')

    // Confirma que a lista inicial carregou com pelo menos uma tabela
    await expect(tabelasPage.primeiroAbrirButton).toBeVisible({ timeout: 10_000 })

    // ─── Fase 1: busca sem resultado ─────────────────────────────────────────
    // Termo único e improvável — nunca corresponderá a uma tabela real
    const termo = `zzzz-sem-resultado-qa-${Date.now()}`
    await tabelasPage.buscarTabela(termo)

    // Texto confirmado via error-context: célula colspan "Nenhuma tabela encontrada"
    await expect(tabelasPage.emptyStateLista).toBeVisible({ timeout: 10_000 })

    // Botão "Abrir" não deve existir (sem linhas para abrir)
    await expect(tabelasPage.primeiroAbrirButton).not.toBeVisible()

    // ─── Fase 2: limpa busca e recupera lista ────────────────────────────────
    await tabelasPage.limparBuscaTabela()

    // Lista deve voltar — aguarda skeleton loading completar via primeiroAbrirButton
    await expect(tabelasPage.primeiroAbrirButton).toBeVisible({ timeout: 10_000 })
    await expect(tabelasPage.tabelaGrid).toBeVisible()
  })
})
