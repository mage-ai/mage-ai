# fs.tf | File System Configuration

resource "google_filestore_instance" "instance" {
  name = "${var.app_name}"
  location = var.zone
  tier = "BASIC_HDD"

  file_shares {
    capacity_gb = 1024
    name        = "share1"
  }

  networks {
    network = "default"
    modes   = ["MODE_IPV4"]
  }
}

resource "google_vpc_access_connector" "connector" {
  name          = "${var.app_name}-connector"
  ip_cidr_range = "10.8.0.0/28"
  region        = var.region
  network       = "default"
}
