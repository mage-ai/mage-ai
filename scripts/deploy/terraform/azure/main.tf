provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "resource_group" {
  name     = "${var.app_name}-${var.app_environment}"
  location = "West US 2"
}

resource "azurerm_network_profile" "containergroup_profile" {
  name                = "${var.app_name}-${var.app_environment}-profile"
  location            = azurerm_resource_group.resource_group.location
  resource_group_name = azurerm_resource_group.resource_group.name

  container_network_interface {
    name = "${var.app_name}-${var.app_environment}-nic"

    ip_configuration {
      name      = "aciipconfig"
      subnet_id = azurerm_subnet.sn-aci.id
    }
  }
}

resource "azurerm_container_group" "container_group" {
  name                = "${var.app_name}-${var.app_environment}"
  location            = azurerm_resource_group.resource_group.location
  resource_group_name = azurerm_resource_group.resource_group.name
  ip_address_type     = "Private"
  os_type             = "Linux"
  network_profile_id  = azurerm_network_profile.containergroup_profile.id

  container {
    name      = "${var.app_name}-${var.app_environment}-container"
    image     = "${var.docker_image}"
    cpu       = "${var.container_cpu}"
    memory    = "${var.container_memory}"

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

output "ip" {
  value = azurerm_public_ip.public_ip.ip_address
}

output "id" {
  value = azurerm_container_group.container_group.id
}
