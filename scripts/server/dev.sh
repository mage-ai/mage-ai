#!/bin/bash

pip install -r requirements.txt

python mage_ai/server/server.py --host $HOST --port $PORT --project $PROJECT --manage-instance $MANAGE_INSTANCE
