const { test: base } = require('playwright/test')

/**
 * Extensões de fixtures para o projeto InTable.
 * Page objects são adicionados aqui à medida que os seletores reais
 * forem descobertos via codegen.
 *
 * TODO: adicionar TabelaPage, FiltrosPage etc. após codegen confirmar seletores.
 */

const test = base.extend({})

const expect = base.expect

module.exports = { test, expect }
