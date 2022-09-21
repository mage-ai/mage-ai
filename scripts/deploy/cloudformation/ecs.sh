#!/bin/bash

SUBNET="$1"
PARAMETERS=ParameterKey=SubnetID,ParameterValue=${SUBNET}
DIR=$(cd "$(dirname "$0")"; pwd)
TEMPLATE_PATH=file://$DIR/ecs.yaml

aws cloudformation create-stack --stack-name mage-data-preparation \
--template-body $TEMPLATE_PATH \
--capabilities CAPABILITY_NAMED_IAM \
--parameters $PARAMETERS
