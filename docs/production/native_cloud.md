# Mage and Native Cloud Environments
Just like a traditional notebook, Mage supports execution in native cloud environments. We provide a set of utility scripts that allow you quickly get started running Mage in the your private cloud. The following services currently have launch scripts
- [Amazon EC2](#ec2)

Below are guides on how to use these launch scripts
## Amazon EC2
We provide the `scripts/run_ec2.sh` script to launch Mage in an EC2 instance. Currently only connections via SSH are supported.

### Prerequistes
The only prerequisite is that your EC2 instance must have `python3` installed.

### Usage
To run Mage in an EC2 instance, you need to provide
- Path to the key pair used with the EC2 instance
- Your EC2 instance username
- Your EC2 public DNS name

```bash
./scripts/run_ec2.sh path_to_key_pair ec2_user_name ec2_public_dns_name [--name custom_repo_name]
```
This script will
1. Connect to your EC2 instance
2. Install Mage
3. Create a default repository (default repository name is 'default_repo', use `--name` to specify your own custom repository name)
4. Launch the Mage tool pointing at this repository

To access the Mage tool, open [localhost:6789](http://localhost:6789). All actions made here will be forwarded to your EC2 instance for execution.

To quit out of Mage, stop execution in your current terminal window (Ctrl+C). This will shutdown the Mage tool alongside closing the connection to your EC2 instance.