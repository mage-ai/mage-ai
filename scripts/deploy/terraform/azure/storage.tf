# storage.tf | Shared Storage Configuration

resource "azurerm_storage_account" "aci_storage" {
  name                     = "${var.storage_account_name}"
  resource_group_name      = azurerm_resource_group.resource_group.name
  location                 = azurerm_resource_group.resource_group.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  min_tls_version          = "TLS1_2"

}

resource "azurerm_storage_share" "container_share" {
  name                 = "${var.app_name}-${var.app_environment}-data"
  storage_account_name = azurerm_storage_account.aci_storage.name
  quota                = 100
}
