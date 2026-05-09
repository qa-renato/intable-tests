/**
 * TabelasPage — InTable (https://intable.inbot.com.br/)
 *
 * Seletores confirmados via DOM snapshot (error-context) em 2026-05-09.
 *
 * Fluxo real observado:
 *   goto('/') → HOME page com seleção de empresa
 *   click(empresaInbot) → navega para /tables
 *   /tables → tabela carregada com buscarTabelasInput + atualizarTabelasButton
 *   Painel "Filtros" (colapsado por padrão) → contém departamentoInput e buscarButton
 */
class TabelasPage {
  constructor(page) {
    this.page = page

    // ─── HOME page (/) — seleção de empresa ───────────────────────────────────

    // Título da seção de seleção de empresa na home page
    this.selectEmpresaHeading = page.getByRole('heading', { name: 'Selecione uma empresa para visualizar', level: 3 })

    // Campo de busca de empresa na home page
    this.buscarEmpresaInput = page.getByRole('textbox', { name: 'Buscar empresa...' })

    // Card da empresa "inbot" — confirmado via codegen: nth(1) é o card clicável
    // (nth(0) é o div interno com somente o texto; nth(1) é o card com cursor=pointer)
    // TODO: solicitar ao time de front-end data-testid="empresa-inbot" ou aria-label
    // para eliminar a dependência de posição (nth).
    this.empresaInbot = page.locator('div').filter({ hasText: /^inbot$/ }).nth(1)

    // ─── /tables — lista de tabelas ───────────────────────────────────────────

    // Painel de filtros (toggle colapsável)
    this.filtrosToggle = page.getByRole('heading', { name: 'Filtros', level: 3 })

    // Controles dentro do painel Filtros (visíveis somente quando expandido)
    this.departamentoInput = page.getByRole('textbox', { name: 'Selecione os departamentos...' })
    this.buscarButton = page.getByRole('button', { name: 'Buscar' })

    // Barra de ações acima da tabela
    this.atualizarTabelasButton = page.getByRole('button', { name: 'Atualizar tabelas' })
    this.buscarTabelasInput = page.getByRole('textbox', { name: 'Buscar tabelas...' })

    // Tabela principal e cabeçalhos de coluna confirmados pelo DOM
    this.tabelaGrid = page.getByRole('table')
    this.colNomeTabela   = page.getByRole('columnheader', { name: 'Nome da Tabela' })
    this.colEmpresa      = page.getByRole('columnheader', { name: 'Empresa' })
    this.colDepartamento = page.getByRole('columnheader', { name: 'Departamento' })
    this.colLinhas       = page.getByRole('columnheader', { name: 'Linhas' })
    this.colAcoes        = page.getByRole('columnheader', { name: 'Ações' })

    // Primeiro botão "Abrir" — usado apenas para checar existência de tabelas
    this.primeiroAbrirButton = page.getByRole('button', { name: 'Abrir' }).first()

    // Paginação
    this.paginacaoInfo = page.getByText(/Mostrando \d+-\d+ de \d+ itens/)
    this.btnProximo    = page.getByRole('button', { name: 'Prox' })
    this.btnAnterior   = page.getByRole('button', { name: 'Ant' })
  }

  /**
   * Navega para a home page. Com sessão ativa, carrega a tela de seleção de empresa.
   */
  async goto() {
    await this.page.goto('/', { waitUntil: 'networkidle' })
  }

  /**
   * Clica na empresa e aguarda a tela de tabelas (/tables) carregar.
   * A navegação para /tables ocorre após o clique na empresa.
   */
  async selecionarEmpresa(nomeEmpresa = 'inbot') {
    if (nomeEmpresa === 'inbot') {
      await this.empresaInbot.click()
    } else {
      // Para outras empresas: busca pelo nome no campo "Buscar empresa..." e clica no card
      await this.buscarEmpresaInput.fill(nomeEmpresa)
      await this.page.locator('div').filter({ hasText: new RegExp(`^${nomeEmpresa}$`) }).nth(1).click()
    }
    await this.waitForTabelasLoaded()
  }

  /**
   * Aguarda a tela de tabelas estar pronta.
   * Usa buscarTabelasInput como âncora — visível somente em /tables.
   */
  async waitForTabelasLoaded(timeout = 20_000) {
    await this.buscarTabelasInput.waitFor({ state: 'visible', timeout })
  }

  /**
   * Expande o painel de filtros (empresa/departamento).
   * O painel começa colapsado — clicar no heading "Filtros" o abre.
   */
  async expandirFiltros() {
    await this.filtrosToggle.click()
    await this.departamentoInput.waitFor({ state: 'visible', timeout: 5_000 })
  }

  /**
   * Seleciona um departamento no painel Filtros (requer expandirFiltros() antes).
   * Tenta getByRole('option') primeiro; cai em div.filter se não disponível.
   *
   * TODO: confirmar role do item de dropdown executando codegen com filtros expandidos.
   */
  async selecionarDepartamento(nomeDept) {
    await this.departamentoInput.click()
    const byOption = this.page.getByRole('option', { name: nomeDept, exact: true })
    const usesOption = await byOption.isVisible({ timeout: 2_000 }).catch(() => false)
    if (usesOption) {
      await byOption.click()
    } else {
      await this.page.locator('div').filter({ hasText: new RegExp(`^${nomeDept}$`) }).click()
    }
  }

  /**
   * Filtra a lista de tabelas por departamento e aciona Buscar.
   */
  async filtrarPorDepartamento(nomeDept) {
    await this.expandirFiltros()
    await this.selecionarDepartamento(nomeDept)
    await this.buscarButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Retorna o texto atual do rodapé de paginação, ex: "Mostrando 1-10 de 25 itens".
   */
  async getTextoPaginacao() {
    return (await this.paginacaoInfo.textContent())?.trim()
  }

  /**
   * Clica em "Prox" para avançar de página.
   */
  async irParaProximaPagina() {
    await this.btnProximo.click()
  }

  /**
   * Clica em "Ant" para voltar de página.
   */
  async voltarPaginaAnterior() {
    await this.btnAnterior.click()
  }
}

module.exports = { TabelasPage }
