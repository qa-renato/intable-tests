// @ts-check
const { test, expect } = require('playwright/test')
const { TabelasPage } = require('../../pages/intable/tabelas.page')

/**
 * InTable — Ordenação por colunas adicionais @readonly
 *
 * Valida que clicar nos cabeçalhos de colunas adicionais (Empresa, Departamento,
 * Criada em, Alterada em) não quebra o grid nem remove os dados da lista.
 *
 * Não realiza nenhuma escrita. Não clica em "Abrir".
 *
 * Limitação: a direção de ordenação (asc/desc) não é validada porque os
 * columnheaders não expõem aria-sort. Solicitar ao time de front-end
 * via Card 5 em docs/frontend-testability-tickets.md.
 */

test.describe('InTable — Ordenação por colunas adicionais @readonly', () => {
  test('deve manter grid íntegro ao clicar em cabeçalhos de colunas adicionais @readonly', async ({ page }) => {
    const tabelasPage = new TabelasPage(page)

    // HOME → empresa inbot → /tables
    await tabelasPage.goto()
    await tabelasPage.selecionarEmpresa('inbot')

    // Aguarda dados reais — primeiroAbrirButton só aparece após skeleton loading
    await expect(tabelasPage.primeiroAbrirButton).toBeVisible({ timeout: 10_000 })

    const colunasAdicionais = [
      { col: tabelasPage.colEmpresa,      nome: 'Empresa' },
      { col: tabelasPage.colDepartamento, nome: 'Departamento' },
      { col: tabelasPage.colCriadaEm,     nome: 'Criada em' },
      { col: tabelasPage.colAlteradaEm,   nome: 'Alterada em' },
    ]

    for (const { col } of colunasAdicionais) {
      await col.click()
      await page.waitForLoadState('networkidle')

      // Grid deve permanecer visível após ordenação
      await expect(tabelasPage.tabelaGrid).toBeVisible()

      // Pelo menos uma linha de dados deve permanecer (botão "Abrir" presente)
      // Timeout de 10s cobre re-render pós-ordenação com skeleton loading
      await expect(tabelasPage.primeiroAbrirButton).toBeVisible({ timeout: 10_000 })

      // Direção de ordenação não validada — aguarda aria-sort (Card 5)
    }
  })
})
