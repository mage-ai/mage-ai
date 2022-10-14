# efs.tf | Elastic File System Configuration

resource "aws_efs_file_system" "file_system" {
  encrypted        = true
  performance_mode = "generalPurpose"
  throughput_mode  = "bursting"

  tags = {
    Name        = "${var.app_name}-efs"
    Environment = var.app_environment
  }
}

resource "aws_efs_mount_target" "mount_target" {
  count           = length(aws_subnet.public)
  file_system_id  = aws_efs_file_system.file_system.id
  subnet_id       = aws_subnet.public[count.index].id
  security_groups = [aws_security_group.mount_target_security_group.id]
}


resource "aws_security_group" "mount_target_security_group" {
  vpc_id = aws_vpc.aws-vpc.id

  ingress {
    from_port        = 2049
    to_port          = 2049
    protocol         = "tcp"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name        = "${var.app_name}-efs-sg"
    Environment = var.app_environment
  }
}
