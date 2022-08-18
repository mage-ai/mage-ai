# !/bin/bash
PROJECT_NAME="$1"

: "${PROJECT_NAME:="default_repo"}"

HOST='' \
PORT='' \
PROJECT='' \
docker-compose run server python mage_ai/cli/main.py init $PROJECT_NAME
