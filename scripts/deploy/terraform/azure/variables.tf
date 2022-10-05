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
  default     = "2"
}

variable "container_memory" {
  description = "Container memory"
  default     = "2"
}

variable "docker_image" {
  description = "Docker image url."
  default     = "mageai/mageai:latest"
}

variable "key_vault_name" {
  description = "Key vault name. It must be globally unique across Azure."
  default     = "magedataprepkeyvault"
}

variable "storage_account_name" {
  description = "Storage account name. It must be globally unique across Azure."
  default     = "magedataprepstorage"
}
