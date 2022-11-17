# CI/CD

1. [Local to cloud](#local-to-cloud)
1. [Using GitHub Actions](#using-github-actions)

<br />

## Local to cloud

1. Create a parent folder for your Mage project (e.g. `my_team`).
1. Change directory (e.g. `cd my_team`) into the parent folder and start Mage locally:
    For example:
    ```bash
    docker run -it -p 6789:6789 -v $(pwd):/home/src mageai/mageai \
      mage start demo_project
    ```

    For more examples, read the [setup guide](../../tutorials/quick_start/setup.md).

1. Once you’re done developing, copy the contents of the this [Dockerfile template](https://github.com/mage-ai/docker/blob/master/Dockerfile)
and paste it into a new `Dockerfile` located in the parent folder of your Mage project (e.g. `my_team/Dockerfile`).
Replace all instances of the string `[project_name]` with your project name. For example, if your
project name is `demo_project`, then your Dockerfile will look like this:
    The contents of your `Dockerfile` are:
    ```
    FROM mageai/mageai:latest

    ARG PROJECT_NAME=[project_name]
    ARG MAGE_CODE_PATH=/home/mage_code
    ARG USER_CODE_PATH=${MAGE_CODE_PATH}/${PROJECT_NAME}

    WORKDIR ${MAGE_CODE_PATH}

    # Replace [project_name] with the name of your project (e.g. demo_project)
    COPY ${PROJECT_NAME} ${PROJECT_NAME}

    # Set the USER_CODE_PATH variable to the path of user project.
    # The project path needs to contain project name.
    # Replace [project_name] with the name of your project (e.g. demo_project)
    ENV USER_CODE_PATH=${USER_CODE_PATH}

    # Install custom Python libraries
    RUN pip3 install -r ${USER_CODE_PATH}/requirements.txt
    # Install custom libraries within 3rd party libraries (e.g. DBT packages)
    RUN python3 /app/install_other_dependencies.py --path ${USER_CODE_PATH}

    ENV PYTHONPATH="${PYTHONPATH}:/home/mage_code"

    CMD ["/bin/sh", "-c", "/app/run_app.sh"]
    ```

1. Your current folder structure should look like this:
    ```
    my_team/
    |   demo_project/
    |   Dockerfile
    ```
1. Build a custom Docker image using `mageai/mageai:latest` as the base and using the
newly created Dockerfile as the additional set of instructions:
    ```
    docker build --platform linux/amd64 --tag mageprod:latest .
    ```

    > Note
    >
    > Change `mageprod` to any other name. You’ll need this tag name when deploying to
    > production in the cloud.

1. To test the new image works, run the following command:
    ```bash
    docker run -it -p 6789:6789 mageprod:latest mage start demo_project
    ```
1. Open your browser and go to http://localhost:6789/
    1. You should see all your pipelines there.
    1. Changing the contents of files won’t change the contents on your local file system
    because all your code was packaged together within the Docker image (this is intentional).
1. The next steps depends on your deployment method. If you are using [Terraform](../terraform/README.md),
then you’ll need to use the previously tag name (e.g. `mageprod`) when pushing a Docker image to a
remote Docker registry.

<br />

## Using GitHub Actions

1. Create a new repository on GitHub.
1. Open your repository on GitHub, then click the tab labeled <b>Settings</b>.
1. Click the section labeled <b>Security</b> on the left hand side to expand it.
1. Click the link labeled <b>Actions</b>.
1. Click the button labeled <b>New repository secret</b> in the top right corner.
1. Follow the instructions below for your specific cloud provider:

### AWS

1. In the field labeled <b>Name</b>, enter the value `AWS_ACCESS_KEY_ID`.
1. In the field labeled <b>Secret</b>, enter your AWS Access Key ID.
1. Click the button labeled <b>Add secret</b> to save.
1. Add a 2nd secret by clicking the button labeled <b>New repository secret</b> in the top right corner.
1. In the field labeled <b>Name</b>, enter the value `AWS_SECRET_ACCESS_KEY`.
1. In the field labeled <b>Secret</b>, enter your AWS Secret Access Key.
1. Click the button labeled <b>Add secret</b> to save.
1. Click on the tab labeled <b>Actions</b>.
1. On the left side, click the button labeled <b>New workflow</b>.
1. Find the link labeled <b>`set up a workflow yourself`</b> and click it.
1. Copy the contents from the GitHub Action YAML file for AWS at
[templates/github_actions/build_and_deploy_to_aws_ecs.yml](https://github.com/mage-ai/mage-ai/blob/master/templates/github_actions/build_and_deploy_to_aws_ecs.yml), and
paste it into the textarea.
1. Change the following values under the key labeled `env`:
    ```yaml
    env:
      AWS_REGION: ...
      CONTAINER_NAME: ...
      ECR_REPOSITORY: ...
      ECS_CLUSTER: ...
      ECS_SERVICE: ...
      ECS_TASK_DEFINITION: ...
    ```

    | Key | Description | Sample value |
    | --- | --- | --- |
    | `AWS_REGION` | Region of your AWS ECS cluster. | `us-west-2` |
    | `CONTAINER_NAME` | Set this to the name of the container in the containerDefinitions section of your task definition. | `mage-data-production-container` |
    | `ECR_REPOSITORY` | The name of the AWS ECR repository you created to store your Docker images. | `mage-data` |
    | `ECS_CLUSTER` | The name of your AWS ECS cluster. | `mage-production-cluster` |
    | `ECS_SERVICE` | The name of your AWS ECS service. | `mage-production-ecs-service` |
    | `ECS_TASK_DEFINITION` | Go to your AWS ECS task definition for the above service. Click on the <b>JSON</b> tab on the task definition detail page. Copy the JSON string content and save it to a file in your root folder containing your Mage project. Use the path to that file as the value in this field. | `some_path/ecs-task-definition.json` |

1. Click the button labeled <b>Start commit</b> in the top right corner.
1. Click the button labeled <b>Commit new file</b>.
1. Every time you merge a pull request into the master branch, this GitHub Action will run, building
a Docker image using your GitHub code, then updating Google Cloud Run to use the new image with
the updated code.

<br />

### Azure

*Coming soon...*

<br />

### GCP

1. In the field labeled <b>Name</b>, enter the value `GCP_CREDENTIALS`.
1. In the field labeled <b>Secret</b>, enter the JSON string containing your GCP service account
credentials. It should look something like this:
    ```json
    {
      "type": "service_account",
      "project_id": "mage-123456",
      "private_key_id": "...",
      "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
      "client_email": "mage@mage-123456.iam.gserviceaccount.com",
      "client_id": "...",
      "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      "token_uri": "https://oauth2.googleapis.com/token",
      "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
      "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/mage%40mage-123456.iam.gserviceaccount.com"
    }
    ```
1. Click the button labeled <b>Add secret</b> to save.
1. Click on the tab labeled <b>Actions</b>.
1. On the left side, click the button labeled <b>New workflow</b>.
1. Find the link labeled <b>`set up a workflow yourself`</b> and click it.
1. Copy the contents from the GitHub Action YAML file for GCP at
[templates/github_actions/build_and_deploy_to_gcp_cloud_run.yml](https://github.com/mage-ai/mage-ai/blob/master/templates/github_actions/build_and_deploy_to_gcp_cloud_run.yml), and
paste it into the textarea.
1. Change the following values under the key labeled `env`:
    ```yaml
    env:
      PROJECT_ID: ...
      GAR_LOCATION: ...
      REPOSITORY: ...
      IMAGE: ...
    ```

    | Key | Description | Sample value |
    | --- | --- | --- |
    | `PROJECT_ID` | Project ID of where you launched Mage using Terraform. | `mage-123456` |
    | `GAR_LOCATION` | Region that Mage is already deployed in. | `us-east1` |
    | `REPOSITORY` | The name of your GCP Artifact Registry that is storing your Docker image. | `mageprod` |
    | `IMAGE` | The name of the Docker image you pushed to the above GCP Artifact Registry. | `mageai` |

1. Click the button labeled <b>Start commit</b> in the top right corner.
1. Click the button labeled <b>Commit new file</b>.
1. Everytime you merge a pull request into the master branch, this GitHub Action will run, building
a Docker image using your GitHub code, then updating Google Cloud Run to use the new image with
the updated code.

<br />
