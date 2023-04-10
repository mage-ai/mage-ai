#!/bin/bash
PROJECT_NAME="$1"

: "${PROJECT_NAME:="default_repo"}"

HOST='' \
PORT='' \
PROJECT='' \
docker_version=$(docker version --format '{{.Server.Version}}')
if [[ "$docker_version" == 2*.* ]]; then
  docker compose run server python mage_ai/cli/main.py init $PROJECT_NAME
else
  docker-compose run server python mage_ai/cli/main.py init $PROJECT_NAME
fi

