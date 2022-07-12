# !/bin/bash
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

: "${HOST:="''"}"
: "${PORT:="''"}"
: "${PROJECT_NAME:="''"}"

HOST=$HOST \
PORT=$PORT \
PROJECT=$PROJECT_NAME \
docker-compose -f docker-compose.yml up
