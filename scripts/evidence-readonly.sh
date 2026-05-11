#!/usr/bin/env bash
set -euo pipefail

# Resolve project root (directory containing this script's parent)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

EVIDENCE_DIR="evidencias/evidence-run"
JSON_REPORT="$EVIDENCE_DIR/results.json"
SUMMARY="$EVIDENCE_DIR/resumo-execucao-readonly.md"
HTML_REPORT="playwright-report/index.html"

echo ""
echo "=== InTable — Evidência Readonly ==="
echo "Projeto: $PROJECT_ROOT"
echo ""

# ── Etapa 1: limpar e recriar pasta de evidências ──────────────────────────
echo "[ 1/3 ] Preparando pasta de evidências..."
rm -rf "$EVIDENCE_DIR"
mkdir -p "$EVIDENCE_DIR"

# ── Etapa 2: rodar suíte readonly ──────────────────────────────────────────
echo "[ 2/3 ] Rodando suíte @readonly..."
echo ""

BASE_URL=https://intable.inbot.com.br \
ENABLE_DESTRUCTIVE=false \
PLAYWRIGHT_JSON_OUTPUT_NAME="$JSON_REPORT" \
npx playwright test tests/tabelas \
  --grep "@readonly" \
  --reporter=line,json,html \
  --trace=on || true   # permite continuar mesmo com falhas para gerar o resumo

echo ""

# ── Etapa 3: gerar resumo Markdown ─────────────────────────────────────────
echo "[ 3/3 ] Gerando resumo Markdown..."
node scripts/generate-evidence-summary.js

# ── Resultado final ────────────────────────────────────────────────────────
echo ""
echo "=== Resultado ==="

node -e "
const r = JSON.parse(require('fs').readFileSync('$JSON_REPORT', 'utf8'))
const s = r.stats
const durMin  = (s.duration / 60000).toFixed(1)
const passed  = s.expected
const failed  = s.unexpected
const flaky   = s.flaky
const skipped = s.skipped
console.log('  Total specs : ' + (passed + failed + skipped))
console.log('  Passed      : ' + passed)
console.log('  Failed      : ' + failed)
console.log('  Flaky       : ' + flaky + ' (setup)')
console.log('  Skipped     : ' + skipped)
console.log('  Duração     : ' + durMin + ' min')
"

echo ""
echo "  HTML report : $HTML_REPORT"
echo "  Resumo MD   : $SUMMARY"
echo ""
echo "  Para abrir o relatório:"
echo "    npm run report"
echo ""
