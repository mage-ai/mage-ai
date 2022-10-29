# Terraform Microsoft Azure

![](https://user-images.githubusercontent.com/78053898/198754758-13aed127-73cd-4582-8556-f4f7f84012f9.png)

1. [Install Azure CLI](#1-install-azure-cli)
1. [Log into Azure from CLI](#2-log-into-azure-from-cli)
1. [Customize Terraform settings](#3-customize-terraform-settings)
1. [Deploy](#4-deploy)
1. [Updating Mage versions](#updating-mage-versions)
1. [Misc](#misc)

<br />

## Terraform plan

You can run the following command to see all the resources that will be created by Terraform:

```bash
cd scripts/deploy/terraform/azure
terraform plan
```

By default, here are the <b>[resources](./Azure/Resources.md)</b> that will be created.

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

Your browser will open and have you sign in with an existing Azure account.
Once completed, your terminal will output something like this:

```
[
  {
    "cloudName": "AzureCloud",
    "homeTenantId": "7712a6c4-1684-402f-8d1a-f1bb656e5d40",
    "id": "d17fcd32-b98c-4f81-a881-42b8e811a0e8",
    "isDefault": true,
    "managedByTenants": [],
    "name": "Azure subscription 1",
    "state": "Enabled",
    "tenantId": "7712a6c4-1684-402f-8d1a-f1bb656e5d40",
    "user": {
      "name": "eng@mage.com",
      "type": "user"
    }
  }
]
```

<br />

## 3. Customize Terraform settings

<b>Storage account name (REQUIRED)</b>

The `storage_account_name` must be unique globally. Before running any Terraform commands,
please change the `default` value of variable named `storage_account_name` in the
[./scripts/deploy/terraform/azure/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/azure/variables.tf)
file.

```
variable "storage_account_name" {
  description = "Storage account name. It must be globally unique across Azure."
  default     = "something_very_unique"
}
```

<b>Key vault name (REQUIRED)</b>

The `key_vault_name` must be unique globally. Before running any Terraform commands,
please change the `default` value of variable named `key_vault_name` in the
[./scripts/deploy/terraform/azure/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/azure/variables.tf)
file.

```
variable "key_vault_name" {
  description = "Key vault name. It must be globally unique across Azure."
  default     = "something_very_unique"
}
```

<b>Virtual network name</b>

In the file [./scripts/deploy/terraform/azure/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/azure/variables.tf),
you can change the `default` value under `app_name`:

```
variable "app_name" {
  type        = string
  description = "Application Name"
  default     = "mage-data-prep"
}
```

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

### More

Other variables defined in [./scripts/deploy/terraform/azure/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/azure/variables.tf)
can also be customized to your needs.

<br />

## 4. Deploy

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
A sample output could look like this:
```
Apply complete! Resources: 4 added, 2 changed, 0 destroyed.

Outputs:

id = "/subscriptions/d17fcd12-b89c-4f81-a221-40b8e768a0e8/resourceGroups/mage-data-prep2-production/providers/Microsoft.ContainerInstance/containerGroups/mage-data-prep-production"
ip = "20.3.85.62"
```

In your browser, go to [`http://[IP_address]/`](http://IP_address/).

> Note
>
> Change the `IP_address` to the IP address that was output in your terminal after successfully running `terraform apply`.

<br />

## Updating Mage versions

After Mage is running in your cloud, you can update the Mage Docker image version by running the following command in your CLI tool:

```bash
az container restart --name mage-data-prep-production --resource-group mage-data-prep-production
```

<br />

## Misc

### Security

By default, `terraform apply` will attempt to add your current workstation’s IP address to
the above mentioned security group.

In order to access Mage on Azure from another local workstation,
you must add that IP address to the security group named `mage-data-prep-production-nsg-public`.

> Security group name
>
> Your security group might be named differently because you may have changed your
virtual network name (e.g. `app_name`). The security group you must add the IP to
will end with `-nsg-public`.

### HTTPS enabling

TBD

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
