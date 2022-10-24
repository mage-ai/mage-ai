# Multi-development environment in the cloud

Mage is designed and built to be cloud native. We recommend running your development environment and
production environment in the cloud.
Use Mage’s maintained [Terraform scripts](../../deploy/terraform/README.md) to deploy to cloud.

You can manage your cloud development environment with Mage.
Each developer on your team can have access to their own Mage server with a unique IP.

Each developer’s environment will run on cloud resources but won’t impact other developers’
environments or their code. The code each developer writes is stored under a separate directory
that won’t conflict with other developers’ code.

Your team can use [Git for version control](../../guides/version_control/Git.md) in the cloud.

<img src="https://github.com/mage-ai/assets/blob/main/multi-dev-cloud-env.jpg?raw=true" />
