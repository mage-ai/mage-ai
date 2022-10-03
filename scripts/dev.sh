#!/bin/bash
PROJECT_NAME="$1"

POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$2"

case $key in
    --aws_access_key_id)
    AWS_ACCESS_KEY_ID="$3"
    shift # past argument
    shift # past value
    ;;
    --aws_secret_access_key)
    AWS_SECRET_ACCESS_KEY="$3"
    shift # past argument
    shift # past value
    ;;
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

export AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY

HOST=$HOST \
PORT=$PORT \
PROJECT=$PROJECT_NAME \
docker-compose -f docker-compose.yml up
