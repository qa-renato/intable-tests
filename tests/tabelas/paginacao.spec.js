const { test, expect } = require('playwright/test')
const { TabelasPage } = require('../../pages/intable/tabelas.page')

/**
 * InTable — Paginação @readonly
 *
 * Valida a navegação entre páginas da lista de tabelas.
 * Não realiza nenhuma escrita: sem criação, edição, exclusão, importação ou exportação.
 * Não clica em "Abrir".
 *
 * Se o total de tabelas couber em uma única página, o teste é ignorado (test.skip)
 * com motivo explícito — não é uma falha, é uma condição de ambiente.
 */

test.describe('InTable — Paginação @readonly', () => {
  test('deve navegar para próxima página e voltar para página anterior @readonly', async ({ page }) => {
    const tabelasPage = new TabelasPage(page)

    // HOME → empresa inbot → /tables
    await tabelasPage.goto()
    await tabelasPage.selecionarEmpresa('inbot')

    // Aguarda o texto de paginação — só aparece com dados reais carregados
    await expect(tabelasPage.paginacaoInfo).toBeVisible({ timeout: 10_000 })

    const textoInicial = await tabelasPage.getTextoPaginacao()

    // Verifica se há mais de uma página antes de tentar navegar
    const proximoDisabled = await tabelasPage.btnProximo.isDisabled().catch(() => true)
    test.skip(proximoDisabled, 'Paginação possui apenas uma página — botão Prox está desabilitado; aumente o volume de dados para exercitar essa cobertura')

    // ─── Fase 1: avança para a próxima página ────────────────────────────────
    await tabelasPage.irParaProximaPagina()

    // Espera o texto de paginação mudar (sem sleep fixo)
    await expect.poll(
      () => tabelasPage.getTextoPaginacao(),
      { timeout: 10_000 }
    ).not.toBe(textoInicial)

    // Tabela deve continuar visível na segunda página
    await expect(tabelasPage.tabelaGrid).toBeVisible()

    // Botão "Ant" deve estar habilitado (há uma página anterior)
    await expect(tabelasPage.btnAnterior).toBeEnabled()

    // ─── Fase 2: volta para a página anterior ────────────────────────────────
    await tabelasPage.voltarPaginaAnterior()

    // Espera o texto voltar ao estado inicial
    await expect.poll(
      () => tabelasPage.getTextoPaginacao(),
      { timeout: 10_000 }
    ).toBe(textoInicial)

    // Tabela deve continuar visível ao retornar
    await expect(tabelasPage.tabelaGrid).toBeVisible()
  })
})
