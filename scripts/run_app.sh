#!/bin/bash
set -eo pipefail

PROJECT_PATH="default_repo"

if [[ ! -z "${FILESTORE_IP_ADDRESS}" && ! -z "${FILE_SHARE_NAME}" ]]; then
    echo "Mounting Cloud Filestore ${FILESTORE_IP_ADDRESS}:/${FILE_SHARE_NAME}"
    mount -o nolock $FILESTORE_IP_ADDRESS:/$FILE_SHARE_NAME /home/src
    echo "Mounting completed."
fi

if [[ ! -z "${USER_CODE_PATH}" ]]; then
    PROJECT_PATH=$USER_CODE_PATH
fi

echo "Starting project at ${PROJECT_PATH}"
if [[ ! -z "${DBT_DOCS_INSTANCE}" ]]; then
    mage start $PROJECT_PATH --dbt-docs-instance 1
else
    mage start $PROJECT_PATH
fi

# Exit immediately when one of the background processes terminate.
wait -n
