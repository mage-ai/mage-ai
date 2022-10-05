# service_principal.tf | Service Principal Configuration

resource "azuread_application" "app" {
  display_name = "${var.app_name}-app"
  owners       = [data.azuread_client_config.current.object_id]
}

resource "azuread_service_principal" "app" {
  application_id               = azuread_application.app.application_id
  app_role_assignment_required = false
  owners                       = [data.azuread_client_config.current.object_id]
}

# Create Service Principal password
resource "azuread_service_principal_password" "app" {
  service_principal_id = azuread_service_principal.app.id
}

# Assign roles
resource "azurerm_role_assignment" "storage" {
  scope                 = data.azurerm_subscription.current.id
  role_definition_name  = "Storage Blob Data Reader"
  principal_id          = azuread_service_principal.app.id
}
