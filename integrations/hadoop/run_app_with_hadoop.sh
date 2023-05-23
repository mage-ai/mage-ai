#!/bin/bash

/etc/init.d/ssh start
start-dfs.sh
start-yarn.sh

if [ "$#" -gt 0 ]; then
    echo "Execute command: ${@}"
    /app/run_app.sh "$@"
else
    /app/run_app.sh
fi
