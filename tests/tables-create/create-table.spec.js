// @ts-check
const { test, expect } = require('playwright/test')
const { TabelasPage } = require('../../pages/intable/tabelas.page')

/**
 * InTable — Criação e deleção de tabela @crud @table-create @destructive @integration
 *
 * Suíte isolada — NÃO faz parte de @readonly e NÃO é executada por padrão.
 *
 * Fluxo validado:
 *   / → empresa TABLE_CREATE_COMPANY → /tables →
 *   "Nova Tabela" → nome único (prefixo qa_tabela_aut_) + departamento →
 *   confirmar → validar na lista → deletar → confirmar → validar remoção
 *
 * Flags obrigatórias (ambas necessárias):
 *   ENABLE_DESTRUCTIVE=true          Proteção geral de suítes destrutivas
 *   ENABLE_TABLE_CREATE_TESTS=true   Proteção específica desta suíte
 *
 * Variáveis configuráveis (com defaults seguros):
 *   TABLE_CREATE_COMPANY     Empresa onde criar a tabela   (default: "inbot")
 *   TABLE_CREATE_DEPARTMENT  Departamento da tabela        (default: "testes")
 *
 * SEGURANÇA:
 *   - Nome usa prefixo fixo "qa_tabela_aut_" + timestamp — nunca sobrescreve tabela real.
 *   - Cleanup só atua em tabelas com este prefixo — proteção contra deleção acidental.
 *   - Toda tabela criada é deletada no finally, mesmo em caso de falha intermediária.
 *
 * ── BLOQUEIOS DE TESTABILIDADE (front-end pendente — Card 10) ───────────────
 *   data-testid="create-table-button"
 *   data-testid="table-name-input"
 *   data-testid="table-department-select"
 *   data-testid="table-department-option-{nome}"
 *   data-testid="confirm-create-table"
 *   data-testid="delete-table-button"    (no row da tabela)
 *   data-testid="confirm-delete-table"
 * ────────────────────────────────────────────────────────────────────────────
 */

const ENABLE_DESTRUCTIVE = process.env.ENABLE_DESTRUCTIVE === 'true'
const ENABLE_TABLE_CREATE_TESTS = process.env.ENABLE_TABLE_CREATE_TESTS === 'true'
const TEST_COMPANY = process.env.TABLE_CREATE_COMPANY || 'inbot'
const TEST_DEPARTMENT = process.env.TABLE_CREATE_DEPARTMENT || 'testes'

const TABLE_NAME_PREFIX = 'qa_tabela_aut_'

test.describe('InTable — Criação de Tabela @crud @table-create @destructive @integration', () => {

  test(
    'deve criar, listar e deletar tabela com prefixo de segurança @crud @table-create @destructive @integration',
    async ({ page }) => {
      test.skip(
        !ENABLE_DESTRUCTIVE || !ENABLE_TABLE_CREATE_TESTS,
        'Passe ENABLE_DESTRUCTIVE=true e ENABLE_TABLE_CREATE_TESTS=true para habilitar esta suíte. ' +
          'Consulte docs/table-create-tests.md para pré-requisitos e riscos.'
      )

      const tableName = `${TABLE_NAME_PREFIX}${Date.now()}`
      let tableCreated = false
      let tableDeleted = false
      let tablesPageUrl = ''

      try {
        // ── 1-2: Autenticação e seleção de empresa ────────────────────────
        // Sessão reutilizada via storageState — sem login manual neste teste.
        const tabelasPage = new TabelasPage(page)
        await tabelasPage.goto()
        await tabelasPage.selecionarEmpresa(TEST_COMPANY)
        tablesPageUrl = page.url()

        // ── 3: Abrir formulário de criação ────────────────────────────────
        // BLOQUEIO: botão de criação sem seletor estável confirmado.
        // Solicitar ao front-end: data-testid="create-table-button"
        // Documentado em docs/frontend-testability-tickets.md — Card 10.
        const createButton = page.getByTestId('create-table-button')
        await expect(
          createButton,
          'BLOQUEIO: botão de criação de tabela não encontrado. ' +
            'Adicionar data-testid="create-table-button" ao botão "Nova Tabela" (ou equivalente). ' +
            'Consulte docs/frontend-testability-tickets.md — Card 10.'
        ).toBeVisible({ timeout: 10_000 })
        await createButton.click()

        // ── 4: Preencher nome da tabela ───────────────────────────────────
        // BLOQUEIO: campo de nome sem seletor estável confirmado.
        // Solicitar ao front-end: data-testid="table-name-input"
        const nameInput = page.getByTestId('table-name-input')
        await expect(
          nameInput,
          'BLOQUEIO: campo de nome da tabela não encontrado. ' +
            'Adicionar data-testid="table-name-input" ao input de nome no formulário. ' +
            'Consulte docs/frontend-testability-tickets.md — Card 10.'
        ).toBeVisible({ timeout: 10_000 })
        await nameInput.fill(tableName)

        // ── 5: Selecionar departamento ────────────────────────────────────
        // Tenta data-testid preferido; cai em role=combobox/option se não disponível.
        // Prossegue com anotação se o campo de departamento não existir no form.
        const deptSelect = page.getByTestId('table-department-select')
        const hasDeptSelect = await deptSelect.isVisible({ timeout: 3_000 }).catch(() => false)
        if (hasDeptSelect) {
          await deptSelect.click()
          const deptOption = page.getByTestId(`table-department-option-${TEST_DEPARTMENT}`)
          if (await deptOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await deptOption.click()
          } else {
            const byRole = page.getByRole('option', { name: TEST_DEPARTMENT, exact: true })
            if (await byRole.isVisible({ timeout: 2_000 }).catch(() => false)) {
              await byRole.click()
            } else {
              test.info().annotations.push({
                type: 'info',
                description:
                  `Opção de departamento "${TEST_DEPARTMENT}" não localizada. ` +
                  'Confirmar seletor real no DOM e atualizar o spec.',
              })
            }
          }
        } else {
          const byCombo = page.getByRole('combobox', { name: /departamento/i })
          if (await byCombo.isVisible({ timeout: 2_000 }).catch(() => false)) {
            await byCombo.click()
            const byOption = page.getByRole('option', { name: TEST_DEPARTMENT, exact: true })
            if (await byOption.isVisible({ timeout: 2_000 }).catch(() => false)) {
              await byOption.click()
            }
          } else {
            test.info().annotations.push({
              type: 'info',
              description:
                'Campo de departamento não localizado no formulário de criação. ' +
                'Confirmar se o campo existe e qual seletor usar.',
            })
          }
        }

        // ── 6: Confirmar criação ──────────────────────────────────────────
        // BLOQUEIO: botão de confirmação sem seletor estável confirmado.
        // Solicitar ao front-end: data-testid="confirm-create-table"
        const confirmCreate = page.getByTestId('confirm-create-table')
        const hasConfirm = await confirmCreate.isVisible({ timeout: 3_000 }).catch(() => false)
        if (hasConfirm) {
          await confirmCreate.click()
        } else {
          const byText = page.getByRole('button', { name: /criar|salvar|confirmar/i })
          if (await byText.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await byText.click()
          } else {
            throw new Error(
              'BLOQUEIO: botão de confirmação de criação de tabela não encontrado. ' +
                'Adicionar data-testid="confirm-create-table" ao botão que submete o formulário. ' +
                'Consulte docs/frontend-testability-tickets.md — Card 10.'
            )
          }
        }
        await page.waitForLoadState('networkidle')

        // ── 7: Validar que a tabela aparece na lista ──────────────────────
        await expect(
          page.getByText(tableName),
          `Tabela "${tableName}" deve aparecer na lista após criação`
        ).toBeVisible({ timeout: 15_000 })

        tableCreated = true

        test.info().annotations.push({
          type: 'info',
          description:
            `Tabela criada | Nome: ${tableName} | ` +
            `Empresa: ${TEST_COMPANY} | Departamento: ${TEST_DEPARTMENT} | ` +
            `Timestamp: ${new Date().toISOString()}`,
        })

        // ── 8: Localizar e clicar no botão de deleção da linha ────────────
        // REGRA DE SEGURANÇA: cleanup escopo à linha com nome exato.
        // Nunca deletar tabelas que não tenham o prefixo "qa_tabela_aut_".
        const tableRow = page.getByRole('row').filter({ hasText: tableName })

        // BLOQUEIO: botão de deleção sem seletor estável confirmado.
        // Solicitar ao front-end: data-testid="delete-table-button" no row da tabela.
        const deleteButton = tableRow.getByTestId('delete-table-button')
        const hasDeleteBtn = await deleteButton.isVisible({ timeout: 5_000 }).catch(() => false)
        if (hasDeleteBtn) {
          await deleteButton.click()
        } else {
          const byLabel = tableRow.getByRole('button', { name: /excluir|deletar|remover/i })
          if (await byLabel.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await byLabel.click()
          } else {
            throw new Error(
              'BLOQUEIO: botão de deleção de tabela não encontrado na linha. ' +
                'Adicionar data-testid="delete-table-button" ao botão de exclusão no row da tabela. ' +
                'Consulte docs/frontend-testability-tickets.md — Card 10.'
            )
          }
        }

        // ── 9: Confirmar deleção ──────────────────────────────────────────
        // BLOQUEIO: botão de confirmação de deleção sem seletor estável confirmado.
        // Solicitar ao front-end: data-testid="confirm-delete-table"
        const confirmDelete = page.getByTestId('confirm-delete-table')
        const hasConfirmDelete = await confirmDelete.isVisible({ timeout: 5_000 }).catch(() => false)
        if (hasConfirmDelete) {
          await confirmDelete.click()
        } else {
          const byText = page.getByRole('button', { name: /sim|confirmar|excluir/i })
          if (await byText.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await byText.click()
          } else {
            throw new Error(
              'BLOQUEIO: botão de confirmação de deleção não encontrado. ' +
                'Adicionar data-testid="confirm-delete-table" ao botão que confirma a exclusão. ' +
                'Consulte docs/frontend-testability-tickets.md — Card 10.'
            )
          }
        }
        await page.waitForLoadState('networkidle')

        tableDeleted = true

        // ── 10: Validar que a tabela não aparece mais ─────────────────────
        await expect(
          page.getByText(tableName),
          `Tabela "${tableName}" não deve aparecer na lista após deleção`
        ).not.toBeVisible({ timeout: 10_000 })

        test.info().annotations.push({
          type: 'info',
          description: `Tabela deletada com sucesso | Nome: ${tableName}`,
        })
      } finally {
        // ── Cleanup: deletar tabela se o teste falhou antes da deleção ────
        if (tableCreated && !tableDeleted) {
          try {
            if (tablesPageUrl) {
              await page.goto(tablesPageUrl, { waitUntil: 'networkidle' })
            }
            // REGRA DE SEGURANÇA: só atua em tabelas com o prefixo de teste.
            if (tableName.startsWith(TABLE_NAME_PREFIX)) {
              const rowCleanup = page.getByRole('row').filter({ hasText: tableName })
              const delBtnCleanup = rowCleanup.getByTestId('delete-table-button')
              if (await delBtnCleanup.isVisible({ timeout: 5_000 }).catch(() => false)) {
                await delBtnCleanup.click()
              } else {
                const byLabel = rowCleanup.getByRole('button', { name: /excluir|deletar|remover/i })
                if (await byLabel.isVisible({ timeout: 3_000 }).catch(() => false)) {
                  await byLabel.click()
                }
              }
              const confirmCleanup = page.getByTestId('confirm-delete-table')
              if (await confirmCleanup.isVisible({ timeout: 5_000 }).catch(() => false)) {
                await confirmCleanup.click()
              } else {
                const byText = page.getByRole('button', { name: /sim|confirmar|excluir/i })
                if (await byText.isVisible({ timeout: 3_000 }).catch(() => false)) {
                  await byText.click()
                }
              }
            }
          } catch {
            // Não relançar — preservar o erro original do teste.
          } finally {
            if (!tableDeleted) {
              test.info().annotations.push({
                type: 'warning',
                description:
                  `CLEANUP PENDENTE: a tabela "${tableName}" pode não ter sido deletada. ` +
                  'Verificar manualmente na lista de tabelas e excluir se necessário. ' +
                  `Identificador: prefixo "${TABLE_NAME_PREFIX}" no nome.`,
              })
            }
          }
        }
      }
    }
  )
})
