#!/bin/bash
set -e

# Initialize the variable to store the value of --stdin-filename
stdin_filename=""

# Loop through all arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        --stdin-filename) stdin_filename="$2"; shift ;;
        *) echo "Unknown parameter: $1"; exit 1 ;;
    esac
    shift # Move to next argument
done

# Use the stdin_filename variable
# echo "The value of --stdin-filename is: $stdin_filename"

# git diff --name-only master...HEAD | \
#   grep -v '^mage_ai/server/frontend_dist/' | \
#   grep -v '^mage_ai/server/frontend_dist_base_path_template/' | \
#   grep -E '\.(js|jsx|ts|tsx)$' | \
  # xargs
# prettier --config mage_ai/frontend/.prettierrc $stdin_filename --write

# git diff --name-only master...HEAD | \
#   grep -v '^mage_ai/server/frontend_dist/' | \
#   grep -v '^mage_ai/server/frontend_dist_base_path_template/' | \
#   grep -E '\.(js|jsx|ts|tsx)$' | \
  # xargs
# eslint_d --quiet --config mage_ai/frontend/.eslintrc.js $stdin_filename --fix
