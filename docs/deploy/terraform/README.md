# Terraform

![](https://user-images.githubusercontent.com/78053898/198754720-d6b1e5bd-caa8-431e-a4cb-e26743c0ef36.png)

Deploy Mage to your cloud provider using Terraform.

Cloud providers currently supported with Mage Terraform scripts:

- AWS
- Azure
- GCP

<br />

## Pre-install

Clone Mage’s [Terraform template repository](https://github.com/mage-ai/mage-ai-terraform-templates):

```bash
git clone https://github.com/mage-ai/mage-ai-terraform-templates.git
```

<br />

## Install Terraform CLI

<b>Using Homebrew</b>

```bash
brew tap hashicorp/tap && brew install hashicorp/tap/terraform
```

<b>Using Docker</b>

```bash
docker pull hashicorp/terraform:latest
```

<br />

## Cloud specific Terraform instructions

Read the following documentation for the cloud provider of your choice:

- [Amazon Web Services (AWS)](./AWS.md)
- [Microsoft Azure](./Azure.md)
- [Google Cloud Platform (GCP)](./GCP.md)

<br />
