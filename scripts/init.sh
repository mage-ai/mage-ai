# !/bin/bash
PROJECT="$1"

: "${PROJECT:="default_repo"}"

PROJECT_PATH=$PROJECT docker-compose run server python mage_ai/command_line.py init $PROJECT
