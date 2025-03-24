#!/bin/bash
PROJECT_NAME="$1"
PIPELINE="$2"

HOST='' \
PORT='' \
PROJECT='' \
docker-compose run server python mage_ai/cli/main.py run $PROJECT_NAME $PIPELINE
