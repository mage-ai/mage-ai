# !/bin/bash
PROJECT="$1"

: "${PROJECT:=""}"

PROJECT_PATH=$PROJECT docker-compose -f docker-compose.yml up
