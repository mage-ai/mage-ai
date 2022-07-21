# Mage and Native Cloud Environments
Just like a traditional notebook, Mage supports execution in native cloud environments. Below are guides on how to integrate with native cloud resources.
- [Amazon EC2](#amazon-ec2)

Below are guides on how to use these launch scripts
## Amazon EC2
Mage can be run in an Amazon EC2 instance, either by [manually setting up a connection](#manual-connection) or by using the [Quick Connection](#quick-connection) script provided.

### Prerequistes
The only prerequisite is that your EC2 instance must have `python3` installed.
### Quick Connection

We provide the `scripts/run_ec2.sh` script to launch Mage in an EC2 instance. Currently only connections via SSH are supported. To access this script clone this repository.

To run Mage in an EC2 instance, you need to provide
- Path to the key pair used with the EC2 instance
- Your EC2 instance username
- Your EC2 public DNS name

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

### Manual connection
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

2. Forward all requests sent to [localhost:6789](http://localhost:6789) on _your_ computer back to the EC2 instance. This means that as you interact the user interface on your computer, the data will be forwarded to the EC2 instance  for execution. Open another terminal window and run
    ```bash
    ssh -i path/to/key/pair.pem -N -L 6789:localhost:6789 ec2_username@ec2_public_dns_name
    ```
    which opens up a SSH connection to your EC2 instance which forwards requests to your localhost.
    - The `-N` option tells your SSH client to not send user commands to the EC2 server through this connection, especially since this connection is only for port forwarding

Now you can access the Mage tool at [localhost:6789](http://localhost:6789) on your computer, and all executions will be processed on your EC2 instance!