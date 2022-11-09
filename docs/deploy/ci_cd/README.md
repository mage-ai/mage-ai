# CI/CD

## Local to cloud

1. Create a parent folder for your Mage project (e.g. `my_team`).
1. Change directory (e.g. `cd my_team`) into the parent folder and start Mage locally:
    For example:
    ```bash
    docker run -it -p 6789:6789 -v $(pwd):/home/src mageai/mageai \
      mage start demo_project
    ```

    For more examples, read the [setup guide](../../tutorials/quick_start/setup.md).

1. Once you’re done developing, copy the contents of the `mage-ai/templates/docker/Dockerfile`
and paste it into a new `Dockerfile` located in the parent folder of your Mage project (e.g. `my_team/Dockerfile`).
    The contents of `mage-ai/templates/docker/Dockerfile` are:
    ```
    FROM mageai/mageai:latest

    WORKDIR /home/src

    COPY . .

    RUN pip3 install -r $(ls -d */ | head -1)/requirements.txt

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
    docker build --tag mageprod:latest .
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
