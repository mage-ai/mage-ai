variable "app_name" {
  type        = string
  description = "Application Name"
  default     = "mage-data-prep"
}

variable "container_cpu" {
  description = "Container cpu"
  default     = "2"
}

variable "container_memory" {
  description = "Container memory"
  default     = "1G"
}

variable "project_id" {
  description = "The name of the project"
  type        = string
}

variable "region" {
  description = "The default compute region"
  type        = string
  default     = "us-west2"
}

variable "zone" {
  description = "The default compute zone"
  type        = string
  default     = "us-west2-a"
}

variable "repository" {
  description = "The name of the Artifact Registry repository to be created"
  type        = string
  default     = "mage-data-prep"
}

variable "docker_image" {
  description = "The name of the Docker image in the Artifact Registry repository to be deployed to Cloud Run"
  type        = string
  default     = "mageai"
}
