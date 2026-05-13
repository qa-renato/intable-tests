#!/usr/bin/env bash
set -euo pipefail

# Guard duplo: não invoca Playwright sem ambas as flags
if [ "${ENABLE_DESTRUCTIVE:-}" != "true" ] || [ "${ENABLE_TABLE_CREATE_TESTS:-}" != "true" ]; then
  echo ""
  echo "Suíte @table-create desativada — Playwright não será iniciado."
  echo ""
  [ "${ENABLE_DESTRUCTIVE:-}" != "true" ]        && echo "  Flag ausente: ENABLE_DESTRUCTIVE=true"
  [ "${ENABLE_TABLE_CREATE_TESTS:-}" != "true" ]  && echo "  Flag ausente: ENABLE_TABLE_CREATE_TESTS=true"
  echo ""
  echo "Para executar:"
  echo "  ENABLE_DESTRUCTIVE=true \\"
  echo "  ENABLE_TABLE_CREATE_TESTS=true \\"
  echo "  TABLE_CREATE_COMPANY=\"inbot\" \\"
  echo "  TABLE_CREATE_DEPARTMENT=\"testes\" \\"
  echo "  bash scripts/evidence-table-create.sh"
  echo ""
  exit 0
fi

EVIDENCE_DIR="evidencias/evidence-run"
JSON_OUT="${EVIDENCE_DIR}/results-table-create.json"

mkdir -p "${EVIDENCE_DIR}"

echo "=== InTable — Table Create: iniciando suíte @table-create ==="
echo "EMPRESA     : ${TABLE_CREATE_COMPANY:-inbot (default)}"
echo "DEPARTAMENTO: ${TABLE_CREATE_DEPARTMENT:-testes (default)}"
echo ""
echo "AVISO:"
echo "  Esta suíte cria e deleta uma tabela real no ambiente."
echo "  Nome usa prefixo 'qa_tabela_aut_' + timestamp para rastreabilidade."
echo "  Toda tabela criada será deletada ao final — verificar warnings de CLEANUP PENDENTE."
echo ""

BASE_URL=https://intable.inbot.com.br \
ENABLE_DESTRUCTIVE=true \
ENABLE_TABLE_CREATE_TESTS=true \
TABLE_CREATE_COMPANY="${TABLE_CREATE_COMPANY:-inbot}" \
TABLE_CREATE_DEPARTMENT="${TABLE_CREATE_DEPARTMENT:-testes}" \
PLAYWRIGHT_JSON_OUTPUT_NAME="${JSON_OUT}" \
npx playwright test tests/tables-create \
  --grep "@table-create" \
  --reporter=line,json,html

echo ""
echo "=== Evidências geradas ==="
echo "  JSON : ${JSON_OUT}"
echo "  HTML : evidencias/html/index.html"
echo ""
echo "Para visualizar relatório HTML: npm run report"
echo ""
echo "LEMBRETE: verificar anotações do relatório para warnings de CLEANUP PENDENTE."
