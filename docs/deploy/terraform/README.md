# Terraform

<img
  alt="Terraform"
  src="https://www.vectorlogo.zone/logos/terraformio/terraformio-ar21.png"
  width="300"
/>

Deploy Mage to your cloud provider using Terraform.

Cloud providers currently supported with Mage Terraform scripts:

- AWS
- Azure
- *GCP (coming soon)*

<br />

## Pre-install

Clone this repository:

```bash
git clone https://github.com/mage-ai/mage-ai.git
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

- [AWS](./AWS.md)
- [Azure](./Azure.md)
- *GCP (coming soon)*

<br />
