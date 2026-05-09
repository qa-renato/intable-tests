const { test, expect } = require('playwright/test')
const { TabelasPage } = require('../../pages/intable/tabelas.page')

/**
 * InTable — Tamanho de Página @readonly
 *
 * Valida a combobox de itens por página na lista de tabelas.
 * Não realiza nenhuma escrita: sem criação, edição, exclusão, importação ou exportação.
 * Não clica em "Abrir".
 */

test.describe('InTable — Tamanho de Página @readonly', () => {
  test('deve alterar quantidade de itens por página e recarregar lista @readonly', async ({ page }) => {
    const tabelasPage = new TabelasPage(page)

    // HOME → empresa inbot → /tables
    await tabelasPage.goto()
    await tabelasPage.selecionarEmpresa('inbot')

    // Aguarda dados reais (Abrir só aparece após skeleton loading completar)
    await expect(tabelasPage.primeiroAbrirButton).toBeVisible({ timeout: 10_000 })

    // Captura paginação inicial (ex: "Mostrando 1-10 de X itens")
    const textoInicial = await tabelasPage.getTextoPaginacao()

    // ─── Fase 1: muda para 25 itens ──────────────────────────────────────────
    const selecionou25 = await tabelasPage.alterarTamanhoPagina('25 itens')
    test.skip(!selecionou25, 'Opção "25 itens" não disponível na combobox desse ambiente')

    // Aguarda o texto de paginação mudar (sem sleep fixo)
    await expect.poll(
      () => tabelasPage.getTextoPaginacao(),
      { timeout: 10_000 }
    ).not.toBe(textoInicial)

    // Tabela deve continuar visível e com o padrão de paginação correto
    await expect(tabelasPage.tabelaGrid).toBeVisible()
    await expect(tabelasPage.paginacaoInfo).toBeVisible()

    // ─── Fase 2: volta para 10 itens ─────────────────────────────────────────
    const selecionou10 = await tabelasPage.alterarTamanhoPagina('10 itens')
    test.skip(!selecionou10, 'Opção "10 itens" não disponível ao tentar restaurar')

    // Aguarda o texto de paginação voltar ao estado inicial
    await expect.poll(
      () => tabelasPage.getTextoPaginacao(),
      { timeout: 10_000 }
    ).toBe(textoInicial)

    // Tabela deve continuar visível após restaurar tamanho de página
    await expect(tabelasPage.tabelaGrid).toBeVisible()
  })
})
