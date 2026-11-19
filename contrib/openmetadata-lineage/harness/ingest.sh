#!/usr/bin/env bash
# Ingest the demo warehouse into OpenMetadata using the compose ingestion container.
#
# Requires the containers from bootstrap_omd.sh and docker-compose.warehouse.yml.
# Host ports are rewritten to container-reachable addresses for the ingestion run.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INGESTION_CONTAINER="${INGESTION_CONTAINER:-openmetadata_ingestion}"
SERVER_CONTAINER="${SERVER_CONTAINER:-openmetadata_server}"

if ! docker inspect "${INGESTION_CONTAINER}" >/dev/null 2>&1; then
  echo "ingestion container '${INGESTION_CONTAINER}' is not running; run harness/bootstrap_omd.sh" >&2
  exit 1
fi

if [ -z "${OMD_TOKEN:-}" ]; then
  OMD_TOKEN="$("${ROOT}/harness/token.sh")"
fi

WORKFLOW="$(mktemp)"
trap 'rm -f "${WORKFLOW}"' EXIT
sed \
  -e "s#localhost:5433#host.docker.internal:5433#g" \
  -e "s#http://localhost:8585/api#http://${SERVER_CONTAINER}:8585/api#g" \
  "${ROOT}/harness/ingest-warehouse.yaml" > "${WORKFLOW}"
# docker cp keeps the mktemp 0600 mode; the ingestion container runs as `airflow`.
chmod 0644 "${WORKFLOW}"

docker cp "${WORKFLOW}" "${INGESTION_CONTAINER}:/tmp/ingest-warehouse.yaml"
docker exec -e OMD_TOKEN="${OMD_TOKEN}" "${INGESTION_CONTAINER}" \
  metadata ingest -c /tmp/ingest-warehouse.yaml
