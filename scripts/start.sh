#!/bin/bash
PROJECT_NAME="$1"

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$2"

case $key in
    --host)
    HOST="$3"
    shift # past argument
    shift # past value
    ;;
    --port)
    PORT="$3"
    shift # past argument
    shift # past value
    ;;
    *)    # unknown option
    POSITIONAL+=("$1") # save it in an array for later
    shift # past argument
    ;;
esac
done
set -- "${POSITIONAL[@]}" # restore positional parameters


: "${HOST:="localhost"}"
: "${PORT:="6789"}"
: "${PROJECT_NAME:=""}"

HOST=$HOST \
PORT=$PORT \
PROJECT=$PROJECT_NAME \
docker-compose run --service-ports server python mage_ai/cli/main.py start $PROJECT_NAME --host $HOST --port $PORT
