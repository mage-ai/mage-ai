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
    --enable_new_relic)
    ENABLE_NEW_RELIC="$3"
    shift # past argument
    shift # past value
    ;;
    --enable_prometheus)
    ENABLE_PROMETHEUS=1
    shift # past argument
    shift # past value
    ;;
    --otel_exporter_otlp_endpoint)
    OTEL_EXPORTER_OTLP_ENDPOINT="$3"
    shift # past argument
    shift # past value
    ;;
    --otel_exporter_otlp_http_endpoint)
    OTEL_EXPORTER_OTLP_HTTP_ENDPOINT="$3"
    shift # past argument
    shift # past value
    ;;
    --otel_python_tornado_excluded_urls)
    OTEL_PYTHON_TORNADO_EXCLUDED_URLS="$3"
    shift # past argument
    shift # past value
    ;;
    --huggingface_api)
    HUGGINGFACE_API="$3"
    shift # past argument
    shift # past value
    ;;
    --huggingface_inference_api_token)
    HUGGINGFACE_INFERENCE_API_TOKEN="$3"
    shift # past argument
    shift # past value
    ;;
    --gcp_project_id)
    GCP_PROJECT_ID="$3"
    shift # past argument
    shift # past value
    ;;
    --gcp_path_to_credentials)
    GCP_PATH_TO_CREDENTIALS="$3"
    shift # past argument
    shift # past value
    ;;
    --gcp_region)
    GCP_REGION="$3"
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
    --new_relic_config_path)
    NEW_RELIC_CONFIG_PATH="$3"
    shift # past argument
    shift # past value
    ;;
    --openai_api_key)
    OPENAI_API_KEY="$3"
    shift # past argument
    shift # past value
    ;;
    --database_connection_url)
    DATABASE_CONNECTION_URL="$3"
    shift # past argument
    shift # past value
    ;;
    --require-user-authentication)
    REQUIRE_USER_AUTHENTICATION=1
    shift # past argument
    shift # past value
    ;;
    --require-user-permissions)
    REQUIRE_USER_PERMISSIONS=1
    shift # past argument
    shift # past value
    ;;
    --debug)
    DEBUG=1
    shift # past argument
    shift # past value
    ;;
    --spark)
    SPARK=1
    shift # past argument
    shift # past value
    ;;
    --data_dir)
    MAGE_DATA_DIR=1
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
export ENABLE_NEW_RELIC=$ENABLE_NEW_RELIC
export ENABLE_PROMETHEUS=$ENABLE_PROMETHEUS
export OTEL_EXPORTER_OTLP_ENDPOINT=$OTEL_EXPORTER_OTLP_ENDPOINT
export OTEL_EXPORTER_OTLP_HTTP_ENDPOINT=$OTEL_EXPORTER_OTLP_HTTP_ENDPOINT
export OTEL_PYTHON_TORNADO_EXCLUDED_URLS=$OTEL_PYTHON_TORNADO_EXCLUDED_URLS

export GCP_PROJECT_ID=$GCP_PROJECT_ID
export GCP_PATH_TO_CREDENTIALS=$GCP_PATH_TO_CREDENTIALS
export GCP_REGION=$GCP_REGION

export HUGGINGFACE_API=$HUGGINGFACE_API
export HUGGINGFACE_INFERENCE_API_TOKEN=$HUGGINGFACE_INFERENCE_API_TOKEN
export DATABASE_CONNECTION_URL=$DATABASE_CONNECTION_URL
export DEUS_EX_MACHINA=$DEUS_EX_MACHINA
export DISABLE_API_TERMINAL_OUTPUT=$DISABLE_API_TERMINAL_OUTPUT
export DISABLE_DATABASE_TERMINAL_OUTPUT=$DISABLE_DATABASE_TERMINAL_OUTPUT
export MAX_NUMBER_OF_FILE_VERSIONS=$MAX_NUMBER_OF_FILE_VERSIONS
export NEW_RELIC_CONFIG_PATH=$NEW_RELIC_CONFIG_PATH
export OPENAI_API_KEY=$OPENAI_API_KEY
export REQUIRE_USER_AUTHENTICATION=$REQUIRE_USER_AUTHENTICATION
export REQUIRE_USER_PERMISSIONS=$REQUIRE_USER_PERMISSIONS
export DEBUG=$DEBUG
export MAGE_DATA_DIR=$MAGE_DATA_DIR

UP_SERVICES="server app"

if [[ "$SPARK" == "1" ]]; then
    UP_SERVICES="server_spark app_spark"
fi

if command -v docker-compose &> /dev/null
then
    # docker-compose exists
    HOST=$HOST \
    PORT=$PORT \
    PROJECT=$PROJECT_NAME \
    MANAGE_INSTANCE=$MANAGE_INSTANCE \
    docker-compose -f docker-compose.yml up $UP_SERVICES
else
    # docker-compose does not exist
    HOST=$HOST \
    PORT=$PORT \
    PROJECT=$PROJECT_NAME \
    MANAGE_INSTANCE=$MANAGE_INSTANCE \
    docker compose -f docker-compose.yml up $UP_SERVICES
fi
