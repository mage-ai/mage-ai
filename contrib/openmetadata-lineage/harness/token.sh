#!/usr/bin/env bash
# Print a JWT for the local OpenMetadata admin user.
#
#   export OMD_TOKEN=$(./harness/token.sh)
#
# OpenMetadata 1.6 expects the password Base64-encoded in the login payload.

set -euo pipefail

HOST="${OMD_HOST:-http://localhost:8585}"
EMAIL="${OMD_ADMIN_EMAIL:-admin@open-metadata.org}"
PASSWORD="${OMD_ADMIN_PASSWORD:-admin}"
ENCODED="$(printf '%s' "${PASSWORD}" | base64 | tr -d '\n')"

curl -fsS -X POST "${HOST}/api/v1/users/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${ENCODED}\"}" \
  | python3 -c 'import json, sys; print(json.load(sys.stdin)["accessToken"])'
