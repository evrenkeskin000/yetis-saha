#!/usr/bin/env bash
# Yerel Supabase üzerinde tenant_isolation.sql çalıştırır.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v supabase >/dev/null 2>&1 && ! command -v npx >/dev/null 2>&1; then
  echo "supabase CLI veya npx gerekli" >&2
  exit 1
fi

SUPABASE=(npx supabase)
if command -v supabase >/dev/null 2>&1; then
  SUPABASE=(supabase)
fi

echo "==> supabase start (gerekirse)"
"${SUPABASE[@]}" start >/dev/null 2>&1 || true

echo "==> db reset"
"${SUPABASE[@]}" db reset

DB_URL="$("${SUPABASE[@]}" status -o env 2>/dev/null | sed -n 's/^DB_URL=//p' | tr -d '"' || true)"
if [[ -z "${DB_URL}" ]]; then
  DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
fi

echo "==> tenant_isolation.sql"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f supabase/tests/tenant_isolation.sql

echo "test:db OK"
