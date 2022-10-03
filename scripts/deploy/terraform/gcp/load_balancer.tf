# load_balancer.tf | Load Balancer Configuration

data "http" "myip" {
  url = "http://ipv4.icanhazip.com"
}

resource "google_compute_security_policy" "policy" {
  name = "${var.app_name}-security-policy"

  rule {
    action   = "allow"
    priority = "100"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["${chomp(data.http.myip.response_body)}/32"]
      }
    }
    description = "Whitelist IP"
  }

  rule {
    action   = "deny(403)"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "default rule"
  }
}

resource "google_compute_global_address" "ip" {
  name = "${var.app_name}-service-ip"
}

resource "google_compute_region_network_endpoint_group" "cloudrun_neg" {
  name                  = "${var.app_name}-neg"
  network_endpoint_type = "SERVERLESS"
  region                = var.region
  cloud_run {
    service = google_cloud_run_service.run_service.name
  }
}

resource "google_compute_backend_service" "backend" {
  name      = "${var.app_name}-backend"

  protocol  = "HTTP"
  port_name = "http"
  timeout_sec = 30

  backend {
    group = google_compute_region_network_endpoint_group.cloudrun_neg.id
  }

  security_policy = google_compute_security_policy.policy.name
}

resource "google_compute_url_map" "url_map" {
  name            = "${var.app_name}-urlmap"

  default_service = google_compute_backend_service.backend.id
}

resource "google_compute_target_http_proxy" "http_proxy" {
  name    = "${var.app_name}-http-proxy"
  url_map = google_compute_url_map.url_map.id
}

resource "google_compute_global_forwarding_rule" "frontend" {
  name       = "${var.app_name}-frontend"
  target     = google_compute_target_http_proxy.http_proxy.id
  port_range = "80"
  ip_address = google_compute_global_address.ip.address
}
