#!/bin/bash
POSITIONAL=()
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    --package)
    PACKAGE="$2"
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

: "${PACKAGE:=""}"

docker-compose run app yarn add $PACKAGE
