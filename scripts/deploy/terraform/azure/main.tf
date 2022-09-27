provider "azurerm" {
  features {}
  skip_provider_registration = true
}

resource "azurerm_resource_group" "resource_group" {
  name     = "${var.app_name}-${var.app_environment}"
  location = "West US 2"
}

resource "azurerm_container_group" "container_group" {
  name                = "${var.app_name}-${var.app_environment}"
  location            = azurerm_resource_group.resource_group.location
  resource_group_name = azurerm_resource_group.resource_group.name
  ip_address_type     = "Public"
  dns_name_label      = "${var.app_name}-${var.app_environment}"
  os_type             = "Linux"

  container {
    name      = "${var.app_name}-${var.app_environment}-container"
    image     = "${var.docker_image}"
    cpu       = "1"
    memory    = "1.5"

    ports {
      port     = 6789
      protocol = "TCP"
    }

    volume {
      name                 = "${var.app_name}-fs"
      mount_path           = "/home/src"
      storage_account_name = azurerm_storage_account.aci_storage.name
      storage_account_key  = azurerm_storage_account.aci_storage.primary_access_key
      share_name           = azurerm_storage_share.container_share.name
    }
  }

  tags = {
    Environment = "${var.app_environment}"
  }
}

output "fqdn" {
  value = azurerm_container_group.container_group.fqdn
}

output "ip" {
  value = azurerm_container_group.container_group.ip_address
}

output "id" {
  value = azurerm_container_group.container_group.id
}
