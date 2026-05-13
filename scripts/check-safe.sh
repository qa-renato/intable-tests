#!/usr/bin/env bash
# check-safe.sh — Quality gate local e CI.
# Roda apenas verificações estáticas e guards.
# Playwright NÃO é invocado. Nenhum dado é criado ou modificado.
# Pode rodar sem sessão autenticada, sem credenciais e sem flags destrutivas.
set -euo pipefail

echo ""
echo "=== InTable QA — Safe Quality Gate ==="
echo ""

# ── 1. Sintaxe JS ─────────────────────────────────────────────────────────────
echo "── node --check (verificação de sintaxe) ────────────────────────────────"

JS_FILES=(
  "helpers/emailClient.js"
  "helpers/notifications.js"
  "pages/intable/tabelas.page.js"
  "scripts/run-export.js"
  "scripts/run-api-keys.js"
  "scripts/run-table-create.js"
  "tests/export/export-table.spec.js"
  "tests/api-keys/api-key-management.spec.js"
  "tests/tables-create/create-table.spec.js"
)

SYNTAX_ERRORS=0
for f in "${JS_FILES[@]}"; do
  if node --check "$f" 2>&1; then
    echo "  ✓  $f"
  else
    echo "  ✗  $f"
    SYNTAX_ERRORS=$((SYNTAX_ERRORS + 1))
  fi
done

if [ "$SYNTAX_ERRORS" -gt 0 ]; then
  echo ""
  echo "ERRO: $SYNTAX_ERRORS arquivo(s) com erro de sintaxe."
  exit 1
fi

echo ""

# ── 2. Guards das suítes controladas ─────────────────────────────────────────
# Cada suíte deve encerrar com exit 0 e mensagem de suíte desativada.
# Playwright NÃO deve ser invocado.
echo "── Guards (sem flags — Playwright não deve iniciar) ─────────────────────"

echo ""
echo "  @export:"
npm run test:export 2>&1 | grep -E "desativada|disabled|Playwright não|Para executar" | sed 's/^/    /'
echo "  ✓  @export guard OK"

echo ""
echo "  @api-key:"
npm run test:api-keys 2>&1 | grep -E "desativada|disabled|Playwright não|Para executar|Defaults" | sed 's/^/    /'
echo "  ✓  @api-key guard OK"

echo ""
echo "  @table-create:"
npm run test:table-create 2>&1 | grep -E "desativada|disabled|ausente|Playwright não|Para executar|Defaults" | sed 's/^/    /'
echo "  ✓  @table-create guard OK"

echo ""
echo "=== Safe Quality Gate: PASSED ==="
echo ""
echo "  Sintaxe verificada:    ${#JS_FILES[@]} arquivos"
echo "  Guards verificados:    @export, @api-key, @table-create"
echo "  Playwright invocado:   NÃO"
echo "  Dados criados:         NENHUM"
echo ""
echo "Para rodar testes readonly (requer sessão): npm run check:readonly"
echo ""
