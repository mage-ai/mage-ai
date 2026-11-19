#!/usr/bin/env bash
# Start Mage with the live demo project and install the connector inside Mage's
# Python environment.
#
#   export OMD_TOKEN=$(./harness/token.sh)
#   ./harness/start_mage.sh
#
# Then open http://localhost:6789 and run the `demo_lineage` pipeline.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NAME="${MAGE_CONTAINER:-mage-demo}"
IMAGE="${MAGE_IMAGE:-mageai/mageai:latest}"
PROJECT="${ROOT}/harness/mage_demo"

if ! docker image inspect "${IMAGE}" >/dev/null 2>&1; then
  echo "pulling ${IMAGE} (first run only)"
  docker pull "${IMAGE}"
fi

if [ -z "${OMD_TOKEN:-}" ]; then
  OMD_TOKEN="$("${ROOT}/harness/token.sh")"
fi

if docker inspect "${NAME}" >/dev/null 2>&1; then
  docker rm -f "${NAME}" >/dev/null
fi

docker run -d --name "${NAME}" \
  -p 6789:6789 \
  -v "${PROJECT}:/home/src/mage_demo" \
  -v "${ROOT}:/home/src/connector" \
  -e OMD_HOST="${OMD_HOST_DOCKER:-http://host.docker.internal:8585}" \
  -e OMD_TOKEN="${OMD_TOKEN}" \
  -e PYTHONPATH=/home/src/connector/src \
  -e REQUIRE_USER_AUTHENTICATION=false \
  "${IMAGE}" mage start mage_demo >/dev/null

echo "waiting for Mage on http://localhost:6789"
for _ in $(seq 1 60); do
  if curl -fsS -o /dev/null http://localhost:6789/api/status 2>/dev/null \
    || curl -fsS -o /dev/null http://localhost:6789 2>/dev/null; then
    break
  fi
  sleep 2
done

# PYTHONPATH above is what the forked scheduler workers use. The editable install
# installs dependencies (PyYAML, requests, sqlglot) into Mage's own site-packages.
echo "installing mage-omd-lineage into the Mage container"
docker exec -u root "${NAME}" pip install -q -e /home/src/connector

echo "Mage is up: http://localhost:6789 (project: mage_demo)"
