#!/bin/bash
PROJECT_NAME="$1"

: "${PROJECT_NAME:="default_repo"}"


docker_version=$(docker version --format '{{.Server.Version}}')
if [[ "$docker_version" == 2*.* ]]; then
  HOST='' \
  PORT='' \
  PROJECT='' \
  docker-compose run server python mage_ai/cli/main.py init $PROJECT_NAME
else
  HOST='' \
  PORT='' \
  PROJECT='' \
  docker-compose run server python mage_ai/cli/main.py init $PROJECT_NAME
fi

