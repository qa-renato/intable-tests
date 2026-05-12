// @ts-check

/**
 * Cliente de e-mail para validação de exportações do InTable.
 *
 * Implementação: Microsoft Graph API (app-only, sem login visual no e-mail).
 * Conta: Outlook/Microsoft 365 — https://outlook.cloud.microsoft/mail/inbox/
 *
 * Instalação necessária:
 *   npm install @microsoft/microsoft-graph-client @azure/identity --save-dev
 *
 * ── VARIÁVEIS DE AMBIENTE OBRIGATÓRIAS ────────────────────────────────────────
 * Nunca commitar — protegidas pelo .gitignore via .env:
 *
 *   MS_TENANT_ID       Directory (tenant) ID do Microsoft Entra / Azure AD
 *   MS_CLIENT_ID       Application (client) ID do App Registration
 *   MS_CLIENT_SECRET   Client secret gerado no App Registration
 *   MS_MAILBOX_USER    UPN da caixa de correio consultada
 *                      (ex: renato.paulino@inbot.com.br)
 *
 * ── VARIÁVEL OPCIONAL ─────────────────────────────────────────────────────────
 *   EXPORT_EMAIL_SUBJECT_KEYWORDS
 *     Palavras-chave separadas por vírgula para filtrar o assunto do e-mail.
 *     Default: export,exportação,intable,tabela
 *     Ajustar conforme o assunto real enviado pelo sistema.
 *
 * ── PERMISSÕES MICROSOFT GRAPH NECESSÁRIAS ────────────────────────────────────
 * Tipo de permissão: Application permissions (app-only, sem delegação de usuário)
 * Permissão mínima: Mail.ReadBasic ou Mail.Read
 *
 * ADMIN CONSENT OBRIGATÓRIO:
 *   Application permissions no Microsoft Entra exigem consentimento explícito
 *   do administrador do tenant. Sem admin consent a API retorna 403 Forbidden.
 *   Conceder em:
 *     Azure Portal → Microsoft Entra ID → App registrations →
 *     <nome do app> → API permissions → Grant admin consent for <tenant>
 *
 * RECOMENDAÇÃO DE SEGURANÇA:
 *   Se o tenant Exchange Online permitir, restringir o acesso do app apenas
 *   à mailbox usada no teste via ApplicationAccessPolicy:
 *     New-ApplicationAccessPolicy -AppId <MS_CLIENT_ID> \
 *       -PolicyScopeGroupId <grupo ou mailbox> \
 *       -AccessRight RestrictAccess
 *
 * ── PROCESSO DE CONFIGURAÇÃO (executar uma vez) ───────────────────────────────
 * 1. Azure Portal → Microsoft Entra ID → App registrations → New registration.
 * 2. Em "API permissions" → Add permission → Microsoft Graph →
 *    Application permissions → Mail.Read → Add.
 * 3. Clicar em "Grant admin consent for <tenant>" (requer conta de admin).
 * 4. Em "Certificates & secrets" → New client secret → copiar valor imediatamente.
 * 5. Copiar Tenant ID e Client ID da aba Overview do App Registration.
 * 6. Salvar todas as variáveis no .env (nunca commitar).
 *
 * Não implementar Mail.Send. Este helper é somente leitura (Mail.Read).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const REQUIRED_ENV_VARS = ['MS_TENANT_ID', 'MS_CLIENT_ID', 'MS_CLIENT_SECRET', 'MS_MAILBOX_USER']

const DEFAULT_SUBJECT_KEYWORDS = 'export,exportação,intable,tabela'

function assertEnvVars() {
  const missing = REQUIRED_ENV_VARS.filter(k => !process.env[k])
  if (missing.length) {
    throw new Error(
      `emailClient: variáveis de ambiente ausentes: ${missing.join(', ')}.\n` +
        'Configure-as em .env (nunca commitar).\n' +
        'Instale dependências se necessário:\n' +
        '  npm install @microsoft/microsoft-graph-client @azure/identity --save-dev'
    )
  }
}

/**
 * Cria cliente Microsoft Graph autenticado via Client Credentials (app-only).
 * Requires lazy — não quebra importações em testes que não usam este helper.
 */
function createGraphClient() {
  assertEnvVars()

  const { Client } = require('@microsoft/microsoft-graph-client')
  const { ClientSecretCredential } = require('@azure/identity')
  const { TokenCredentialAuthenticationProvider } = require(
    '@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials'
  )

  // assertEnvVars() garante que os valores existem — ?? '' satisfaz o type-checker
  const credential = new ClientSecretCredential(
    process.env.MS_TENANT_ID ?? '',
    process.env.MS_CLIENT_ID ?? '',
    process.env.MS_CLIENT_SECRET ?? ''
  )

  const authProvider = new TokenCredentialAuthenticationProvider(credential, {
    scopes: ['https://graph.microsoft.com/.default'],
  })

  return Client.initWithMiddleware({ authProvider })
}

/**
 * Aguarda por polling que um e-mail de exportação do InTable chegue após testStartedAt.
 *
 * Estratégia de filtragem:
 *   - OData $filter: somente receivedDateTime ge <testStartedAt>
 *     (evita depender de contains(subject,...) que pode ter limitações com acentos)
 *   - Filtragem de assunto/destinatário feita no JavaScript
 *   - Palavras-chave configuráveis via EXPORT_EMAIL_SUBJECT_KEYWORDS
 *
 * Valida:
 *   1. E-mail recebido após testStartedAt
 *   2. Destinatário em toRecipients coincide com recipient (EXPORT_RECIPIENT)
 *   3. Assunto contém ao menos uma palavra-chave de exportação
 *   4. Presença de anexo (hasAttachments)
 *
 * Não imprime o corpo completo do e-mail no log.
 * Não salva conteúdo sensível nas evidências.
 *
 * @param {string} recipient - Endereço do destinatário (valor de EXPORT_RECIPIENT)
 * @param {Date} testStartedAt - Ignora e-mails anteriores a este timestamp
 * @param {{ timeoutMs?: number, pollIntervalMs?: number }} [options]
 * @returns {Promise<{ subject: string, from: string, receivedAt: Date, hasAttachment: boolean }>}
 */
async function waitForExportEmail(recipient, testStartedAt, options = {}) {
  const { timeoutMs = 120_000, pollIntervalMs = 10_000 } = options

  const graphClient = createGraphClient()
  const mailboxUser = process.env.MS_MAILBOX_USER

  const rawKeywords = process.env.EXPORT_EMAIL_SUBJECT_KEYWORDS || DEFAULT_SUBJECT_KEYWORDS
  const subjectKeywords = rawKeywords
    .split(',')
    .map(k => k.trim().toLowerCase())
    .filter(Boolean)

  // OData filter: somente por data/hora — sem operações de string no servidor
  // para evitar limitações de suporte a acentos e variações entre endpoints.
  const filter = `receivedDateTime ge ${testStartedAt.toISOString()}`

  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const response = await graphClient
      .api(`/users/${mailboxUser}/messages`)
      .filter(filter)
      .select('id,subject,from,toRecipients,receivedDateTime,hasAttachments')
      .orderby('receivedDateTime desc')
      .top(50)
      .get()

    for (const msg of response.value ?? []) {
      // 1. Recebido após testStartedAt (dupla verificação além do filtro OData)
      const receivedAt = new Date(msg.receivedDateTime)
      if (receivedAt < testStartedAt) continue

      // 2. Destinatário correto (comparação em lowercase)
      const toAddresses = (msg.toRecipients ?? []).map(
        r => (r.emailAddress?.address ?? '').toLowerCase()
      )
      const recipientMatched = toAddresses.some(addr => addr.includes(recipient.toLowerCase()))
      if (!recipientMatched) {
        // Diagnóstico seguro — não imprime endereços completos, apenas quantidade
        const recipientCount = toAddresses.length
        if (recipientCount > 0 && process.env.DEBUG_EMAIL === 'true') {
          console.log(`[emailClient] e-mail ignorado: destinatário não coincide (${recipientCount} endereço(s) na mensagem)`)
        }
        continue
      }

      // 3. Assunto contém ao menos uma palavra-chave de exportação (JS-side)
      const subject = (msg.subject ?? '').toLowerCase()
      if (!subjectKeywords.some(kw => subject.includes(kw))) continue

      return {
        subject: msg.subject,
        from: msg.from?.emailAddress?.address ?? '',
        receivedAt,
        hasAttachment: msg.hasAttachments === true,
      }
    }

    const remaining = deadline - Date.now()
    if (remaining > pollIntervalMs) {
      await new Promise(r => setTimeout(r, pollIntervalMs))
    } else {
      break
    }
  }

  throw new Error(
    `E-mail de exportação não encontrado para "${recipient}" dentro de ${timeoutMs / 1000}s.\n` +
      `Palavras-chave buscadas no assunto: ${subjectKeywords.join(', ')}.\n` +
      'Verificar:\n' +
      '  (1) o sistema disparou o e-mail\n' +
      '  (2) MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET estão corretos\n' +
      '  (3) admin consent foi concedido para Mail.Read no tenant Microsoft Entra\n' +
      '  (4) MS_MAILBOX_USER e EXPORT_RECIPIENT correspondem ao destinatário real\n' +
      '  (5) o assunto enviado contém alguma das palavras-chave configuradas\n' +
      '  (6) se o e-mail chegou por alias/lista: verificar toRecipients na mensagem real'
  )
}

module.exports = { waitForExportEmail }
