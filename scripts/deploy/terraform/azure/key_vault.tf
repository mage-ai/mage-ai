# key_vault.tf | Key Vault Configuration

resource "azurerm_key_vault" "kv" {
  name                        = var.key_vault_name
  location                    = azurerm_resource_group.resource_group.location
  resource_group_name         = azurerm_resource_group.resource_group.name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false
  sku_name = "standard"

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = azuread_service_principal.app.id

    certificate_permissions = [
      "Get", "List",
    ]

    key_permissions = [
      "Get", "List",
    ]

    secret_permissions = [
      "Get", "List",
    ]
  }
}
