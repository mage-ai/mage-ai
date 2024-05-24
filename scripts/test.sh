#!/bin/bash
set -e

git diff --name-only master...HEAD | \
  grep -v '^mage_ai/server/frontend_dist/' | \
  grep -v '^mage_ai/server/frontend_dist_base_path_template/' | \
  grep -E '\.(js|jsx|ts|tsx)$' | \
  xargs prettier --config mage_ai/frontend/.prettierrc --write

git diff --name-only master...HEAD | \
  grep -v '^mage_ai/server/frontend_dist/' | \
  grep -v '^mage_ai/server/frontend_dist_base_path_template/' | \
  grep -E '\.(js|jsx|ts|tsx)$' | \
  xargs eslint_d --quiet --config mage_ai/frontend/.eslintrc.js --fix --ext .js,.jsx,.ts,.tsx

HOST='' PORT='' PROJECT='' docker compose run --rm test-frontend yarn type 2>/dev/null

git diff --name-only master...HEAD | \
  grep -v '^mage_ai/server/frontend_dist/' | \
  grep -v '^mage_ai/server/frontend_dist_base_path_template/' | \
  grep -E '\.(py)$' | \
  xargs poetry run pre-commit run --show-diff-on-failure --files
