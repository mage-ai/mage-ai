# Mage and Native Cloud Environments

Just like a traditional notebook, Mage supports execution in native cloud environments. Below are guides on how to integrate with native cloud resources.

-   [Amazon EC2](#amazon-ec2)
-   [Amazon ECS](#amazon-ecs)

# Amazon EC2

Mage can be run in an Amazon EC2 instance, either by

-   using SSH to port forward localhost requests to your EC2 instance
-   opening port 6789 on your EC2 instance for access

## Prerequistes

Your EC2 instance must have `python3` installed. All Python versions between 3.7.0 (inclusive) and 3.10.0 (exclusive) are supported.

## Quick Connection via SSH

We provide the `scripts/run_ec2.sh` script to launch Mage in an EC2 instance. Currently only connections via SSH are supported. To access this script clone this repository.

To run Mage in an EC2 instance, you need to provide

-   Path to the key pair used with the EC2 instance
-   Your EC2 instance username
-   Your EC2 public DNS name

```bash
./scripts/run_ec2.sh path_to_key_pair ec2_user_name ec2_public_dns_name [--name custom_repo_name]
```

This script will

1. Connect to your EC2 instance
2. Install Mage if not already installed on instance
3. Create a default repository (default repository name is 'default_repo', use `--name` to specify your own custom repository name)
4. Launch the Mage tool pointing at this repository

To access the Mage tool, open [localhost:6789](http://localhost:6789). All actions made here will be forwarded to your EC2 instance for execution.

To quit out of Mage, stop execution in your current terminal window (Ctrl+C). This will shutdown the Mage tool alongside closing the connection to your EC2 instance.

## Manual connection via Open Port

You can also connect to the Mage app running on your EC2 instance by editing your security group to expose the port that Mage runs on.

1. When creating your EC2 instance, edit your security group rules to allow a Custom TCP connection to port 6789 (the port that Mage runs on).
2. Connect to your EC2 instance via SSH and install Mage if you haven't already:
    ```bash
    ssh -i path/to/key/pair.pem ec2_username@ec2_public_dns_name
    pip install mage-ai
    ```
3. Start Mage on your EC2 instance:

    ```bash
    mage init <your_repo_name>
    mage start <your_repo_name>
    ```

4. Then from your browser, access `<ec2-instance-public-ip>:6789` to access the Mage app, where `ec2-instance-public-ip` is the Public IPv4 address of your EC2 instance.

## Manual connection via SSH

You can also manually start a connection to the Mage tool running on an EC2 instance. This process involves opening two separate SSH connections:

1. Connect to the EC2 instance to run the Mage Tool. First, open an SSH connection with your EC2 Key Pair and your EC2 login information to connect the EC2 instance.

    ```bash
    ssh -i path/to/key/pair.pem ec2_username@ec2_public_dns_name
    ```

    If the Mage tool is not installed, install Mage using `pip`. It is recommended to use a virtual environment to store the Python packages to isolate your Python dependencies per project.

    ```bash
    python3 -m venv env
    source ./env/bin/activate
    pip3 install mage-ai
    ```

    Next, initalize your Mage repository using `mage init`. You can change your repository name as per your preference.

    ```bash
    mage init default_repo
    ```

    Then start the Mage app. This will start the notebook at [localhost:6789](http://localhost:6789), but you can't directly access it yet as this notebook is started and is executed on the EC2 instance

    ```bash
    mage start default_repo
    ```

2. Forward all requests sent to [localhost:6789](http://localhost:6789) on _your_ computer back to the EC2 instance. This means that as you interact the user interface on your computer, the data will be forwarded to the EC2 instance for execution. Open another terminal window and run
    ```bash
    ssh -i path/to/key/pair.pem -N -L 6789:localhost:6789 ec2_username@ec2_public_dns_name
    ```
    which opens up a SSH connection to your EC2 instance which forwards requests to your localhost.
    - The `-N` option tells your SSH client to not send user commands to the EC2 server through this connection since this connection is only for port forwarding

Now you can access the Mage tool at [localhost:6789](http://localhost:6789) on your computer, and all executions will be processed on your EC2 instance!

# Amazon ECS

You can launch Mage in an Amazon Elastic Container Service (ECS) cluster.

## Mage Dockerfile

Below is an example Dockerfile that you can use run the Mage data prep tool. You will need to upload this image to Amazon Elastic Container Registry (ECR) or another Docker image repository in order to use this image to launch instances in your ECS cluster.

```Dockerfile
FROM python
LABEL description="Deploy Mage on ECS"
ARG PIP=pip3
USER root

# Install Mage
RUN ${PIP} install mage-ai

# Set up spark kernel
RUN mkdir ~/.sparkmagic
RUN wget https://raw.githubusercontent.com/jupyter-incubator/sparkmagic/master/sparkmagic/example_config.json
RUN mv example_config.json ~/.sparkmagic/config.json
RUN sed -i 's/localhost:8998/host.docker.internal:9999/g' ~/.sparkmagic/config.json
RUN jupyter-kernelspec install --user $(pip show sparkmagic | grep Location | cut -d" " -f2)/sparkmagic/kernels/pysparkkernel


ENV PYTHONPATH="${PYTHONPATH}:/home/src"

WORKDIR /home/src
```
## Running the Mage App in ECS
Follow the steps below to launch the Mage app on your ECS cluster:
1. If not already created, create a new ECS cluster. Both Fargate and EC2 based clusters work for this task.
2. Create a new task definition based off the template below. This task, when run:
   1. Creates a new Mage repository named "default_repo".
   2. Starts the Mage app, serving requests from the host "localhost:6789"

    ```json
    {
        "containerDefinitions": [
            {
                "name": "mage-data-prep-start",
                "image": "[aws_account_id].dkr.ecr.[region].amazonaws.com/[your-image-repo-name]:[tag]",
                "portMappings": [
                    {
                        "containerPort": 6789,
                        "hostPort": 6789,
                        "protocol": "tcp"
                    }
                ],
                "essential": true,
                "entryPoint": ["sh", "-c"],
                "command": [
                    "mage init default_repo && mage start default_repo"
                ],
                "interactive": true,
                "pseudoTerminal": true
            }
        ],
        "family": "mage-data-prep",
        "networkMode": "awsvpc",
        "requiresCompatibilities": ["FARGATE", "EC2"],
        "cpu": "256",
        "memory": "512",
    }
    ```

    You must specify the  Docker image URI (`"image"`). If using ECR, you can use the template below, but must provide:
    - `aws_account_id` - AWS Account ID
    - `region` - region in which ECR is being used
    - `your-image-repo-name` - name of the repository holding your repo
    - `tag` - tag for the version of the image to use

    In addition, you may want to tweak the allocated CPU and Memory resources based on the type of data you plan to handle and intensity of the computations performed.
3. Launch the task in your new cluster. Make sure the following conditions are met:
   - The task is launched in a VPC that has a public subnet with a public IP address assigned (enable the setting to create a public IP address)
   - The security group with which the task is launched allows a Custom TCP connection inbound to port 6789 from your IP (or the IP with which the app will be accessed). This will enable you to connect securely to the task and access the Mage App
4. Once the task is running, find the public IP of your task. To access the Mage app, go to `your-public-ip:6789`. If you followed the previous steps correctly, you should be able to access the Mage app running in your cluster!

## Running Mage Pipeline in ECS
Follow the below steps to run a Mage pipeline on an ECS cluster. We will be pulling