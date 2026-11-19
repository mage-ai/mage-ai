#!/usr/bin/env bash
# End-to-end demo against a running OpenMetadata and the seeded warehouse.
#
#   ./harness/bootstrap_omd.sh
#   docker compose -f harness/docker-compose.warehouse.yml up -d
#   export OMD_TOKEN=$(./harness/token.sh)
#   metadata ingest -c harness/ingest-warehouse.yaml
#   ./harness/run_demo.sh
#
# run_demo.sh only plans by default; pass --apply to publish.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="${ROOT}/tests/fixtures/demo_project"
export PYTHONPATH="${ROOT}/src${PYTHONPATH:+:${PYTHONPATH}}"
export OMD_HOST="${OMD_HOST:-http://localhost:8585}"

if [ -z "${OMD_TOKEN:-}" ]; then
  echo "OMD_TOKEN is not set. Get one with harness/token.sh" >&2
  exit 2
fi

python3 -m mage_omd_lineage platforms | sed -n '1,12p'
python3 -m mage_omd_lineage plan \
  --project "${PROJECT}" \
  --pipeline demo_lineage \
  --format table

if [ "${1:-}" = "--apply" ]; then
  python3 -m mage_omd_lineage apply \
    --project "${PROJECT}" \
    --pipeline demo_lineage \
    --yes \
    --non-interactive \
    --format json
  echo "coverage report: ${PROJECT}/mage_data/demo_project/omd_lineage/coverage.json"
fi
