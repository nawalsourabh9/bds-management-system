#!/usr/bin/env bash
# Run the FastAPI backend locally using PostgreSQL credentials from Azure Key Vault
# (same secrets as scripts/deploy-all.sh: db-host, db-user, db-password, db-name).
#
# Prerequisites:
#   - Azure CLI installed and logged in: az login
#   - Access to Key Vault secrets (e.g. Key Vault Secrets User)
#   - Your public IP allowed on the Azure PostgreSQL firewall
#   - Python 3.12+ and backend dependencies: cd backend && pip install -r requirements.txt
#
# Usage:
#   ./scripts/run-backend-local-azure.sh
#   KEYVAULT_NAME=my-vault ./scripts/run-backend-local-azure.sh
#   ./scripts/run-backend-local-azure.sh --port 8002

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT/backend"

# Match scripts/deploy-all.sh
KEYVAULT_NAME="${KEYVAULT_NAME:-bds-qms-kv}"
LISTEN_HOST="${LISTEN_HOST:-127.0.0.1}"
PORT="8002"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)
      PORT="${2:?}"
      shift 2
      ;;
    --host)
      LISTEN_HOST="${2:?}"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [--port 8002] [--host 127.0.0.1]"
      echo "Env: KEYVAULT_NAME (default: bds-qms-kv), DB_PORT (default: 5432)"
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

if ! command -v az &>/dev/null; then
  echo "[error] Azure CLI (az) not found. Install: https://docs.microsoft.com/cli/azure/install-azure-cli" >&2
  exit 1
fi

if ! az account show &>/dev/null; then
  echo "[error] Not logged in to Azure. Run: az login" >&2
  exit 1
fi

echo "[info] Fetching database secrets from Key Vault: $KEYVAULT_NAME"

kv_get() {
  local name="$1"
  az keyvault secret show --vault-name "$KEYVAULT_NAME" --name "$name" --query value -o tsv
}

set +e
DB_HOST=$(kv_get db-host)
DB_USER=$(kv_get db-user)
DB_PASSWORD=$(kv_get db-password)
DB_NAME=$(kv_get db-name)
set -e

if [[ -z "${DB_HOST:-}" || -z "${DB_USER:-}" || -z "${DB_PASSWORD:-}" || -z "${DB_NAME:-}" ]]; then
  echo "[error] Could not read all secrets: db-host, db-user, db-password, db-name" >&2
  echo "[error] Vault: $KEYVAULT_NAME — run: az login && az keyvault secret show --vault-name $KEYVAULT_NAME --name db-host" >&2
  exit 1
fi

export DB_HOST DB_USER DB_PASSWORD DB_NAME

export DB_PORT="${DB_PORT:-5432}"
export DB_SSLMODE="${DB_SSLMODE:-require}"
export ENVIRONMENT="${ENVIRONMENT:-development}"

# Unset DATABASE_URL so app/core/config.py builds URL from DB_* (with encoded credentials)
unset DATABASE_URL || true

echo "[info] DB_HOST=$DB_HOST (user=$DB_USER, db=$DB_NAME, sslmode=$DB_SSLMODE)"
echo "[info] Starting uvicorn on http://${LISTEN_HOST}:${PORT} — set frontend VITE_API_BASE_URL=http://${LISTEN_HOST}:${PORT} if needed"

cd "$BACKEND_DIR"

if [[ -d .venv ]]; then
  # shellcheck source=/dev/null
  source .venv/bin/activate
elif [[ -d venv ]]; then
  # shellcheck source=/dev/null
  source venv/bin/activate
fi

exec uvicorn app.main:app --reload --host "$LISTEN_HOST" --port "$PORT"
