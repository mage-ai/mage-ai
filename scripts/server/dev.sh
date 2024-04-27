#!/bin/bash

# Exit the script on any command failure
set -e

# Install dependencies
pip install -r /home/src/$PROJECT/requirements.txt

# Base command
cmd="python mage_ai/server/server.py"

# Checking and appending HOST if exists
if [ ! -z "$HOST" ]; then
  cmd+=" --host $HOST"
fi

# Checking and appending PORT if exists
if [ ! -z "$PORT" ]; then
  cmd+=" --port $PORT"
fi

# Checking and appending PROJECT if exists
if [ ! -z "$PROJECT" ]; then
  cmd+=" --project $PROJECT"
fi

# Checking and appending MANAGE_INSTANCE if exists
if [ ! -z "$MANAGE_INSTANCE" ]; then
  cmd+=" --manage-instance $MANAGE_INSTANCE"
fi

# Execute the command
eval $cmd
