#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

PYTHON_BIN="${PYTHON_BIN:-python3}"
TWINE_REPOSITORY_URL="${TWINE_REPOSITORY_URL:-http://pip.b2metric.com/}"
TWINE_USERNAME="${TWINE_USERNAME:-odin}"
TWINE_PASSWORD="${TWINE_PASSWORD:-asgard_2021.}"

if [[ -z "${TWINE_REPOSITORY_URL}" ]]; then
  cat <<'EOF'
Missing TWINE_REPOSITORY_URL.

Use the package upload endpoint for your private repository, not the install index.
For example, this is usually not correct for uploads:
  http://pip.b2metric.com/simple/

Run with:
  TWINE_REPOSITORY_URL="https://your-upload-endpoint" \
  TWINE_USERNAME="user" \
  TWINE_PASSWORD="pass" \
  bash scripts/publish_private_pip.sh
EOF
  exit 1
fi

if [[ -z "${TWINE_USERNAME}" || -z "${TWINE_PASSWORD}" ]]; then
  echo "Missing TWINE_USERNAME or TWINE_PASSWORD."
  exit 1
fi

cd "${ROOT_DIR}"

echo "Installing build dependencies..."
"${PYTHON_BIN}" -m pip install --upgrade build twine

echo "Cleaning previous artifacts..."
rm -rf build dist *.egg-info

echo "Building source and wheel distributions..."
"${PYTHON_BIN}" -m build

echo "Uploading distributions to ${TWINE_REPOSITORY_URL}..."
"${PYTHON_BIN}" -m twine upload \
  --repository-url "${TWINE_REPOSITORY_URL}" \
  --username "${TWINE_USERNAME}" \
  --password "${TWINE_PASSWORD}" \
  dist/*
