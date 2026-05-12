// @ts-check
const { test, expect } = require('playwright/test')
const path = require('path')
const fs = require('fs')
const { TabelasPage } = require('../../pages/intable/tabelas.page')
const { waitForExportEmail } = require('../../helpers/emailClient')

/**
 * InTable — Exportação de tabela @export @integration @notification @download
 *
 * Suíte isolada — NÃO faz parte da suíte @readonly e não interfere com ela.
 *
 * Fluxo validado:
 *   /tables → empresa inbot → abre tabela → menu de ações →
 *   "Exportar (CSV)" → notificações → "Baixar CSV" → download → validação
 *
 * Flags de controle:
 *   ENABLE_EXPORT_TESTS=true    habilita a suíte (obrigatório)
 *   EMAIL_VALIDATION_ENABLED=true  habilita validação de e-mail via Microsoft Graph (opcional)
 *
 * Variáveis obrigatórias:
 *   EXPORT_RECIPIENT  destinatário esperado do e-mail de exportação
 *
 * Consulte docs/export-tests.md para comandos completos e pré-requisitos.
 *
 * ── SELETORES CONFIRMADOS VIA CODEGEN (2026-05-11) ───────────────────────────
 *   getByRole('menuitem', { name: 'Exportar (CSV)' })  — item do menu de exportação
 *   getByRole('button', { name: 'Notificações' })      — botão de notificações no header
 *   getByRole('button', { name: 'Baixar CSV' })        — botão de download no painel
 *
 * ── BLOQUEIO DE TESTABILIDADE (front-end pendente) ────────────────────────────
 *   Botão que abre o menu de ações da tabela NÃO tem seletor estável.
 *   O Playwright Codegen gerou o seletor frágil:
 *     page.getByRole('button').filter({ hasText: /^$/ }).nth(4)
 *   Esse seletor NÃO deve ser usado — quebra com qualquer mudança de layout.
 *
 *   Solicitar ao front-end UMA das seguintes alternativas:
 *     data-testid="table-actions-menu-button"   ← preferida
 *     aria-label="Ações da tabela"
 *     aria-label="Abrir menu de ações"
 *
 *   O teste falhará neste passo até que o front-end adicione um seletor estável.
 *
 * ── DOWNLOADS ─────────────────────────────────────────────────────────────────
 *   Salvos em downloads/export/ — protegida pelo .gitignore.
 *   Não commitar o conteúdo dos arquivos baixados.
 *   Não imprimir dados do CSV no log ou relatório.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const ENABLE_EXPORT = process.env.ENABLE_EXPORT_TESTS === 'true'
const EMAIL_VALIDATION = process.env.EMAIL_VALIDATION_ENABLED === 'true'
const EXPORT_RECIPIENT = process.env.EXPORT_RECIPIENT

test.describe('InTable — Exportação @export @integration @notification @download', () => {
  test(
    'deve exportar CSV, validar notificação, baixar e validar arquivo @export @integration @notification @download',
    async ({ page }) => {
      // ── Guard: pula se a flag de exportação não estiver ativa ────────────
      test.skip(
        !ENABLE_EXPORT,
        'Passe ENABLE_EXPORT_TESTS=true para habilitar esta suíte de exportação'
      )

      if (!EXPORT_RECIPIENT) {
        throw new Error(
          'EXPORT_RECIPIENT não definido.\n' +
            'Execute com: EXPORT_RECIPIENT="email@dominio.com" npm run test:export'
        )
      }

      // ── 1-2: Autenticação e seleção de empresa ────────────────────────────
      // Autenticação reutilizada via storageState — sem login manual neste teste.
      const tabelasPage = new TabelasPage(page)
      await tabelasPage.goto()
      await tabelasPage.selecionarEmpresa('inbot')

      // ── 3: Aguarda /tables carregar com dados reais ───────────────────────
      await expect(tabelasPage.primeiroAbrirButton).toBeVisible({ timeout: 10_000 })

      // ── 4: Captura nome da tabela e abre em modo visualização ─────────────
      const tabelaNome = await tabelasPage.getNomePrimeiraLinha()
      await tabelasPage.abrirPrimeiraTabela()
      await expect(tabelasPage.buscarTabelasInput).not.toBeVisible({ timeout: 10_000 })

      // Marca horário de início APÓS navegação, ANTES de acionar exportação.
      const testStartedAt = new Date()

      // ── 5: Abre menu de ações da tabela ──────────────────────────────────
      // BLOQUEIO: botão sem seletor estável no DOM atual.
      // Codegen gerou: getByRole('button').filter({ hasText: /^$/ }).nth(4)
      // Esse seletor NÃO é usado aqui — é frágil e posicional.
      //
      // Solicitar ao front-end:
      //   <button data-testid="table-actions-menu-button" aria-label="Ações da tabela">
      const actionsMenuButton = page.getByTestId('table-actions-menu-button')
      await expect(
        actionsMenuButton,
        'BLOQUEIO: botão do menu de ações não encontrado. ' +
          'Adicionar data-testid="table-actions-menu-button" (ou aria-label="Ações da tabela") ' +
          'ao botão que abre o menu de ações/exportação da tabela.'
      ).toBeVisible({ timeout: 10_000 })
      await actionsMenuButton.click()

      // ── 6: Seleciona "Exportar (CSV)" no menu ────────────────────────────
      // Seletor confirmado via Codegen: menuitem com name acessível 'Exportar (CSV)'.
      await page.getByRole('menuitem', { name: 'Exportar (CSV)' }).click()

      // ── 7: Abre painel de notificações ────────────────────────────────────
      // Seletor confirmado via Codegen: button com name='Notificações'.
      await page.getByRole('button', { name: 'Notificações' }).click()

      // ── 8: Aguarda botão "Baixar CSV" aparecer no painel ──────────────────
      // O processo de exportação é assíncrono — pode demorar alguns segundos.
      // Playwright auto-espera (polling interno) com o timeout configurado.
      const downloadButton = page.getByRole('button', { name: 'Baixar CSV' })
      await expect(
        downloadButton,
        'Botão "Baixar CSV" não apareceu no painel de notificações após 60s. ' +
          'Verificar: (1) exportação foi solicitada com sucesso, ' +
          '(2) o processamento concluiu, ' +
          '(3) o botão tem role=button e name acessível "Baixar CSV" no DOM.'
      ).toBeVisible({ timeout: 60_000 })

      // ── 9: Captura o download ANTES do clique ─────────────────────────────
      const downloadPromise = page.waitForEvent('download')
      await downloadButton.click()
      const download = await downloadPromise

      // ── 10: Valida metadados do arquivo baixado ────────────────────────────
      const suggestedFilename = download.suggestedFilename()
      expect(
        suggestedFilename,
        'Arquivo baixado deve ter extensão .csv'
      ).toMatch(/\.csv$/i)

      const downloadDir = path.join('downloads', 'export')
      fs.mkdirSync(downloadDir, { recursive: true })
      const downloadPath = path.join(downloadDir, suggestedFilename)
      await download.saveAs(downloadPath)

      const stats = fs.statSync(downloadPath)
      expect(stats.size, 'Arquivo CSV não deve estar vazio').toBeGreaterThan(0)

      // ── 11: Valida cabeçalho do CSV sem expor dados ───────────────────────
      // Lê apenas a primeira linha — não imprime conteúdo completo no log.
      const primeiraLinha = fs.readFileSync(downloadPath, 'utf8').split('\n')[0] ?? ''
      expect(
        primeiraLinha.length,
        'CSV deve ter cabeçalho na primeira linha'
      ).toBeGreaterThan(0)

      // Registra apenas metadados seguros no relatório — sem dados do CSV.
      test.info().annotations.push({
        type: 'info',
        description:
          `Tabela: ${tabelaNome} | ` +
          `Arquivo: ${suggestedFilename} | ` +
          `Tamanho: ${stats.size} bytes | ` +
          `Timestamp: ${testStartedAt.toISOString()}`,
      })

      // ── 12: Validação de e-mail (condicional) ─────────────────────────────
      // Só executa se EMAIL_VALIDATION_ENABLED=true e variáveis MS_* configuradas.
      if (EMAIL_VALIDATION) {
        const emailResult = await waitForExportEmail(EXPORT_RECIPIENT, testStartedAt)

        expect(
          emailResult.receivedAt.getTime(),
          'E-mail deve ter sido recebido após o acionamento da exportação'
        ).toBeGreaterThan(testStartedAt.getTime())

        expect(emailResult.subject, 'E-mail deve ter assunto preenchido').toBeTruthy()
      } else {
        test.info().annotations.push({
          type: 'info',
          description:
            'Validação de e-mail não executada nesta rodada. ' +
            'Fluxo validado até download via notificação. ' +
            'Para ativar: EMAIL_VALIDATION_ENABLED=true com variáveis MS_* configuradas.',
        })
      }
    }
  )
})
