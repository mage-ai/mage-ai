#!/usr/bin/env bash
# Boot a local OpenMetadata (Postgres + OpenSearch) from released images.
#
# No Maven build and no upstream checkout: the compose file pins the official
# 1.6.5 server/ingestion images.
#
#   ./harness/bootstrap_omd.sh
#
# Override the release with OMD_VERSION=1.7.0 ./harness/bootstrap_omd.sh
# (the image tag must exist in docker.getcollate.io/openmetadata/*).

set -euo pipefail

VERSION="${OMD_VERSION:-1.6.5}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE="${ROOT}/harness/docker-compose.omd.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required" >&2
  exit 1
fi

export OMD_VERSION="${VERSION}"

# The compose file pins 1.6.5; rewrite tags when a different version is requested.
if [ "${VERSION}" != "1.6.5" ]; then
  TMP="$(mktemp)"
  sed "s#openmetadata/server:1\.6\.5#openmetadata/server:${VERSION}#g; s#openmetadata/ingestion:1\.6\.5#openmetadata/ingestion:${VERSION}#g" \
    "${COMPOSE}" > "${TMP}"
  trap 'rm -f "${TMP}"' EXIT
  COMPOSE="${TMP}"
fi

docker compose -f "${COMPOSE}" up -d

echo "waiting for the OpenMetadata API on http://localhost:8585"
for _ in $(seq 1 180); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8585/api/v1/system/version || true)"
  if [ "${code}" = "200" ] || [ "${code}" = "401" ]; then
    echo "OpenMetadata is up: http://localhost:8585 (API on the same port)"
    exit 0
  fi
  sleep 5
done

echo "OpenMetadata did not become healthy; inspect: docker compose -f harness/docker-compose.omd.yml logs -f" >&2
exit 1
