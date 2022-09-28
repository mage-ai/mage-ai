# Terraform Azure

<img
  alt="Azure"
  src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Microsoft_Azure_Logo.svg/1024px-Microsoft_Azure_Logo.svg.png"
  width="300"
/>

1. [Install Azure CLI](#1-install-azure-cli)
1. [Log into Azure from CLI](#2-log-into-azure-from-cli)
1. [Customize Terraform settings](#3-customize-terraform-settings)
1. [Deploy](#4-deploy)
1. [Misc](#5-misc)

<br />

## 1. Install Azure CLI

Follow these [instructions](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
to install the Azure CLI on your workstation.

<br />

## 2. Log into Azure from CLI

If you don’t already have an account in Azure, create one [here](https://portal.azure.com/).

Once you created an account, from your terminal run the following command to log in:

```bash
az login
```

Your browser will open

<br />

## 3. Customize Terraform settings

<b>Docker image</b>

In the file [./scripts/deploy/terraform/azure/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/azure/variables.tf),
you can change the `default` value under `docker_image`:

```
variable "docker_image" {
  description = "Docker image url."
  default     = "mageai/mageai:latest"
}
```

<b>Region</b>

In the file [./scripts/deploy/terraform/azure/main.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/azure/main.tf),
you can change the `location` value under `resource_group`:

```
resource "azurerm_resource_group" "resource_group" {
  name     = "${var.app_name}-${var.app_environment}"
  location = "West US 2"
}
```

<b>Name of virtual network</b>

In the file [./scripts/deploy/terraform/azure/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/azure/variables.tf),
you can change the `default` value under `app_name`:

```
variable "app_name" {
  type        = string
  description = "Application Name"
  default     = "mage-data-prep"
}
```

### More

Other variables defined in [./scripts/deploy/terraform/azure/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/azure/variables.tf)
can also be customized to your needs.

<br />

## 4. Deploy

<b>Using CLI</b>

1. Change directory into scripts folder:
```bash
cd scripts/deploy/terraform/azure
```

2. Initialize Terraform:
```bash
terraform init
```
A sample output could look like this:
```
Initializing the backend...

Initializing provider plugins...
- Finding latest version of hashicorp/azurerm...
- Finding latest version of hashicorp/http...
- Installing hashicorp/azurerm v3.24.0...
- Installed hashicorp/azurerm v3.24.0 (signed by HashiCorp)
- Installing hashicorp/http v3.1.0...
- Installed hashicorp/http v3.1.0 (signed by HashiCorp)

Terraform has created a lock file .terraform.lock.hcl to record the provider
selections it made above. Include this file in your version control repository
so that Terraform can guarantee to make the same selections by default when
you run "terraform init" in the future.

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

3. Deploy:
```bash
terraform apply
```

<br />

<b>Using Docker</b>

From the root directory of Mage, run the following commands:

1. Initialize Terraform:
```bash
docker run -i -t -v $(pwd):/mage --workdir="/mage/scripts/deploy/terraform/azure" \
  hashicorp/terraform:latest init
```

2. Deploy:
```bash
docker run -i -t -v $(pwd):/mage --workdir="/mage/scripts/deploy/terraform/azure" \
  --env AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  --env AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  hashicorp/terraform:latest apply
```

<br />

## Misc

### Terminate all resources

If you want to delete all resources created from deploying, run the following command:

```bash
terraform destroy
```

A sample output could look like this:
```
Destroy complete! Resources: 10 destroyed.
```

<br />
