variable "app_environment" {
  type        = string
  description = "Application Environment"
  default     = "production"
}

variable "app_name" {
  type        = string
  description = "Application Name"
  default     = "mage-data-prep"
}

variable "docker_image" {
  description = "Docker image url."
  default     = "mageai/mageai:latest"
}

