# Terraform

<img
  alt="Terraform"
  src="https://www.vectorlogo.zone/logos/terraformio/terraformio-ar21.png"
  width="300"
/>

Deploy Mage to your cloud provider using Terraform.

Cloud providers currently supported with Mage Terraform scripts:

- AWS
- *GCP (coming soon)*

<br />

## Install Terraform CLI

<b>Using Homebrew</b>

```bash
brew tap hashicorp/tap && brew install hashicorp/tap/terraform
```

<br />

<b>Using Docker</b>

```bash
docker pull hashicorp/terraform:latest
```

<br />

## Environment variables

### AWS
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

<br />

## Configurable settings

<b>Docker image</b>

```
variable "docker_image" {
  description = "Docker image url used in ECS task."
  default     = "mageai/mageai:latest"
}
```

### AWS

<b>Region</b>

```
provider "aws" {
  region  = "us-west-2"
}
```

<br />

## Deploying

### AWS

<b>Using CLI</b>

1. Change directory into scripts folder:
```bash
cd scripts/deploy/terraform/aws
```

1. Initialize Terraform:
```bash
terraform init
```

1. Deploy:
```bash
terraform apply
```

<br />

<b>Using Docker</b>

1. Initialize Terraform:
```bash
docker run -i -t -v $(pwd):/mage --workdir="/mage/scripts/deploy/terraform/aws" \
  hashicorp/terraform:latest init
```

1. Deploy:
```bash
docker run -i -t -v $(pwd):/mage --workdir="/mage/scripts/deploy/terraform/aws" \
  --env AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  --env AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  hashicorp/terraform:latest apply
```
