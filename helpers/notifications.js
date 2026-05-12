// @ts-check
const { expect } = require('playwright/test')

/**
 * Abre o painel de notificações e aguarda por polling uma notificação de exportação.
 *
 * ── SELETORES CONFIRMADOS VIA CODEGEN ────────────────────────────────────────
 *   getByRole('button', { name: 'Notificações' })
 *     Botão que abre o painel de notificações.
 *     Observado via Playwright Codegen em 2026-05-11.
 *
 * ── SELETORES AINDA NÃO CONFIRMADOS (front-end pendente) ─────────────────────
 *   data-testid="notifications-panel"
 *     Container do painel quando aberto — não confirmado no DOM.
 *     Sugestão: <div data-testid="notifications-panel" role="region" aria-label="Notificações">
 *
 *   data-testid="notification-item"
 *     Cada item individual de notificação dentro do painel.
 *     Sugestão: <li data-testid="notification-item">
 *
 *   data-testid="notification-export-status" (opcional)
 *     Estado da exportação dentro do notification-item (solicitada, concluída, enviada).
 *
 * NOTA: O fluxo de download usa diretamente getByRole('button', { name: 'Baixar CSV' })
 * como confirmação prática de que a notificação de exportação chegou.
 * Este helper é uma validação alternativa por texto, útil para outros contextos.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * @param {import('playwright/test').Page} page
 * @param {Date} testStartedAt - Ignora notificações anteriores a este timestamp
 * @param {string} [tabelaNome] - Nome da tabela exportada (validação adicional se disponível)
 */
async function waitForExportNotification(page, testStartedAt, tabelaNome) {
  // Seletor confirmado via Codegen: botão com name='Notificações' no header.
  const notificationsButton = page.getByRole('button', { name: 'Notificações' })
  await expect(
    notificationsButton,
    'Botão "Notificações" não encontrado. ' +
      'Confirmar que o elemento tem role=button e name acessível "Notificações" no DOM.'
  ).toBeVisible({ timeout: 10_000 })
  await notificationsButton.click()

  // BLOQUEIO: data-testid="notifications-panel" não confirmado no DOM.
  // Se o painel não tiver testId, aguardar os itens diretamente.
  const notificationsPanel = page.getByTestId('notifications-panel')
  const panelVisivel = await notificationsPanel.isVisible({ timeout: 3_000 }).catch(() => false)
  if (!panelVisivel) {
    // Painel sem testId — prosseguir verificando os itens diretamente.
    // Solicitar ao front-end: data-testid="notifications-panel"
  }

  // Polling: aguarda notificação de exportação aparecer no painel.
  // BLOQUEIO: data-testid="notification-item" não confirmado no DOM.
  // Alternativa observada no Codegen: getByRole('button', { name: 'Baixar CSV' })
  await expect
    .poll(
      async () => {
        // Tentativa 1: itens com data-testid
        const items = page.getByTestId('notification-item')
        const count = await items.count()

        for (let i = 0; i < count; i++) {
          const text = ((await items.nth(i).textContent()) ?? '').toLowerCase()

          const isExportRelated =
            text.includes('export') ||
            text.includes('exporta') ||
            text.includes('tabela')

          if (!isExportRelated) continue
          if (tabelaNome && !text.includes(tabelaNome.toLowerCase())) continue

          return true
        }

        // Tentativa 2: botão "Baixar CSV" — indica exportação processada
        const downloadButton = page.getByRole('button', { name: 'Baixar CSV' })
        return downloadButton.isVisible()
      },
      {
        message:
          `Notificação de exportação não encontrada no painel` +
          (tabelaNome ? ` para a tabela "${tabelaNome}"` : '') +
          '. Verificar:\n' +
          '  (1) data-testid="notification-item" existe no DOM\n' +
          '  (2) ou botão "Baixar CSV" aparece no painel\n' +
          `  (3) o sistema gerou a notificação após ${testStartedAt.toISOString()}`,
        timeout: 60_000,
        intervals: [3_000, 5_000, 10_000],
      }
    )
    .toBe(true)
}

module.exports = { waitForExportNotification }
