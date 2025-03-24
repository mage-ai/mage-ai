#!/bin/bash
set -e

SHELL_MODE=false

while [[ $# -gt 0 ]]
do
    case "$1" in
        --shell)
            SHELL_MODE=true
            shift # past argument
            ;;
        *)    # unknown option
            POSITIONAL+=("$1") # save it in an array for later
            shift # past argument
            ;;
    esac
done

# If SHELL_MODE is true, run the ipython shell using docker-compose
if [ "$SHELL_MODE" = true ]; then
    HOST='' PORT='' PROJECT='' docker compose run py ipython
else
  HOST='' PORT='' PROJECT='' docker compose run py python3 "${POSITIONAL[@]}"
fi
