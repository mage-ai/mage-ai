#!/bin/sh

# Get the current working directory
CWD=$(pwd)/mage_ai/frontend

bash "$CWD/mage_ai/frontend/scripts/clean.sh" "$CWD"


NODE_ENV=production yarn --cwd "$CWD" export_prod
