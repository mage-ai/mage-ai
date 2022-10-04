# Terraform Google Cloud Platform (GCP)

<img
  alt="GCP"
  src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Google_Cloud_logo.svg/2560px-Google_Cloud_logo.svg.png"
  width="300"
/>

1. [Install gcloud CLI](#1-install-gcloud-cli)
1. [Log into GCP from CLI](#2-log-into-gcp-from-cli)
1. [Push Docker image to GCP Artifact Registry](#3-push-docker-image-to-gcp-artifact-registry)
1. [Customize Terraform settings](#4-customize-terraform-settings)
1. [Deploy](#5-deploy)
1. [Misc](#misc)

<br />

## 1. Install `gcloud` CLI

Follow these [instructions](https://cloud.google.com/sdk/docs/install)
to install the CLI on your workstation.

For macOS and Homebrew, you can do the following:

```bash
brew install --cask google-cloud-sdk
```

<br />

## 2. Log into GCP from CLI

If you don’t already have an account in GCP, create one [here](https://cloud.google.com/).

Once you created an account, from your terminal run the following command to log in:

```bash
gcloud init
gcloud auth application-default login
```

<br />

## 3. Push Docker image to GCP Artifact Registry

GCP doesn’t support using Docker images from Docker Hub.
We’ll need to pull the Mage Docker image, tag it, and push it to
[GCP Artifact Registry](https://cloud.google.com/artifact-registry).

Here are the steps we’ll take:

1. Create a repository on [GCP Artifact Registry](https://console.cloud.google.com/artifacts)
by clicking the <b>`+ CREATE REPOSITORY`</b> button.
    - Fill in the <b>Name</b>
    - Choose Docker as the <b>Format</b>
    - Choose any <b>Location type</b>
    - Choose any <b>Encryption</b>
    - Click <b>`CREATE`</b>
1. Click on the newly created repository (e.g. `mage-docker`).
1. Near the top of the page, click the link <b>`SETUP INSTRUCTIONS`</b>
or read these [instructions](https://cloud.google.com/artifact-registry/docs/docker/authentication)
to set up authentication for Docker.
    - <b>TLDR</b> - Run the following command in your terminal:
```bash
gcloud auth configure-docker [region]-docker.pkg.dev
```
    - An example command could look like this:
    ```bash
    gcloud auth configure-docker us-west2-docker.pkg.dev
    ```
1. Pull the Mage Docker image:
```bash
docker pull mageai/mageai:latest
```
    - If you’re local workstation is using macOS and a silicon chip (e.g. M1, M2, etc),
    then run this command instead:
```bash
docker pull --platform linux/amd64 mageai/mageai:latest
```
1. Tag the pulled Mage docker image:
```bash
docker tag mageai/mageai:latest [region]-docker.pkg.dev/[project_id]/[repository]/mageai:latest
```
    - An example command could look like this:
    ```bash
    docker tag mageai/mageai:latest \
      us-west2-docker.pkg.dev/materia-284023/mage-docker/mageai:latest
    ```
1. Push the local Docker image to GCP Artifact Registry:
```bash
docker push [region]-docker.pkg.dev/[project_id]/[repository]/mageai:latest
```
    - An example command could look like this:
    ```bash
    docker push us-west2-docker.pkg.dev/materia-284023/mage-docker/mageai:latest
    ```

<br />

## 4. Customize Terraform settings

<b>Project ID (REQUIRED)</b>

Before running any Terraform commands,
please change the `default` value of the variable named `project_id` in the
[./scripts/deploy/terraform/gcp/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/gcp/variables.tf)
file.

```
variable "project_id" {
  type        = string
  description = "The name of the project"
  default     = "unique-gcp-project-id"
}
```

<b>Docker image (REQUIRED)</b>

In the repository you created in GCP Artifact Repository, you’ll see a list of Docker images.
Click on an image name, then copy the full path to the image
(e.g. `us-west2-docker.pkg.dev/materia-284023/mage-docker/mageai`).

In the file [./scripts/deploy/terraform/gcp/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/gcp/variables.tf),
you can change the `default` value under `docker_image`:

```
variable "docker_image" {
  type        = string
  description = "The Docker image url in the Artifact Registry repository to be deployed to Cloud Run"
  default     = "us-west2-docker.pkg.dev/materia-284023/mage-docker/mageai"
}
```

<b>Application Name</b>

In the file [./scripts/deploy/terraform/gcp/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/gcp/variables.tf),
you can change the `default` value under `app_name`:

```
variable "app_name" {
  type        = string
  description = "Application Name"
  default     = "mage-data-prep"
}
```

<b>Region</b>

In the file [./scripts/deploy/terraform/gcp/main.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/gcp/main.tf),
you can change the `default` value under `region`:

```
variable "region" {
  type        = string
  description = "The default compute region"
  default     = "us-west2"
}
```

### More

Other variables defined in [./scripts/deploy/terraform/gcp/variables.tf](https://github.com/mage-ai/mage-ai/blob/master/scripts/deploy/terraform/gcp/variables.tf)
can also be customized to your needs.

<br />

## 5. Deploy

1. Change directory into scripts folder:
```bash
cd scripts/deploy/terraform/gcp
```

2. Initialize Terraform:
```bash
terraform init
```
A sample output could look like this:
```
Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/google versions matching ">= 3.3.0"...
- Finding latest version of hashicorp/http...
- Installing hashicorp/google v4.38.0...
- Installed hashicorp/google v4.38.0 (signed by HashiCorp)
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
Apply complete! Resources: 7 added, 1 changed, 0 destroyed.

Outputs:

service_ip = "34.107.187.208"
```

In your browser, go to [`http://[IP_address]/`](http://IP_address/).

> Note
>
> Change the `IP_address` to the IP address that was output in your terminal after successfully running `terraform apply`.

### Errors

<b>403 Forbidden</b>

If you get this error when trying to open the above IP address in your browser,
open the security group named [`[application_name]-security-policy`](https://console.cloud.google.com/net-security/securitypolicies/list).
Click on that security group and verify your IP address is whitelisted.

If it isn’t, add a new rule with the following values:

| Mode | Match | Action | Priority |
| --- | --- | --- | --- |
| Basic mode | [Enter your IP address](https://whatismyipaddress.com/) | Allow | 100 |

<br />

## Misc

### Security

To enable other IP addresses access to Mage, open the security group named
[`[application_name]-security-policy`](https://console.cloud.google.com/net-security/securitypolicies/list).
Click on that security group and add a new rule with the following values:

| Mode | Match | Action | Priority |
| --- | --- | --- | --- |
| Basic mode | [Enter your IP address](https://whatismyipaddress.com/) | Allow | 100 |

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
