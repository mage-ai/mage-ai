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
    --ecs_cluster_name)
    ECS_CLUSTER_NAME="$3"
    shift # past argument
    shift # past value
    ;;
    --ecs_task_definition)
    ECS_TASK_DEFINITION="$3"
    shift # past argument
    shift # past value
    ;;
    --ecs_container_name)
    ECS_CONTAINER_NAME="$3"
    shift # past argument
    shift # past value
    ;;
    --database_connection_url)
    DATABASE_CONNECTION_URL="$3"
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
    --manage-instance)
    MANAGE_INSTANCE=1
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
: "${MANAGE_INSTANCE:="''"}"

export AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY

export ECS_CLUSTER_NAME=$ECS_CLUSTER_NAME
export ECS_TASK_DEFINITION=$ECS_TASK_DEFINITION
export ECS_CONTAINER_NAME=$ECS_CONTAINER_NAME

export DATABASE_CONNECTION_URL=$DATABASE_CONNECTION_URL

HOST=$HOST \
PORT=$PORT \
PROJECT=$PROJECT_NAME \
MANAGE_INSTANCE=$MANAGE_INSTANCE \
docker-compose -f docker-compose.yml up
