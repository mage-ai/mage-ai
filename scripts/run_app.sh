#!/bin/bash
set -eo pipefail

if [[ ! -z "${FILESTORE_IP_ADDRESS}" && ! -z "${FILE_SHARE_NAME}" ]]; then
    echo "Mounting Cloud Filestore ${FILESTORE_IP_ADDRESS}:/${FILE_SHARE_NAME}"
    mount -o nolock $FILESTORE_IP_ADDRESS:/$FILE_SHARE_NAME ./
    echo "Mounting completed."
fi

mage start default_repo

# Exit immediately when one of the background processes terminate.
wait -n
