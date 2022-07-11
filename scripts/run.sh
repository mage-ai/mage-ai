# !/bin/bash
POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    --project)
    PROJECT="$2"
    shift # past argument
    shift # past value
    ;;
    --pipeline)
    PIPELINE="$2"
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

: "${PROJECT:=""}"
: "${PIPELINE:=""}"

PROJECT_PATH=$PROJECT docker-compose run server python mage_ai/command_line.py run $PROJECT $PIPELINE
