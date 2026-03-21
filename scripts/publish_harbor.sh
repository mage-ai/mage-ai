#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${1:-${ROOT_DIR}/.env.harbor}"

if [[ ! -f "${ENV_FILE}" ]]; then
  cat <<EOF
Missing env file: ${ENV_FILE}

Create it from .env.harbor.example, then run:
  ./scripts/publish_harbor.sh .env.harbor
EOF
  exit 1
fi

load_env_file() {
  local env_file="$1"
  local line key value

  while IFS= read -r line || [[ -n "${line}" ]]; do
    if [[ -z "${line}" || "${line}" =~ ^[[:space:]]*# ]]; then
      continue
    fi

    key="${line%%=*}"
    value="${line#*=}"

    key="${key#"${key%%[![:space:]]*}"}"
    key="${key%"${key##*[![:space:]]}"}"

    if [[ "${value}" =~ ^\".*\"$ || "${value}" =~ ^\'.*\'$ ]]; then
      value="${value:1:${#value}-2}"
    fi

    printf -v "${key}" '%s' "${value}"
    export "${key}"
  done < "${env_file}"
}

load_env_file "${ENV_FILE}"

IMAGE_NAME="${IMAGE_NAME:-b2m-sage-ai}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
HARBOR_REGISTRY="${HARBOR_REGISTRY:-}"
HARBOR_PROJECT="${HARBOR_PROJECT:-}"
HARBOR_USER="${HARBOR_USER:-}"
HARBOR_PASSWORD="${HARBOR_PASSWORD:-}"
BUILD_PLATFORMS="${BUILD_PLATFORMS:-linux/amd64,linux/arm64}"
BUILDER_NAME="${BUILDER_NAME:-multiarch}"
DOCKERFILE_PATH="${DOCKERFILE_PATH:-Dockerfile}"
BUILD_CONTEXT="${BUILD_CONTEXT:-.}"
MAGE_EXTRAS="${MAGE_EXTRAS:-postgres}"
INSTALL_EXTRA_PY_DEPS="${INSTALL_EXTRA_PY_DEPS:-true}"
INSTALL_MSSQL="${INSTALL_MSSQL:-false}"
INSTALL_R="${INSTALL_R:-false}"
INSTALL_SPARKMAGIC="${INSTALL_SPARKMAGIC:-false}"

REMOTE_IMAGE="${HARBOR_REGISTRY}/${HARBOR_PROJECT}/${IMAGE_NAME}:${IMAGE_TAG}"

if [[ -z "${HARBOR_REGISTRY}" || -z "${HARBOR_PROJECT}" || -z "${HARBOR_USER}" || -z "${HARBOR_PASSWORD}" ]]; then
  cat <<'EOF'
Missing required variables in env file:
  HARBOR_REGISTRY
  HARBOR_PROJECT
  HARBOR_USER
  HARBOR_PASSWORD

Optional variables:
  IMAGE_NAME
  IMAGE_TAG
  BUILD_PLATFORMS
  BUILDER_NAME
  DOCKERFILE_PATH
  BUILD_CONTEXT
  MAGE_EXTRAS
  INSTALL_EXTRA_PY_DEPS
  INSTALL_MSSQL
  INSTALL_R
  INSTALL_SPARKMAGIC
EOF
  exit 1
fi

cd "${ROOT_DIR}"

echo "Loaded env file: ${ENV_FILE}"
echo "Remote image: ${REMOTE_IMAGE}"
echo "Platforms: ${BUILD_PLATFORMS}"
echo "Dockerfile: ${DOCKERFILE_PATH}"
echo "Build context: ${BUILD_CONTEXT}"
echo "MAGE_EXTRAS: ${MAGE_EXTRAS}"
echo "INSTALL_EXTRA_PY_DEPS: ${INSTALL_EXTRA_PY_DEPS}"

echo "Logging in to ${HARBOR_REGISTRY}..."
printf '%s' "${HARBOR_PASSWORD}" | docker login "${HARBOR_REGISTRY}" \
  --username "${HARBOR_USER}" \
  --password-stdin

if ! docker buildx inspect "${BUILDER_NAME}" >/dev/null 2>&1; then
  echo "Creating buildx builder ${BUILDER_NAME}..."
  docker buildx create --name "${BUILDER_NAME}" --use
else
  docker buildx use "${BUILDER_NAME}"
fi

docker buildx inspect --bootstrap >/dev/null

echo "Building and pushing ${REMOTE_IMAGE}..."
docker buildx build \
  --platform "${BUILD_PLATFORMS}" \
  --build-arg "MAGE_EXTRAS=${MAGE_EXTRAS}" \
  --build-arg "INSTALL_EXTRA_PY_DEPS=${INSTALL_EXTRA_PY_DEPS}" \
  --build-arg "INSTALL_MSSQL=${INSTALL_MSSQL}" \
  --build-arg "INSTALL_R=${INSTALL_R}" \
  --build-arg "INSTALL_SPARKMAGIC=${INSTALL_SPARKMAGIC}" \
  -f "${DOCKERFILE_PATH}" \
  -t "${REMOTE_IMAGE}" \
  --push \
  "${BUILD_CONTEXT}"

echo "Published ${REMOTE_IMAGE}"
