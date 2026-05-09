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
    this.colCriadaEm     = page.getByRole('columnheader', { name: 'Criada em' })
    this.colAlteradaEm   = page.getByRole('columnheader', { name: 'Alterada em' })
    this.colAcoes        = page.getByRole('columnheader', { name: 'Ações' })

    // Primeiro botão "Abrir" — usado apenas para checar existência de tabelas
    this.primeiroAbrirButton = page.getByRole('button', { name: 'Abrir' }).first()

    // Empty state da lista — célula colspan exibida quando a busca não retorna resultados
    // Texto confirmado via error-context em 2026-05-09: "Nenhuma tabela encontrada"
    this.emptyStateLista = page.getByRole('cell', { name: 'Nenhuma tabela encontrada' })

    // Paginação
    this.paginacaoInfo = page.getByText(/Mostrando \d+-\d+ de \d+ itens/)
    this.btnProximo    = page.getByRole('button', { name: 'Prox' })
    this.btnAnterior   = page.getByRole('button', { name: 'Ant' })

    // Combobox de tamanho de página — único combobox da tela de lista
    // Confirmado via DOM snapshot: role=combobox, texto interno "10 itens"
    // TODO: solicitar ao time de front-end aria-label="Itens por página" para eliminar
    // dependência de posição e melhorar acessibilidade.
    this.tamanhoPaginaCombobox = page.getByRole('combobox')
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

  /**
   * Clica no primeiro botão "Abrir" e aguarda a tela de detalhe carregar.
   */
  async abrirPrimeiraTabela() {
    await this.primeiroAbrirButton.click()
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Volta para a lista de tabelas via histórico do browser.
   */
  async voltarParaLista() {
    await this.page.goBack()
    await this.waitForTabelasLoaded()
  }

  /**
   * Preenche o campo "Buscar tabelas..." e aguarda o resultado estabilizar.
   */
  async buscarTabela(termo) {
    await this.buscarTabelasInput.fill(termo)
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Limpa o campo "Buscar tabelas..." e aguarda a lista ser restaurada.
   */
  async limparBuscaTabela() {
    await this.buscarTabelasInput.fill('')
    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Retorna o nome da primeira tabela visível na lista (primeira célula da primeira
   * linha de dados). Retorna '' durante skeleton loading (células sem conteúdo).
   * Pré-condição: primeiroAbrirButton já foi confirmado visível antes de chamar.
   */
  async getNomePrimeiraLinha() {
    const texto = await this.page
      .getByRole('row').nth(1)
      .getByRole('cell').first()
      .textContent()
      .catch(() => '')
    return (texto ?? '').trim()
  }

  /**
   * Clica no cabeçalho "Nome da Tabela" para acionar ordenação.
   * TODO: solicitar ao time de front-end aria-sort no columnheader para
   * permitir validação de estado de ordenação via ARIA (asc/desc).
   */
  async ordenarPorNomeTabela() {
    await this.colNomeTabela.click()
  }

  /**
   * Abre o combobox de tamanho de página e seleciona a opção indicada.
   * Retorna false (sem click) se a opção não aparecer — permite test.skip no caller.
   * @param {string} label  Texto exato da opção, ex: "25 itens"
   * @returns {Promise<boolean>} true se selecionou, false se opção não disponível
   */
  async alterarTamanhoPagina(label) {
    await this.tamanhoPaginaCombobox.click()
    const opcao = this.page.getByRole('option', { name: label, exact: true })
    const disponivel = await opcao.isVisible({ timeout: 3_000 }).catch(() => false)
    if (!disponivel) {
      await this.page.keyboard.press('Escape')
      return false
    }
    await opcao.click()
    return true
  }
}

module.exports = { TabelasPage }
