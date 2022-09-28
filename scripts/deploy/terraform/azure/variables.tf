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

variable "container_cpu" {
  description = "Container cpu"
  default     = "1"
}

variable "container_memory" {
  description = "Container memory"
  default     = "1.5"
}

variable "docker_image" {
  description = "Docker image url."
  default     = "mageai/mageai:latest"
}

