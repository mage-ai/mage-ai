# Terraform AWS

## Environment variables

Set these environment variables on your machine
so that Terraform can use your credentials to perform all necessary operations

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

<br />

## Configurable settings

<b>Docker image</b>

In the file [./scripts/deploy/terraform/aws/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/aws/variables.tf),
you can change the default Docker image:

```
variable "docker_image" {
  description = "Docker image url used in ECS task."
  default     = "mageai/mageai:latest"
}
```

<b>Region</b>

In the file [./scripts/deploy/terraform/aws/main.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/aws/main.tf),
you can change the region:

```
provider "aws" {
  region  = "us-west-2"
}
```

<b>More</b>

Other variables defined in [./scripts/deploy/terraform/aws/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/aws/variables.tf)
can also be customized to your needs.

<br />

## Configurable variables

In the [`mage-ai/scripts/deploy/terraform/aws/env_vars.json`](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/aws/env_vars.json)
file, you can edit the following variables, which are used by the tool while running in the cloud:

Change the value of the variables with the following names to match the actual values you want
the tool to use while running in the cloud:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

These variable values are used by the tool to retrieve AWS resources like CloudWatch events, etc.

<br />

## Deploying

<b>Using CLI</b>

1. Change directory into scripts folder:
```bash
cd scripts/deploy/terraform/aws
```

2. Initialize Terraform:
```bash
terraform init
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
docker run -i -t -v $(pwd):/mage --workdir="/mage/scripts/deploy/terraform/aws" \
  hashicorp/terraform:latest init
```

2. Deploy:
```bash
docker run -i -t -v $(pwd):/mage --workdir="/mage/scripts/deploy/terraform/aws" \
  --env AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
  --env AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
  hashicorp/terraform:latest apply
```

<br />

## Security

- Update security group name `mage-data-prep-sg` to whitelist IPs

<br />
