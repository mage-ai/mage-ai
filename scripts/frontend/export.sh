#!/bin/sh

# Get the current working directory
CWD=$(pwd)/mage_ai/frontend

# bash "$CWD/mage_ai/frontend/scripts/clean.sh" "$CWD"

export NODE_ENV=production

NODE_ENV=$NODE_ENV yarn --cwd "$CWD" export_prod
