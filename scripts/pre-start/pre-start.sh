#!/bin/bash
set -eo pipefail

python3 /app/create_pre_start.py --template-path /app/kubernetes_pre_start_template.py
python3 /app/kubernetes_pre_start.py --name $WORKSPACE_NAME --namespace $KUBE_NAMESPACE
