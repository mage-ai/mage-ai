#!/usr/bin/env bash
# Create the fresh tables for `manual_lineage` and ingest them into OpenMetadata.
# Run this before executing the pipeline in Mage: the connector only publishes
# lineage for tables that already exist in the catalog.
#
#   ./harness/setup_manual_demo.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WAREHOUSE_CONTAINER="${WAREHOUSE_CONTAINER:-mage-omd-warehouse}"

if ! docker inspect "${WAREHOUSE_CONTAINER}" >/dev/null 2>&1; then
  echo "warehouse container '${WAREHOUSE_CONTAINER}' is not running; start harness/docker-compose.warehouse.yml" >&2
  exit 1
fi

echo "creating fresh demo tables in ${WAREHOUSE_CONTAINER}"
docker exec -i "${WAREHOUSE_CONTAINER}" \
  psql -v ON_ERROR_STOP=1 -U warehouse -d analytics -f - \
  < "${ROOT}/harness/manual_demo_seed.sql"

if [ -z "${OMD_TOKEN:-}" ]; then
  OMD_TOKEN="$("${ROOT}/harness/token.sh")"
  export OMD_TOKEN
fi

echo "ingesting fresh tables into OpenMetadata"
"${ROOT}/harness/ingest.sh"

echo
echo "Ready. Open http://localhost:6789/pipelines/manual_lineage and click Run."
echo "Mage itself will publish lineage; do not run the connector CLI with --apply."
