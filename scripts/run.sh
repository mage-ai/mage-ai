# !/bin/bash
PROJECT="$1"
PIPELINE="$2"

: "${PROJECT:=""}"
: "${PIPELINE:=""}"

PROJECT_PATH=$PROJECT docker-compose run server python mage_ai/command_line.py run $PROJECT $PIPELINE
