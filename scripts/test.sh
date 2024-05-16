#!/bin/bash

git diff --name-only master...HEAD | \
  grep -v '^mage_ai/server/frontend_dist/' | \
  grep -v '^mage_ai/server/frontend_dist_base_path_template/' | \
  grep -E '\.(js|jsx|ts|tsx)$' | \
  xargs prettier --config mage_ai/frontend/.prettierrc --write

git diff --name-only master...HEAD | \
  grep -v '^mage_ai/server/frontend_dist/' | \
  grep -v '^mage_ai/server/frontend_dist_base_path_template/' | \
  grep -E '\.(js|jsx|ts|tsx)$' | \
  xargs eslint_d --fix --config mage_ai/frontend/.eslintrc.js

git diff --name-only master...HEAD | \
  grep -v '^mage_ai/server/frontend_dist/' | \
  grep -v '^mage_ai/server/frontend_dist_base_path_template/' | \
  xargs poetry run pre-commit run --show-diff-on-failure --files

# HOST='' \
# PORT='' \
# PROJECT='' \
# docker compose exec app yarn type
