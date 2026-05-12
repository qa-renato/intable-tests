#!/usr/bin/env bash
set -euo pipefail

# Guard: não invoca Playwright sem a flag
if [ "${ENABLE_EXPORT_TESTS:-}" != "true" ]; then
  echo ""
  echo "Suíte @export desativada — Playwright não será iniciado."
  echo "Para executar:"
  echo "  ENABLE_EXPORT_TESTS=true \\"
  echo "  EXPORT_RECIPIENT=\"email@dominio.com\" \\"
  echo "  bash scripts/evidence-export.sh"
  echo ""
  exit 0
fi

EVIDENCE_DIR="evidencias/evidence-run"
JSON_OUT="${EVIDENCE_DIR}/results-export.json"

mkdir -p "${EVIDENCE_DIR}"

echo "=== InTable — Exportação: iniciando suíte @export ==="
echo "EXPORT_RECIPIENT    : ${EXPORT_RECIPIENT:-[não definido]}"
echo "MS_MAILBOX_USER     : ${MS_MAILBOX_USER:-[não definido]}"
echo ""

BASE_URL=https://intable.inbot.com.br \
PLAYWRIGHT_JSON_OUTPUT_NAME="${JSON_OUT}" \
npx playwright test tests/export \
  --grep "@export" \
  --reporter=line,json,html

echo ""
echo "=== Evidências geradas ==="
echo "  JSON  : ${JSON_OUT}"
echo "  HTML  : evidencias/html/index.html"
echo ""
echo "Para visualizar relatório HTML: npm run report"
