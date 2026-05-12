// @ts-check
const { test, expect } = require('playwright/test')
const { TabelasPage } = require('../../pages/intable/tabelas.page')

/**
 * InTable — Gerenciamento de API Keys @api-key @integration @destructive
 *
 * Suíte isolada — NÃO faz parte de @readonly e NÃO é executada por padrão.
 *
 * Fluxo validado:
 *   / → empresa API_KEY_TEST_COMPANY → menu de API Keys →
 *   "Gerenciar Chaves de API" → "Nova API Key" → nome único →
 *   departamento (se exigido) → permissões mínimas → "Gerar Chave" →
 *   validar criação → "Voltar para listagem" → identificar chave →
 *   revogar → confirmar → validar remoção
 *
 * Flag obrigatória:
 *   ENABLE_API_KEY_TESTS=true
 *
 * Variáveis configuráveis (com defaults seguros):
 *   API_KEY_TEST_COMPANY     Empresa onde gerenciar chaves (default: "inbot")
 *   API_KEY_TEST_DEPARTMENT  Departamento para a chave    (default: "testes")
 *   API_KEY_TEST_TABLE       Tabela de massa de teste      (default: "")
 *                            Usada no nome da chave para rastreabilidade e,
 *                            se o form exigir seleção de tabela, como critério.
 *
 * SEGURANÇA — trace, screenshot e video desabilitados:
 *   Qualquer um desses artefatos pode capturar o valor da chave exibido na UI.
 *   Toda chave criada é revogada no finally, mesmo em caso de falha do teste.
 *   O valor completo da chave NUNCA é lido, logado, salvo ou anotado.
 *
 * ── SELETORES AVALIADOS VIA CODEGEN (a confirmar no DOM real) ──────────────
 *   getByRole('menuitem', { name: 'Gerenciar Chaves de API' })
 *   getByRole('button', { name: 'Nova API Key' })
 *   getByRole('button', { name: 'Gerar Chave' })
 *   getByRole('button', { name: 'Copiar para área de transferência' })
 *   getByRole('button', { name: 'Voltar para listagem' })
 *   getByRole('button', { name: 'Revogar acesso desta chave' })
 *   getByRole('button', { name: 'Sim, Excluir' })
 *
 * ── BLOQUEIO DE TESTABILIDADE (front-end pendente) ──────────────────────────
 *   Botão que abre o menu de API Keys: sem seletor estável confirmado.
 *   Solicitar ao front-end: data-testid="api-keys-menu-button"
 *   Documentado em docs/frontend-testability-tickets.md — Card 9.
 *
 * ── SELETORES NÃO CONFIRMADOS (form de criação — a confirmar via DOM) ───────
 *   Label do campo de nome da chave (getByLabel(/nome da chave|nome/i))
 *   data-testid="api-key-department-select"
 *   data-testid="api-key-department-option-testes"
 *   getByRole('checkbox', { name: 'Ler Dados' })
 *   getByRole('checkbox', { name: 'Ver Estrutura' })
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ENABLE_API_KEY_TESTS = process.env.ENABLE_API_KEY_TESTS === 'true'
const TEST_COMPANY = process.env.API_KEY_TEST_COMPANY || 'inbot'
const TEST_DEPARTMENT = process.env.API_KEY_TEST_DEPARTMENT || 'testes'
const TEST_TABLE = process.env.API_KEY_TEST_TABLE || ''

// Desabilita artefatos no nível do arquivo — trace/screenshot/video não podem
// ser desabilitados dentro de test.describe (forçam novo worker nesta versão do Playwright).
// Qualquer um desses artefatos poderia capturar o valor da chave exibido na UI.
test.use({ trace: 'off', screenshot: 'off', video: 'off' })

test.describe('InTable — Gerenciamento de API Keys @api-key @integration @destructive', () => {

  test(
    'deve gerar, listar e revogar API Key com permissões mínimas @api-key @integration @destructive',
    async ({ page }) => {
      test.skip(
        !ENABLE_API_KEY_TESTS,
        'Passe ENABLE_API_KEY_TESTS=true para habilitar esta suíte de API Keys'
      )

      // Nome único: inclui tabela de referência (se informada) para rastreabilidade.
      // Nunca contém o valor da chave — é apenas um identificador de cleanup.
      const tableSlug = TEST_TABLE ? `-${TEST_TABLE.toLowerCase().replace(/\s+/g, '-')}` : ''
      const keyName = `qa-api-key${tableSlug}-${Date.now()}`
      let keyCreated = false
      let keyRevoked = false
      let apiKeysPageUrl = ''
      let hasNameField = false

      try {
        // ── 1-2: Autenticação e seleção de empresa ────────────────────────
        // Sessão reutilizada via storageState — sem login manual neste teste.
        const tabelasPage = new TabelasPage(page)
        await tabelasPage.goto()
        await tabelasPage.selecionarEmpresa(TEST_COMPANY)

        // ── 3: Abrir menu de API Keys ─────────────────────────────────────
        // BLOQUEIO: botão que abre o menu de API Keys sem data-testid estável.
        // Codegen gerou seletor posicional — não usar.
        // Solicitar ao front-end: data-testid="api-keys-menu-button"
        // Documentado em docs/frontend-testability-tickets.md — Card 9.
        const apiKeysMenuButton = page.getByTestId('api-keys-menu-button')
        await expect(
          apiKeysMenuButton,
          'BLOQUEIO: botão que abre o menu de API Keys não encontrado. ' +
            'Adicionar data-testid="api-keys-menu-button" ao botão de acesso ao menu. ' +
            'Consulte docs/frontend-testability-tickets.md — Card 9.'
        ).toBeVisible({ timeout: 10_000 })
        await apiKeysMenuButton.click()

        // ── 4: Clicar em "Gerenciar Chaves de API" ────────────────────────
        // Seletor avaliado como estável via Codegen. Confirmar no DOM real.
        await page.getByRole('menuitem', { name: 'Gerenciar Chaves de API' }).click()
        await page.waitForLoadState('networkidle')
        apiKeysPageUrl = page.url()

        // ── 5: Iniciar criação de nova chave ──────────────────────────────
        await expect(
          page.getByRole('button', { name: 'Nova API Key' }),
          'Botão "Nova API Key" deve estar visível na tela de gerenciamento'
        ).toBeVisible({ timeout: 10_000 })
        await page.getByRole('button', { name: 'Nova API Key' }).click()

        // ── 6: Preencher nome da chave ────────────────────────────────────
        // Seletor por label — estável se o label estiver associado ao input.
        // Se o campo não existir, o teste prossegue mas sem garantia de cleanup único.
        const keyNameInput = page.getByLabel(/nome da chave|key name|nome/i)
        hasNameField = await keyNameInput.isVisible({ timeout: 3_000 }).catch(() => false)
        if (hasNameField) {
          await keyNameInput.fill(keyName)
        } else {
          test.info().annotations.push({
            type: 'info',
            description:
              'Campo de nome da chave não localizado via getByLabel(/nome da chave|key name|nome/i). ' +
              'Confirmar o label real no formulário e atualizar o seletor. ' +
              'Sem nome único, o cleanup automático pode não identificar a chave correta.',
          })
        }

        // ── 7: Selecionar departamento (condicional) ──────────────────────
        // Tenta data-testid preferido; cai em role=option se não disponível.
        // Prossegue silenciosamente se o form não exigir departamento.
        const deptSelect = page.getByTestId('api-key-department-select')
        const hasDeptSelect = await deptSelect.isVisible({ timeout: 3_000 }).catch(() => false)
        if (hasDeptSelect) {
          await deptSelect.click()
          const deptOption = page.getByTestId(`api-key-department-option-${TEST_DEPARTMENT}`)
          if (await deptOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
            await deptOption.click()
          } else {
            const byRole = page.getByRole('option', { name: TEST_DEPARTMENT, exact: true })
            if (await byRole.isVisible({ timeout: 2_000 }).catch(() => false)) {
              await byRole.click()
            }
          }
        }

        // ── 8: Selecionar permissões mínimas ──────────────────────────────
        // Marca apenas leitura: "Ler Dados" e "Ver Estrutura".
        // Se os checkboxes não existirem com esses nomes exatos, prossegue sem marcar.
        // NÃO selecionar: Criar/Editar/Excluir Registros, Editar Estrutura,
        //                 Gerenciar Tabela, Importar Arquivos.
        for (const permLabel of ['Ler Dados', 'Ver Estrutura']) {
          const checkbox = page.getByRole('checkbox', { name: permLabel })
          const visible = await checkbox.isVisible({ timeout: 2_000 }).catch(() => false)
          if (visible && !(await checkbox.isChecked().catch(() => false))) {
            await checkbox.check()
          }
        }

        // ── 9: Gerar chave ────────────────────────────────────────────────
        await page.getByRole('button', { name: 'Gerar Chave' }).click()

        // ── 10: Validar criação ───────────────────────────────────────────
        // O botão "Copiar para área de transferência" confirma que a chave foi gerada.
        // O valor completo da chave NÃO é lido, não é logado, não é salvo.
        const copyButton = page.getByRole('button', { name: 'Copiar para área de transferência' })
        await expect(
          copyButton,
          'Botão "Copiar para área de transferência" deve aparecer após gerar a chave. ' +
            'Verificar: (1) formulário submeteu com sucesso, ' +
            '(2) o botão tem role=button e name acessível correto no DOM.'
        ).toBeVisible({ timeout: 15_000 })

        keyCreated = true

        // Anotar apenas metadados seguros — nunca o valor da chave.
        test.info().annotations.push({
          type: 'info',
          description:
            `API Key criada | Nome: ${keyName} | ` +
            `Empresa: ${TEST_COMPANY} | Departamento: ${TEST_DEPARTMENT} | ` +
            (TEST_TABLE ? `Tabela: ${TEST_TABLE} | ` : '') +
            `Timestamp: ${new Date().toISOString()}`,
        })

        // ── 11: Voltar para listagem ──────────────────────────────────────
        await page.getByRole('button', { name: 'Voltar para listagem' }).click()
        await page.waitForLoadState('networkidle')

        // ── 12: Validar que a chave aparece na listagem ───────────────────
        if (hasNameField) {
          await expect(
            page.getByText(keyName),
            `Chave "${keyName}" deve aparecer na listagem após criação`
          ).toBeVisible({ timeout: 10_000 })
        }

        // ── 13-15: Revogar apenas a chave criada por este teste ───────────
        // Escopa o botão de revogar à linha que contém o nome gerado pelo teste.
        // NUNCA revoga chaves de outras linhas.
        if (!hasNameField) {
          throw new Error(
            'Não é possível identificar com segurança a chave criada sem campo de nome. ' +
              `Chave "${keyName}" pode precisar de revogação manual. ` +
              'Confirmar o label real do campo de nome no formulário.'
          )
        }

        const keyRow = page.getByRole('row').filter({ hasText: keyName })
        const revokeButton = keyRow.getByRole('button', { name: 'Revogar acesso desta chave' })
        await expect(
          revokeButton,
          `Botão "Revogar acesso desta chave" deve estar visível na linha da chave "${keyName}"`
        ).toBeVisible({ timeout: 10_000 })
        await revokeButton.click()

        // ── 16: Confirmar exclusão ────────────────────────────────────────
        const confirmButton = page.getByRole('button', { name: 'Sim, Excluir' })
        await expect(
          confirmButton,
          'Diálogo de confirmação deve aparecer após clicar em Revogar'
        ).toBeVisible({ timeout: 10_000 })
        await confirmButton.click()
        await page.waitForLoadState('networkidle')

        keyRevoked = true

        // ── 17: Confirmar que a chave não aparece mais ────────────────────
        await expect(
          page.getByText(keyName),
          `Chave "${keyName}" não deve aparecer na listagem após revogação`
        ).not.toBeVisible({ timeout: 10_000 })

        test.info().annotations.push({
          type: 'info',
          description: `API Key revogada com sucesso | Nome: ${keyName}`,
        })
      } finally {
        // ── Cleanup: revogar chave se o teste falhou antes da revogação ───
        if (keyCreated && !keyRevoked) {
          try {
            if (apiKeysPageUrl) {
              await page.goto(apiKeysPageUrl, { waitUntil: 'networkidle' })
            }
            if (hasNameField) {
              const rowCleanup = page.getByRole('row').filter({ hasText: keyName })
              const revokeCleanup = rowCleanup.getByRole('button', { name: 'Revogar acesso desta chave' })
              if (await revokeCleanup.isVisible({ timeout: 5_000 }).catch(() => false)) {
                await revokeCleanup.click()
                const confirmCleanup = page.getByRole('button', { name: 'Sim, Excluir' })
                if (await confirmCleanup.isVisible({ timeout: 5_000 }).catch(() => false)) {
                  await confirmCleanup.click()
                }
              }
            }
          } catch {
            // Não relançar — preservar o erro original do teste.
          } finally {
            if (!keyRevoked) {
              test.info().annotations.push({
                type: 'warning',
                description:
                  `CLEANUP PENDENTE: a API Key "${keyName}" pode não ter sido revogada. ` +
                  'Verificar manualmente na tela de Gerenciar Chaves de API e revogar se necessário.',
              })
            }
          }
        }
      }
    }
  )
})
