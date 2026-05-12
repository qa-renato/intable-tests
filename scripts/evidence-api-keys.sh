#!/usr/bin/env bash
set -euo pipefail

# Guard: não invoca Playwright sem a flag
if [ "${ENABLE_API_KEY_TESTS:-}" != "true" ]; then
  echo ""
  echo "Suíte @api-key desativada — Playwright não será iniciado."
  echo "Para executar:"
  echo "  ENABLE_API_KEY_TESTS=true \\"
  echo "  API_KEY_TEST_COMPANY=\"inbot\" \\"
  echo "  API_KEY_TEST_DEPARTMENT=\"testes\" \\"
  echo "  bash scripts/evidence-api-keys.sh"
  echo ""
  exit 0
fi

EVIDENCE_DIR="evidencias/evidence-run"
JSON_OUT="${EVIDENCE_DIR}/results-api-keys.json"

mkdir -p "${EVIDENCE_DIR}"

echo "=== InTable — API Keys: iniciando suíte @api-key ==="
echo "EMPRESA     : ${API_KEY_TEST_COMPANY:-inbot (default)}"
echo "DEPARTAMENTO: ${API_KEY_TEST_DEPARTMENT:-testes (default)}"
echo ""
echo "AVISO DE SEGURANÇA:"
echo "  trace, screenshot e video estão desabilitados nesta suíte."
echo "  Isso é intencional — esses artefatos poderiam capturar o valor da chave."
echo "  Toda chave criada será revogada ao final do teste."
echo ""

BASE_URL=https://intable.inbot.com.br \
API_KEY_TEST_COMPANY="${API_KEY_TEST_COMPANY:-inbot}" \
API_KEY_TEST_DEPARTMENT="${API_KEY_TEST_DEPARTMENT:-testes}" \
PLAYWRIGHT_JSON_OUTPUT_NAME="${JSON_OUT}" \
npx playwright test tests/api-keys \
  --grep "@api-key" \
  --reporter=line,json,html

echo ""
echo "=== Evidências geradas ==="
echo "  JSON : ${JSON_OUT}"
echo "  HTML : evidencias/html/index.html"
echo ""
echo "Para visualizar relatório HTML: npm run report"
echo ""
echo "LEMBRETE: verificar anotações do relatório para warnings de CLEANUP PENDENTE."
