#!/bin/bash

# exit immediately on failure, or if an undefined variable is used
set -eu

# Log in to ECR
printf "\n-> Logging in to ECR...\n";
$(aws ecr get-login --region us-east-1 --no-include-email)
printf "\n-> Logged in to ECR!\n";

# Build, tag and push Docker images
printf "\n-> Building and pushing Docker images to ECR...\n";
docker build --tag $REPOSITORY_URL:$ENV --tag $REPOSITORY_URL:$BUILDKITE_COMMIT .
docker push $REPOSITORY_URL:$ENV
docker push $REPOSITORY_URL:$BUILDKITE_COMMIT
printf "\n-> Docker images built and pushed to ECR!\n";

# Update ECS services
printf "\n-> Updating ECS services...\n";
IFS=', ' read -r -a SERVICES <<< "$SERVICES_NAMES" # Parse services names list

for SERVICE in "${SERVICES[@]}"
do
    TASK_DEFINITION_ARN=$(aws ecs describe-services --cluster "$CLUSTER_NAME" --service "$SERVICE" | jq -r '.services[0].taskDefinition')
    TASK_DEFINITION=$(aws ecs describe-task-definition --task-definition "$TASK_DEFINITION_ARN" --region "us-east-1")
    TASK_DEFINITION_FAMILY=$(aws ecs describe-task-definition --task-definition "$TASK_DEFINITION_ARN" | jq -r '.taskDefinition.family')
    # Update IMAGE value and add DD_VERSION variable
    NEW_TASK_DEFINITION=$(echo $TASK_DEFINITION | jq --arg BUILDKITE_COMMIT "$BUILDKITE_COMMIT" --arg IMAGE "$REPOSITORY_URL:$BUILDKITE_COMMIT" '.taskDefinition | .containerDefinitions[0].image = $IMAGE | .containerDefinitions[0].environment += [{"name": "DD_VERSION", "value": "'$BUILDKITE_COMMIT'"}] | del(.taskDefinitionArn) | del(.revision) | del(.status) | del(.requiresAttributes) | del(.registeredAt) | del(.registeredBy) | del(.compatibilities)')
    NEW_TASK_INFO=$(aws ecs register-task-definition --region "us-east-1" --cli-input-json "$NEW_TASK_DEFINITION")
    NEW_REVISION=$(echo $NEW_TASK_INFO | jq '.taskDefinition.revision')
    aws ecs update-service --cluster ${CLUSTER_NAME} \
                       --service ${SERVICE} \
                       --task-definition ${TASK_DEFINITION_FAMILY}:${NEW_REVISION} &> /dev/null
done
printf "\n-> ECS services updated!\n";

# Wait for ECS services to be deployed
printf "\n-> Waiting for the deployment to be ready...\n";
until aws ecs wait services-stable --cluster ${CLUSTER_NAME} --services $(echo $SERVICES_NAMES | tr ',' ' ')
do
    printf "..."
    sleep 1
done
printf "\n-> Deployment ready!\n";
