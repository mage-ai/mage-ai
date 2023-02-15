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

REQUIREMENTS_FILE="${PROJECT_PATH}/requirements.txt"
if [ -f "$REQUIREMENTS_FILE" ]; then
    echo "$REQUIREMENTS_FILE exists."
    pip3 install -r $REQUIREMENTS_FILE
fi

if [ "$#" -gt 0 ]; then
    echo "Execute command: ${@}"
    "$@"
else
    echo "Starting project at ${PROJECT_PATH}"
    if [[ ! -z "${DBT_DOCS_INSTANCE}" ]]; then
        mage start $PROJECT_PATH --dbt-docs-instance 1
    elif [[ ! -z "${MANAGE_INSTANCE}" ]]; then
        mage start $PROJECT_PATH --manage-instance 1
    else
        mage start $PROJECT_PATH
    fi
fi
