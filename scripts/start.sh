# !/bin/bash
PROJECT="$1"

: "${PROJECT:=""}"

PROJECT_PATH=$PROJECT docker-compose run server python mage_ai/command_line.py start $PROJECT
