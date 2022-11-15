# Terraform Amazon Web Services (AWS)

![](https://user-images.githubusercontent.com/78053898/198754745-9e462ffc-1214-47d2-8093-05c88949c08e.png)

1. [Environment variables](#1-environment-variables)
1. [Customize Terraform settings](#2-customize-terraform-settings)
1. [Configurable variables](#3-configurable-variables)
1. [Deploy](#4-deploy)
1. [Misc](#misc)

<br />

## Terraform plan

You can run the following command to see all the resources that will be created by Terraform:

```bash
cd scripts/deploy/terraform/aws
terraform plan
```

By default, here are the <b>[resources](./AWS/Resources.md)</b> that will be created.

<br />

## 1. Environment variables

If you don’t have the AWS CLI installed, you’ll need to create this file: `~/.aws/credentials`.

In that file, add the following values:

```
[default]
aws_access_key_id = XXX
aws_secret_access_key = XXX
```

<br />

## 2. Customize Terraform settings

<b>Application name (optional)</b>

In the file [./scripts/deploy/terraform/aws/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/aws/variables.tf),
you can change the default application name that will appear in AWS ECS:

```
variable "app_name" {
  type        = string
  description = "Application Name"
  default     = "mage-data-prep"
}
```

<b>Docker image (optional)</b>

In the file [./scripts/deploy/terraform/aws/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/aws/variables.tf),
you can change the default Docker image:

```
variable "docker_image" {
  description = "Docker image url used in ECS task."
  default     = "mageai/mageai:latest"
}
```

> Note: Custom Docker images
>
> If you previously tagged a Docker image you built when following this
> [CI/CD guide](../ci_cd/README.md), you must push that locally tagged Docker image to
> Amazon Elastic Container Registry (ECR) before deploying using Terraform.
> Read the [AWS documentation](https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html) to learn more.

1. `docker build --platform linux/amd64 -tag [image_name]:latest .`
1. `docker tag [image_name]:latest [registry_uuid].dkr.ecr.[region].amazonaws.com/[image_name]:latest`
1. `docker push [registry_uuid].dkr.ecr.[region].amazonaws.com/[image_name]:latest`

<b>Region (optional)</b>

In the file [./scripts/deploy/terraform/aws/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/aws/variables.tf),
you can change the region:

```
variable "aws_region" {
  type        = string
  description = "AWS Region"
  default     = "us-west-2"
}
```

<b>Availability zones (optional)</b>

In the file [./scripts/deploy/terraform/aws/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/aws/variables.tf),
you must change the availability zones to match your region from above:

```
variable "availability_zones" {
  description = "List of availability zones"
  default     = ["us-west-2a", "us-west-2b"]
}
```

<b>More</b>

Other variables defined in [./scripts/deploy/terraform/aws/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/aws/variables.tf)
can also be customized to your needs.

<br />

## 3. Configurable environment variables

In the [`mage-ai/scripts/deploy/terraform/aws/env_vars.json`](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/aws/env_vars.json)
file, you can edit the following variables, which are used by the tool while running in the cloud:

Change the value of the variables with the following names to match the actual values you want
the tool to use while running in the cloud:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

These variable values are used by the tool to retrieve AWS resources like CloudWatch events, etc.

<b>Other environment variables</b>

You can add any environment variable you want in this file. These will be set on the running container.

<br />

## 4. Deploy

<b>Using CLI</b>

1. Change directory into scripts folder:
    ```bash
    cd scripts/deploy/terraform/aws
    ```
1. Initialize Terraform:
    ```bash
    terraform init
    ```
    - If you run into errors like the following:
        ```
        │ Error: Failed to install provider
        │
        │ Error while installing hashicorp/template v2.2.0: the local package for registry.terraform.io/hashicorp/template 2.2.0 doesn't match any of the checksums previously recorded in the dependency lock file (this might be because the available checksums are for packages targeting different
        │ platforms); for more information: https://www.terraform.io/language/provider-checksum-verification
        ```
        then run the following commands to resolve this:
        ```
        brew install kreuzwerker/taps/m1-terraform-provider-helper
        m1-terraform-provider-helper activate
        m1-terraform-provider-helper install hashicorp/template -v v2.2.0
        rm .terraform.lock.hcl
        terraform init --upgrade
        ```
1. Deploy:
    ```bash
    terraform apply
    ```

Once it’s finished deploying, you can access Mage in your browser.

1. Open your EC2 dashboard.
1. View all load balancers.
1. Click on the load balancer with the name `mage-data-prep` in it
(if you changed the app name, then find the load balancer with that app name).
1. Find the public DNS name, copy that, and paste it in your browser.

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

### Errors

<b>Page isn’t loading</b>

If you run into connection issues, check to see if your IP is whitelisted in the appropriate
[security group](#security).

<b>503 Forbidden</b>

Check to see if the service task in your ECS cluster is running or if it stopped.

503 typically means that the service task isn’t running and that can be caused by a variety of things.

Open the service task that stopped running and click on the "Logs" tab to see what issues occurred.

<b>`exec /bin/sh: exec format error`</b>

If your cluster is running and the service launches a task that eventually stops, check the logs for
the stopped task. If the logs contain the error above, try re-building your image with the
platform flag `--platform linux/amd64`.

<br />

## Updating Mage versions

After Mage is running in your cloud, you can update the Mage Docker image version by
running the following command in your CLI tool:

```bash
aws ecs update-service --cluster [cluster_name] --service [service_name] --force-new-deployment
```

> `cluster_name`
>
> This is the name of your AWS ECS cluster. Go to the AWS ECS dashboard to view the clusters and
> find the cluster with the name that contains the `app_name` from `variables.tf`.

> `service_name`
>
> This is the name of your AWS ECS service running in your AWS ECS cluster with the name
> identified from above.

<br />

## Misc

### Security

To enable other IP addresses access to Mage, open the security group named
`mage-data-prep-sg` to whitelist IPs.

Add a new inbound rule for HTTP port 80 and use your IP address.

### HTTPS enabling

Terraform creates a load balancer with a HTTP listener by default.

To enable HTTPS for your cloud app, you need to have SSL certificates. You can create a SSL certificate in [AWS Certificate Manager](https://console.aws.amazon.com/acm/home?#/certificates/list).

After you get a certificate, add a HTTPS listener in your load balancer group.
1. Open your EC2 dashboard.
1. View all load balancers.
1. Click on the load balancer with the name `mage-data-prep` in it
(if you changed the app name, then find the load balancer with that app name).
1. Click "Listners" tab.
1. Click "Add listener" button
1. For "Protocol" and "Port", choose HTTPS and keep the default port or enter a different port.
1. In "Default actions", select "Forward" and forward to the target group that contains your app name (`mage-data-prep-production-tg` by default)
1. In "Security Policy", keep the default security policy.
1. For "Default SSL certificate", do one of the following:
    1. If you created or imported a certificate using AWS Certificate Manager, choose From ACM and choose the certificate.
    1. If you uploaded a certificate using IAM, choose From IAM and choose the certificate.
1. Click "Add" to create the HTTPS listener.
1. Edit your HTTP listener, change the default action to redirect traffic to your HTTPS listener.


The detailed instructions can be found in: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html


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
