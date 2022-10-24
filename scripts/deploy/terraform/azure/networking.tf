# networking.tf | Network Configuration

resource "azurerm_virtual_network" "virtual_network" {
  name                = "${var.app_name}-${var.app_environment}"
  location            = azurerm_resource_group.resource_group.location
  resource_group_name = azurerm_resource_group.resource_group.name
  address_space       = ["10.0.0.0/16"]
  dns_servers         = ["10.0.0.4", "10.0.0.5"]

  tags = {
    Environment = "${var.app_environment}"
  }
}

resource "azurerm_subnet" "sn-public" {
  name                 = "public"
  resource_group_name  = azurerm_resource_group.resource_group.name
  virtual_network_name = azurerm_virtual_network.virtual_network.name
  address_prefixes     = ["10.0.20.0/24"]
}

resource "azurerm_subnet" "sn-aci" {
  name                 = "aci"
  resource_group_name  = azurerm_resource_group.resource_group.name
  virtual_network_name = azurerm_virtual_network.virtual_network.name
  address_prefixes     = ["10.0.10.0/24"]
  service_endpoints    = ["Microsoft.Storage", "Microsoft.KeyVault"]
  delegation {
    name = "acidelegationservice"

    service_delegation {
      name    = "Microsoft.ContainerInstance/containerGroups"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/action",
      ]
    }
  }
}

resource "azurerm_public_ip" "public_ip" {
  name                = "${var.app_name}-${var.app_environment}-public-ip"
  resource_group_name = azurerm_resource_group.resource_group.name
  location            = azurerm_resource_group.resource_group.location
  allocation_method   = "Static"
  sku                 = "Standard"
}

locals {
  backend_address_pool_name      = "${var.app_name}-${var.app_environment}-backend-pool"
  frontend_port_name             = "${var.app_name}-${var.app_environment}-frontend-port"
  frontend_ip_configuration_name = "${var.app_name}-${var.app_environment}-frontend-ip-config"
  http_setting_name              = "${var.app_name}-${var.app_environment}-http-setting"
  listener_name                  = "${var.app_name}-${var.app_environment}-listener"
  request_routing_rule_name      = "${var.app_name}-${var.app_environment}-routing-rule"
}


resource "azurerm_application_gateway" "network" {
  name                = "${var.app_name}-${var.app_environment}-app-gateway"
  resource_group_name = azurerm_resource_group.resource_group.name
  location            = azurerm_resource_group.resource_group.location

  sku {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 2
  }

  gateway_ip_configuration {
    name      = "${var.app_name}-${var.app_environment}-ip-configuration"
    subnet_id = azurerm_subnet.sn-public.id
  }

  frontend_port {
    name = local.frontend_port_name
    port = 80
  }

  frontend_ip_configuration {
    name                 = local.frontend_ip_configuration_name
    public_ip_address_id = azurerm_public_ip.public_ip.id
  }

  backend_address_pool {
    name          = local.backend_address_pool_name
    ip_addresses  = [azurerm_container_group.container_group.ip_address]
  }

  backend_http_settings {
    name                  = local.http_setting_name
    cookie_based_affinity = "Disabled"
    port                  = 6789
    protocol              = "Http"
    request_timeout       = 60
  }

  http_listener {
    name                           = local.listener_name
    frontend_ip_configuration_name = local.frontend_ip_configuration_name
    frontend_port_name             = local.frontend_port_name
    protocol                       = "Http"
  }

  request_routing_rule {
    name                        = local.request_routing_rule_name
    rule_type                   = "Basic"
    http_listener_name          = local.listener_name
    backend_address_pool_name   = local.backend_address_pool_name
    backend_http_settings_name  = local.http_setting_name
    priority                    = 10
  }
}

resource "azurerm_network_security_group" "nsg-aci" {
  name                = "${var.app_name}-${var.app_environment}-nsg-aci"
  location            = azurerm_resource_group.resource_group.location
  resource_group_name = azurerm_resource_group.resource_group.name

  security_rule {
    name              = "from-gateway-subnet"
    priority          = 100
    direction         = "Inbound"
    access            = "Allow"
    protocol          = "Tcp"
    source_port_range = "*"

    destination_port_ranges       = [22, 443, 445, 6789, 8000]
    source_address_prefixes       = azurerm_subnet.sn-public.address_prefixes
    destination_address_prefixes  = azurerm_subnet.sn-aci.address_prefixes
  }

  security_rule {
    name                       = "DenyAllInBound-Override"
    priority                   = 900
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }


  security_rule {
    name              = "to-internet"
    priority          = 100
    direction         = "Outbound"
    access            = "Allow"
    protocol          = "Tcp"
    source_port_range = "*"

    destination_port_range    = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  security_rule {
    name                       = "DenyAllOutBound-Override"
    priority                   = 900
    direction                  = "Outbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "sn-nsg-aci" {
  subnet_id                 = azurerm_subnet.sn-aci.id
  network_security_group_id = azurerm_network_security_group.nsg-aci.id
}

data "http" "myip" {
  url = "http://ipv4.icanhazip.com"
}

resource "azurerm_network_security_group" "nsg-public" {
  name                = "${var.app_name}-${var.app_environment}-nsg-public"
  location            = azurerm_resource_group.resource_group.location
  resource_group_name = azurerm_resource_group.resource_group.name

  security_rule {
    name              = "whitelist-inbound-ip"
    priority          = 100
    direction         = "Inbound"
    access            = "Allow"
    protocol          = "Tcp"
    source_port_range = "*"

    destination_port_ranges       = [80]
    source_address_prefixes       = ["${chomp(data.http.myip.response_body)}/32"]
    destination_address_prefix    = "*"
  }

  security_rule {
    name              = "AllowInfraComms"
    priority          = 200
    direction         = "Inbound"
    access            = "Allow"
    protocol          = "Tcp"
    source_port_range = "*"

    destination_port_range      = "65200-65535"
    source_address_prefix       = "*"
    destination_address_prefix  = "*"
  }

  security_rule {
    name                       = "DenyAllInBound-Override"
    priority                   = 900
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}

resource "azurerm_subnet_network_security_group_association" "sn-nsg-public" {
  subnet_id                 = azurerm_subnet.sn-public.id
  network_security_group_id = azurerm_network_security_group.nsg-public.id
}
